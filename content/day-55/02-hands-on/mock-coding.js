/**
 * Day 55 — JavaScript Mock Coding Challenges
 * Simulate whiteboard conditions: implement from scratch, no library imports.
 */

// ─────────────────────────────────────────────────────────────
// 1. Promise.all from Scratch
// ─────────────────────────────────────────────────────────────
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (promises.length === 0) return resolve([]);

    const results = new Array(promises.length);
    let completed = 0;

    promises.forEach((p, i) => {
      // Wrap in Promise.resolve to handle non-Promise values
      Promise.resolve(p).then(val => {
        results[i] = val;
        completed++;
        if (completed === promises.length) resolve(results);
      }).catch(reject); // First rejection rejects all
    });
  });
}

// Test
async function testPromiseAll() {
  console.log('=== Promise.all ===');
  const r1 = await promiseAll([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
  console.log(r1); // [1, 2, 3]

  const r2 = await promiseAll([Promise.resolve('a'), 42, Promise.resolve('c')]);
  console.log(r2); // ['a', 42, 'c'] — non-Promise values wrapped

  try {
    await promiseAll([Promise.resolve(1), Promise.reject(new Error('failed')), Promise.resolve(3)]);
  } catch (err) {
    console.log('Rejected:', err.message); // "failed"
  }

  const r3 = await promiseAll([]);
  console.log('Empty:', r3); // []
}

// ─────────────────────────────────────────────────────────────
// 2. Deep Clone (handles circular references, Date, Array)
// ─────────────────────────────────────────────────────────────
function deepClone(value, visited = new WeakMap()) {
  // Primitives — return as-is
  if (value === null || typeof value !== 'object') return value;

  // Handle special types
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (value instanceof Map) {
    const cloned = new Map();
    visited.set(value, cloned);
    for (const [k, v] of value) cloned.set(deepClone(k, visited), deepClone(v, visited));
    return cloned;
  }
  if (value instanceof Set) {
    const cloned = new Set();
    visited.set(value, cloned);
    for (const v of value) cloned.add(deepClone(v, visited));
    return cloned;
  }

  // Circular reference detection
  if (visited.has(value)) return visited.get(value);

  // Array
  if (Array.isArray(value)) {
    const cloned = [];
    visited.set(value, cloned);
    for (let i = 0; i < value.length; i++) {
      cloned[i] = deepClone(value[i], visited);
    }
    return cloned;
  }

  // Plain object (preserve prototype)
  const cloned = Object.create(Object.getPrototypeOf(value));
  visited.set(value, cloned);
  for (const key of [...Object.keys(value), ...Object.getOwnPropertySymbols(value)]) {
    cloned[key] = deepClone(value[key], visited);
  }
  return cloned;
}

function testDeepClone() {
  console.log('\n=== Deep Clone ===');

  const original = {
    a: 1,
    b: { c: [1, 2, 3], d: new Date('2024-01-01') },
    e: new Map([['key', { nested: true }]]),
  };
  // Circular reference
  original.self = original;

  const clone = deepClone(original);
  console.log('Primitive:', clone.a === 1);                      // true
  console.log('Nested array:', clone.b.c !== original.b.c);      // true (different ref)
  clone.b.c.push(99);
  console.log('No mutation:', original.b.c.length === 3);        // true
  console.log('Date cloned:', clone.b.d instanceof Date);        // true
  console.log('Map cloned:', clone.e instanceof Map);            // true
  console.log('Circular ref:', clone.self === clone);            // true (points to clone)
}

// ─────────────────────────────────────────────────────────────
// 3. EventEmitter (on, off, emit, once)
// ─────────────────────────────────────────────────────────────
class EventEmitter {
  constructor() {
    this._events = new Map(); // event → Set of listeners
  }

  on(event, listener) {
    if (!this._events.has(event)) this._events.set(event, new Set());
    this._events.get(event).add(listener);
    return this; // chainable
  }

  off(event, listener) {
    const listeners = this._events.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) this._events.delete(event);
    }
    return this;
  }

  emit(event, ...args) {
    const listeners = this._events.get(event);
    if (!listeners) return false;
    // Snapshot the set before iteration — listeners may modify it during emit
    for (const listener of [...listeners]) {
      listener(...args);
    }
    return true;
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper); // auto-remove after first call
    };
    // Store original so `off(event, originalListener)` still works
    wrapper._original = listener;
    return this.on(event, wrapper);
  }

  removeAllListeners(event) {
    if (event) this._events.delete(event);
    else this._events.clear();
    return this;
  }

  listenerCount(event) {
    return this._events.get(event)?.size ?? 0;
  }
}

function testEventEmitter() {
  console.log('\n=== EventEmitter ===');
  const emitter = new EventEmitter();

  let count = 0;
  const handler = (n) => { count += n; };

  emitter.on('add', handler);
  emitter.emit('add', 5);   // count = 5
  emitter.emit('add', 3);   // count = 8
  console.log('After two emits:', count); // 8

  emitter.off('add', handler);
  emitter.emit('add', 100);
  console.log('After off:', count); // still 8

  let onceCount = 0;
  emitter.once('greet', () => onceCount++);
  emitter.emit('greet');  // fires
  emitter.emit('greet');  // no-op (already removed)
  console.log('Once count:', onceCount); // 1

  // Chaining
  emitter.on('x', () => {}).on('x', () => {});
  console.log('Listener count:', emitter.listenerCount('x')); // 2
}

// ─────────────────────────────────────────────────────────────
// 4. Async Pool — Run N Promises at a Time
// ─────────────────────────────────────────────────────────────
/**
 * Like Promise.all but limits concurrency to `poolSize`.
 * Essential for rate-limiting API calls or DB queries.
 */
async function asyncPool(poolSize, items, iteratorFn) {
  const results = [];
  const executing = new Set();

  for (const item of items) {
    const p = Promise.resolve(iteratorFn(item)).then(result => {
      executing.delete(p);
      return result;
    });

    results.push(p);
    executing.add(p);

    // If pool is full, wait for one to complete before continuing
    if (executing.size >= poolSize) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

async function testAsyncPool() {
  console.log('\n=== Async Pool ===');
  const startTime = Date.now();
  let maxConcurrent = 0;
  let currentConcurrent = 0;

  const results = await asyncPool(3, [1, 2, 3, 4, 5, 6], async (n) => {
    currentConcurrent++;
    maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
    await new Promise(r => setTimeout(r, 50 * n)); // variable delay
    currentConcurrent--;
    return n * 2;
  });

  console.log('Results:', results);         // [2,4,6,8,10,12]
  console.log('Max concurrent:', maxConcurrent); // <= 3
  console.log(`Total time: ${Date.now() - startTime}ms`);
}

// ─────────────────────────────────────────────────────────────
// 5. Virtual DOM Diff Algorithm (simplified)
// ─────────────────────────────────────────────────────────────
/**
 * Compare two virtual DOM trees and return a list of patch operations.
 * Simplified: handles node type changes, prop changes, text changes, and children.
 */
function diff(oldNode, newNode, path = '') {
  const patches = [];

  // Case 1: Both are text nodes
  if (typeof oldNode === 'string' || typeof newNode === 'string') {
    if (oldNode !== newNode) {
      patches.push({ type: 'TEXT', path, oldValue: oldNode, newValue: newNode });
    }
    return patches;
  }

  // Case 2: Null/undefined
  if (!oldNode && newNode) {
    patches.push({ type: 'INSERT', path, node: newNode });
    return patches;
  }
  if (oldNode && !newNode) {
    patches.push({ type: 'REMOVE', path });
    return patches;
  }

  // Case 3: Different node types — replace entirely
  if (oldNode.type !== newNode.type) {
    patches.push({ type: 'REPLACE', path, newNode });
    return patches;
  }

  // Case 4: Same node type — check prop changes
  const propChanges = diffProps(oldNode.props || {}, newNode.props || {});
  if (Object.keys(propChanges).length > 0) {
    patches.push({ type: 'PROPS', path, changes: propChanges });
  }

  // Case 5: Recurse into children
  const oldChildren = oldNode.children || [];
  const newChildren = newNode.children || [];
  const maxLen = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < maxLen; i++) {
    const childPath = `${path}[${i}]`;
    const childPatches = diff(oldChildren[i], newChildren[i], childPath);
    patches.push(...childPatches);
  }

  return patches;
}

function diffProps(oldProps, newProps) {
  const changes = {};

  // Check for modified or removed props
  for (const key of Object.keys(oldProps)) {
    if (oldProps[key] !== newProps[key]) {
      changes[key] = { old: oldProps[key], new: newProps[key] };
    }
  }

  // Check for added props
  for (const key of Object.keys(newProps)) {
    if (!(key in oldProps)) {
      changes[key] = { old: undefined, new: newProps[key] };
    }
  }

  return changes;
}

function h(type, props = {}, ...children) {
  return { type, props, children: children.flat() };
}

function testVDOMDiff() {
  console.log('\n=== Virtual DOM Diff ===');

  const oldTree = h('div', { class: 'container' },
    h('h1', { id: 'title' }, 'Hello'),
    h('p', {}, 'World'),
  );

  const newTree = h('div', { class: 'container updated' }, // prop change
    h('h1', { id: 'title' }, 'Hello Updated'), // text change
    h('p', {}, 'World'),
    h('span', {}, 'New node'), // inserted
  );

  const patches = diff(oldTree, newTree);
  console.log('Patches:');
  patches.forEach(p => console.log(' ', JSON.stringify(p)));
}

// ─────────────────────────────────────────────────────────────
// Run All
// ─────────────────────────────────────────────────────────────
async function main() {
  await testPromiseAll();
  testDeepClone();
  testEventEmitter();
  await testAsyncPool();
  testVDOMDiff();
}

main().catch(console.error);

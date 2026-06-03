# Day 55 — Full 15-Question JavaScript Mock Interview

---

## Q1 (Conceptual): Explain the JavaScript event loop. What are microtasks vs macrotasks?

**Model Answer:**
JavaScript runs on a single thread. The event loop coordinates task execution. There are two queues:

**Macrotask queue** (task queue): `setTimeout`, `setInterval`, `setImmediate`, I/O callbacks, UI rendering events. Processed one at a time.

**Microtask queue**: `Promise.then/catch/finally`, `queueMicrotask()`, `MutationObserver`. After each macrotask, the event loop drains ALL pending microtasks before moving to the next macrotask.

**Order**: Synchronous code → microtasks (all) → macrotask → microtasks (all) → macrotask → ...

Practical consequence: `Promise.resolve().then(fn)` always runs before `setTimeout(fn, 0)`, even though both are "async".

---

## Q2 (Conceptual): How does the prototype chain work in JavaScript?

**Model Answer:**
Every object in JavaScript has an internal `[[Prototype]]` slot that points to another object (or null). When you access a property, the engine looks on the object first, then follows `[[Prototype]]`, then its `[[Prototype]]`, up the chain to `Object.prototype`, then null.

```js
const dog = Object.create(animal); // dog's [[Prototype]] is animal
dog.hasOwnProperty('name'); // checks own properties
'toString' in dog; // found at Object.prototype
```

Constructor functions: `new Dog()` creates an object whose `[[Prototype]]` is `Dog.prototype`. `class` syntax is syntactic sugar over this mechanism — `class Dog extends Animal` sets `Dog.prototype.__proto__ = Animal.prototype`.

---

## Q3 (Conceptual): What is a closure? Give a practical use case.

**Model Answer:**
A closure is a function that retains access to its enclosing scope's variables even after the outer function has returned.

```js
function createCounter() {
  let count = 0; // private via closure
  return {
    increment: () => ++count,
    reset: () => { count = 0; },
    value: () => count,
  };
}
const c = createCounter();
c.increment(); c.increment();
c.value(); // 2 — count is private, not accessible directly
```

**Practical use cases**: Module pattern (private state), function factories (memoize, curry), React hooks (useState internals capture the state value in a closure), event handlers with access to outer variables.

**Memory leak risk**: If a closure holds a reference to a large object or a DOM element, and the closure itself is held (e.g., in a global variable or event listener), the large object cannot be garbage collected.

---

## Q4 (Conceptual): Explain `this` binding. How does it differ in arrow functions?

**Model Answer:**
`this` in JavaScript is determined at **call time**, not at define time (except for arrow functions).

4 binding rules (in order of priority):
1. **`new`**: `this` = newly created object
2. **Explicit**: `fn.call(ctx)`, `fn.apply(ctx)`, `fn.bind(ctx)` — `this` = ctx
3. **Implicit**: `obj.method()` — `this` = obj
4. **Default**: `fn()` in strict mode = `undefined`; in sloppy mode = global (`window`/`globalThis`)

**Arrow functions**: No own `this`. They capture `this` from the enclosing lexical scope at definition time. Cannot be changed with `bind/call/apply`.

```js
class Timer {
  start() {
    setTimeout(function() { this.tick(); }, 100); // BROKEN — this is undefined
    setTimeout(() => { this.tick(); }, 100);      // WORKS — arrow captures class this
  }
}
```

---

## Q5 (Conceptual): What are ES6+ features you use daily and why do they matter?

**Model Answer:**
- **Destructuring**: cleaner extraction of values from objects/arrays
- **Optional chaining** `?.`: avoids `Cannot read properties of null` crashes — `user?.address?.city`
- **Nullish coalescing** `??`: default only for `null`/`undefined`, unlike `||` which defaults for all falsy values (including `0`, `""`)
- **`Promise.all`, `Promise.allSettled`, `Promise.race`**: composing async operations
- **`async/await`**: synchronous-style async code, proper error handling with try/catch
- **Spread/rest**: `...args`, function composition, immutable updates
- **`Map`/`Set`**: proper data structures — Map has O(1) lookup AND maintains insertion order; Set for deduplication
- **`WeakMap`/`WeakRef`**: don't prevent GC — critical for caches and event listener tracking
- **`Proxy`/`Reflect`**: meta-programming, reactive systems (Vue 3 reactivity uses Proxy)
- **`Symbol`**: unique property keys, custom iteration (`Symbol.iterator`)

---

## Q6 (Code Output): What does this print?

```js
async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
async function main() {
  console.log('A');
  await delay(0);
  console.log('B');
  Promise.resolve().then(() => console.log('C'));
  console.log('D');
}
main();
console.log('E');
```

**Output**: `A, E, B, D, C`

**Why**: `A` prints synchronously. `await delay(0)` suspends main. `E` prints (main is suspended, outer code continues). setTimeout fires (macrotask), main resumes. `B` prints. `Promise.resolve().then(...)` schedules a microtask. `D` prints synchronously. Then microtask runs: `C`.

---

## Q7 (Code Output): What does this print?

```js
const p = new Promise((resolve) => {
  resolve(1);
  resolve(2);
  throw new Error('oops');
});
p.then(v => console.log('val:', v)).catch(e => console.log('err:', e.message));
```

**Output**: `val: 1`

**Why**: A Promise can only be settled once. After `resolve(1)`, the promise is fulfilled. The second `resolve(2)` is ignored. `throw new Error('oops')` is also ignored (already settled). The `.then` handler fires with value 1.

---

## Q8 (Code Output): What is the output?

```js
console.log(typeof undefined);  // 'undefined'
console.log(typeof null);        // 'object' (bug)
console.log(typeof []);          // 'object'
console.log(typeof function(){}); // 'function'
console.log([] == false);        // true
console.log([] === false);       // false
console.log(null == undefined);  // true
console.log(null === undefined); // false
```

**Model Answer**: Explain each: `typeof null` is a historical bug. `typeof []` returns `'object'` — use `Array.isArray()` to check for arrays. `[] == false` triggers type coercion: `[]` → `""` → `0`, `false` → `0`, `0 == 0` is true.

---

## Q9 (Code Output): Explain the output

```js
let x = 1;
const obj = {
  x: 2,
  getX: function() { return this.x; },
  getXArrow: () => this?.x,
};
const { getX } = obj;
console.log(obj.getX());     // 2 — implicit binding, this = obj
console.log(getX());         // undefined — no binding, this is undefined (strict mode)
console.log(obj.getXArrow()); // undefined — arrow captures outer this (not obj)
```

---

## Q10 (Code Output): What is the output and why?

```js
function makeAdder(x) {
  return function(y) { return x + y; };
}
const add5 = makeAdder(5);
const add10 = makeAdder(10);
console.log(add5(3));    // 8
console.log(add10(3));   // 13
console.log(add5 === add10); // false — each call creates a new closure
```

**Why**: Each call to `makeAdder` creates a new closure with its own `x`. `add5` and `add10` are different function objects that close over different `x` values.

---

## Q11 (Implement): Implement `debounce` and `throttle`

**Model Answer:**
```js
// debounce: execute after N ms of inactivity
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// throttle: execute at most once per N ms
function throttle(fn, limit) {
  let inThrottle = false;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}
```

**When to use each**: Debounce for search inputs (fire once after typing stops). Throttle for scroll/resize events (fire at most once per 100ms while scrolling).

---

## Q12 (Implement): Implement `memoize` and `once`

**Model Answer:**
```js
function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args); // simple key — for complex args, use a WeakMap
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

function once(fn) {
  let called = false;
  let result;
  return function(...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result; // returns same result on subsequent calls
  };
}
```

---

## Q13 (Implement): Implement `curry`

**Model Answer:**
```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      // Have enough args — invoke the function
      return fn.apply(this, args);
    }
    // Return a new function that collects more args
    return function(...moreArgs) {
      return curried.apply(this, args.concat(moreArgs));
    };
  };
}

// Usage:
const add = curry((a, b, c) => a + b + c);
console.log(add(1)(2)(3));   // 6
console.log(add(1, 2)(3));   // 6
console.log(add(1)(2, 3));   // 6
console.log(add(1, 2, 3));   // 6
```

---

## Q14 (System Design Mini): Design a rate limiter library for Node.js

**Model Answer:**
A rate limiter restricts how many times an identifier (IP, user ID, API key) can perform an action within a time window.

**Algorithms**:
1. **Fixed window**: count requests in a window (e.g., 100 req/min). Simple. Problem: 100 at 0:59 + 100 at 1:01 = 200 in 2 seconds.
2. **Sliding window** (best): maintain a sorted set of timestamps, evict entries older than the window. Count remaining = limit.
3. **Token bucket**: refill tokens at a rate, consume on request. Allows bursting.

**Interface**:
```js
const limiter = new RateLimiter({ windowMs: 60000, max: 100, store: new RedisStore() });
// Express middleware:
app.use(limiter.middleware());
// Programmatic:
const result = await limiter.check('user:42'); // { allowed: true, remaining: 99, resetAt }
```

**Storage backends**: In-memory (single server, no persistence), Redis (distributed, atomic operations with Lua scripts).

**Key operations in Redis (atomic)**: `ZADD key timestamp timestamp`, `ZREMRANGEBYSCORE key 0 windowStart`, `ZCARD key`, all in a Lua script to be atomic.

---

## Q15 (Behavioral): Tell me about a time you fixed a production JavaScript bug.

**Model Answer (STAR format):**
**Situation**: Our React app had a memory leak in production — memory grew continuously until the browser tab crashed, typically after 10-15 minutes of use.

**Task**: Identify the root cause and fix it without causing regression.

**Action**: 
1. Reproduced in Chrome DevTools with the Memory profiler — took three heap snapshots at 5-min intervals, compared with "Objects allocated between snapshots"
2. Found retained `WebSocket` objects — 300+ alive after users had navigated away from the live-chat page
3. Root cause: `useEffect` had `socket.on('message', handler)` but no cleanup function — component unmounted, socket closed, but the reference was still held by an event listener on a global event bus
4. Fix: Added cleanup in `useEffect`'s return function: `return () => { socket.off('message', handler); socket.close(); }`
5. Added a dev-mode lint rule to enforce cleanup in useEffect hooks that create subscriptions

**Result**: Memory leak eliminated — heap stabilized at ~50MB vs growing to 400MB+. Added this scenario to our code review checklist for async resources in hooks.

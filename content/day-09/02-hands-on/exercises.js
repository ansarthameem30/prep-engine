/**
 * Day 09 – Performance: Implement debounce, throttle, memoize from scratch
 * Run with: node exercises.js
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: Debounce with Leading + Trailing Options
// ─────────────────────────────────────────────────────────────

function debounce(fn, delay, { leading = false, trailing = true } = {}) {
  let timerId = null;
  let lastArgs = null;
  let lastThis = null;
  let shouldInvokeOnTrail = false;

  function invoke() {
    fn.apply(lastThis, lastArgs);
    lastThis = null;
    lastArgs = null;
  }

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;
    const isFirstInvocation = timerId === null;

    clearTimeout(timerId);

    if (leading && isFirstInvocation) {
      invoke(); // fire immediately on leading edge
      shouldInvokeOnTrail = false;
    } else {
      shouldInvokeOnTrail = true;
    }

    timerId = setTimeout(() => {
      timerId = null;
      if (trailing && shouldInvokeOnTrail) {
        invoke();
      }
      shouldInvokeOnTrail = false;
    }, delay);
  }

  debounced.cancel = function() {
    clearTimeout(timerId);
    timerId = null;
    shouldInvokeOnTrail = false;
  };

  return debounced;
}

// Tests
console.log("=== Exercise 1: Debounce ===");

let debouncedCallCount = 0;
const debouncedFn = debounce(() => {
  debouncedCallCount++;
  console.log(`debounce fired — call #${debouncedCallCount}`);
}, 50);

// Rapid calls — should only fire ONCE (trailing edge)
debouncedFn(); debouncedFn(); debouncedFn();
setTimeout(() => console.log("debounced calls:", debouncedCallCount), 200); // 1

// Leading edge test
let leadingCount = 0;
const leadingFn = debounce(() => leadingCount++, 100, { leading: true, trailing: false });
leadingFn(); leadingFn(); leadingFn(); // fires on first call
setTimeout(() => console.log("leading fires:", leadingCount), 200); // 1


// ─────────────────────────────────────────────────────────────
// Exercise 2: Throttle with Correct Leading Execution
// ─────────────────────────────────────────────────────────────

function throttle(fn, interval) {
  let lastRun = 0;
  let scheduledTimer = null;

  return function throttled(...args) {
    const now = Date.now();
    const elapsed = now - lastRun;

    if (elapsed >= interval) {
      // Enough time passed — run now (leading edge)
      if (scheduledTimer) {
        clearTimeout(scheduledTimer);
        scheduledTimer = null;
      }
      lastRun = now;
      fn.apply(this, args);
    } else if (!scheduledTimer) {
      // Schedule for trailing edge (fire once after interval expires)
      const remaining = interval - elapsed;
      scheduledTimer = setTimeout(() => {
        lastRun = Date.now();
        scheduledTimer = null;
        fn.apply(this, args);
      }, remaining);
    }
    // If already scheduled, update args would require storing them
  };
}

console.log("\n=== Exercise 2: Throttle ===");

let throttleCallCount = 0;
const throttledFn = throttle(() => {
  throttleCallCount++;
  console.log(`throttle fired at ${Date.now()} — call #${throttleCallCount}`);
}, 100);

// Simulated rapid firing over 500ms
const calls = [0, 20, 40, 60, 80, 120, 200, 350, 500];
calls.forEach(ms => setTimeout(throttledFn, ms));
// Should fire at ~0ms, ~100ms, ~200ms, ~350ms, ~500ms (not on every call)
setTimeout(() => console.log("total throttle fires:", throttleCallCount), 700);


// ─────────────────────────────────────────────────────────────
// Exercise 3: Memoize with Cache Size Limit + Eviction
// ─────────────────────────────────────────────────────────────

function memoize(fn, { maxSize = Infinity, ttl = Infinity } = {}) {
  const cache = new Map(); // key → { value, lastAccessed, expires }

  function getKey(args) {
    return JSON.stringify(args);
  }

  function evictLRU() {
    // Find entry with oldest lastAccessed
    let oldest = Infinity;
    let oldestKey;
    for (const [key, entry] of cache) {
      if (entry.lastAccessed < oldest) {
        oldest = entry.lastAccessed;
        oldestKey = key;
      }
    }
    cache.delete(oldestKey);
  }

  const memoized = function(...args) {
    const key = getKey(args);
    const now = Date.now();

    if (cache.has(key)) {
      const entry = cache.get(key);
      if (now < entry.expires) {
        entry.lastAccessed = now;
        return entry.value;
      }
      cache.delete(key); // expired
    }

    const value = fn.apply(this, args);

    if (cache.size >= maxSize) evictLRU();

    cache.set(key, {
      value,
      lastAccessed: now,
      expires: ttl === Infinity ? Infinity : now + ttl
    });

    return value;
  };

  memoized.cache = cache;
  memoized.clear = () => cache.clear();
  memoized.delete = (...args) => cache.delete(getKey(args));
  return memoized;
}

console.log("\n=== Exercise 3: Memoize with LRU + TTL ===");

let computeCount = 0;
const cachedFib = memoize((n) => {
  computeCount++;
  if (n <= 1) return n;
  return cachedFib(n - 1) + cachedFib(n - 2);
});

console.log(cachedFib(10)); // 55
console.log(cachedFib(10)); // 55 (from cache)
console.log(`computeCount: ${computeCount}`); // 11 (fib(0) through fib(10), each once)


// ─────────────────────────────────────────────────────────────
// Exercise 4: Detect Memory Leak Pattern
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 4: Memory Leak Analysis ===");

// Simulate the event listener leak pattern and fix
class EventLeaker {
  constructor(name) {
    this.name = name;
    this.data = new Array(10000).fill(name); // simulate large data
    // BUG: binding creates a new function each time, can't be removed
    // document.addEventListener("click", this.handleClick.bind(this));
  }
}

class EventSafe {
  constructor(name) {
    this.name = name;
    this.data = new Array(10000).fill(name);
    // FIXED: store the bound reference for later removal
    this._handleClick = this.handleClick.bind(this);
    // document.addEventListener("click", this._handleClick);
  }

  handleClick(e) { console.log(this.name); }

  destroy() {
    // document.removeEventListener("click", this._handleClick);
    this.data = null; // help GC
  }
}

console.log("Memory patterns reviewed — see concept notes for examples");


// ─────────────────────────────────────────────────────────────
// Exercise 5: requestAnimationFrame Animation Simulator
// ─────────────────────────────────────────────────────────────
// Simulate the rAF pattern in Node.js (no browser API)

console.log("\n=== Exercise 5: Animation Frame Simulation ===");

// Node.js rAF simulation
let rafCallbacks = [];
let rafHandle = 0;
function requestAnimationFrame(cb) {
  rafCallbacks.push(cb);
  return ++rafHandle;
}
function runFrame() {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach(cb => cb(Date.now()));
}

// Easing function
const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

function animateValue(from, to, duration, onUpdate, onComplete) {
  const start = Date.now();

  function frame(timestamp) {
    const elapsed = timestamp - start;
    const raw = Math.min(elapsed / duration, 1);
    const eased = easeInOut(raw);
    const value = from + (to - from) * eased;

    onUpdate(Math.round(value * 100) / 100);

    if (raw < 1) requestAnimationFrame(frame);
    else onComplete?.();
  }

  requestAnimationFrame(frame);
}

// Run the animation
const values = [];
animateValue(0, 100, 300, (v) => values.push(v), () => {
  console.log("Animation complete. First 5 values:", values.slice(0, 5));
  console.log("Last value:", values[values.length - 1]);
});

// Simulate 5 frames
for (let i = 0; i < 10; i++) runFrame();

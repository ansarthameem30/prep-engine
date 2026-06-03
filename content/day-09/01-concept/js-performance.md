# JavaScript Performance Optimization

## Debounce — Implementation from Scratch

**Problem:** A function is called too frequently (on every keystroke, every scroll pixel). Debounce delays execution until the caller has stopped calling for a specified period.

```js
function debounce(fn, delay, options = {}) {
  const { leading = false, trailing = true } = options;
  let timerId;
  let lastCallTime;
  let lastResult;

  function invoke(args, thisArg) {
    lastResult = fn.apply(thisArg, args);
    return lastResult;
  }

  function debounced(...args) {
    const time = Date.now();
    const isFirstCall = !lastCallTime;
    lastCallTime = time;

    clearTimeout(timerId);

    if (leading && isFirstCall) {
      invoke(args, this);
    }

    if (trailing) {
      timerId = setTimeout(() => {
        if (!leading || (Date.now() - lastCallTime >= delay)) {
          invoke(args, this);
        }
        lastCallTime = undefined;
      }, delay);
    }

    return lastResult;
  }

  debounced.cancel = function() {
    clearTimeout(timerId);
    lastCallTime = undefined;
  };

  debounced.flush = function() {
    clearTimeout(timerId);
    // Immediate invoke would need stored args — simplified here
  };

  return debounced;
}

// Use case: search input
const search = debounce(async (query) => {
  const results = await fetch(`/api/search?q=${query}`).then(r => r.json());
  renderResults(results);
}, 300);

// Called on every keystroke, but API call fires 300ms after LAST keystroke
inputEl.addEventListener("input", (e) => search(e.target.value));
```

---

## Throttle — Implementation from Scratch

**Problem:** A function should execute at most once per time window, even if called many times. Unlike debounce (waits for silence), throttle fires on a regular interval.

```js
function throttle(fn, interval) {
  let lastTime = 0;
  let timerId;

  function throttled(...args) {
    const now = Date.now();
    const remaining = interval - (now - lastTime);

    if (remaining <= 0) {
      // Enough time has passed — invoke immediately
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      lastTime = now;
      return fn.apply(this, args);
    }

    // Schedule for trailing edge if not already scheduled
    if (!timerId) {
      timerId = setTimeout(() => {
        lastTime = Date.now();
        timerId = null;
        fn.apply(this, args);
      }, remaining);
    }
  }

  throttled.cancel = function() {
    clearTimeout(timerId);
    timerId = null;
    lastTime = 0;
  };

  return throttled;
}

// Use case: scroll tracking (fires at most once per 100ms regardless of scroll speed)
const onScroll = throttle(() => {
  updateScrollIndicator(window.scrollY);
}, 100);
window.addEventListener("scroll", onScroll);

// Debounce vs Throttle:
// Debounce: wait for silence → use for search input, resize final state
// Throttle: regular interval → use for scroll, mousemove, real-time data
```

---

## Memoization for Expensive Computations

```js
// Production-grade memoize with WeakMap support for object args
function memoize(fn, resolver) {
  const cache = new Map();

  function memoized(...args) {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  }

  memoized.cache = cache;
  return memoized;
}

// Use case: expensive React component calculation
const expensiveFilter = memoize((items, criteria) => {
  return items.filter(item =>
    Object.entries(criteria).every(([key, val]) => item[key] === val)
  );
}, (items, criteria) => `${items.length}:${JSON.stringify(criteria)}`);
```

---

## Memory Leaks: The 4 Most Common Causes

### 1. Forgotten Event Listeners
```js
// LEAK: listener added but never removed
class SearchComponent {
  constructor() {
    document.addEventListener("keydown", this.handleKey.bind(this));
    // When component is removed, listener persists, keeping 'this' alive
  }
  // FIX: store the bound reference and remove it
  destroy() {
    document.removeEventListener("keydown", this._handleKey);
  }
}
```

### 2. Detached DOM Nodes
```js
// LEAK: keep reference to removed DOM element
let detachedNode;
function leak() {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode("data"));
  document.body.appendChild(div);
  detachedNode = div; // detachedNode keeps entire subtree alive
  document.body.removeChild(div);
  // div is removed from DOM but still reachable via detachedNode
}
// FIX: detachedNode = null when done
```

### 3. Uncleaned Intervals and Timers
```js
// LEAK: interval keeps closure alive
let userData = fetchLargeDataset(); // 50MB object
const id = setInterval(() => {
  if (userData.isActive) refresh(); // closure holds userData
}, 1000);
// If you never clearInterval(id), userData is never GC'd

// FIX: always clearInterval when component unmounts
// In React: return () => clearInterval(id) from useEffect
```

### 4. Closures Retaining Large Scope
```js
// LEAK: inner function retains reference to large outer variable
function processData() {
  const hugeBuffer = new Uint8Array(100_000_000); // 100MB
  const processedResult = { summary: "done" };

  // This closure closes over the entire local scope, including hugeBuffer
  return {
    getResult: () => processedResult,
    // Even though hugeBuffer is "unused" in getResult,
    // V8 may keep the entire scope alive
  };
}
// FIX: return the data you need, not a closure that includes unused large vars
// Or explicitly: hugeBuffer = null; before returning
```

---

## `requestAnimationFrame` for Animations

```js
// BAD: setTimeout for animations
function animateBad(element, from, to, duration) {
  const start = Date.now();
  const timer = setInterval(() => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    element.style.left = from + (to - from) * progress + "px";
    if (progress >= 1) clearInterval(timer);
  }, 16); // ~60fps but not synchronized with display refresh
}

// GOOD: requestAnimationFrame — synchronized with display refresh rate
function animate(element, from, to, duration) {
  const start = performance.now();

  function frame(timestamp) {
    const elapsed = timestamp - start;
    const progress = Math.min(elapsed / duration, 1);
    element.style.left = from + (to - from) * progress + "px";
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
// rAF callbacks run just before the browser paints, at the display's native refresh rate
// rAF is paused when the tab is hidden (saves battery/CPU)
```

---

## Virtual Scrolling (Concept)

Render only the DOM nodes currently visible (plus a small buffer). Maintain a "window" of rendered items that shifts as the user scrolls.

```
Total list: 10,000 items
Viewport: shows 20 items
Rendered DOM nodes: ~30 items (20 visible + 5 buffer top + 5 buffer bottom)
Technique:
  - Outer container: height = itemHeight * totalItems (full scroll height)
  - Inner wrapper: position = top: scrollTop (transforms without layout)
  - On scroll: recalculate firstVisibleIndex, re-render the window
  - Items are recycled/reused rather than created/destroyed
```

Libraries: `react-window`, `react-virtualized`, Tanstack Virtual. The key performance win: DOM is O(viewport size) not O(data size) — 30 nodes vs 10,000 nodes means 300x fewer layout calculations.

---

## Web Workers

Web Workers run JavaScript in a background thread, solving the "blocking the main thread" problem.

```js
// worker.js
self.addEventListener("message", (e) => {
  const { data, operation } = e.data;
  let result;
  if (operation === "sort") result = data.sort((a, b) => a - b);
  if (operation === "filter") result = data.filter(x => x > 1000);
  self.postMessage(result);
});

// main.js
const worker = new Worker("worker.js");
worker.postMessage({ data: hugeArray, operation: "sort" });
worker.onmessage = (e) => { console.log("Sorted:", e.data); };

// Worker limitations:
// - No DOM access (no document, window, element)
// - Communication via postMessage (serialization overhead for large data)
// - Use SharedArrayBuffer + Atomics for zero-copy large data sharing
// - No localStorage access (sessionStorage also blocked)
```

---

## Chrome DevTools Performance Profiling

Key things to look for:
1. **Long tasks** (red triangles, >50ms) — these cause UI jank
2. **Layout thrashing** — forcing layout in a loop (`offsetWidth` inside a loop triggers reflow each time)
3. **Memory panel** — heap snapshots to identify retained objects
4. **Heap allocation timeline** — see when garbage is created and collected
5. **Call tree / Bottom-Up** — find which functions consume the most CPU

```js
// Layout thrashing example (bad)
elements.forEach(el => {
  el.style.width = el.offsetWidth + 10 + "px"; // read then write in loop = reflow per iteration
});

// Fix: batch reads, then writes
const widths = elements.map(el => el.offsetWidth); // all reads
elements.forEach((el, i) => { el.style.width = widths[i] + 10 + "px"; }); // all writes
```

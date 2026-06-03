# Day 09 – JS Performance Optimization: Interview Q&A

---

**Q1: What is the difference between debounce and throttle? Give a use case for each.**

Debounce delays execution until the function has not been called for a specified duration — it waits for silence. If calls keep coming, the timer resets and the function never fires until there's a pause. Throttle limits execution to at most once per interval — it fires on a regular cadence regardless of how often the function is called. Use debounce for: search input (fire API call only after user stops typing), window resize handler (recalculate layout only after resizing is done), form auto-save (save only after user pauses). Use throttle for: scroll event handlers (update UI position at 60fps, not on every pixel of scroll), mouse tracking (record cursor position at 100ms intervals), rate-limiting API requests in real-time features (live collaborative editing). The key mental model: debounce = "wait for silence," throttle = "fire on a clock."

---

**Q2: Name four common causes of JavaScript memory leaks.**

(1) Forgotten event listeners — attaching a listener with `.bind(this)` creates a new function reference each time; you can't remove it without storing the reference, so the listener (and its closure) persists after the element is gone. (2) Detached DOM nodes — keeping a JavaScript reference to a DOM element after it's been removed from the document prevents GC of the entire subtree. (3) Uncleaned intervals and timers — `setInterval` callbacks keep their closure alive indefinitely. In React, failing to `clearInterval` in `useEffect`'s cleanup causes one interval per mount to accumulate. (4) Closures retaining large outer scopes — an inner function that could theoretically access a large variable in the outer scope may prevent that variable from being GC'd, even if the inner function never actually uses it. A fifth common one: growing caches without eviction — unbounded Maps or objects used as caches grow indefinitely. Always implement LRU eviction or TTL for caches.

---

**Q3: What is `requestAnimationFrame` and why prefer it over `setTimeout` for animations?**

`requestAnimationFrame` (rAF) schedules a callback to run just before the browser's next paint, synchronized with the display's refresh rate (typically 60fps = ~16.7ms intervals). Three advantages over `setTimeout`: (1) Synchronization — rAF callbacks fire at the exact moment the browser is about to paint, preventing sub-frame updates or wasted updates on frames the browser skips. `setTimeout(fn, 16)` will drift and may fire mid-frame. (2) Tab visibility — rAF automatically pauses when the tab is in the background, saving CPU and battery. `setTimeout` keeps firing regardless. (3) Optimized by the browser — the browser can batch and optimize rAF callbacks, for instance skipping frames when the system is under load. For animations, always use rAF and `performance.now()` (not `Date.now()`) for timestamps — `performance.now()` has sub-millisecond precision and is monotonic.

---

**Q4: How does virtual scrolling work and when should you implement it?**

Virtual scrolling renders only the DOM nodes currently visible in the viewport (plus a small buffer), rather than creating a DOM node for every item in the list. Implementation: an outer container has a fixed height matching the full scroll area (`totalItems * itemHeight`), so the scrollbar reflects the real list size. An inner container is absolutely positioned at `top: firstVisibleIndex * itemHeight`. As the user scrolls, you recalculate which items are visible, update the inner container's position, and replace the rendered DOM nodes with the new visible slice. Implement when: list has more than ~200-500 items (benchmark for your target device), items have consistent height (variable height is possible but significantly more complex), and the list is the performance bottleneck. Use `react-window` or `tanstack-virtual` in production rather than implementing from scratch — the edge cases (keyboard navigation, accessibility, variable heights) are substantial.

---

**Q5: What can Web Workers not do?**

Web Workers run in a separate thread with no access to: the DOM (no `document`, `window`, `element`), the main thread's global scope, `localStorage` and `sessionStorage`, or most browser APIs. Communication with the main thread is via `postMessage`, which uses structured cloning — data is serialized and deserialized (a performance cost for large objects). They cannot be used for UI manipulation, only for CPU-heavy computation: sorting large arrays, image processing, cryptography, data parsing, complex calculations. Use Web Workers when a computation exceeds ~50ms and blocks the main thread. Share large data without copying using `SharedArrayBuffer` (requires proper COOP/COEP headers) and `Atomics` for synchronization. In Node.js, `worker_threads` is the equivalent, with the addition of shared memory via `SharedArrayBuffer`.

---

**Q6: What is layout thrashing and how do you prevent it?**

Layout thrashing occurs when JavaScript forces the browser to recalculate layout (reflow) multiple times in rapid succession by interleaving reads and writes of layout properties. When you read a layout property (`offsetWidth`, `getBoundingClientRect`, `scrollTop`) after writing style properties, the browser must flush its pending style/layout changes to give you an accurate reading — triggering a synchronous reflow. If you do this in a loop, you get one reflow per iteration instead of one total. Prevention: batch all reads first, then all writes. Use `requestAnimationFrame` to schedule writes at the right point in the rendering pipeline. Libraries like `fastdom` provide a scheduled read/write queue. `transform` and `opacity` are "cheap" properties that don't trigger layout and run on the compositor thread — use them for animations instead of `top`/`left`/`width`/`height`.

---

**Q7: How would you profile a JavaScript performance issue in a real application?**

Start with the Performance tab in Chrome DevTools: record a session during the slow behavior, then examine the flame chart. Look for long tasks (>50ms, flagged with red triangles), which cause jank. The Bottom-Up view identifies the functions consuming the most CPU time. For memory issues, use the Memory tab: take a heap snapshot before and after an action to identify retained objects. The allocation timeline shows when objects are created and whether they're GC'd. Network tab for waterfall analysis of resource loading. Lighthouse for a holistic performance score with actionable recommendations. In Node.js, use `--prof` flag to generate a V8 profile, then analyze with `node --prof-process`. Key metrics to track: FCP (First Contentful Paint), LCP (Largest Contentful Paint), TTI (Time to Interactive), TBT (Total Blocking Time), CLS (Cumulative Layout Shift) — these are Core Web Vitals that directly impact user experience and SEO.

---

**Q8: What is the difference between paint and layout in the browser rendering pipeline?**

The browser rendering pipeline (critical rendering path): JavaScript → Style → Layout → Paint → Composite. Layout (reflow) calculates the geometry of every element — position, size, how they affect each other. This is expensive and affects the whole document. Paint creates the actual pixels for each layer. Composite combines layers in the right order. Not every property change triggers the full pipeline: `width`/`height`/`margin`/`padding`/`position` → triggers layout + paint + composite (most expensive). `color`/`background-color`/`border-color` → skip layout, trigger paint + composite. `transform`/`opacity` → skip layout + paint, only composite (cheapest — runs on the GPU compositor thread, doesn't block main thread). For 60fps animations, you want changes that only trigger composite — use `transform: translateX()` instead of `left:`, `transform: scale()` instead of `width:`. The `will-change` CSS property hints to the browser to promote an element to its own layer for composite-only updates.

# Day 05 – Event Loop & Microtasks: Interview Q&A

---

**Q1: Describe the JavaScript runtime architecture.**

The V8 engine provides the call stack (where execution contexts live) and the heap (where objects are allocated). The runtime environment — browser or Node.js — adds Web APIs (or Node APIs) that handle async operations: `setTimeout`, `fetch`, DOM events, file I/O. When an async operation completes, its callback is placed in a queue. The event loop's job is to continuously monitor the call stack and queues, moving callbacks onto the call stack when it's empty. There are two queues: the microtask queue (Promises, `queueMicrotask`) and the macrotask queue (setTimeout, setInterval, I/O callbacks). The loop drains the entire microtask queue after every macrotask (and after all synchronous code), before picking the next macrotask.

---

**Q2: What is the exact event loop algorithm?**

The event loop runs continuously: (1) Execute all synchronous code — drain the call stack completely. (2) Drain the entire microtask queue: run all pending Promise `.then`/`.catch`/`.finally` callbacks and `queueMicrotask` callbacks. If any microtask adds more microtasks, those also run before moving on — the queue keeps draining until empty. (3) In browsers, check if a render update is needed (layout, paint) and if so, perform it. (4) Take exactly one macrotask from the macrotask queue (one setTimeout callback, one click event handler, etc.) and execute it. (5) Go back to step 2. This means microtasks always execute before the next macrotask and before any render — giving them very low latency but also the ability to starve the event loop if they run indefinitely.

---

**Q3: Why does `Promise.then` run before `setTimeout(fn, 0)`?**

`setTimeout(fn, 0)` places `fn` in the macrotask queue, meaning it runs in a future event loop iteration. `Promise.then` places its callback in the microtask queue, which is drained completely after the current synchronous code finishes and before the event loop picks up any macrotask. So even if the `setTimeout` was registered before the Promise resolved, the Promise callback executes first because of queue priority. This design choice enables Promise chains to complete without yielding to other pending tasks — essential for correctness (you don't want a click handler to fire between two `.then` steps of a database transaction).

---

**Q4: What is `process.nextTick` and how does it differ from `Promise.then`?**

`process.nextTick` is a Node.js-specific mechanism that queues a callback to run at the end of the current operation, before the event loop continues. It has its own "nextTick queue" that Node.js processes BEFORE the microtask queue (before Promise `.then` callbacks). This means `process.nextTick` callbacks run before any Promise callbacks, even if the Promise was resolved first. This priority makes `nextTick` useful for operations that must complete before any I/O or timers (like ensuring error callbacks run before continuing), but it's also a footgun — overusing it can starve all other async operations, including Promises. The Node.js docs recommend using `Promise.resolve()` / `queueMicrotask()` instead of `nextTick` for most use cases.

---

**Q5: Can the event loop be blocked? What causes it?**

Yes — any synchronous code on the call stack blocks the event loop. Long-running synchronous operations (heavy computation, synchronous file reads via `fs.readFileSync`, large JSON parsing) prevent the event loop from processing any callbacks, timers, or events until the stack clears. In browsers, this causes UI freeze — no clicks, no renders, nothing responds. Common causes: (1) Large array operations in one go (sorting millions of items). (2) Synchronous regex on large strings with catastrophic backtracking. (3) Deep recursive algorithms without chunking. Solutions: break work into smaller chunks using `setTimeout(fn, 0)` or `setImmediate`, use Web Workers (browser) or `worker_threads` (Node) for CPU-heavy tasks, or use `requestIdleCallback` for non-critical background work.

---

**Q6: What is the difference between `setImmediate` and `setTimeout(fn, 0)` in Node.js?**

Both schedule a callback as a macrotask, but they correspond to different phases of Node.js's event loop (which uses libuv). `setTimeout(fn, 0)` is placed in the "timers" phase, which runs before I/O callbacks. `setImmediate` is placed in the "check" phase, which runs after I/O callbacks. When neither is called inside an I/O callback, the order between them is non-deterministic due to OS timer resolution — sometimes `setTimeout` fires first, sometimes `setImmediate`. However, when both are called inside an I/O callback (e.g., inside `fs.readFile`), `setImmediate` is always guaranteed to run before `setTimeout`. For most real-world use cases, `setImmediate` is preferred over `setTimeout(fn, 0)` in Node.js when you want "run after current I/O."

---

**Q7: How do microtasks interact with async/await?**

Every `await` expression suspends the async function and schedules the continuation as a microtask. `await expr` is roughly equivalent to `Promise.resolve(expr).then(continuation)`. This means: all code before the first `await` in an async function runs synchronously. After the first `await`, the function's continuation is in the microtask queue. Multiple awaits in the same function each create a new microtask turn — other microtasks queued between those turns can interleave. This is why two concurrent `async` functions appear to interleave at their `await` points. Understanding this is essential for predicting output in async code interviews and for correctly reasoning about race conditions in state management.

---

**Q8: What is microtask starvation and how do you prevent it?**

Microtask starvation occurs when the microtask queue is never emptied because each microtask adds another microtask before completing. Since the event loop only proceeds to macrotasks (and renders) after the microtask queue is fully drained, an infinite microtask chain blocks all macrotask processing indefinitely — UI freezes, timers never fire, I/O callbacks never run. Prevention: never create unbounded recursive Promise chains (`Promise.resolve().then(fn)` where `fn` calls itself). If you need to do iterative async work, use macrotasks (`setTimeout`/`setImmediate`) to yield to the event loop between iterations. `requestAnimationFrame` in browsers serves a similar purpose for animation work — it runs before render but after all current microtasks, at a natural 60fps cadence.

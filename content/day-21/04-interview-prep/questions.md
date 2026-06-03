# Day 21 — Node.js Internals: Interview Q&A

---

**Q1. Explain the Node.js event loop phases in order.**

The event loop has 6 phases: (1) **Timers** — runs `setTimeout`/`setInterval` callbacks whose threshold has passed. (2) **Pending I/O** — deferred I/O error callbacks from the previous iteration. (3) **Idle/Prepare** — internal libuv use only. (4) **Poll** — fetches new I/O events and executes their callbacks; blocks here if no timers/immediates are pending. (5) **Check** — runs `setImmediate` callbacks. (6) **Close callbacks** — cleanup handlers like `socket.on('close')`. Between *every* phase transition, the nextTick queue and microtask (Promise) queue are fully drained.

---

**Q2. What is `process.nextTick` and why should you be careful with it?**

`process.nextTick` schedules a callback to run after the current synchronous operation completes but before the event loop advances to its next phase — or even before microtasks (Promises). It's not part of the event loop phases at all; it has its own queue that drains at every inter-phase boundary. The danger: recursive `nextTick` calls cause **starvation** — the event loop never progresses, so I/O callbacks, timers, and incoming HTTP requests are never processed. Use `setImmediate` when you need to yield control back to I/O between recursive calls. `nextTick` is appropriate for error propagation patterns and ensuring a callback fires after object initialization completes.

---

**Q3. When would you use Worker Threads vs `child_process`?**

Use **Worker Threads** for CPU-intensive JavaScript work where you want shared memory (`SharedArrayBuffer`) and low inter-thread communication overhead — image processing, JSON parsing of huge payloads, cryptographic work. Workers share the same process, so `require` cache and environment are inherited. Use **`child_process`** (specifically `fork`) when you need full process isolation, different memory limits, or want to use a different Node.js version/script. Use `spawn` for wrapping non-Node external binaries with streaming I/O. Worker Threads have ~1ms startup vs ~50ms for a new process. For a web server's per-request CPU work, a pre-created worker pool (e.g., `piscina` library) eliminates startup cost entirely.

---

**Q4. What happens when you call a synchronous `fs` function in a production Node.js server?**

A synchronous `fs` call (e.g., `fs.readFileSync`) blocks the entire event loop thread for the duration of the disk I/O — which can be milliseconds to seconds. During that time, **no other requests can be processed**, no timers fire, no health check endpoints respond. Under load, a single slow disk read can cascade: all concurrent requests queue behind it, latency spikes, and under high traffic the process becomes unresponsive. Under load testing you'd see p99 latency shoot up. The fix is always to use the async APIs (`fs.promises.readFile`) or streams. The only acceptable use of sync fs is in startup scripts before the server begins accepting connections.

---

**Q5. What is the libuv thread pool and what operations use it?**

libuv maintains a thread pool (default 4 threads, configurable via `UV_THREADPOOL_SIZE` up to 1024) for OS operations that lack native async interfaces. The thread pool handles: most **filesystem operations** (`fs.readFile`, `fs.stat`, etc.), **DNS resolution** via `dns.lookup`, **crypto operations** (`pbkdf2`, `scrypt`, `randomBytes`), and **zlib** compression. Network I/O (TCP/UDP) does NOT use the thread pool — it uses the OS's async event notification (epoll/kqueue/IOCP) directly. If your app does heavy parallel crypto or file I/O, increase `UV_THREADPOOL_SIZE`. A common production mistake: running 100 concurrent `bcrypt` operations with the default 4-thread pool creates a 96-operation queue.

---

**Q6. How does Node.js handle concurrent requests if it's single-threaded?**

Node.js achieves concurrency through **non-blocking I/O and the event loop**, not through parallelism. When a request arrives and triggers a database query, Node delegates the query to libuv (which either uses the OS async interface or the thread pool), then immediately returns to the event loop to handle the next incoming request. When the DB responds, the callback is queued and executed. This is the **reactor pattern** — one thread handles thousands of concurrent connections because it never blocks; it just registers callbacks and moves on. CPU-bound work breaks this model because it monopolizes the single thread. The concurrency model is I/O-bound scalability, not CPU parallelism.

---

**Q7. What is the difference between `setImmediate` and `setTimeout(fn, 0)`?**

Both schedule a callback "soon," but they run in different phases. `setTimeout(fn, 0)` (actually minimum 1ms) runs in the **timers phase** of the next loop iteration, if its threshold has passed. `setImmediate` always runs in the **check phase**, which comes after the poll phase in the same iteration. Inside an I/O callback, `setImmediate` **always fires before `setTimeout(fn, 0)`** because the check phase precedes the timers phase in the next iteration. Outside I/O, the order is **non-deterministic** because it depends on whether the 1ms timer threshold has elapsed by the time the event loop starts. For guaranteed post-I/O execution, use `setImmediate`. Use `setTimeout(fn, 0)` only when you specifically want timer semantics.

---

**Q8. How would you profile a Node.js application to find an event loop blocker?**

Multiple approaches exist: (1) **`clinic.js doctor`** — wraps the app and generates a visual flamechart showing event loop lag over time. (2) **`--prof` flag + `node --prof-process`** — V8's built-in CPU profiler generates a tick-based profile; process the isolate log to find hot functions. (3) **`perf_hooks` module** — `performance.eventLoopUtilization()` gives a ratio of busy vs idle time; values above 0.85 indicate saturation. (4) **`async_hooks`** — track the time between async operation registration and callback execution to find slow operations. (5) **`0x`** — generates interactive flamecharts from V8 profiler output. In production, the Clinic.js suite or the `--inspect` flag with Chrome DevTools timeline gives the most actionable data. Look for long synchronous blocks in the flamechart (wide flat bars at the top of the call stack).

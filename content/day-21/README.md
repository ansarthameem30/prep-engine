# Day 21 – Node.js Internals: Event Loop & libuv Architecture | DSA: Recursion

> **Phase 3 – Node.js + MySQL + MongoDB** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Event loop phases, libuv, Worker threads, child_process |
| Hands-On | 00:40–01:10 | Build a CPU-bound vs I/O-bound benchmark + Worker thread demo |
| DSA | 01:10–01:25 | Fibonacci variants + Power function (recursion) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Diagram all 6 event loop phases and what runs in each
- [ ] Explain libuv's role in Node.js I/O handling
- [ ] Differentiate Worker threads, cluster, and child_process with use cases
- [ ] Solve: Fibonacci with memoization + Power function (fast exponentiation)
- [ ] Review 5 interview questions for Node.js internals

---

## Concept: Node.js Internals

### What to Study
- **Event loop phases in order:** timers (setTimeout/setInterval) → pending callbacks (I/O errors) → idle/prepare (internal) → poll (retrieve new I/O, block if queue empty) → check (setImmediate) → close callbacks (socket.destroy())
- **Microtask queue priority:** `process.nextTick()` runs before any phase transition; `Promise.then()` runs after nextTick but before the next phase — both drain completely before the loop advances
- **libuv architecture:** Thread pool (default 4 threads, UV_THREADPOOL_SIZE up to 128) handles file system, DNS lookup, crypto — NOT TCP/UDP which uses OS async primitives (epoll/kqueue/IOCP)
- **Concurrency models:** `cluster` forks OS processes sharing a port via IPC (stateless scale-out), `worker_threads` share memory via SharedArrayBuffer (CPU-bound work), `child_process.fork/exec/spawn` for subprocesses

### Key Mental Models
- The event loop is single-threaded for JS execution, but libuv uses a thread pool for blocking I/O — so Node.js is "non-blocking" from your code's perspective, not from the OS's
- `process.nextTick()` is a "cut in line" mechanism — overuse starves I/O; use it sparingly for deferred synchronous-like callbacks
- Worker threads are NOT like browser Web Workers — they can share memory but have their own V8 instance and event loop

### Why This Matters in Interviews
Senior engineers are expected to diagnose Node.js performance issues — event loop blocking, libuv thread pool saturation (heavy crypto or fs work), and memory leaks from listeners. Interviewers test whether you understand why Node.js is fast for I/O but terrible for CPU-bound work without workers, and whether you can choose the right concurrency primitive for a given scenario.

---

## DSA Focus: Recursion – Fibonacci & Fast Power

- **Problem:** Fibonacci Number (LeetCode #509) + Power(x, n) (LeetCode #50)
- **Difficulty:** Easy / Medium
- **Pattern:** Recursion with memoization, divide & conquer recursion
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Memoized Fibonacci caches overlapping subproblems turning O(2^n) into O(n); fast power uses `pow(x, n/2) * pow(x, n/2)` to get O(log n) — recognize the "halving" pattern

---

## Today's 5 Interview Questions (Flash Review)
1. What are the 6 phases of the Node.js event loop and what runs in each phase?
2. Why does `process.nextTick()` fire before a resolved `Promise.then()`?
3. When would you use `worker_threads` vs `cluster` vs `child_process`?
4. What is libuv's thread pool used for, and how can it become a bottleneck?
5. How does Node.js handle thousands of concurrent connections without blocking if it's single-threaded?

---

## Files in This Folder
- `01-concept/` → Read: Node.js event loop docs, libuv architecture diagram, nodejs.org/en/docs/guides/event-loop-timers-and-nexttick
- `02-hands-on/` → Code: CPU-bound blocking demo, Worker thread offload, cluster fork example, setImmediate vs setTimeout ordering tests
- `03-dsa/` → DSA: fibonacci-memo.js (memoized + iterative), power-function.js (fast exponentiation)
- `04-interview-prep/` → Full Q&A: 5 questions with detailed answers on Node.js event loop internals

---

## Success Criteria
- [ ] Can draw the event loop phases from memory and explain what callbacks land where
- [ ] Solved both DSA problems in < 20 minutes
- [ ] Confident answering all 5 interview questions
- [ ] Bonus: Implement a Worker thread pool that handles N concurrent tasks without blocking the main thread

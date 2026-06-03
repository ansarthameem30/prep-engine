# Node.js Internals: Event Loop Phases + libuv

## Runtime Architecture

Node.js is not just a JavaScript runtime — it is a carefully orchestrated system of three major components working in concert:

**V8** is Google's JavaScript engine, responsible for parsing, compiling, and executing JavaScript code. V8 compiles JS to machine code via JIT compilation, uses hidden classes for object optimization, and handles garbage collection. Everything that is pure JavaScript execution — function calls, arithmetic, object creation — lives here.

**libuv** is a C library originally written for Node.js, now used by other runtimes too. It provides the event loop implementation, the thread pool for offloading blocking operations, and cross-platform abstractions for filesystem, networking, DNS, child processes, timers, and signals. The event loop you hear about in Node.js interviews is libuv's event loop, not V8's.

**Node.js bindings** are C++ modules that bridge the two worlds. When you call `fs.readFile()`, the JavaScript layer calls into Node's C++ binding, which calls into libuv, which uses the OS's async I/O APIs (epoll on Linux, kqueue on macOS, IOCP on Windows).

```
Your JS Code
     ↓
  V8 Engine (JS execution)
     ↓
Node.js Bindings (C++)
     ↓
  libuv (event loop, thread pool, I/O)
     ↓
  OS (epoll / kqueue / IOCP)
```

---

## The 6 Event Loop Phases

When Node.js starts, it initializes the event loop and starts processing the input script. The event loop runs in a cycle through six phases. Each phase has a FIFO queue of callbacks to execute. The loop moves to the next phase once the queue is exhausted OR a configurable maximum number of callbacks has been processed.

### Phase 1: Timers

Executes callbacks scheduled by `setTimeout()` and `setInterval()`. The timer checks if the delay threshold has passed. The threshold is the *minimum* delay — actual execution may happen later depending on what else is running. A `setTimeout(fn, 0)` is actually `setTimeout(fn, 1)` under the hood (minimum 1ms).

### Phase 2: Pending I/O Callbacks

Executes I/O callbacks deferred to the next loop iteration. These are error callbacks from I/O operations like TCP errors from a previous iteration. Most I/O callbacks execute in the poll phase; this phase handles the overflow.

### Phase 3: Idle / Prepare

Internal use only by libuv. `setImmediate`'s internal preparation happens here. You cannot hook into this phase from userland JavaScript.

### Phase 4: Poll

This is the heart of the event loop. It has two functions:

1. **Calculates how long to block and poll for I/O** — if there are timers scheduled, it calculates when the earliest one fires and blocks at most that long.
2. **Processes events in the poll queue** — incoming connections, data reads, etc.

If the poll queue is empty, it checks for `setImmediate` callbacks. If any exist, the loop moves to the check phase immediately. If there are no `setImmediate` calls, the loop waits here for callbacks to be added to the queue (blocking I/O wait).

If the poll queue is *not* empty, the loop iterates through callbacks synchronously until the queue is empty or the system-dependent callback limit is reached.

### Phase 5: Check (setImmediate)

`setImmediate` callbacks execute here. `setImmediate` was specifically designed to run after the poll phase completes, letting you execute code after I/O callbacks but before timers.

### Phase 6: Close Callbacks

Handles cleanup callbacks — `socket.on('close', ...)`, `process.on('exit', ...)`. If a socket or handle is closed abruptly, the close event fires here.

---

## process.nextTick — Runs Between Phases

`process.nextTick` is NOT part of the event loop phases. Its callbacks go into the **nextTick queue**, which is processed after the current operation completes and before the event loop moves to the next phase (or even before moving between sub-phases in some cases).

```javascript
console.log('1: synchronous');

process.nextTick(() => console.log('2: nextTick'));

Promise.resolve().then(() => console.log('3: microtask'));

setTimeout(() => console.log('4: setTimeout'), 0);

setImmediate(() => console.log('5: setImmediate'));

console.log('6: synchronous end');

// Output:
// 1: synchronous
// 6: synchronous end
// 2: nextTick          ← nextTick queue drains first
// 3: microtask         ← microtask queue (Promise) drains next
// 4: setTimeout        ← timers phase
// 5: setImmediate      ← check phase
```

**nextTick starvation**: If you call `process.nextTick` recursively, you will starve the event loop — no I/O, no timers, nothing will execute until the nextTick queue is empty.

```javascript
// DANGER: this blocks the event loop forever
function infiniteNextTick() {
  process.nextTick(infiniteNextTick);
}
infiniteNextTick(); // I/O and timers never run
```

Use `setImmediate` when you want to yield to I/O between recursive calls.

---

## setImmediate vs setTimeout(fn, 0) — The Non-Determinism

Outside an I/O callback, the order is non-deterministic because it depends on process performance:

```javascript
// Outside I/O — order is NON-DETERMINISTIC
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
// Could print either order
```

Inside an I/O callback, `setImmediate` always runs first — the check phase comes before the next timer phase:

```javascript
const fs = require('fs');
fs.readFile('/etc/hostname', () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
  // ALWAYS: immediate → timeout
});
```

---

## Worker Threads

Node.js is single-threaded for JavaScript execution, but it has `worker_threads` for CPU-intensive work that would block the event loop. Workers share memory via `SharedArrayBuffer` and communicate via message passing.

```javascript
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  const worker = new Worker(__filename, { workerData: { n: 40 } });
  worker.on('message', result => console.log(`fibonacci(40) = ${result}`));
  worker.on('error', err => console.error(err));
} else {
  function fib(n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
  }
  parentPort.postMessage(fib(workerData.n));
}
```

**When to use Worker Threads:**
- CPU-bound computation (image processing, video encoding, crypto)
- Large dataset transformations
- Anything that takes >10ms of pure CPU time

**When NOT to use Workers:**
- I/O operations — use async APIs instead (libuv handles concurrency via thread pool)
- Simple data transformations — async + event loop handles this fine

---

## Child Process: exec vs spawn vs fork

```javascript
const { exec, spawn, fork } = require('child_process');

// exec: buffers output, for short-lived commands, shell injection risk
exec('ls -la', (err, stdout, stderr) => {
  console.log(stdout); // entire output in memory
});

// spawn: streaming output, no shell by default, for long-running processes
const ls = spawn('ls', ['-la']);
ls.stdout.on('data', chunk => process.stdout.write(chunk));

// fork: specialized spawn for Node.js scripts, built-in IPC channel
const child = fork('./worker.js');
child.send({ task: 'compute' });
child.on('message', result => console.log(result));
```

- **exec**: shell=true, buffered, callback-style. Use for short commands where you need the full output.
- **spawn**: no shell, streaming, no buffer limit. Use for long-running external processes.
- **fork**: creates a Node.js child process with IPC channel (`process.send`/`process.on('message')`). Use for multi-process Node.js apps.

---

## libuv Thread Pool

libuv maintains a thread pool (default: 4 threads) for operations that don't have native async OS support:

- `fs` operations (most filesystem calls)
- DNS resolution (`dns.lookup`)
- Crypto (`crypto.pbkdf2`, `crypto.randomBytes`, `crypto.scrypt`)
- `zlib` compression

```bash
# Increase thread pool size (set before process starts)
UV_THREADPOOL_SIZE=16 node server.js
```

Operations that do NOT use the thread pool (use OS async APIs directly):
- Network I/O (TCP/UDP) — uses epoll/kqueue/IOCP
- Pipes and TTYs
- DNS via `dns.resolve()` (uses `c-ares` async library)

---

## Blocking the Event Loop — Common Mistakes

```javascript
// BAD: Blocks event loop during synchronous file read
app.get('/data', (req, res) => {
  const data = fs.readFileSync('/var/log/huge-file.log'); // blocks!
  res.send(data);
});

// GOOD: Non-blocking
app.get('/data', async (req, res) => {
  const data = await fs.promises.readFile('/var/log/huge-file.log');
  res.send(data);
});

// BAD: CPU-bound in main thread
app.get('/hash', (req, res) => {
  const result = expensiveComputation(); // blocks for 500ms
  res.send(result);
});

// GOOD: Offload to worker
app.get('/hash', async (req, res) => {
  const result = await runInWorker(expensiveComputation, args);
  res.send(result);
});
```

Other event loop blockers:
- JSON.parse/JSON.stringify on massive payloads
- Synchronous regex on large strings (catastrophic backtracking)
- Tight loops with millions of iterations
- Synchronous crypto operations on request path

# Event Loop & Microtasks

## JavaScript Runtime Architecture

The "JavaScript engine" (V8) only provides the call stack and heap. The full runtime for browser/Node adds:

```
┌─────────────────────────────────────────────────────────────┐
│                        JS Runtime                            │
│                                                              │
│  ┌──────────────┐    ┌─────────────────────────────────┐   │
│  │  Call Stack   │    │           Web APIs / Node APIs  │   │
│  │               │    │  (setTimeout, fetch, fs.read,   │   │
│  │  [executing]  │    │   DOM events, setInterval...)   │   │
│  └──────────────┘    └─────────────────────────────────┘   │
│                                        │                     │
│  ┌──────────────┐    ┌─────────────────▼─────────────────┐ │
│  │     Heap     │    │  ┌─────────────────────────────┐   │ │
│  │  (objects)   │    │  │  Microtask Queue             │   │ │
│  │              │    │  │  (Promise.then, queueMicro)  │   │ │
│  └──────────────┘    │  └─────────────────────────────┘   │ │
│                       │  ┌─────────────────────────────┐   │ │
│                       │  │  Macrotask Queue (Task Queue) │   │ │
│                       │  │  (setTimeout, setInterval,   │   │ │
│                       │  │   I/O callbacks, UI events)  │   │ │
│                       │  └─────────────────────────────┘   │ │
│                       └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
              ▲                         │
              └─────── Event Loop ──────┘
```

---

## The Event Loop Algorithm (Step by Step)

```
while (true) {
  1. Execute all synchronous code (drain the call stack)
  2. Drain the ENTIRE microtask queue:
     a. Execute all Promise .then/.catch/.finally callbacks
     b. Execute all queueMicrotask() callbacks
     c. If new microtasks are added during this step, execute those too
        (microtasks keep running until the queue is EMPTY)
  3. [Browser only] Render if needed (layout, paint)
  4. Pick ONE macrotask from the macrotask queue and execute it
  5. Go back to step 2 (drain microtasks again after each macrotask)
}
```

The critical rule: **the entire microtask queue is drained before any macrotask runs, and before any render.**

---

## Microtasks vs Macrotasks

| | Microtasks | Macrotasks |
|---|---|---|
| Also called | Microtask queue, job queue | Task queue, callback queue, macrotask queue |
| What goes here | `Promise.then/catch/finally`, `queueMicrotask()`, `MutationObserver` | `setTimeout`, `setInterval`, `setImmediate` (Node), I/O callbacks, UI events, `MessageChannel` |
| When processed | After every synchronous code block, after EVERY macrotask | One per event loop iteration |
| Can add more? | Yes — new microtasks run before next macrotask | Yes — queued for next iteration |

```js
console.log("1");

setTimeout(() => console.log("2 - macrotask"), 0);

Promise.resolve()
  .then(() => console.log("3 - microtask"))
  .then(() => console.log("4 - microtask 2"));

console.log("5");

// Output order:
// 1  ← synchronous
// 5  ← synchronous
// 3  ← microtask (entire queue drained before any macrotask)
// 4  ← microtask added by the .then above (runs before setTimeout)
// 2  ← macrotask (setTimeout)
```

---

## Output Prediction: Key Scenarios

### Scenario 1: Promise constructor is synchronous
```js
console.log("start");

new Promise((resolve) => {
  console.log("promise body"); // synchronous! runs immediately
  resolve();
}).then(() => {
  console.log("then");
});

console.log("end");

// Output: start → promise body → end → then
// The executor function (the callback to `new Promise`) is synchronous.
// Only .then callbacks are async (microtasks).
```

### Scenario 2: async/await desugared
```js
async function foo() {
  console.log("foo start");
  await Promise.resolve();
  console.log("foo after await"); // microtask
}

console.log("before");
foo();
console.log("after");

// Output: before → foo start → after → foo after await
// Everything before the first await runs synchronously.
// Code after await resumes as a microtask.
```

### Scenario 3: Nested microtasks
```js
Promise.resolve()
  .then(() => {
    console.log("then 1");
    Promise.resolve().then(() => console.log("nested then"));
  })
  .then(() => console.log("then 2"));

// Output: then 1 → nested then → then 2
// After "then 1" runs, it adds "nested then" to microtask queue.
// "nested then" runs before "then 2" because the queue is drained fully.
```

---

## Node.js Specifics: `process.nextTick` and `setImmediate`

### `process.nextTick`
`process.nextTick` callbacks run before ANY other I/O events, timers, or even Promise microtasks in Node.js. It has its own queue (the "nextTick queue") that is processed before the microtask queue in Node's event loop.

```js
setImmediate(() => console.log("setImmediate"));
setTimeout(() => console.log("setTimeout"), 0);
Promise.resolve().then(() => console.log("Promise"));
process.nextTick(() => console.log("nextTick"));

// Node.js output:
// nextTick     ← nextTick queue, highest priority async
// Promise      ← microtask queue
// setTimeout   ← macrotask (order of setTimeout vs setImmediate is non-deterministic without I/O)
// setImmediate ← check phase of Node's event loop
```

### `setImmediate` vs `setTimeout(fn, 0)`
- `setImmediate` — scheduled in the "check" phase of the Node.js event loop (after I/O)
- `setTimeout(fn, 0)` — scheduled in the "timers" phase

Without an I/O callback context, the order between them is non-deterministic (OS timer resolution varies). Within an I/O callback, `setImmediate` always runs before `setTimeout`.

---

## Practical Implications for Performance

### Why long sync code blocks the UI
The event loop can't pick up new macrotasks (click events, rendering frames) while the call stack is busy. A 200ms synchronous computation = UI frozen for 200ms.

```js
// BAD: blocks event loop for ~500ms
function blockingWork() {
  const start = Date.now();
  while (Date.now() - start < 500) {} // busy wait
}

// BETTER: break into chunks using setTimeout
function chunkWork(items, index = 0) {
  const batchEnd = Math.min(index + 100, items.length);
  for (let i = index; i < batchEnd; i++) {
    process(items[i]);
  }
  if (batchEnd < items.length) {
    setTimeout(() => chunkWork(items, batchEnd), 0); // yield to event loop
  }
}

// BEST for CPU-heavy work: Web Workers (browser) or worker_threads (Node)
```

### Microtask starvation
If microtasks continuously enqueue more microtasks, macrotasks (including rendering and I/O) are starved:

```js
// Infinite microtask loop — NEVER use in production
function infiniteMicrotasks() {
  Promise.resolve().then(infiniteMicrotasks);
}
infiniteMicrotasks(); // UI freezes — macrotasks never run
```

/**
 * Day 05 – Event Loop Output Prediction Exercises
 *
 * INSTRUCTIONS:
 * For each exercise, write your predicted output as a comment BEFORE running.
 * Then run: node exercises.js
 * Compare your prediction to the actual output.
 * If wrong, trace through the event loop algorithm step by step to understand WHY.
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: Basic Microtask vs Macrotask Ordering
// ─────────────────────────────────────────────────────────────
// Predict the output:

console.log("=== Exercise 1 ===");

console.log("A");

setTimeout(() => console.log("B"), 0);

Promise.resolve().then(() => console.log("C"));

console.log("D");

/*
Your prediction:
  1:
  2:
  3:
  4:

Answer:
  A ← synchronous
  D ← synchronous
  C ← microtask (Promise.then drains before macrotask)
  B ← macrotask (setTimeout)
*/


// ─────────────────────────────────────────────────────────────
// Exercise 2: Promise Constructor is Synchronous
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 2 ===");

console.log("1");

new Promise((resolve) => {
  console.log("2"); // executor runs synchronously
  resolve();
  console.log("3"); // still synchronous, after resolve() call
}).then(() => {
  console.log("4"); // microtask
});

setTimeout(() => console.log("5"), 0); // macrotask

console.log("6");

/*
Prediction:
  1:
  2:
  3:
  4:
  5:
  6:

Answer: 1 → 2 → 3 → 6 → 4 → 5
  1: synchronous
  2: executor is synchronous
  3: still in executor, synchronous
  6: synchronous
  4: microtask (after all sync)
  5: macrotask (after all microtasks)
*/


// ─────────────────────────────────────────────────────────────
// Exercise 3: Nested Microtasks and Chained .then
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 3 ===");

setTimeout(() => console.log("timeout"), 0);

Promise.resolve()
  .then(() => {
    console.log("then 1");
    return Promise.resolve(); // nested promise
  })
  .then(() => console.log("then 2"))
  .then(() => console.log("then 3"));

Promise.resolve().then(() => console.log("separate chain"));

/*
Prediction:
  1:
  2:
  3:
  4:
  5:

Answer: then 1 → separate chain → then 2 → then 3 → timeout

TRICKY: `return Promise.resolve()` inside .then creates an EXTRA microtask turn
because the engine must wait for the returned promise to resolve before
enqueueing the next .then. This means "separate chain" runs before "then 2".

Step trace:
  Sync done.
  Microtask queue: [then1-callback, separate-chain-callback]
  Run then1-callback: logs "then 1", returns Promise.resolve()
    → resolution of returned promise = extra tick before next .then is queued
  Microtask queue: [separate-chain-callback, (resolution of inner promise)]
  Run separate-chain-callback: logs "separate chain"
  Microtask queue: [(resolve inner) → enqueue then2]
  Enqueue then2
  Microtask queue: [then2-callback]
  Run then2: logs "then 2" → enqueues then3
  Run then3: logs "then 3"
  Macrotask: timeout
*/


// ─────────────────────────────────────────────────────────────
// Exercise 4: async/await Desugaring
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 4 ===");

async function alpha() {
  console.log("alpha-1");
  await Promise.resolve();
  console.log("alpha-2");
  await Promise.resolve();
  console.log("alpha-3");
}

async function beta() {
  console.log("beta-1");
  await Promise.resolve();
  console.log("beta-2");
}

console.log("start");
alpha();
beta();
console.log("end");

/*
Prediction:
  1:
  2:
  3:
  4:
  5:
  6:
  7:

Answer: start → alpha-1 → beta-1 → end → alpha-2 → beta-2 → alpha-3

Trace:
  "start" (sync)
  alpha() called: runs sync until first await
    → logs "alpha-1", suspends
  beta() called: runs sync until first await
    → logs "beta-1", suspends
  "end" (sync)
  Microtask queue: [resume-alpha, resume-beta]
  resume-alpha: logs "alpha-2", hits second await, suspends
  Microtask queue: [resume-beta, resume-alpha-again]
  resume-beta: logs "beta-2", returns
  Microtask queue: [resume-alpha-again]
  resume-alpha: logs "alpha-3"
*/


// ─────────────────────────────────────────────────────────────
// Exercise 5: Mixed Real-World Scenario
// ─────────────────────────────────────────────────────────────

console.log("\n=== Exercise 5 ===");

console.log("script start");

setTimeout(() => console.log("setTimeout 1"), 0);
setTimeout(() => console.log("setTimeout 2"), 0);

Promise.resolve()
  .then(() => {
    console.log("promise 1");
    setTimeout(() => console.log("setTimeout inside promise"), 0);
  })
  .then(() => console.log("promise 2"));

queueMicrotask(() => console.log("queueMicrotask"));

console.log("script end");

/*
Prediction — write it before reading:

Answer: script start → script end → promise 1 → queueMicrotask → promise 2
        → setTimeout 1 → setTimeout 2 → setTimeout inside promise

KEY INSIGHT: setTimeout added INSIDE a .then callback goes to the macrotask queue
AFTER the ones that were registered synchronously. But notice — the TWO original
setTimeouts were registered before the Promise resolved, so they appear first.
The setTimeout inside the .then fires last.

"queueMicrotask" runs in the same microtask flush as the .then callbacks.
The order between .then and queueMicrotask depends on the order they were queued:
  - Promise.resolve() enqueues .then callback first
  - queueMicrotask is registered second (synchronously after)
  - BUT: "promise 1" runs, then queueMicrotask fires, then "promise 2"

Wait — let's be precise:
  Sync: "script start", "script end"
  Microtask queue after sync: [promise1-then, queueMicrotask]
  Run promise1-then: logs "promise 1", adds setTimeout (macrotask), enqueues promise2-then
  Queue now: [queueMicrotask, promise2-then]
  Run queueMicrotask: logs "queueMicrotask"
  Run promise2-then: logs "promise 2"
  Macrotask queue: [setTimeout1, setTimeout2, setTimeoutInsidePromise]
  Run each macrotask one at a time with microtask drain between each.
*/

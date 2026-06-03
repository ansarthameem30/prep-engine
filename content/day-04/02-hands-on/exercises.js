/**
 * Day 04 – Hands-On Exercises
 * Topic: Async JS, Promises, Async/Await
 * Run with: node exercises.js
 */

// Helper: fake async API calls
const delay = (ms, value) => new Promise(resolve => setTimeout(() => resolve(value), ms));
const failAfter = (ms, msg) => new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));

// ─────────────────────────────────────────────────────────────
// Exercise 1: Promisify a Callback-Based Function
// ─────────────────────────────────────────────────────────────
// Convert Node-style callback (err, result) to Promise.

function readFileCb(path, callback) {
  // Simulated Node fs.readFile
  setTimeout(() => {
    if (path === "/bad/path") return callback(new Error("File not found"));
    callback(null, `contents of ${path}`);
  }, 50);
}

function promisify(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };
}

const readFile = promisify(readFileCb);

console.log("=== Exercise 1: Promisify ===");
readFile("/some/path")
  .then(content => console.log("Success:", content))
  .catch(err => console.error("Error:", err.message));

readFile("/bad/path")
  .then(content => console.log("Success:", content))
  .catch(err => console.error("Error:", err.message));


// ─────────────────────────────────────────────────────────────
// Exercise 2: Promise Chaining vs Async/Await
// ─────────────────────────────────────────────────────────────
// Fetch user → fetch orders for user → return total order value.
// Implement as (a) promise chain, (b) async/await.

const getUser = (id) => delay(30, { id, name: "Alice" });
const getOrders = (userId) => delay(30, [{ id: 1, value: 100 }, { id: 2, value: 50 }]);

// Promise chain version
function getUserTotalChain(userId) {
  return getUser(userId)
    .then(user => getOrders(user.id))
    .then(orders => orders.reduce((sum, o) => sum + o.value, 0));
}

// Async/await version
async function getUserTotalAsync(userId) {
  const user = await getUser(userId);
  const orders = await getOrders(user.id);
  return orders.reduce((sum, o) => sum + o.value, 0);
}

console.log("\n=== Exercise 2: Chaining vs Await ===");
getUserTotalChain(1).then(total => console.log("Chain total:", total));     // 150
getUserTotalAsync(1).then(total => console.log("Async total:", total));     // 150


// ─────────────────────────────────────────────────────────────
// Exercise 3: Promise.all vs Promise.allSettled
// ─────────────────────────────────────────────────────────────
// Run 3 operations: 2 succeed, 1 fails.
// Compare behavior of .all vs .allSettled.

const task1 = delay(20, "Task 1 done");
const task2 = failAfter(30, "Task 2 failed");
const task3 = delay(25, "Task 3 done");

console.log("\n=== Exercise 3: all vs allSettled ===");

Promise.all([task1, task2, task3])
  .then(results => console.log("all results:", results))
  .catch(err => console.log("all rejected:", err.message));
// Output: "all rejected: Task 2 failed" — rejects on first failure

// NOTE: task1/task2/task3 are same promises, already running.
// Re-create for allSettled demonstration:
Promise.allSettled([
  delay(20, "Task 1 done"),
  failAfter(30, "Task 2 failed"),
  delay(25, "Task 3 done")
]).then(results => {
  results.forEach((r, i) => {
    if (r.status === "fulfilled") console.log(`Task ${i+1} ok:`, r.value);
    else console.log(`Task ${i+1} failed:`, r.reason.message);
  });
});
// Waits for all, reports each outcome


// ─────────────────────────────────────────────────────────────
// Exercise 4: Retry Logic with Async/Await
// ─────────────────────────────────────────────────────────────

let callCount = 0;
function flakyAPI() {
  callCount++;
  if (callCount < 3) return Promise.reject(new Error(`Attempt ${callCount} failed`));
  return Promise.resolve("Success on attempt " + callCount);
}

async function withRetry(fn, maxRetries = 3, delayMs = 10) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.log(`Retry ${attempt}/${maxRetries}: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs * attempt)); // backoff
      }
    }
  }
  throw lastError;
}

console.log("\n=== Exercise 4: Retry ===");
withRetry(flakyAPI).then(console.log).catch(err => console.error("Gave up:", err.message));


// ─────────────────────────────────────────────────────────────
// Exercise 5: Async Queue with Concurrency Limit
// ─────────────────────────────────────────────────────────────
// Process N tasks but only K at a time concurrently.

async function asyncQueue(tasks, concurrency = 2) {
  const results = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++;
      try {
        results[currentIndex] = await tasks[currentIndex]();
      } catch (err) {
        results[currentIndex] = { error: err.message };
      }
    }
  }

  // Launch `concurrency` workers in parallel
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker)
  );

  return results;
}

const jobs = [
  () => delay(50, "job-1"),
  () => delay(30, "job-2"),
  () => delay(20, "job-3"),
  () => delay(40, "job-4"),
  () => failAfter(10, "job-5 failed"),
];

console.log("\n=== Exercise 5: Async Queue (concurrency=2) ===");
const start = Date.now();
asyncQueue(jobs, 2).then(results => {
  console.log("Results:", results);
  console.log(`Time: ${Date.now() - start}ms`); // ~100ms with concurrency=2 vs ~150ms sequential
});

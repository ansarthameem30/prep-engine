# Day 04 – Async JavaScript: Interview Q&A

---

**Q1: What are the three states of a Promise and are transitions reversible?**

A Promise is always in one of three states: pending (initial, hasn't settled), fulfilled (resolved with a value), or rejected (failed with a reason). Transitions are strictly one-directional and irreversible — a Promise can go from pending to fulfilled, or from pending to rejected, but never back to pending and never from fulfilled to rejected. This immutability is the core reliability guarantee of Promises: once you have a resolved value or a rejection, it never changes. This contrasts with callbacks where a third party could call your callback multiple times or not at all. The `.then` and `.catch` handlers of a fulfilled/rejected Promise are always called asynchronously (as microtasks), even if the Promise is already settled when you attach the handler.

---

**Q2: What does `Promise.all` do when one Promise rejects?**

`Promise.all` follows an "all or nothing" contract: it waits for all Promises to fulfill and returns an array of results in the same order as the input array. If any single Promise rejects, `Promise.all` immediately rejects with that rejection reason — it does not wait for the remaining Promises. Crucially, the other Promises are not cancelled (JavaScript has no built-in cancellation) — they continue running, but their results are discarded. This "fail-fast" behavior is intentional: if you need all results to proceed (e.g., loading all dependencies before rendering), a single failure should abort the whole operation. If you need partial results or want to handle failures per-item, use `Promise.allSettled` instead.

---

**Q3: What is the difference between `async function` and returning `Promise.resolve()`?**

An `async` function always returns a Promise, and any value you `return` inside it is automatically wrapped in `Promise.resolve()`. An `async` function that `throw`s automatically returns a rejected Promise. The main difference is syntactic and behavioral: `async/await` lets you write sequential-looking code with full try/catch error handling, which is far more readable than deeply chained `.then()`. Under the hood they're equivalent: `async function f() { return 42; }` compiles to roughly `function f() { return Promise.resolve(42); }`. One practical difference: if you `return Promise.reject(err)` from a non-async function, the error shows up as an unhandled rejection at the call site. In an async function, `throw err` achieves the same and integrates with the caller's `try/catch` or `.catch` naturally.

---

**Q4: What happens when you `await` a non-Promise value?**

When you `await` a non-Promise (a string, number, object, etc.), JavaScript automatically wraps it in `Promise.resolve(value)` before awaiting. The result is that execution still yields to the microtask queue momentarily and then resumes with the value. This means `await 42` gives you `42`, not an error. This is useful because it makes functions that might or might not be async composable: you can `await maybeAsync()` whether `maybeAsync` returns a Promise or a plain value. It also means `await null` and `await undefined` work without throwing. The only case where this matters for bugs is if you accidentally `await` an already-resolved value that should have been a Promise — the code still works, just wastes a microtask.

---

**Q5: How do you implement a timeout for a Promise?**

Use `Promise.race` between the actual operation and a rejection timer:
```js
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}
```
The key insight is that `Promise.race` settles with whichever Promise settles first. If the actual operation completes within `ms`, that result wins. If the timeout fires first, the rejection propagates to the caller. The actual Promise continues running in the background (no cancellation), which is a known limitation of this pattern. For true cancellation, you'd use `AbortController` (for fetch) or a custom cancellation token pattern.

---

**Q6: What is the difference between `Promise.race` and `Promise.any`?**

`Promise.race` settles with the **first settled** Promise — whether fulfilled or rejected. So if the fastest Promise rejects, `race` rejects immediately. `Promise.any` settles with the **first fulfilled** Promise, ignoring rejections. It only rejects (with an `AggregateError` containing all rejection reasons) if every Promise in the input rejects. Use `race` when you want the fastest result and a rejection should propagate (timeout patterns, first-write-wins). Use `any` when you want the fastest successful result and want to tolerate some failures (CDN fallback, trying multiple equivalent API endpoints). `Promise.any` is newer (ES2021) and may need a polyfill in older environments.

---

**Q7: How do you handle errors in a series of `await` calls where each can fail independently?**

A single `try/catch` around multiple `await` calls catches the first failure but doesn't distinguish which operation failed or allow the others to continue. Three strategies: (1) Separate `try/catch` per `await` — verbose but maximally explicit. (2) Wrap each `await` in a helper like `safeAwait(promise)` that returns `[error, result]` tuples (Go-style), letting you check and handle each individually inline. (3) Use `Promise.allSettled` if the operations are independent — run them all in parallel and examine each result. The right choice depends on whether operations are sequential (dependent on previous results) or independent (can run in parallel). For sequential with granular handling, option 1 or 2. For parallel independent operations, `allSettled`.

---

**Q8: What are common mistakes with async/await in loops?**

The most common mistake is using `async/await` inside `forEach`, which doesn't return a Promise and doesn't await the callbacks:
```js
// WRONG — forEach doesn't await the async callbacks
items.forEach(async (item) => {
  await processItem(item);
});
// Code after forEach runs immediately, before any items are processed

// CORRECT — sequential (each waits for previous)
for (const item of items) {
  await processItem(item);
}

// CORRECT — parallel (all run simultaneously)
await Promise.all(items.map(item => processItem(item)));
```
The sequential `for...of` approach processes one at a time — useful when order matters or you need to limit concurrency. `Promise.all(items.map(...))` processes all in parallel — faster but can overwhelm an API or database with too many concurrent requests. For rate limiting, use a concurrency-limiting queue pattern.

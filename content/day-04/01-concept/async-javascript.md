# Async JavaScript Deep Dive

## Why We Moved Away from Callbacks

Callbacks are the original async pattern but suffer from three problems:

1. **Callback hell (Pyramid of doom)** — nested callbacks become unreadable and unmaintainable
2. **Inversion of control** — you hand your callback to a third party that decides when/if to call it
3. **Error propagation** — no standard mechanism; every library invented its own (Node's `(err, result)` convention is a workaround, not a solution)

```js
// Callback hell — real-world example
getUserById(userId, function(err, user) {
  if (err) return handleError(err);
  getOrdersByUser(user.id, function(err, orders) {
    if (err) return handleError(err);
    getProductsForOrder(orders[0].id, function(err, products) {
      if (err) return handleError(err);
      // now you can work with products
      // 3 levels deep, 6 more lines of nesting to go...
    });
  });
});
```

---

## Promises: States, Chaining, and Combinators

### States
A Promise is in exactly one of three states:
- **Pending** — initial state, not settled
- **Fulfilled** — resolved with a value
- **Rejected** — rejected with a reason (usually an Error)

State transitions are **irreversible** — once settled (fulfilled or rejected), a Promise's state never changes. This is the fundamental reliability guarantee: a Promise settles at most once.

```js
const p = new Promise((resolve, reject) => {
  resolve(42);
  reject("error"); // ignored — already resolved
  resolve(99);     // ignored — already resolved
});
p.then(v => console.log(v)); // 42 — only fires once
```

### .then Chaining
Each `.then` returns a new Promise. If the handler returns a value, the new Promise is fulfilled with that value. If it returns a Promise, the chain waits for that Promise. If it throws, the new Promise is rejected.

```js
fetch("/api/users")
  .then(res => res.json())            // returns Promise<data>
  .then(data => data.filter(u => u.active)) // returns array
  .then(active => active[0])          // returns first item
  .then(user => console.log(user.name))
  .catch(err => console.error("Failed:", err)); // catches any rejection above
```

### Promise Combinators

```js
// Promise.all — all must succeed. Rejects immediately if ANY rejects.
// Use when: you need ALL results and failure of any is a total failure.
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id)
]);

// Promise.allSettled — waits for ALL, regardless of outcome.
// Returns [{status, value/reason}] for each.
// Use when: you want to know outcome of each, partial success is acceptable.
const results = await Promise.allSettled([
  updateUser(id, data),
  sendEmail(email),
  invalidateCache(id)
]);
results.forEach(result => {
  if (result.status === "fulfilled") console.log("Success:", result.value);
  else console.error("Failed:", result.reason);
});

// Promise.race — resolves/rejects with the first settled Promise.
// Use when: implementing timeouts or taking the fastest of multiple sources.
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("Timeout")), 5000)
);
const data = await Promise.race([fetchData(), timeoutPromise]);

// Promise.any — resolves with the first FULFILLED Promise (ignores rejections).
// Rejects with AggregateError only if ALL reject.
// Use when: you have multiple sources and need the fastest successful one.
const cdn = await Promise.any([
  fetchFromCDN1(),
  fetchFromCDN2(),
  fetchFromCDN3()
]);
```

---

## Async/Await: Syntactic Sugar and Pitfalls

`async` functions always return a Promise. `await` suspends execution of the async function until the awaited Promise settles — it does NOT block the event loop.

```js
// Every async function returns a Promise
async function getUser() { return 42; }
getUser().then(console.log); // 42

// Equivalent without async:
function getUser() { return Promise.resolve(42); }
```

### Error Handling Patterns

```js
// Pattern 1: try/catch — works for sequential awaits
async function processUser(id) {
  try {
    const user = await getUser(id);       // throws if id invalid
    const orders = await getOrders(user.id); // throws if user has no orders
    return orders;
  } catch (err) {
    // Catches either rejection above
    // PROBLEM: can't distinguish which one failed
    console.error(err);
    throw err; // re-throw if caller needs to handle it
  }
}

// Pattern 2: Granular error handling
async function processUserGranular(id) {
  let user;
  try {
    user = await getUser(id);
  } catch (err) {
    throw new Error(`User fetch failed: ${err.message}`);
  }

  let orders;
  try {
    orders = await getOrders(user.id);
  } catch (err) {
    return []; // orders are optional — default to empty
  }

  return orders;
}

// Pattern 3: Go-style error tuples (popular in large codebases)
async function safeAwait(promise) {
  try {
    const result = await promise;
    return [null, result];
  } catch (err) {
    return [err, null];
  }
}

const [err, user] = await safeAwait(getUser(id));
if (err) { /* handle */ }
```

### Sequential vs Parallel Execution

```js
// WRONG: sequential when they could be parallel
async function loadDashboard(userId) {
  const user    = await getUser(userId);     // waits 100ms
  const posts   = await getPosts(userId);    // waits 100ms
  const friends = await getFriends(userId);  // waits 100ms
  // Total: ~300ms
}

// CORRECT: parallel
async function loadDashboard(userId) {
  const [user, posts, friends] = await Promise.all([
    getUser(userId),
    getPosts(userId),
    getFriends(userId)
  ]);
  // Total: ~100ms (limited by the slowest)
}
```

### Unhandled Promise Rejections

In Node.js, an unhandled rejection was historically only a warning. From Node.js 15+, it terminates the process. Always handle rejections.

```js
// Global handler (last resort, not a substitute for proper handling)
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1); // fail fast
});

// In browser:
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled:", event.reason);
});
```

---

## Common Async Patterns

### Retry with Exponential Backoff
```js
async function retry(fn, maxAttempts = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

const data = await retry(() => fetch("/api/flaky-endpoint").then(r => r.json()));
```

### Promise Queue (Concurrency Limiting)
```js
async function processInBatches(items, fn, batchSize = 5) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}
```

### Async Iterator
```js
async function* paginatedFetch(url) {
  let page = 1;
  while (true) {
    const res = await fetch(`${url}?page=${page}`);
    const data = await res.json();
    if (!data.items.length) return;
    yield data.items;
    page++;
  }
}

for await (const items of paginatedFetch("/api/records")) {
  processItems(items); // process each page as it arrives
}
```

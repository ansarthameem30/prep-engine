/**
 * Day 40 — DSA: System Design Coding Problems
 *
 * Problems:
 *   1. Rate Limiter: Token Bucket + Sliding Window Log + Sliding Window Counter
 *   2. Thread-safe Counter (Node.js patterns)
 *   3. LeetCode #295 — Find Median from Data Stream (two heaps)
 *   4. LeetCode #23  — Merge K Sorted Lists (final review)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: Rate Limiter Implementations
// ─────────────────────────────────────────────────────────────────────────────

// ─── Token Bucket Algorithm ────────────────────────────────────────────────

/**
 * Token Bucket: Allow bursts up to bucket capacity.
 * Tokens replenish at a constant rate. Each request consumes 1 token.
 * If bucket is empty: reject the request.
 *
 * Properties:
 *   - Allows short bursts (up to bucket capacity)
 *   - Smooth long-term rate (tokens replenish steadily)
 *   - Memory: O(1) per user (just store token count + last refill time)
 *
 * Time: O(1) per request
 */
class TokenBucketRateLimiter {
  constructor(bucketCapacity = 10, tokensPerSecond = 5) {
    this.bucketCapacity = bucketCapacity;
    this.tokensPerSecond = tokensPerSecond;
    this.buckets = new Map(); // userId -> { tokens, lastRefill }
  }

  _getBucket(userId) {
    if (!this.buckets.has(userId)) {
      this.buckets.set(userId, {
        tokens: this.bucketCapacity,
        lastRefill: Date.now(),
      });
    }
    return this.buckets.get(userId);
  }

  isAllowed(userId) {
    const now = Date.now();
    const bucket = this._getBucket(userId);

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    const newTokens = elapsed * this.tokensPerSecond;
    bucket.tokens = Math.min(this.bucketCapacity, bucket.tokens + newTokens);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, remainingTokens: Math.floor(bucket.tokens) };
    }

    return { allowed: false, remainingTokens: 0, retryAfterMs: Math.ceil((1 - bucket.tokens) / this.tokensPerSecond * 1000) };
  }
}

// ─── Sliding Window Log Algorithm ─────────────────────────────────────────

/**
 * Sliding Window Log: Maintain a log of request timestamps.
 * For each request: remove timestamps outside the window, count remaining, decide.
 *
 * Properties:
 *   - Exact accuracy (no approximation error)
 *   - Memory: O(requests in window) per user — can be large for high-traffic APIs
 *   - Handles burst correctly
 *
 * Time: O(1) amortized (old entries removed lazily)
 */
class SlidingWindowLogRateLimiter {
  constructor(windowMs = 60000, maxRequests = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.logs = new Map(); // userId -> sorted array of timestamps
  }

  isAllowed(userId) {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    if (!this.logs.has(userId)) this.logs.set(userId, []);
    const log = this.logs.get(userId);

    // Remove expired entries (older than window)
    while (log.length > 0 && log[0] <= cutoff) {
      log.shift();
    }

    if (log.length < this.maxRequests) {
      log.push(now);
      return { allowed: true, remaining: this.maxRequests - log.length };
    }

    const resetAfterMs = log[0] + this.windowMs - now;
    return { allowed: false, remaining: 0, resetAfterMs };
  }
}

// ─── Sliding Window Counter Algorithm ─────────────────────────────────────

/**
 * Sliding Window Counter: Space-efficient approximation.
 * Stores only 2 counters: current window count + previous window count.
 * Estimates current count as: prevCount × (1 - elapsedRatio) + curCount
 *
 * Properties:
 *   - Memory: O(1) per user (2 counters + timestamps)
 *   - Approximation error < 0.1% in practice (used by Redis, Cloudflare)
 *   - Trade-off: very slight inaccuracy vs massive memory savings
 *
 * Time: O(1) per request
 */
class SlidingWindowCounterRateLimiter {
  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.counters = new Map(); // userId -> { curCount, prevCount, windowStart }
  }

  isAllowed(userId) {
    const now = Date.now();

    if (!this.counters.has(userId)) {
      this.counters.set(userId, { curCount: 0, prevCount: 0, windowStart: now });
    }

    const c = this.counters.get(userId);
    const elapsed = now - c.windowStart;

    if (elapsed >= this.windowMs * 2) {
      // More than 2 windows have passed — reset completely
      c.prevCount = 0;
      c.curCount = 0;
      c.windowStart = now;
    } else if (elapsed >= this.windowMs) {
      // Rolled into next window
      c.prevCount = c.curCount;
      c.curCount = 0;
      c.windowStart = c.windowStart + this.windowMs;
    }

    // Estimate: weight previous window's count by how much of current window has passed
    const elapsedRatio = (now - c.windowStart) / this.windowMs;
    const estimatedCount = Math.floor(c.prevCount * (1 - elapsedRatio)) + c.curCount;

    if (estimatedCount < this.maxRequests) {
      c.curCount++;
      return { allowed: true, estimated: estimatedCount + 1, remaining: this.maxRequests - estimatedCount - 1 };
    }

    return { allowed: false, estimated: estimatedCount };
  }
}

console.log("=== Rate Limiter Comparison ===");

// Token Bucket demo
const tokenBucket = new TokenBucketRateLimiter(5, 1); // 5 tokens, refill 1/sec
console.log("\nToken Bucket (5 capacity, 1/sec refill):");
for (let i = 0; i < 7; i++) {
  const result = tokenBucket.isAllowed("user:1");
  console.log(`  Request ${i + 1}: ${result.allowed ? "ALLOWED" : "DENIED"} (tokens: ${result.remainingTokens ?? 0})`);
}

// Sliding Window Log demo
const swLog = new SlidingWindowLogRateLimiter(60000, 5);
console.log("\nSliding Window Log (5 req/60s):");
for (let i = 0; i < 7; i++) {
  const result = swLog.isAllowed("user:2");
  console.log(`  Request ${i + 1}: ${result.allowed ? "ALLOWED" : "DENIED"} (remaining: ${result.remaining ?? 0})`);
}


// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Thread-safe Counter (Node.js patterns)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Node.js is single-threaded (event loop), so CPU operations like i++ are safe.
 * However, async operations can create race conditions:
 *   counter.get() → 5
 *   await doSomething()  ← another request reads 5 here
 *   counter.set(5 + 1)  ← both requests end up setting to 6, not 7
 */

// UNSAFE counter with async operations
class UnsafeCounter {
  constructor() { this.count = 0; }

  async increment() {
    const current = this.count;    // Read
    await new Promise(r => setTimeout(r, 0)); // Simulate async delay (lost update window)
    this.count = current + 1;      // Write with stale read
    return this.count;
  }
}

// SAFE counter using a mutex/queue pattern
class SafeCounter {
  constructor() {
    this.count = 0;
    this._queue = Promise.resolve(); // Serialized execution queue
  }

  increment() {
    // Chain the operation onto the existing queue (serialize all increments)
    this._queue = this._queue.then(async () => {
      const current = this.count;
      await new Promise(r => setTimeout(r, 0));
      this.count = current + 1;
      return this.count;
    });
    return this._queue;
  }
}

// SAFER counter using in-place atomic-like operation (no async gap between read and write)
class AtomicLikeCounter {
  constructor() { this.count = 0; }

  increment() {
    this.count++; // Synchronous: no async gap = no race condition
    return this.count;
  }

  async incrementWithDbSync() {
    this.count++; // Increment in memory synchronously
    // Async operations happen AFTER the state change — no race condition on this.count
    // In practice: use Redis INCR for distributed atomic increments
    return this.count;
  }
}

async function demonstrateRaceCondition() {
  console.log("\n=== Race Condition Demo ===");

  // Unsafe: 100 concurrent increments, expect count = 100
  const unsafe = new UnsafeCounter();
  await Promise.all(Array.from({ length: 100 }, () => unsafe.increment()));
  console.log(`Unsafe counter (100 increments): ${unsafe.count} (expected 100, got LESS due to races)`);

  // Safe: 100 concurrent increments, expect count = 100
  const safe = new SafeCounter();
  await Promise.all(Array.from({ length: 100 }, () => safe.increment()));
  console.log(`Safe counter  (100 increments): ${safe.count} (expected 100, got exactly 100)`);
}

demonstrateRaceCondition();


// ─────────────────────────────────────────────────────────────────────────────
// Problem 3: Find Median from Data Stream (LC #295)
//
// Design a data structure that:
//   addNum(n)    — adds an integer to the stream
//   findMedian() — returns the median of current elements
//
// Strategy: Two heaps — max-heap for lower half, min-heap for upper half
//   The max-heap's top + min-heap's top give us O(1) median access.
//   Keep heaps balanced (differ by at most 1 element).
//
// Time: O(log n) for addNum, O(1) for findMedian
// Space: O(n)
// ─────────────────────────────────────────────────────────────────────────────

class MaxHeap {
  constructor() { this.heap = []; }
  push(v) { this.heap.push(v); this._up(this.heap.length - 1); }
  pop() {
    const t = this.heap[0];
    const l = this.heap.pop();
    if (this.heap.length) { this.heap[0] = l; this._down(0); }
    return t;
  }
  peek() { return this.heap[0]; }
  size() { return this.heap.length; }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p] >= this.heap[i]) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }
  _down(i) {
    const n = this.heap.length;
    while (true) {
      let max = i, l = 2*i+1, r = 2*i+2;
      if (l < n && this.heap[l] > this.heap[max]) max = l;
      if (r < n && this.heap[r] > this.heap[max]) max = r;
      if (max === i) break;
      [this.heap[max], this.heap[i]] = [this.heap[i], this.heap[max]];
      i = max;
    }
  }
}

class MinHeap {
  constructor() { this.heap = []; }
  push(v) { this.heap.push(v); this._up(this.heap.length - 1); }
  pop() {
    const t = this.heap[0];
    const l = this.heap.pop();
    if (this.heap.length) { this.heap[0] = l; this._down(0); }
    return t;
  }
  peek() { return this.heap[0]; }
  size() { return this.heap.length; }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p] <= this.heap[i]) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }
  _down(i) {
    const n = this.heap.length;
    while (true) {
      let min = i, l = 2*i+1, r = 2*i+2;
      if (l < n && this.heap[l] < this.heap[min]) min = l;
      if (r < n && this.heap[r] < this.heap[min]) min = r;
      if (min === i) break;
      [this.heap[min], this.heap[i]] = [this.heap[i], this.heap[min]];
      i = min;
    }
  }
}

class MedianFinder {
  constructor() {
    this.lowerHalf = new MaxHeap(); // max-heap: top = largest in lower half
    this.upperHalf = new MinHeap(); // min-heap: top = smallest in upper half
    // Invariant: lowerHalf.size >= upperHalf.size, differ by at most 1
  }

  addNum(num) {
    // Step 1: Add to appropriate heap
    if (this.lowerHalf.size() === 0 || num <= this.lowerHalf.peek()) {
      this.lowerHalf.push(num);
    } else {
      this.upperHalf.push(num);
    }

    // Step 2: Rebalance (lowerHalf can be equal to or 1 larger than upperHalf)
    if (this.lowerHalf.size() > this.upperHalf.size() + 1) {
      this.upperHalf.push(this.lowerHalf.pop());
    } else if (this.upperHalf.size() > this.lowerHalf.size()) {
      this.lowerHalf.push(this.upperHalf.pop());
    }
  }

  findMedian() {
    if (this.lowerHalf.size() === this.upperHalf.size()) {
      return (this.lowerHalf.peek() + this.upperHalf.peek()) / 2;
    }
    return this.lowerHalf.peek(); // lowerHalf has the extra element
  }
}

console.log("\n=== Find Median from Data Stream (LC #295) ===");
const mf = new MedianFinder();
mf.addNum(1); console.log("After [1]:", mf.findMedian()); // 1.0
mf.addNum(2); console.log("After [1,2]:", mf.findMedian()); // 1.5
mf.addNum(3); console.log("After [1,2,3]:", mf.findMedian()); // 2.0
mf.addNum(7); console.log("After [1,2,3,7]:", mf.findMedian()); // 2.5
mf.addNum(5); console.log("After [1,2,3,5,7]:", mf.findMedian()); // 3.0


// ─────────────────────────────────────────────────────────────────────────────
// Problem 4: Merge K Sorted Lists (LC #23) — Final Review
//
// Strategy: Min-heap with (value, listIndex, nodeIndex)
//   Extract min → add to result → push next node from same list
//
// Time: O(N log K) where N = total nodes, K = number of lists
// Space: O(K) for heap
// ─────────────────────────────────────────────────────────────────────────────

class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

function mergeKLists(lists) {
  // Use a min-heap keyed by node value
  // Store [value, listIndex, nodeRef] — sort by value
  const heap = []; // Simulated with sorted array for clarity (use proper heap in production)

  // Helper: push a node to the heap
  const heapPush = (val, node) => {
    heap.push({ val, node });
    heap.sort((a, b) => a.val - b.val); // In production: use proper min-heap
  };

  // Initialize heap with the head of each non-empty list
  for (const head of lists) {
    if (head) heapPush(head.val, head);
  }

  const dummy = new ListNode(0);
  let curr = dummy;

  while (heap.length > 0) {
    const { val, node } = heap.shift(); // O(1) with proper min-heap
    curr.next = new ListNode(val);
    curr = curr.next;

    if (node.next) {
      heapPush(node.next.val, node.next);
    }
  }

  return dummy.next;
}

// Helper: array to linked list
function arrToList(arr) {
  const dummy = new ListNode(0);
  let cur = dummy;
  for (const v of arr) { cur.next = new ListNode(v); cur = cur.next; }
  return dummy.next;
}

// Helper: linked list to array
function listToArr(node) {
  const arr = [];
  while (node) { arr.push(node.val); node = node.next; }
  return arr;
}

console.log("\n=== Merge K Sorted Lists (LC #23) ===");
const lists = [
  arrToList([1, 4, 5]),
  arrToList([1, 3, 4]),
  arrToList([2, 6]),
];
console.log(listToArr(mergeKLists(lists))); // [1,1,2,3,4,4,5,6]
console.log(listToArr(mergeKLists([]))); // []
console.log(listToArr(mergeKLists([arrToList([])]))); // []

/*
 * Why O(N log K) not O(N log N)?
 * The heap contains at most K elements (one from each list).
 * Each of N nodes is pushed and popped once: O(log K) per node.
 * Total: O(N log K) — when K << N, this is significantly better than sorting all N nodes (O(N log N)).
 *
 * Alternative: divide and conquer merging (merge pairs recursively)
 * Also O(N log K) — same asymptotic complexity, similar constant factor.
 * Heap approach is more flexible (can handle streaming lists).
 *
 * Practical applications:
 * - Database merge-sort join (merging pre-sorted runs)
 * - Log aggregation from multiple sources (each sorted by timestamp)
 * - Streaming merge in distributed systems (each node produces sorted output)
 * - External merge sort (merging K sorted file chunks that don't fit in RAM)
 */

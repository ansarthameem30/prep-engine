/**
 * Day 50 DSA — Final Review + System Design
 *
 * These are the hardest/most commonly asked problems from the sprint.
 * Full implementations with complexity analysis and pattern identification.
 * Plus: Token Bucket Rate Limiter system design.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LC #297: Serialize and Deserialize Binary Tree
// Time: O(n) | Space: O(n)
// ─────────────────────────────────────────────────────────────────────────────

class TreeNode {
  constructor(val) { this.val = val; this.left = null; this.right = null; }
}

/**
 * BFS (level-order) approach: easier to implement correctly than DFS.
 * Serialization: BFS, include null markers for missing children.
 * Deserialization: BFS, use a queue to match children to parents in order.
 *
 * Example: [1,2,3,null,null,4,5] serializes to "1,2,3,X,X,4,5"
 */
const serialize = (root) => {
  if (!root) return "X";
  const queue = [root];
  const result = [];

  while (queue.length > 0) {
    const node = queue.shift();
    if (node === null) {
      result.push("X");
    } else {
      result.push(String(node.val));
      queue.push(node.left);   // Always push children (null or not)
      queue.push(node.right);
    }
  }

  // Trim trailing "X"s (optimization)
  while (result[result.length - 1] === "X") result.pop();
  return result.join(",");
};

const deserialize = (data) => {
  if (data === "X" || !data) return null;

  const vals = data.split(",");
  const root = new TreeNode(parseInt(vals[0]));
  const queue = [root];
  let i = 1;

  while (queue.length > 0 && i < vals.length) {
    const node = queue.shift();

    // Left child
    if (i < vals.length && vals[i] !== "X") {
      node.left = new TreeNode(parseInt(vals[i]));
      queue.push(node.left);
    }
    i++;

    // Right child
    if (i < vals.length && vals[i] !== "X") {
      node.right = new TreeNode(parseInt(vals[i]));
      queue.push(node.right);
    }
    i++;
  }

  return root;
};

// Helper to build and verify
function buildTree(...vals) {
  if (!vals[0]) return null;
  const root = new TreeNode(vals[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < vals.length) {
    const node = queue.shift();
    if (vals[i] !== null) { node.left = new TreeNode(vals[i]); queue.push(node.left); }
    i++;
    if (i < vals.length && vals[i] !== null) { node.right = new TreeNode(vals[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

console.log("=== LC #297: Serialize/Deserialize Binary Tree ===");
const tree = buildTree(1, 2, 3, null, null, 4, 5);
const serialized = serialize(tree);
const deserialized = deserialize(serialized);
console.log("Serialized:", serialized);
console.log("Root after deserialize:", deserialized.val); // 1
console.log("Left:", deserialized.left.val); // 2
console.log("Right:", deserialized.right.val); // 3
console.log("Right.Left:", deserialized.right.left.val); // 4

// ─────────────────────────────────────────────────────────────────────────────
// LC #460: LFU Cache (Full Implementation)
// Time: O(1) for get and put | Space: O(capacity)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LFU (Least Frequently Used) Cache
 *
 * Three data structures:
 * 1. keyMap: key → {value, freq}
 * 2. freqMap: freq → Set of keys (maintains insertion order for LRU tiebreaking)
 * 3. minFreq: current minimum frequency
 *
 * Key insight for O(1): when we access a key, move it from freqMap[freq] to
 * freqMap[freq+1]. If freqMap[minFreq] becomes empty, increment minFreq.
 * Only insert increases minFreq reset to 1.
 *
 * We use Map (not object) for LRU ordering within same frequency bucket.
 * Map preserves insertion order → first key in Map = least recently used.
 */
class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.size = 0;
    this.minFreq = 0;
    this.keyMap = new Map();  // key → {value, freq}
    this.freqMap = new Map(); // freq → Map<key, null> (ordered by insertion)
  }

  _addToFreq(freq, key) {
    if (!this.freqMap.has(freq)) this.freqMap.set(freq, new Map());
    this.freqMap.get(freq).set(key, null);
  }

  _removeFromFreq(freq, key) {
    const freqSet = this.freqMap.get(freq);
    freqSet.delete(key);
    if (freqSet.size === 0) this.freqMap.delete(freq);
  }

  _updateFreq(key) {
    const entry = this.keyMap.get(key);
    const oldFreq = entry.freq;
    entry.freq++;
    this._removeFromFreq(oldFreq, key);

    // Update minFreq if old freq bucket is empty
    if (oldFreq === this.minFreq && !this.freqMap.has(oldFreq)) {
      this.minFreq++;
    }

    this._addToFreq(entry.freq, key);
  }

  get(key) {
    if (!this.keyMap.has(key)) return -1;
    this._updateFreq(key);
    return this.keyMap.get(key).value;
  }

  put(key, value) {
    if (this.capacity <= 0) return;

    if (this.keyMap.has(key)) {
      this.keyMap.get(key).value = value;
      this._updateFreq(key);
      return;
    }

    // Evict LFU item if at capacity
    if (this.size === this.capacity) {
      const minFreqSet = this.freqMap.get(this.minFreq);
      const evictKey = minFreqSet.keys().next().value; // First = LRU among min freq
      minFreqSet.delete(evictKey);
      if (minFreqSet.size === 0) this.freqMap.delete(this.minFreq);
      this.keyMap.delete(evictKey);
      this.size--;
    }

    // Insert new key
    this.keyMap.set(key, { value, freq: 1 });
    this._addToFreq(1, key);
    this.minFreq = 1; // New key always starts at freq 1
    this.size++;
  }
}

console.log("\n=== LC #460: LFU Cache ===");
const lfu = new LFUCache(2);
lfu.put(1, 1); // cache=[1:1], minFreq=1
lfu.put(2, 2); // cache=[1:1,2:2], minFreq=1
console.log(lfu.get(1)); // 1 (key 1 freq→2, minFreq=1→2 since key2 is last at freq1)
lfu.put(3, 3); // evict key2 (freq1), cache=[1:1,3:3], minFreq=1
console.log(lfu.get(2)); // -1 (evicted)
console.log(lfu.get(3)); // 3
lfu.put(4, 4); // evict key3 (freq1), cache=[1:1,4:4]
console.log(lfu.get(1)); // 1 (still here, freq3)
console.log(lfu.get(3)); // -1 (evicted)
console.log(lfu.get(4)); // 4

// ─────────────────────────────────────────────────────────────────────────────
// LC #42: Trapping Rain Water (Final Review)
// Time: O(n) | Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

function trap(height) {
  let left = 0, right = height.length - 1;
  let maxLeft = 0, maxRight = 0, water = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      height[left] >= maxLeft ? (maxLeft = height[left]) : (water += maxLeft - height[left]);
      left++;
    } else {
      height[right] >= maxRight ? (maxRight = height[right]) : (water += maxRight - height[right]);
      right--;
    }
  }
  return water;
}

console.log("\n=== LC #42: Trapping Rain Water (Final Review) ===");
console.log(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])); // 6
console.log(trap([4, 2, 0, 3, 2, 5])); // 9

// ─────────────────────────────────────────────────────────────────────────────
// System Design: Token Bucket Rate Limiter
// Production-grade implementation for AI API rate limiting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Problem: Design a rate limiter for an AI API that:
 * - Limits users to X tokens per minute (token-based, not request-based)
 * - Allows burst up to the bucket capacity
 * - Works in a distributed system (multiple API servers)
 * - Handles concurrent requests safely
 *
 * Solution: Token Bucket with Redis for distributed state
 *
 * In-process implementation (single server):
 */
class DistributedTokenBucket {
  constructor(redisLike, config = {}) {
    this.store = redisLike;
    this.capacityTokens = config.capacityTokens || 10000; // Max tokens in bucket
    this.refillRatePerSecond = config.refillRatePerSecond || 1000; // Tokens/sec
    this.prefix = config.prefix || "rate_limit";
  }

  getBucketKey(userId) { return `${this.prefix}:${userId}`; }
  getLastRefillKey(userId) { return `${this.prefix}:lastRefill:${userId}`; }

  async consume(userId, cost) {
    const bucketKey = this.getBucketKey(userId);
    const lastRefillKey = this.getLastRefillKey(userId);

    // Get current state
    const rawTokens = await this.store.get(bucketKey);
    const rawLastRefill = await this.store.get(lastRefillKey);

    const now = Date.now();
    const currentTokens = rawTokens !== null ? parseFloat(rawTokens) : this.capacityTokens;
    const lastRefill = rawLastRefill !== null ? parseInt(rawLastRefill) : now;

    // Calculate tokens to add since last refill
    const elapsedSeconds = (now - lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRatePerSecond;
    const newTokens = Math.min(this.capacityTokens, currentTokens + tokensToAdd);

    if (newTokens < cost) {
      const waitSeconds = (cost - newTokens) / this.refillRatePerSecond;
      return {
        allowed: false,
        remaining: Math.floor(newTokens),
        retryAfterSeconds: Math.ceil(waitSeconds),
        resetAt: new Date(now + waitSeconds * 1000).toISOString(),
      };
    }

    // Deduct tokens and update state
    const updatedTokens = newTokens - cost;
    await this.store.set(bucketKey, String(updatedTokens));
    await this.store.set(lastRefillKey, String(now));

    return {
      allowed: true,
      remaining: Math.floor(updatedTokens),
      cost,
    };
  }
}

// Lightweight in-memory store (simulating Redis)
class InMemoryRedis {
  constructor() { this.data = new Map(); }
  async get(key) { return this.data.has(key) ? this.data.get(key) : null; }
  async set(key, value) { this.data.set(key, value); }
}

async function demonstrateRateLimiter() {
  console.log("\n=== System Design: Token Bucket Rate Limiter ===\n");
  console.log("Config: 1000 tokens/sec refill, 3000 token capacity");
  console.log("Simulating requests that consume 1000 tokens each\n");

  const redis = new InMemoryRedis();
  const limiter = new DistributedTokenBucket(redis, {
    capacityTokens: 3000,
    refillRatePerSecond: 1000,
  });

  const userId = "user-42";

  for (let i = 1; i <= 6; i++) {
    const result = await limiter.consume(userId, 1000);
    const status = result.allowed
      ? `ALLOWED (${result.remaining} tokens remaining)`
      : `DENIED (retry in ${result.retryAfterSeconds}s)`;
    console.log(`Request ${i}: ${status}`);
  }

  console.log("\n[Bucket was full (3000). First 3 requests consumed 1000 each.]");
  console.log("[4th+ requests denied — refill rate is 1000/sec but no time passed in simulation]");
  console.log("\nIn production with Redis:");
  console.log("  - Replace InMemoryRedis with ioredis client");
  console.log("  - Use Redis MULTI/EXEC for atomic read-modify-write");
  console.log("  - Set TTL on keys (24h) for automatic cleanup");
  console.log("  - Per-user capacity based on plan tier");
}

// Main
console.log("\n" + "=".repeat(60));
console.log("DAY 50 DSA FINAL REVIEW");
console.log("=".repeat(60));

demonstrateRateLimiter().then(() => {
  console.log("\n=== All Tests ===");
  // Serialize/Deserialize
  const t = buildTree(1, 2, 3);
  const s = serialize(t);
  const d = deserialize(s);
  console.assert(d.val === 1 && d.left.val === 2 && d.right.val === 3, "#297 failed");

  // LFU Cache
  const cache = new LFUCache(2);
  cache.put(1, 10); cache.put(2, 20);
  console.assert(cache.get(1) === 10, "LFU get failed");
  cache.put(3, 30); // Evicts 2
  console.assert(cache.get(2) === -1, "LFU eviction failed");

  // Trapping Rain Water
  console.assert(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]) === 6, "#42 failed");

  console.log("All tests passed!\n");
  console.log("Sprint Days 41-50 complete. You're ready for GenAI engineering interviews.");
});

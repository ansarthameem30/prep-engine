/**
 * Day 49 DSA — Advanced Mixed Problems (Final Review)
 *
 * These problems cover patterns that appear frequently in interviews:
 * DFS + memoization on grids, classic DP problems reviewed deeply,
 * and a system design challenge related to GenAI infrastructure.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LC #329: Longest Increasing Path in Matrix
// Time: O(m*n) | Space: O(m*n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DFS from each cell, find the longest strictly increasing path.
 * Memoization: dp[i][j] = longest increasing path starting at (i,j).
 *
 * Why memoization works: if we've computed dp[i][j], any path going through
 * (i,j) can reuse that result — no cycles possible because we only move to
 * strictly larger values (DAG structure).
 */
function longestIncreasingPath(matrix) {
  const m = matrix.length, n = matrix[0].length;
  const dp = Array.from({ length: m }, () => new Array(n).fill(0));
  const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  function dfs(row, col) {
    if (dp[row][col] !== 0) return dp[row][col]; // Memoized

    let maxLen = 1;
    for (const [dr, dc] of DIRS) {
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < m && nc >= 0 && nc < n && matrix[nr][nc] > matrix[row][col]) {
        maxLen = Math.max(maxLen, 1 + dfs(nr, nc));
      }
    }

    dp[row][col] = maxLen;
    return maxLen;
  }

  let result = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      result = Math.max(result, dfs(i, j));
    }
  }

  return result;
}

console.log("=== LC #329: Longest Increasing Path in Matrix ===");
console.log(longestIncreasingPath([[9, 9, 4], [6, 6, 8], [2, 1, 1]])); // 4: [1→2→6→9]
console.log(longestIncreasingPath([[3, 4, 5], [3, 2, 6], [2, 2, 1]])); // 4: [3→4→5→6]
console.log(longestIncreasingPath([[1]])); // 1

// ─────────────────────────────────────────────────────────────────────────────
// LC #198: House Robber (Full DP Table Explanation)
// Time: O(n) | Space: O(1) optimized
// ─────────────────────────────────────────────────────────────────────────────

/**
 * dp[i] = max money from houses 0..i
 * At house i: either rob it (dp[i-2] + nums[i]) or skip it (dp[i-1])
 *
 * Full DP table example for [2, 7, 9, 3, 1]:
 * dp[0] = 2
 * dp[1] = max(2, 7) = 7
 * dp[2] = max(dp[1], dp[0] + 9) = max(7, 11) = 11
 * dp[3] = max(dp[2], dp[1] + 3) = max(11, 10) = 11
 * dp[4] = max(dp[3], dp[2] + 1) = max(11, 12) = 12
 * Answer: 12 (rob houses 0,2,4: 2+9+1=12)
 */
function rob198(nums) {
  const n = nums.length;
  if (n === 0) return 0;
  if (n === 1) return nums[0];

  // Space-optimized: only need dp[i-1] and dp[i-2]
  let prev2 = 0;  // dp[i-2]
  let prev1 = 0;  // dp[i-1]

  for (const num of nums) {
    const current = Math.max(prev1, prev2 + num);
    prev2 = prev1;
    prev1 = current;
  }

  return prev1;
}

// With full DP table for educational purposes
function rob198_verbose(nums) {
  const n = nums.length;
  const dp = new Array(n);
  dp[0] = nums[0];
  dp[1] = Math.max(nums[0], nums[1]);

  for (let i = 2; i < n; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i]);
  }

  console.log(`  DP table: [${dp.join(", ")}]`);
  return dp[n - 1];
}

console.log("\n=== LC #198: House Robber ===");
console.log(rob198([2, 7, 9, 3, 1])); // 12
console.log("With DP table:");
console.log(rob198_verbose([2, 7, 9, 3, 1])); // 12: [2,7,11,11,12]
console.log(rob198([1, 2, 3, 1])); // 4: [1,2,3,3] or rob houses 0,2: 1+3=4

// ─────────────────────────────────────────────────────────────────────────────
// LC #91: Decode Ways
// Time: O(n) | Space: O(1) optimized
// ─────────────────────────────────────────────────────────────────────────────

/**
 * '06' is invalid. '0' can only follow '1' (→10) or '2' (→20).
 * dp[i] = number of ways to decode s[0..i-1]
 *
 * At each position i:
 * 1. Single digit: dp[i] += dp[i-1] if s[i-1] != '0'
 * 2. Two digits: dp[i] += dp[i-2] if s[i-2..i-1] is valid (10-26)
 *
 * Similar to climbing stairs but with conditional steps.
 *
 * Example: "226"
 * dp = [1, 1, 2, 3]
 * dp[0]=1 (empty string base case)
 * dp[1]=1 (one way: "2")
 * dp[2]=2 ("22"→single "2" or double "22")
 * dp[3]=3 ("226"→"2"+"2"+"6" OR "22"+"6" OR "2"+"26")
 */
function numDecodings91(s) {
  const n = s.length;
  if (n === 0 || s[0] === "0") return 0;

  let prev2 = 1; // dp[i-2]: empty string = 1 way
  let prev1 = 1; // dp[i-1]: first char (already checked not '0')

  for (let i = 2; i <= n; i++) {
    let current = 0;

    // Single digit decode
    if (s[i - 1] !== "0") {
      current += prev1;
    }

    // Two digit decode
    const twoDigit = parseInt(s.substring(i - 2, i));
    if (twoDigit >= 10 && twoDigit <= 26) {
      current += prev2;
    }

    prev2 = prev1;
    prev1 = current;
  }

  return prev1;
}

console.log("\n=== LC #91: Decode Ways ===");
console.log(numDecodings91("12")); // 2: [1,2] or [12]
console.log(numDecodings91("226")); // 3
console.log(numDecodings91("06")); // 0 (leading zero invalid)
console.log(numDecodings91("10")); // 1: only "10"
console.log(numDecodings91("2101")); // 1: 2,10,1

// ─────────────────────────────────────────────────────────────────────────────
// LC #322: Coin Change (All Approaches)
// Time: O(amount * coins) | Space: O(amount)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * dp[i] = minimum coins to make amount i
 * dp[0] = 0 (base case: 0 coins to make amount 0)
 * dp[i] = min(dp[i - coin] + 1) for each coin where i >= coin
 *
 * Think: for each amount, try each coin denomination.
 * If we use coin c to make amount i, we need dp[i-c] more coins + 1.
 *
 * BFS approach: amount as node, each coin denomination as edge to amount-coin.
 * Find shortest path from 0 to target.
 */
function coinChange322_DP(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i && dp[i - coin] !== Infinity) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}

function coinChange322_BFS(coins, amount) {
  if (amount === 0) return 0;

  const visited = new Set([0]);
  const queue = [0];
  let steps = 0;

  while (queue.length > 0) {
    steps++;
    const size = queue.length;
    for (let k = 0; k < size; k++) {
      const current = queue.shift();
      for (const coin of coins) {
        const next = current + coin;
        if (next === amount) return steps;
        if (next < amount && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }

  return -1;
}

console.log("\n=== LC #322: Coin Change ===");
console.log(coinChange322_DP([1, 5, 11], 15)); // 3: [5,5,5] or [11,1,1,1,1] → nope, 5+5+5=15 → 3
console.log(coinChange322_DP([2], 3)); // -1 (impossible)
console.log(coinChange322_DP([1, 2, 5], 11)); // 3: 5+5+1
console.log(coinChange322_BFS([1, 2, 5], 11)); // 3

// ─────────────────────────────────────────────────────────────────────────────
// System Design: Token Bucket Rate Limiter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Token Bucket algorithm for rate limiting:
 * - Bucket holds up to 'capacity' tokens
 * - Tokens refill at 'refillRate' tokens per second
 * - Each request consumes 'cost' tokens
 * - Request allowed only if bucket has enough tokens
 *
 * This is commonly used for AI API rate limiting where each request
 * consumes tokens proportional to its actual token count.
 *
 * Advantages over fixed window:
 * - Allows bursting up to capacity
 * - Smooth long-term rate (no thundering herd at window reset)
 */
class TokenBucketRateLimiter {
  constructor(capacity, refillRatePerSecond) {
    this.capacity = capacity;         // Max tokens in bucket
    this.tokens = capacity;           // Current tokens (start full)
    this.refillRate = refillRatePerSecond;
    this.lastRefillTime = Date.now();
  }

  refill() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  consume(cost = 1) {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return { allowed: true, remaining: Math.floor(this.tokens) };
    }
    const waitTime = (cost - this.tokens) / this.refillRate;
    return { allowed: false, remaining: Math.floor(this.tokens), retryAfterSeconds: waitTime.toFixed(2) };
  }

  status() {
    this.refill();
    return { tokens: Math.floor(this.tokens), capacity: this.capacity };
  }
}

console.log("\n=== System Design: Token Bucket Rate Limiter ===");
// 100 tokens/second capacity, refill 10 tokens/second
const limiter = new TokenBucketRateLimiter(100, 10);

// Simulate burst of requests
for (let i = 1; i <= 5; i++) {
  const result = limiter.consume(30); // Each request costs 30 tokens
  console.log(`Request ${i}: ${result.allowed ? "ALLOWED" : "DENIED"} (remaining: ${result.remaining}${result.retryAfterSeconds ? ", retry in " + result.retryAfterSeconds + "s" : ""})`);
}

// Tests
console.log("\n=== All Tests ===");
console.assert(longestIncreasingPath([[9, 9, 4], [6, 6, 8], [2, 1, 1]]) === 4, "#329 failed");
console.assert(rob198([2, 7, 9, 3, 1]) === 12, "#198 failed");
console.assert(numDecodings91("226") === 3, "#91 failed");
console.assert(coinChange322_DP([1, 2, 5], 11) === 3, "#322 DP failed");
console.assert(coinChange322_BFS([1, 2, 5], 11) === 3, "#322 BFS failed");
console.log("All tests passed!");

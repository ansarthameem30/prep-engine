/**
 * Day 24 — DSA: Coin Change (Unbounded Knapsack Pattern)
 *
 * LeetCode #322: Coin Change
 * LeetCode #518: Coin Change II (count combinations)
 * LeetCode #279: Perfect Squares
 *
 * Pattern: Unbounded Knapsack — items can be reused unlimited times
 */

// ─────────────────────────────────────────────
// LeetCode #322: Coin Change
// ─────────────────────────────────────────────
// Given coins of various denominations and a target amount,
// find the minimum number of coins to make that amount.

/**
 * Approach 1: BFS (Breadth-First Search)
 * Treat each "amount" as a graph node. Each coin is an edge.
 * BFS finds the shortest path (minimum coins) from 0 to amount.
 *
 * Time: O(amount * coins.length)
 * Space: O(amount) — visited set
 */
function coinChange_BFS(coins, amount) {
  if (amount === 0) return 0;

  const visited = new Set([0]);
  const queue = [0];
  let steps = 0;

  while (queue.length > 0) {
    steps++;
    const size = queue.length;

    for (let i = 0; i < size; i++) {
      const current = queue[i];

      for (const coin of coins) {
        const next = current + coin;
        if (next === amount) return steps;
        if (next < amount && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }

    queue.splice(0, size); // process next level
  }

  return -1; // unreachable
}

/**
 * Approach 2: DP Bottom-Up (Tabulation)
 * dp[i] = minimum coins needed for amount i
 * Recurrence: dp[i] = min(dp[i - coin] + 1) for all coins where coin <= i
 * Base case: dp[0] = 0
 *
 * Time: O(amount * coins.length)
 * Space: O(amount)
 */
function coinChange_DP(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0; // 0 coins needed for amount 0

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i && dp[i - coin] + 1 < dp[i]) {
        dp[i] = dp[i - coin] + 1;
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}

console.log('=== LeetCode #322: Coin Change ===');
console.log('BFS  [1,5,6,9] amount=11:', coinChange_BFS([1, 5, 6, 9], 11)); // 2 (5+6)
console.log('DP   [1,5,6,9] amount=11:', coinChange_DP([1, 5, 6, 9], 11));  // 2
console.log('BFS  [2] amount=3:', coinChange_BFS([2], 3));                   // -1
console.log('DP   [1,2,5] amount=11:', coinChange_DP([1, 2, 5], 11));        // 3 (5+5+1)
console.log('DP   [2] amount=3:', coinChange_DP([2], 3));                    // -1


// ─────────────────────────────────────────────
// LeetCode #518: Coin Change II (count combinations)
// ─────────────────────────────────────────────
// Count the number of ways to make the amount (combinations, not permutations).

/**
 * dp[i] = number of ways to make amount i
 * Recurrence: dp[i] += dp[i - coin] for each coin <= i
 * Base case: dp[0] = 1 (one way to make 0: use no coins)
 *
 * Key insight: iterate coins in outer loop to ensure each combination
 * is counted once (not as different orderings/permutations).
 *
 * Compare with permutations:
 *   Combinations (this problem): coins outer → amounts inner
 *   Permutations (order matters): amounts outer → coins inner
 *
 * Time: O(amount * coins.length)
 * Space: O(amount)
 */
function coinChangeII(coins, amount) {
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 1; // one way to make 0

  for (const coin of coins) {         // outer: each coin
    for (let i = coin; i <= amount; i++) { // inner: each amount from coin to target
      dp[i] += dp[i - coin];
    }
  }

  return dp[amount];
}

/**
 * Why does coins-outer give combinations and not permutations?
 *
 * For coins=[1,2], amount=3:
 *
 * After processing coin=1: dp = [1,1,1,1]
 *   (ways to make 0,1,2,3 using only coin 1)
 * After processing coin=2: dp = [1,1,2,3]
 *   dp[2] += dp[0] = 1+1=2  → {1+1, 2}
 *   dp[3] += dp[1] = 1+1=2  → wait, dp[3]=1, dp[3]+=dp[1]=1 → dp[3]=2... let me trace:
 *
 * Actually: dp[3] += dp[3-2] = dp[1] = 1 → dp[3] = 1+1 = 2
 * Combinations: {1+1+1=3, 1+2=3} = 2 ways ✓
 *
 * If we did amounts-outer (permutations):
 *   i=3: for coin=1: dp[3]+=dp[2], for coin=2: dp[3]+=dp[1]
 *   This counts {1+2} and {2+1} as different — that's permutations
 */

console.log('\n=== LeetCode #518: Coin Change II ===');
console.log('[1,2,5] amount=5:', coinChangeII([1, 2, 5], 5));  // 4
console.log('[2] amount=3:', coinChangeII([2], 3));              // 0
console.log('[10] amount=10:', coinChangeII([10], 10));          // 1


// ─────────────────────────────────────────────
// LeetCode #279: Perfect Squares
// ─────────────────────────────────────────────
// Find the least number of perfect square numbers that sum to n.
// Perfect squares: 1, 4, 9, 16, 25, ...
// This is Coin Change where "coins" are perfect squares.

/**
 * DP approach: same as Coin Change #322 but coins are pre-computed perfect squares.
 *
 * Lagrange's four-square theorem: every positive integer can be expressed as
 * the sum of at most FOUR perfect squares. So the answer is always 1, 2, 3, or 4.
 * (We don't use this to optimize, but it's good to know the bound.)
 *
 * Time: O(n * sqrt(n)) — sqrt(n) possible squares for each of n amounts
 * Space: O(n)
 */
function numSquares(n) {
  // Pre-compute perfect squares <= n
  const squares = [];
  for (let i = 1; i * i <= n; i++) {
    squares.push(i * i);
  }

  const dp = new Array(n + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= n; i++) {
    for (const sq of squares) {
      if (sq > i) break; // squares are sorted, no need to continue
      dp[i] = Math.min(dp[i], dp[i - sq] + 1);
    }
  }

  return dp[n];
}

/**
 * BFS approach: each level adds one perfect square.
 * The first time we reach n, the level count is the answer.
 *
 * Time: O(n * sqrt(n))
 * Space: O(n)
 */
function numSquares_BFS(n) {
  const squares = [];
  for (let i = 1; i * i <= n; i++) squares.push(i * i);

  const visited = new Set([0]);
  const queue = [0];
  let level = 0;

  while (queue.length) {
    level++;
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const curr = queue[i];
      for (const sq of squares) {
        const next = curr + sq;
        if (next === n) return level;
        if (next < n && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    queue.splice(0, size);
  }

  return level;
}

console.log('\n=== LeetCode #279: Perfect Squares ===');
console.log('DP  n=12:', numSquares(12));       // 3 (4+4+4)
console.log('BFS n=12:', numSquares_BFS(12));   // 3
console.log('DP  n=13:', numSquares(13));       // 2 (4+9)
console.log('DP  n=1:', numSquares(1));         // 1


// ─────────────────────────────────────────────
// Pattern: Unbounded Knapsack Framework
// ─────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════════════════════╗
║            UNBOUNDED KNAPSACK PATTERN                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║ Template:                                                    ║
║   dp[0] = base case                                          ║
║   for i in 1..target:                                        ║
║     for item in items:                                       ║
║       if item <= i:                                          ║
║         dp[i] = optimize(dp[i], dp[i - item] + cost)        ║
║                                                              ║
║ Key decisions:                                               ║
║ • Minimize? → dp[i] = min(dp[i], dp[i-item]+1), init=Inf    ║
║ • Count combinations? → dp[i] += dp[i-item], init=[1,0,..0] ║
║ • Count permutations? → swap loop order (amounts outer)      ║
║                                                              ║
╠══════════════════════════╦═══════════════╦══════════════════╣
║ Problem                  ║ Time          ║ Space            ║
╠══════════════════════════╬═══════════════╬══════════════════╣
║ Coin Change (min)        ║ O(amt * C)    ║ O(amt)           ║
║ Coin Change II (count)   ║ O(amt * C)    ║ O(amt)           ║
║ Perfect Squares (min)    ║ O(n * √n)     ║ O(n)             ║
╚══════════════════════════╩═══════════════╩══════════════════╝
`);

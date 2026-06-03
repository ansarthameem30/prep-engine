/**
 * Day 23 — DSA: Dynamic Programming Introduction
 *
 * LeetCode #70: Climbing Stairs
 * LeetCode #198: House Robber
 * LeetCode #213: House Robber II (circular)
 *
 * DP Framework:
 * 1. Define the subproblem: what does dp[i] represent?
 * 2. Recurrence relation: how does dp[i] relate to smaller subproblems?
 * 3. Base cases: smallest subproblems with known answers
 * 4. Order of computation: ensure subproblems are solved before they're needed
 */

// ─────────────────────────────────────────────
// LeetCode #70: Climbing Stairs
// ─────────────────────────────────────────────
// Problem: n steps, can climb 1 or 2 at a time. How many distinct ways to reach top?

/**
 * Approach 1: Memoization (top-down DP)
 *
 * Subproblem: climbStairs(i) = number of ways to reach step i
 * Recurrence: climbStairs(i) = climbStairs(i-1) + climbStairs(i-2)
 *   (reach i from i-1 in one step, or from i-2 in two steps)
 * Base cases: climbStairs(0) = 1 (one way: do nothing), climbStairs(1) = 1
 *
 * This is exactly Fibonacci! fib(n+1)
 *
 * Time: O(n), Space: O(n)
 */
function climbStairsMemo(n, memo = {}) {
  if (n <= 1) return 1;
  if (memo[n]) return memo[n];
  memo[n] = climbStairsMemo(n - 1, memo) + climbStairsMemo(n - 2, memo);
  return memo[n];
}

/**
 * Approach 2: Tabulation (bottom-up DP)
 * Build from base cases up to n.
 *
 * Time: O(n), Space: O(n)
 */
function climbStairsTabulation(n) {
  if (n <= 1) return 1;
  const dp = new Array(n + 1);
  dp[0] = 1;
  dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}

/**
 * Approach 3: Space-optimized (O(1) space)
 * dp[i] only depends on dp[i-1] and dp[i-2] — keep just two variables.
 *
 * Time: O(n), Space: O(1)
 */
function climbStairsOptimal(n) {
  if (n <= 1) return 1;
  let prev2 = 1, prev1 = 1;
  for (let i = 2; i <= n; i++) {
    const curr = prev1 + prev2;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}

console.log('=== LeetCode #70: Climbing Stairs ===');
[1, 2, 3, 4, 5, 10].forEach(n => {
  console.log(`n=${n}: memo=${climbStairsMemo(n)}, tab=${climbStairsTabulation(n)}, opt=${climbStairsOptimal(n)}`);
});
// n=1: 1, n=2: 2, n=3: 3, n=4: 5, n=5: 8 — Fibonacci numbers!


// ─────────────────────────────────────────────
// LeetCode #198: House Robber
// ─────────────────────────────────────────────
// Problem: rob houses in a row, can't rob adjacent houses. Maximize amount stolen.

/**
 * Subproblem: dp[i] = max money robbing houses 0..i
 * Recurrence: dp[i] = max(dp[i-1], dp[i-2] + nums[i])
 *   - Skip house i: take dp[i-1]
 *   - Rob house i: can't rob i-1, so take dp[i-2] + nums[i]
 * Base cases: dp[0] = nums[0], dp[1] = max(nums[0], nums[1])
 *
 * Time: O(n), Space: O(n) tabulation / O(1) optimized
 */
function rob(nums) {
  const n = nums.length;
  if (n === 0) return 0;
  if (n === 1) return nums[0];

  // Space-optimized: only need previous two values
  let prev2 = nums[0];
  let prev1 = Math.max(nums[0], nums[1]);

  for (let i = 2; i < n; i++) {
    const curr = Math.max(prev1, prev2 + nums[i]);
    prev2 = prev1;
    prev1 = curr;
  }

  return prev1;
}

console.log('\n=== LeetCode #198: House Robber ===');
console.log('[1,2,3,1]:', rob([1, 2, 3, 1])); // Expected: 4 (rob 1 + 3)
console.log('[2,7,9,3,1]:', rob([2, 7, 9, 3, 1])); // Expected: 12 (rob 2 + 9 + 1)
console.log('[2,1,1,2]:', rob([2, 1, 1, 2])); // Expected: 4


// ─────────────────────────────────────────────
// LeetCode #213: House Robber II (circular)
// ─────────────────────────────────────────────
// Problem: houses are arranged in a circle, so house[0] and house[n-1] are adjacent.

/**
 * Key insight: because it's circular, you can't rob BOTH the first and last house.
 * So the answer is: max of two subproblems:
 *   1. Rob houses [0..n-2] (exclude last)
 *   2. Rob houses [1..n-1] (exclude first)
 *
 * Both subproblems are the linear House Robber I problem.
 *
 * Why this works: if you don't include the last house in option 1, or the first
 * house in option 2, the circle constraint is automatically satisfied.
 *
 * Time: O(n) — two passes of O(n)
 * Space: O(1)
 */
function robCircular(nums) {
  const n = nums.length;
  if (n === 0) return 0;
  if (n === 1) return nums[0];
  if (n === 2) return Math.max(nums[0], nums[1]);

  // rob on a subarray [start, end] inclusive
  function robLinear(start, end) {
    let prev2 = 0, prev1 = 0;
    for (let i = start; i <= end; i++) {
      const curr = Math.max(prev1, prev2 + nums[i]);
      prev2 = prev1;
      prev1 = curr;
    }
    return prev1;
  }

  return Math.max(
    robLinear(0, n - 2), // exclude last house
    robLinear(1, n - 1)  // exclude first house
  );
}

console.log('\n=== LeetCode #213: House Robber II (circular) ===');
console.log('[2,3,2]:', robCircular([2, 3, 2]));     // Expected: 3 (rob house 1)
console.log('[1,2,3,1]:', robCircular([1, 2, 3, 1])); // Expected: 4
console.log('[1,2,3]:', robCircular([1, 2, 3]));       // Expected: 3


// ─────────────────────────────────────────────
// DP Framework Summary
// ─────────────────────────────────────────────
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    DP FRAMEWORK                               ║
╠═══════════════════════════════════════════════════════════════╣
║ 1. DEFINE SUBPROBLEM: What does dp[i] represent?              ║
║    "The max/min/count for the first i elements"               ║
║                                                               ║
║ 2. RECURRENCE: How does dp[i] relate to dp[i-1], dp[i-2]?    ║
║    "Take or skip current element — maximize the choice"       ║
║                                                               ║
║ 3. BASE CASES: What are dp[0] and dp[1]?                      ║
║    "Smallest subproblems you can answer by inspection"        ║
║                                                               ║
║ 4. ORDER: Fill table from small i to large i (bottom-up)      ║
║    OR use memoized recursion (top-down, same complexity)      ║
║                                                               ║
║ 5. OPTIMIZE: If dp[i] only needs last k values, use O(k)      ║
║    rolling variables instead of O(n) array                    ║
╠═══════════════════════════╦═══════════════╦══════════════════╣
║ Problem                   ║ Time          ║ Space            ║
╠═══════════════════════════╬═══════════════╬══════════════════╣
║ Climbing Stairs (memo)    ║ O(n)          ║ O(n)             ║
║ Climbing Stairs (opt)     ║ O(n)          ║ O(1)             ║
║ House Robber              ║ O(n)          ║ O(1)             ║
║ House Robber II           ║ O(n)          ║ O(1)             ║
╚═══════════════════════════╩═══════════════╩══════════════════╝
`);

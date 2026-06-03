/**
 * Day 48 DSA — Interval DP: Burst Balloons Pattern
 *
 * Interval DP key insight: instead of thinking "what do I do FIRST",
 * think "what do I do LAST". The last action partitions the problem
 * into two independent subproblems.
 *
 * This is the "choose the last item" trick for interval DP.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LC #312: Burst Balloons
// Time: O(n³) | Space: O(n²)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Key insight: "Which balloon do I burst LAST in range [l, r]?"
 *
 * When balloon k is burst last in [l, r]:
 * - Left subproblem [l, k-1] and right [k+1, r] have been fully burst already
 * - Only boundary balloons remain: nums[l-1] and nums[r+1]
 * - Coins from bursting k = nums[l-1] * nums[k] * nums[r+1]
 *
 * Add virtual balloons with value 1 at both ends (index 0 and n+1).
 * dp[l][r] = max coins from bursting all balloons in (l, r) exclusive
 *            (using the original indices 1..n)
 *
 * dp[l][r] = max over k in [l..r]:
 *   dp[l][k-1] + nums[l-1]*nums[k]*nums[r+1] + dp[k+1][r]
 */
function maxCoins312(nums) {
  // Add virtual boundary balloons
  const n = nums.length;
  const arr = [1, ...nums, 1]; // arr[0] = arr[n+1] = 1
  const size = arr.length;     // size = n + 2

  // dp[l][r] = max coins from bursting all balloons strictly between l and r
  const dp = Array.from({ length: size }, () => new Array(size).fill(0));

  // Length of the interval [l, r] from 2 to n+2
  for (let len = 2; len < size; len++) {
    for (let l = 0; l < size - len; l++) {
      const r = l + len;
      // k is the LAST balloon to burst in (l, r) exclusive
      for (let k = l + 1; k < r; k++) {
        dp[l][r] = Math.max(
          dp[l][r],
          dp[l][k] + arr[l] * arr[k] * arr[r] + dp[k][r]
        );
      }
    }
  }

  return dp[0][size - 1];
}

console.log("=== LC #312: Burst Balloons ===");
console.log(maxCoins312([3, 1, 5, 8])); // 167: [3,5,8]→3*1*5 [3,5,8]→3*5*8 [3,8]→1*3*8 [8]→1*8*1
console.log(maxCoins312([1, 5])); // 10
console.log(maxCoins312([1])); // 1

// ─────────────────────────────────────────────────────────────────────────────
// LC #1000: Minimum Cost to Merge Stones
// Time: O(n³/k) | Space: O(n²)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge k adjacent piles into one, cost = sum of pile sizes.
 * Find minimum total cost to merge all piles into 1.
 *
 * Key: merging n piles into 1 with step k is only possible if (n-1) % (k-1) == 0.
 *
 * dp[l][r] = min cost to reduce piles[l..r] to the fewest possible piles.
 * In the end, dp[0][n-1] should = cost of reducing to 1 pile.
 *
 * Recurrence: dp[l][r] = min over all valid split points m:
 *   dp[l][m] + dp[m+1][r]
 * Plus, if (r-l) % (k-1) == 0: add prefix[r+1] - prefix[l] (cost of final merge of k piles)
 */
function mergeStones1000(stones, k) {
  const n = stones.length;
  if ((n - 1) % (k - 1) !== 0) return -1; // Impossible

  // Prefix sums for fast range sum queries
  const prefix = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + stones[i];

  const dp = Array.from({ length: n }, () => new Array(n).fill(0));

  // len = length of current range
  for (let len = k; len <= n; len++) {
    for (let l = 0; l + len - 1 < n; l++) {
      const r = l + len - 1;
      dp[l][r] = Infinity;

      // Split at each position m, but step by k-1 to ensure valid merges
      for (let m = l; m < r; m += k - 1) {
        dp[l][r] = Math.min(dp[l][r], dp[l][m] + dp[m + 1][r]);
      }

      // If this range can be reduced to 1 pile, add the cost of the final merge
      if ((r - l) % (k - 1) === 0) {
        dp[l][r] += prefix[r + 1] - prefix[l];
      }
    }
  }

  return dp[0][n - 1];
}

console.log("\n=== LC #1000: Minimum Cost to Merge Stones ===");
console.log(mergeStones1000([3, 2, 4, 1], 2)); // 20
console.log(mergeStones1000([3, 2, 4, 1], 3)); // -1 (impossible with k=3)
console.log(mergeStones1000([3, 5, 1, 2, 6], 3)); // 25

// ─────────────────────────────────────────────────────────────────────────────
// LC #664: Strange Printer
// Time: O(n³) | Space: O(n²)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum number of turns to print string s.
 * Each turn: print any single character any number of times, any position.
 *
 * Key insight: think about what characters share a "print run."
 * dp[l][r] = min turns to print s[l..r]
 *
 * Base case: dp[i][i] = 1 (one character needs one turn)
 *
 * If s[l] == s[k] for some k in (l, r], we can "extend" the print of s[l]
 * to cover position k for free (already printed when we print l).
 * So: dp[l][r] = min(dp[l][k-1] + dp[k][r]) when s[l] == s[k]
 * The s[l] character doesn't need an extra turn at position k.
 *
 * Default: dp[l][r] = dp[l+1][r] + 1 (print s[l] separately)
 */
function strangePrinter664(s) {
  const n = s.length;
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));

  // Base case: single character
  for (let i = 0; i < n; i++) dp[i][i] = 1;

  for (let len = 2; len <= n; len++) {
    for (let l = 0; l + len - 1 < n; l++) {
      const r = l + len - 1;
      dp[l][r] = dp[l + 1][r] + 1; // Print s[l] in a separate turn

      // Check if s[l] matches any s[k] in range
      for (let k = l + 1; k <= r; k++) {
        if (s[k] === s[l]) {
          // Extend s[l]'s print to cover k (merge l and k into same print)
          dp[l][r] = Math.min(dp[l][r], dp[l + 1][k] + (k + 1 <= r ? dp[k + 1][r] : 0));
          // Alternatively: dp[l][k-1] + dp[k][r] where we extend s[l] to k
          const alt = (l + 1 <= k - 1 ? dp[l + 1][k - 1] : 0) + dp[k][r];
          dp[l][r] = Math.min(dp[l][r], alt + (l + 1 <= k - 1 ? 0 : 0));
        }
      }
    }
  }

  return dp[0][n - 1];
}

// Cleaner implementation
function strangePrinter664_v2(s) {
  const n = s.length;
  const dp = Array.from({ length: n }, (_, i) => {
    const row = new Array(n).fill(0);
    row[i] = 1;
    return row;
  });

  for (let i = n - 2; i >= 0; i--) {
    for (let j = i + 1; j < n; j++) {
      dp[i][j] = dp[i][j - 1] + 1; // Print s[j] separately
      for (let k = i; k < j; k++) {
        if (s[k] === s[j]) {
          // s[k] and s[j] same character — merge their print
          dp[i][j] = Math.min(dp[i][j], dp[i][k] + (k + 1 <= j - 1 ? dp[k + 1][j - 1] : 0));
        }
      }
    }
  }

  return dp[0][n - 1];
}

console.log("\n=== LC #664: Strange Printer ===");
console.log(strangePrinter664_v2("aaabbb")); // 2 (print aaa, then bbb)
console.log(strangePrinter664_v2("aba")); // 2 (print aaa, then b in middle)

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * INTERVAL DP PATTERN: "Think LAST, not FIRST"
 *
 * Classic mistake: "what do I process first?" (leads to complex dependencies)
 * Correct approach: "what's the LAST operation in range [l,r]?"
 *   → last balloon to burst in [l,r]
 *   → last pair of piles to merge into 1
 *   → which characters share a print run at the end
 *
 * Template:
 * for len in 2..n:
 *   for l in 0..n-len:
 *     r = l + len - 1
 *     dp[l][r] = min/max over k in [l..r]:
 *       f(dp[l][k-1], dp[k+1][r], cost(l, k, r))
 *
 * COMPLEXITY: O(n³) time, O(n²) space for all problems above.
 *
 * COMMON INTERVIEW MISTAKES:
 * 1. Processing "first" instead of "last" — causes circular dependencies
 * 2. Forgetting boundary cases (virtual 1s in balloon problem)
 * 3. Off-by-one in the loop bounds
 * 4. Not checking feasibility (#1000: (n-1) % (k-1) == 0)
 */

console.log("\n=== All Tests ===");
console.assert(maxCoins312([3, 1, 5, 8]) === 167, "#312 test 1 failed");
console.assert(maxCoins312([1, 5]) === 10, "#312 test 2 failed");
console.assert(mergeStones1000([3, 2, 4, 1], 2) === 20, "#1000 test 1 failed");
console.assert(mergeStones1000([3, 2, 4, 1], 3) === -1, "#1000 impossible test failed");
console.assert(strangePrinter664_v2("aaabbb") === 2, "#664 test 1 failed");
console.log("All tests passed!");

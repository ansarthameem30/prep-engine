/**
 * Day 42 DSA — Longest Increasing Subsequence (LIS) Patterns
 *
 * LIS is a classic DP problem with multiple approaches:
 * O(n²) DP — build incrementally
 * O(n log n) Patience Sorting — binary search on "piles"
 *
 * These patterns extend to 2D problems (envelopes), counting LIS,
 * and divisibility constraints.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LC #300: Longest Increasing Subsequence
// Time: O(n²) DP | O(n log n) patience sort | Space: O(n) both
// ─────────────────────────────────────────────────────────────────────────────

// Approach 1: Classic DP — O(n²)
// dp[i] = length of LIS ending at index i
function lengthOfLIS_DP(nums) {
  const n = nums.length;
  if (n === 0) return 0;

  const dp = new Array(n).fill(1); // Each element is an LIS of length 1 alone

  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }

  return Math.max(...dp);
}

// Approach 2: Patience Sorting — O(n log n)
// Maintain "piles" where each pile top is >= current card
// Binary search for the first pile top >= nums[i] to place on
// tails[i] = smallest tail element for increasing subsequence of length i+1
function lengthOfLIS_Patience(nums) {
  const tails = []; // tails[i] = smallest tail of all LIS of length i+1

  for (const num of nums) {
    // Binary search: find leftmost position in tails where tails[pos] >= num
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < num) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = num; // Replace or extend
  }

  return tails.length; // Length of tails = length of LIS
}

console.log("=== LC #300: LIS ===");
const nums300 = [10, 9, 2, 5, 3, 7, 101, 18];
console.log(`Input: [${nums300}]`);
console.log(`DP result: ${lengthOfLIS_DP(nums300)}`); // 4: [2,3,7,101]
console.log(`Patience result: ${lengthOfLIS_Patience(nums300)}`); // 4

// ─────────────────────────────────────────────────────────────────────────────
// LC #354: Russian Doll Envelopes
// Time: O(n log n) | Space: O(n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An envelope [w1,h1] fits inside [w2,h2] if w1<w2 AND h1<h2.
 * Reduce to 1D LIS with a trick:
 * Sort by width ASC, then by height DESC for same widths.
 *
 * Why height DESC for same widths?
 * If two envelopes have the same width [3,4] and [3,6],
 * neither can go inside the other (need STRICTLY less width).
 * By sorting height DESC, we prevent picking two same-width envelopes
 * in the LIS (because [6,4] is decreasing, not increasing).
 *
 * After sorting, find LIS on heights only.
 */
function maxEnvelopes(envelopes) {
  // Sort: width ASC, then height DESC for same width
  envelopes.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : b[1] - a[1]);

  // LIS on heights using patience sorting
  const heights = envelopes.map((e) => e[1]);
  return lengthOfLIS_Patience(heights);
}

console.log("\n=== LC #354: Russian Doll Envelopes ===");
console.log(maxEnvelopes([[5, 4], [6, 4], [6, 7], [2, 3]])); // 3: [2,3] -> [5,4] -> [6,7]
console.log(maxEnvelopes([[1, 1], [1, 1], [1, 1]])); // 1 (same width, can't nest)

// ─────────────────────────────────────────────────────────────────────────────
// LC #368: Largest Divisible Subset
// Time: O(n²) | Space: O(n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Key insight: if we sort the array and dp[j] < dp[i] implies nums[j] divides nums[i],
 * then LIS on divisibility gives the largest divisible subset.
 * (If a|b and b|c then a|c — transitivity of divisibility.)
 * Track parent pointers to reconstruct the subset.
 */
function largestDivisibleSubset(nums) {
  nums.sort((a, b) => a - b);
  const n = nums.length;
  const dp = new Array(n).fill(1);
  const parent = new Array(n).fill(-1);

  let maxLen = 1, maxIdx = 0;

  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[i] % nums[j] === 0 && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
        parent[i] = j;
      }
    }
    if (dp[i] > maxLen) {
      maxLen = dp[i];
      maxIdx = i;
    }
  }

  // Reconstruct path from parent pointers
  const result = [];
  for (let i = maxIdx; i !== -1; i = parent[i]) {
    result.unshift(nums[i]);
  }
  return result;
}

console.log("\n=== LC #368: Largest Divisible Subset ===");
console.log(largestDivisibleSubset([1, 2, 3])); // [1,2] or [1,3]
console.log(largestDivisibleSubset([1, 2, 4, 8])); // [1,2,4,8]

// ─────────────────────────────────────────────────────────────────────────────
// LC #673: Number of LIS
// Time: O(n²) | Space: O(n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extend LIS DP with a count array:
 * dp[i] = length of LIS ending at i
 * count[i] = number of LIS of length dp[i] ending at i
 *
 * Transitions:
 * If nums[j] < nums[i]:
 *   if dp[j]+1 > dp[i]: found longer — dp[i] = dp[j]+1, count[i] = count[j]
 *   if dp[j]+1 == dp[i]: found same length — count[i] += count[j]
 *
 * Answer: sum of count[i] for all i where dp[i] == maxLen
 */
function findNumberOfLIS(nums) {
  const n = nums.length;
  if (n === 0) return 0;

  const dp = new Array(n).fill(1);
  const count = new Array(n).fill(1); // count[i] = # of LIS ending at i

  let maxLen = 1;

  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        if (dp[j] + 1 > dp[i]) {
          dp[i] = dp[j] + 1;
          count[i] = count[j]; // Reset count, found new longest
        } else if (dp[j] + 1 === dp[i]) {
          count[i] += count[j]; // Add count of equal-length paths
        }
      }
    }
    maxLen = Math.max(maxLen, dp[i]);
  }

  // Sum counts of all LIS with the maximum length
  let result = 0;
  for (let i = 0; i < n; i++) {
    if (dp[i] === maxLen) result += count[i];
  }
  return result;
}

console.log("\n=== LC #673: Number of LIS ===");
console.log(findNumberOfLIS([1, 3, 5, 4, 7])); // 2: [1,3,5,7] and [1,3,4,7]
console.log(findNumberOfLIS([2, 2, 2, 2, 2])); // 5: each single element

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LIS PATTERN GUIDE
 *
 * Problem         Key Observation                          Approach
 * ─────────────   ──────────────────────────────────────   ──────────────────
 * Basic LIS       Find longest strictly increasing subseq  DP O(n²) or BSearch O(n log n)
 * Russian Doll    2D LIS — sort width ASC, height DESC      Reduce to 1D LIS
 * Divisible Set   Divisibility is like < in LIS            DP with parent tracking
 * Count LIS       How many LIS exist?                      DP + count array
 *
 * PATIENCE SORTING INTUITION:
 * Think of it as a card game. Each pile's top card is the current
 * "candidate" for extending subsequences. We always place a card on the
 * leftmost pile whose top >= current card (binary search). A new pile =
 * extending the LIS by 1. The number of piles = LIS length.
 *
 * COMPLEXITY SUMMARY:
 * - DP: O(n²) time, O(n) space
 * - Patience sort: O(n log n) time, O(n) space
 * - With count tracking: O(n²) time, O(n) space (no known O(n log n) for count)
 */

// Verify all solutions
console.log("\n=== All Tests ===");
console.assert(lengthOfLIS_DP([0, 1, 0, 3, 2, 3]) === 4, "#300 DP failed");
console.assert(lengthOfLIS_Patience([0, 1, 0, 3, 2, 3]) === 4, "#300 Patience failed");
console.assert(maxEnvelopes([[5, 4], [6, 4], [6, 7], [2, 3]]) === 3, "#354 failed");
console.assert(findNumberOfLIS([1, 3, 5, 4, 7]) === 2, "#673 failed");
console.log("All tests passed!");

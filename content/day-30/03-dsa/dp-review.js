/**
 * Day 30 — DSA: DP Review (Hardest Patterns)
 *
 * LeetCode #300: Longest Increasing Subsequence
 * LeetCode #1143: Longest Common Subsequence
 * LeetCode #72: Edit Distance
 *
 * These three problems are the hardest standard DP patterns.
 * Know them cold — they appear in FAANG interviews frequently.
 */

// ─────────────────────────────────────────────
// LeetCode #300: Longest Increasing Subsequence (LIS)
// ─────────────────────────────────────────────

/**
 * Approach 1: DP O(n²)
 * dp[i] = length of LIS ending at index i
 * Recurrence: dp[i] = max(dp[j] + 1) for all j < i where nums[j] < nums[i]
 * Base case: dp[i] = 1 (single element is always a subsequence of length 1)
 * Answer: max(dp)
 *
 * Time: O(n²), Space: O(n)
 */
function lengthOfLIS_dp(nums) {
  const n = nums.length;
  const dp = new Array(n).fill(1);

  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }

  return Math.max(...dp);
}

/**
 * Approach 2: Binary Search + Patience Sorting O(n log n)
 *
 * Maintain an array `tails` where tails[i] is the SMALLEST tail element
 * of all increasing subsequences of length i+1.
 *
 * For each element:
 * - Binary search for the first tail >= current element (leftmost insertion point)
 * - Replace that tail with current element (keep tails as small as possible)
 * - If no such tail exists, append (extend the LIS by 1)
 *
 * The LENGTH of tails = length of LIS.
 * Note: tails does NOT represent the actual LIS — just its length!
 *
 * Time: O(n log n), Space: O(n)
 *
 * Why does this work?
 * We want to keep tails[i] as SMALL as possible to leave room for
 * future elements to extend longer subsequences.
 * By replacing tails[pos] with nums[i], we're saying "there's an IS
 * of length pos+1 with a smaller tail — allowing more extensions later."
 */
function lengthOfLIS_binarySearch(nums) {
  const tails = []; // tails[i] = smallest tail of IS of length i+1

  for (const num of nums) {
    // Binary search: find leftmost position where tails[pos] >= num
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < num) lo = mid + 1;
      else hi = mid;
    }

    if (lo === tails.length) {
      tails.push(num); // new element extends the longest IS
    } else {
      tails[lo] = num; // replace to keep tails minimal
    }
  }

  return tails.length;
}

/**
 * How to reconstruct the actual LIS (not just its length):
 * Maintain a parent array and track which index each element came from.
 */
function findLIS(nums) {
  const n = nums.length;
  const dp = new Array(n).fill(1);
  const parent = new Array(n).fill(-1);

  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
        parent[i] = j;
      }
    }
  }

  // Find the end of the LIS
  let maxLen = 0, endIdx = 0;
  for (let i = 0; i < n; i++) {
    if (dp[i] > maxLen) { maxLen = dp[i]; endIdx = i; }
  }

  // Backtrack to find the sequence
  const lis = [];
  let idx = endIdx;
  while (idx !== -1) {
    lis.push(nums[idx]);
    idx = parent[idx];
  }

  return lis.reverse();
}

console.log('=== LeetCode #300: LIS ===');
const nums1 = [10, 9, 2, 5, 3, 7, 101, 18];
console.log(`Input: [${nums1}]`);
console.log('DP O(n²):', lengthOfLIS_dp(nums1));          // 4
console.log('BinarySearch O(n log n):', lengthOfLIS_binarySearch(nums1)); // 4
console.log('Actual LIS:', JSON.stringify(findLIS(nums1)));  // [2,3,7,18] or [2,5,7,18]
console.log('LIS of [0,1,0,3,2,3]:', lengthOfLIS_binarySearch([0,1,0,3,2,3])); // 4


// ─────────────────────────────────────────────
// LeetCode #1143: Longest Common Subsequence (LCS)
// ─────────────────────────────────────────────

/**
 * Classic 2D DP.
 * dp[i][j] = LCS length of text1[0..i-1] and text2[0..j-1]
 *
 * Recurrence:
 *   if text1[i-1] === text2[j-1]: dp[i][j] = dp[i-1][j-1] + 1  (extend common subsequence)
 *   else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])                (skip one character from either)
 *
 * Base case: dp[0][j] = dp[i][0] = 0 (empty string has LCS of 0 with anything)
 *
 * Time: O(m * n), Space: O(m * n) table / O(n) with rolling array
 */
function longestCommonSubsequence(text1, text2) {
  const m = text1.length, n = text2.length;
  // dp[i][j] = LCS(text1[0..i-1], text2[0..j-1])
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1; // characters match — extend
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); // skip one from either
      }
    }
  }

  return dp[m][n];
}

/**
 * Space-optimized LCS: O(n) space using two rows
 */
function longestCommonSubsequence_optimized(text1, text2) {
  const m = text1.length, n = text2.length;
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev]; // swap arrays (no allocation)
    curr.fill(0);
  }

  return prev[n];
}

console.log('\n=== LeetCode #1143: LCS ===');
console.log('"abcde" vs "ace":', longestCommonSubsequence('abcde', 'ace'));   // 3 (a,c,e)
console.log('"abc" vs "abc":', longestCommonSubsequence('abc', 'abc'));         // 3
console.log('"abc" vs "def":', longestCommonSubsequence('abc', 'def'));         // 0
console.log('Optimized:', longestCommonSubsequence_optimized('abcde', 'ace'));  // 3


// ─────────────────────────────────────────────
// LeetCode #72: Edit Distance (Levenshtein Distance)
// ─────────────────────────────────────────────

/**
 * Min operations (insert, delete, replace) to convert word1 → word2.
 *
 * dp[i][j] = min edits to convert word1[0..i-1] to word2[0..j-1]
 *
 * Recurrence:
 *   if word1[i-1] === word2[j-1]: dp[i][j] = dp[i-1][j-1]  (no edit needed)
 *   else: dp[i][j] = 1 + min(
 *     dp[i-1][j],    // delete from word1 (remove word1[i-1])
 *     dp[i][j-1],    // insert into word1 (add word2[j-1])
 *     dp[i-1][j-1]   // replace word1[i-1] with word2[j-1]
 *   )
 *
 * Base cases:
 *   dp[i][0] = i (delete all i chars from word1 to get empty string)
 *   dp[0][j] = j (insert j chars to convert empty string to word2[0..j-1])
 *
 * Time: O(m * n), Space: O(m * n) / O(n) optimized
 */
function minDistance(word1, word2) {
  const m = word1.length, n = word2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i || j));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]; // no edit
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],   // delete
          dp[i][j - 1],   // insert
          dp[i - 1][j - 1] // replace
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Space-optimized: O(n) using rolling row
 */
function minDistance_optimized(word1, word2) {
  const m = word1.length, n = word2.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j); // prev[j] = dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    const curr = [i]; // curr[0] = dp[i][0] = i
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        curr[j] = prev[j - 1]; // diagonal — no edit
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
    }
    prev = curr;
  }

  return prev[n];
}

console.log('\n=== LeetCode #72: Edit Distance ===');
console.log('"horse" → "ros":', minDistance('horse', 'ros'));                // 3
console.log('"intention" → "execution":', minDistance('intention', 'execution')); // 5
console.log('"" → "abc":', minDistance('', 'abc'));                          // 3
console.log('Optimized "horse"→"ros":', minDistance_optimized('horse', 'ros')); // 3


// ─────────────────────────────────────────────
// Summary: Three Core DP Patterns
// ─────────────────────────────────────────────
console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║              THREE HARDEST DP PATTERNS                                 ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║ LIS (Longest Increasing Subsequence):                                  ║
║   dp[i] = max(dp[j]+1) where j<i and nums[j]<nums[i]                  ║
║   Optimize: binary search on tails array → O(n log n)                 ║
║   Key: tails is SORTED but doesn't represent the actual LIS           ║
║                                                                        ║
║ LCS (Longest Common Subsequence):                                      ║
║   dp[i][j] = LCS of first i chars of s1, first j chars of s2          ║
║   Match → diagonal+1, no match → max(up, left)                        ║
║   Related: diff tool, DNA sequence alignment, plagiarism detection     ║
║                                                                        ║
║ Edit Distance (Levenshtein):                                           ║
║   dp[i][j] = min edits to transform s1[0..i-1] → s2[0..j-1]          ║
║   Match → diagonal, else 1 + min(up=delete, left=insert, diag=replace)║
║   Real use: spell checkers, fuzzy search, git diff                    ║
║                                                                        ║
╠════════════════════════╦═══════════════╦════════════════════╦═════════╣
║ Problem                ║ Time (basic)  ║ Time (optimized)   ║ Space   ║
╠════════════════════════╬═══════════════╬════════════════════╬═════════╣
║ LIS                    ║ O(n²)         ║ O(n log n)          ║ O(n)    ║
║ LCS                    ║ O(m*n)        ║ O(m*n) (same)       ║ O(n)    ║
║ Edit Distance          ║ O(m*n)        ║ O(m*n) (same)       ║ O(n)    ║
╚════════════════════════╩═══════════════╩════════════════════╩═════════╝
`);

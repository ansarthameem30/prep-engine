/**
 * Day 52 — Hard Dynamic Programming Problems
 *
 * Problems:
 *  1. LeetCode #10  — Regular Expression Matching   O(m*n)
 *  2. LeetCode #44  — Wildcard Matching             O(m*n)
 *  3. LeetCode #115 — Distinct Subsequences         O(m*n)
 *  4. LeetCode #87  — Scramble String               O(n^4) with memoization
 */

// ─────────────────────────────────────────────────────────────
// #10 — Regular Expression Matching
// ─────────────────────────────────────────────────────────────
/**
 * Pattern: '.' matches any single char. '*' matches zero or more of preceding char.
 *
 * DP definition:
 *   dp[i][j] = can pattern[0..j-1] match string[0..i-1]
 *
 * Base cases:
 *   dp[0][0] = true (empty matches empty)
 *   dp[0][j]: pattern can match empty string only if pattern has 'x*' pairs
 *             dp[0][j] = dp[0][j-2] if pattern[j-1] === '*'
 *
 * Transitions:
 *   If pattern[j-1] is '.' or matches s[i-1]:
 *     dp[i][j] = dp[i-1][j-1]      (consume both chars)
 *   If pattern[j-1] is '*':
 *     Zero occurrences:  dp[i][j] = dp[i][j-2]        (skip 'x*')
 *     One+ occurrences:  dp[i][j] |= dp[i-1][j]        (if s[i-1] matches pattern[j-2])
 *
 * Time: O(m*n), Space: O(m*n)
 */
function isMatch(s, p) {
  const m = s.length;
  const n = p.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false));

  dp[0][0] = true;

  // Empty string can be matched by "a*", "a*b*", "a*b*c*" etc.
  for (let j = 2; j <= n; j++) {
    if (p[j - 1] === '*') dp[0][j] = dp[0][j - 2];
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (p[j - 1] === '*') {
        // Zero occurrences of 'x' before '*': skip "x*"
        dp[i][j] = dp[i][j - 2];
        // One or more occurrences: if current s[i-1] matches p[j-2]
        if (p[j - 2] === '.' || p[j - 2] === s[i - 1]) {
          dp[i][j] = dp[i][j] || dp[i - 1][j];
        }
      } else if (p[j - 1] === '.' || p[j - 1] === s[i - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      }
    }
  }

  return dp[m][n];
}

console.log('=== #10 Regular Expression Matching ===');
console.log(isMatch('aa', 'a'));       // false
console.log(isMatch('aa', 'a*'));      // true
console.log(isMatch('ab', '.*'));      // true
console.log(isMatch('aab', 'c*a*b')); // true
console.log(isMatch('mississippi', 'mis*is*p*.')); // false

// ─────────────────────────────────────────────────────────────
// #44 — Wildcard Matching
// ─────────────────────────────────────────────────────────────
/**
 * Pattern: '?' matches any single char. '*' matches any sequence (including empty).
 *
 * Difference from #10: '*' here is simpler — it matches ANY sequence, not "zero or more of preceding".
 *
 * dp[i][j] = can pattern[0..j-1] match string[0..i-1]
 *
 * Transitions:
 *   If p[j-1] === '*':
 *     Empty match: dp[i][j] = dp[i][j-1]     (treat * as empty)
 *     Extend:      dp[i][j] |= dp[i-1][j]     (* consumes s[i-1])
 *   If p[j-1] === '?' or p[j-1] === s[i-1]:
 *     dp[i][j] = dp[i-1][j-1]
 *
 * Time: O(m*n), Space: O(m*n) — optimizable to O(n) with rolling array
 */
function isMatchWildcard(s, p) {
  const m = s.length;
  const n = p.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false));

  dp[0][0] = true;

  // pattern of all '*' can match empty string
  for (let j = 1; j <= n; j++) {
    if (p[j - 1] === '*') dp[0][j] = dp[0][j - 1];
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (p[j - 1] === '*') {
        dp[i][j] = dp[i][j - 1] || dp[i - 1][j]; // empty or extend
      } else if (p[j - 1] === '?' || p[j - 1] === s[i - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      }
    }
  }

  return dp[m][n];
}

console.log('\n=== #44 Wildcard Matching ===');
console.log(isMatchWildcard('aa', 'a'));    // false
console.log(isMatchWildcard('aa', '*'));    // true
console.log(isMatchWildcard('cb', '?a'));   // false
console.log(isMatchWildcard('adceb', '*a*b')); // true
console.log(isMatchWildcard('acdcb', 'a*c?b')); // false

// ─────────────────────────────────────────────────────────────
// #115 — Distinct Subsequences
// ─────────────────────────────────────────────────────────────
/**
 * Count the number of distinct subsequences of s that equal t.
 *
 * dp[i][j] = number of ways to form t[0..j-1] from s[0..i-1]
 *
 * Base cases:
 *   dp[i][0] = 1 for all i: empty t can always be formed (by choosing nothing)
 *   dp[0][j] = 0 for j>0: can't form non-empty t from empty s
 *
 * Transitions:
 *   Don't use s[i-1]: dp[i][j] = dp[i-1][j]
 *   Use s[i-1] if s[i-1] === t[j-1]: dp[i][j] += dp[i-1][j-1]
 *
 * Time: O(m*n), Space: O(m*n) — optimizable to O(n)
 */
function numDistinct(s, t) {
  const m = s.length;
  const n = t.length;

  // Space-optimized: 1D DP, iterate t backwards to avoid overwriting
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1; // base: empty t

  for (let i = 1; i <= m; i++) {
    // Traverse t backwards — important to not use updated values in same row
    for (let j = n; j >= 1; j--) {
      if (s[i - 1] === t[j - 1]) {
        dp[j] += dp[j - 1];
      }
    }
  }

  return dp[n];
}

console.log('\n=== #115 Distinct Subsequences ===');
console.log(numDistinct('rabbbit', 'rabbit')); // 3
console.log(numDistinct('babgbag', 'bag'));     // 5
console.log(numDistinct('b', 'a'));             // 0

// ─────────────────────────────────────────────────────────────
// #87 — Scramble String
// ─────────────────────────────────────────────────────────────
/**
 * A string is scrambled by splitting it at any position, optionally swapping
 * the two parts, then recursively scrambling each part.
 *
 * isScramble(s1, s2):
 *   For each split point k (1 to n-1):
 *     Case 1 (no swap): isScramble(s1[0..k-1], s2[0..k-1]) && isScramble(s1[k..], s2[k..])
 *     Case 2 (swap):    isScramble(s1[0..k-1], s2[n-k..]) && isScramble(s1[k..], s2[0..n-k-1])
 *
 * Optimization: prune early if sorted characters don't match (necessary condition).
 *
 * Memoization: key = `${s1}#${s2}` since substrings are bounded by original length.
 *
 * Time:  O(n^4) — n choices for s1, n choices for s2, n-1 split points, O(n) string ops
 * Space: O(n^4) — memoization table
 */
function isScramble(s1, s2) {
  if (s1.length !== s2.length) return false;

  const memo = new Map();

  function dp(a, b) {
    if (a === b) return true;
    const key = `${a}#${b}`;
    if (memo.has(key)) return memo.get(key);

    const n = a.length;

    // Pruning: if characters don't match, impossible
    if ([...a].sort().join('') !== [...b].sort().join('')) {
      memo.set(key, false);
      return false;
    }

    for (let k = 1; k < n; k++) {
      // Case 1: no swap
      if (dp(a.slice(0, k), b.slice(0, k)) && dp(a.slice(k), b.slice(k))) {
        memo.set(key, true);
        return true;
      }
      // Case 2: swap — left of a matches right of b, right of a matches left of b
      if (dp(a.slice(0, k), b.slice(n - k)) && dp(a.slice(k), b.slice(0, n - k))) {
        memo.set(key, true);
        return true;
      }
    }

    memo.set(key, false);
    return false;
  }

  return dp(s1, s2);
}

console.log('\n=== #87 Scramble String ===');
console.log(isScramble('great', 'rgeat')); // true
console.log(isScramble('abcde', 'caebd')); // false
console.log(isScramble('a', 'a'));          // true

/**
 * ─────────────────────────────────────────────────────────────
 * COMPLEXITY ANALYSIS
 * ─────────────────────────────────────────────────────────────
 *
 * #10 Regex Matching:
 *   dp table is (m+1) x (n+1).
 *   Each cell computed in O(1).
 *   Time: O(m*n), Space: O(m*n)
 *   Key insight: '*' can represent 0 occurrences (skip 2 pattern chars)
 *   or extend a match (look at dp[i-1][j] — same pattern position, shorter string).
 *
 * #44 Wildcard Matching:
 *   Same structure as #10 but '*' is simpler (no preceding char concept).
 *   Space can be optimized to O(n) using two rows.
 *   Time: O(m*n), Space: O(m*n)
 *
 * #115 Distinct Subsequences:
 *   Classic "count paths" DP. The key insight: at each position we either
 *   skip s[i] or use s[i] (if it matches t[j]).
 *   Space-optimized to O(n) by processing t backwards (avoid reading stale values).
 *
 * #87 Scramble String:
 *   Most complex. Naive recursion is exponential.
 *   Memoization reduces to O(n^4) total states:
 *   - Both a and b are substrings of length 1..n: O(n^2) starting positions for each
 *   - But since lengths are always equal and n is bounded, unique states = O(n^4)
 *   The sorted-chars pruning typically reduces practical runtime significantly.
 */

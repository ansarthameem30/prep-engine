/**
 * Day 43 DSA — Edit Distance and String DP
 *
 * Edit distance (Levenshtein distance) is foundational to NLP:
 * spell checking, fuzzy search, DNA sequence alignment, diff tools.
 * These DP problems share the same 2D grid approach.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LC #72: Edit Distance (Levenshtein Distance)
// Time: O(m*n) | Space: O(m*n) → O(n) with space optimization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * dp[i][j] = minimum operations to convert word1[0..i-1] to word2[0..j-1]
 *
 * Operations: insert, delete, replace (each costs 1)
 *
 * Recurrence:
 * if word1[i-1] === word2[j-1]: dp[i][j] = dp[i-1][j-1]  (no operation needed)
 * else: dp[i][j] = 1 + min(
 *   dp[i-1][j],   // delete from word1
 *   dp[i][j-1],   // insert into word1
 *   dp[i-1][j-1]  // replace in word1
 * )
 *
 * Base cases:
 * dp[0][j] = j (insert j chars to transform "" → word2[0..j-1])
 * dp[i][0] = i (delete i chars to transform word1[0..i-1] → "")
 */
function minDistance72(word1, word2) {
  const m = word1.length, n = word2.length;
  // dp is (m+1) x (n+1), row 0 and col 0 are base cases
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]; // Characters match, free move
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],   // Delete word1[i-1]
          dp[i][j - 1],   // Insert word2[j-1]
          dp[i - 1][j - 1] // Replace word1[i-1] with word2[j-1]
        );
      }
    }
  }

  return dp[m][n];
}

// Space-optimized version: only need previous row
function minDistance72_SpaceOpt(word1, word2) {
  const m = word1.length, n = word2.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j); // Base case: "" to word2[0..j]

  for (let i = 1; i <= m; i++) {
    const curr = new Array(n + 1);
    curr[0] = i; // Base case: word1[0..i] to ""
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
    }
    prev = curr;
  }

  return prev[n];
}

console.log("=== LC #72: Edit Distance ===");
console.log(minDistance72("horse", "ros")); // 3
console.log(minDistance72("intention", "execution")); // 5
console.log(minDistance72_SpaceOpt("horse", "ros")); // 3 (space optimized)

// ─────────────────────────────────────────────────────────────────────────────
// LC #583: Delete Operation for Two Strings
// Time: O(m*n) | Space: O(m*n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum number of deletions to make both strings equal.
 * Key insight: both strings become equal when reduced to LCS.
 * Deletions needed = len(s1) + len(s2) - 2 * LCS(s1, s2)
 *
 * This reduces to finding LCS (Longest Common Subsequence).
 */
function minDeleteDistance(word1, word2) {
  const m = word1.length, n = word2.length;

  // Find LCS using DP
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcsLength = dp[m][n];
  return (m - lcsLength) + (n - lcsLength); // Delete chars not in LCS
}

console.log("\n=== LC #583: Delete Operation for Two Strings ===");
console.log(minDeleteDistance("sea", "eat")); // 2 (delete 's', delete 't')
console.log(minDeleteDistance("leetcode", "etco")); // 4

// ─────────────────────────────────────────────────────────────────────────────
// LC #712: Minimum ASCII Delete Sum for Two Strings
// Time: O(m*n) | Space: O(m*n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Variant: delete cost = sum of ASCII values, not count.
 * dp[i][j] = min ASCII cost to make s1[0..i-1] == s2[0..j-1]
 *
 * Same structure as edit distance but cost is charCode, not 1.
 */
function minimumDeleteSum(s1, s2) {
  const m = s1.length, n = s2.length;

  // Base cases: cost to delete all chars to reach empty string
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    let row = new Array(n + 1).fill(0);
    row[0] = i > 0 ? dp?.[i - 1]?.[0] + s1.charCodeAt(i - 1) : 0;
    return row;
  });

  // Initialize properly
  for (let i = 0; i <= m; i++) dp[i][0] = 0;
  for (let j = 0; j <= n; j++) dp[0][j] = 0;

  // Build base cases
  for (let i = 1; i <= m; i++) dp[i][0] = dp[i - 1][0] + s1.charCodeAt(i - 1);
  for (let j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] + s2.charCodeAt(j - 1);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]; // Match: no deletion needed
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + s1.charCodeAt(i - 1), // Delete from s1
          dp[i][j - 1] + s2.charCodeAt(j - 1)  // Delete from s2
        );
      }
    }
  }

  return dp[m][n];
}

console.log("\n=== LC #712: Minimum ASCII Delete Sum ===");
console.log(minimumDeleteSum("sea", "eat")); // 231 (delete 's'=115, delete 't'=116)
console.log(minimumDeleteSum("delete", "leet")); // 403

// ─────────────────────────────────────────────────────────────────────────────
// LC #97: Interleaving String
// Time: O(m*n) | Space: O(m*n) → O(n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Is s3 formed by interleaving s1 and s2?
 * dp[i][j] = can s3[0..i+j-1] be formed by interleaving s1[0..i-1] and s2[0..j-1]?
 *
 * Recurrence:
 * dp[i][j] = (dp[i-1][j] && s1[i-1] == s3[i+j-1])
 *           || (dp[i][j-1] && s2[j-1] == s3[i+j-1])
 *
 * Quick sanity check: len(s1)+len(s2) must equal len(s3).
 */
function isInterleave(s1, s2, s3) {
  const m = s1.length, n = s2.length;
  if (m + n !== s3.length) return false;

  // Space-optimized: 1D array
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;

  // Initialize first row (using only s2)
  for (let j = 1; j <= n; j++) {
    dp[j] = dp[j - 1] && s2[j - 1] === s3[j - 1];
  }

  for (let i = 1; i <= m; i++) {
    dp[0] = dp[0] && s1[i - 1] === s3[i - 1]; // First column (using only s1)
    for (let j = 1; j <= n; j++) {
      dp[j] = (dp[j] && s1[i - 1] === s3[i + j - 1])
            || (dp[j - 1] && s2[j - 1] === s3[i + j - 1]);
    }
  }

  return dp[n];
}

console.log("\n=== LC #97: Interleaving String ===");
console.log(isInterleave("aabcc", "dbbca", "aadbbcbcac")); // true
console.log(isInterleave("aabcc", "dbbca", "aadbbbaccc")); // false
console.log(isInterleave("", "", "")); // true

// ─────────────────────────────────────────────────────────────────────────────
// NLP Connection: Edit Distance in Practice
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Edit distance powers many NLP applications:
 *
 * 1. SPELL CHECKING:
 *    For each misspelled word, find dictionary words within edit distance 1-2.
 *    Optimization: only consider words within edit distance 2 from the candidate.
 */
function findSpellingSuggestions(word, dictionary, maxDistance = 2) {
  return dictionary
    .filter((dictWord) => minDistance72(word, dictWord) <= maxDistance)
    .map((dictWord) => ({ word: dictWord, distance: minDistance72(word, dictWord) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
}

const dictionary = ["hello", "help", "hero", "held", "hell", "heel", "feel", "reel"];
console.log("\n=== NLP Connection: Spell Checking ===");
console.log("Suggestions for 'helo':", findSpellingSuggestions("helo", dictionary));

/**
 * 2. FUZZY STRING MATCHING:
 *    "aaple" should match "apple" (edit distance 1)
 *    Used in search, deduplication, record linkage.
 *
 * 3. DNA SEQUENCE ALIGNMENT:
 *    Mutations = substitutions (replace), insertions, deletions
 *    Same DP finds the optimal alignment.
 *
 * 4. GIT DIFF:
 *    Longest Common Subsequence identifies unchanged lines.
 *    Edit distance shows the minimum change set.
 *
 * COMPLEXITY SUMMARY:
 * Problem              Time     Space    Key Idea
 * ─────────────────    ──────   ──────   ─────────────────────────────
 * Edit Distance #72    O(mn)    O(n)*    3 ops: insert/delete/replace
 * Delete #583          O(mn)    O(mn)    Reduce to LCS, delete non-LCS chars
 * ASCII Delete #712    O(mn)    O(mn)    Same structure, cost = charCode
 * Interleaving #97     O(mn)    O(n)*    2D DP checking two sources
 * (* = space optimized)
 */

console.log("\n=== All Tests ===");
console.assert(minDistance72("horse", "ros") === 3, "#72 test 1 failed");
console.assert(minDistance72("", "") === 0, "#72 empty test failed");
console.assert(minDeleteDistance("sea", "eat") === 2, "#583 failed");
console.assert(isInterleave("aabcc", "dbbca", "aadbbcbcac") === true, "#97 test 1 failed");
console.assert(isInterleave("aabcc", "dbbca", "aadbbbaccc") === false, "#97 test 2 failed");
console.log("All tests passed!");

/**
 * LeetCode #3 – Longest Substring Without Repeating Characters
 * Difficulty: Medium
 * Pattern: Sliding Window + HashMap
 *
 * Problem:
 * Given a string s, find the length of the longest substring without
 * duplicate characters.
 *
 * Example:
 *   "abcabcbb" → 3  ("abc")
 *   "bbbbb"    → 1  ("b")
 *   "pwwkew"   → 3  ("wke")
 */

// ─────────────────────────────────────────────────────────────
// Approach 1: Brute Force — O(n²) or O(n³)
// ─────────────────────────────────────────────────────────────
function lengthOfLongestSubstringBrute(s) {
  let maxLen = 0;

  for (let i = 0; i < s.length; i++) {
    const seen = new Set();
    for (let j = i; j < s.length; j++) {
      if (seen.has(s[j])) break;
      seen.add(s[j]);
      maxLen = Math.max(maxLen, j - i + 1);
    }
  }

  return maxLen;
}

// ─────────────────────────────────────────────────────────────
// Approach 2: Sliding Window — O(n) time, O(min(m,n)) space
// ─────────────────────────────────────────────────────────────
// The Sliding Window Pattern:
// Maintain a window [left, right] that always contains unique characters.
// Expand right one step at a time.
// When a duplicate is found, shrink from left until the duplicate is removed.
//
// KEY OPTIMIZATION: instead of shrinking one step at a time,
// store the last SEEN INDEX of each character and jump left directly past it.

function lengthOfLongestSubstring(s) {
  const lastIndex = new Map(); // char → last seen index
  let maxLen = 0;
  let left = 0;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];

    // If ch was seen and its last position is inside our current window:
    if (lastIndex.has(ch) && lastIndex.get(ch) >= left) {
      // Jump left to just after the previous occurrence
      // (rather than shrinking one step at a time — O(n) vs O(n²))
      left = lastIndex.get(ch) + 1;
    }

    lastIndex.set(ch, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}

// Step-by-step trace for "abcabcbb":
// right=0 (a): no dup, window=[0,0] "a",       len=1, max=1
// right=1 (b): no dup, window=[0,1] "ab",      len=2, max=2
// right=2 (c): no dup, window=[0,2] "abc",     len=3, max=3
// right=3 (a): a seen at 0, left=1, window=[1,3] "bca", len=3, max=3
// right=4 (b): b seen at 1, left=2, window=[2,4] "cab", len=3, max=3
// right=5 (c): c seen at 2, left=3, window=[3,5] "abc", len=3, max=3
// right=6 (b): b seen at 4, left=5, window=[5,6] "cb",  len=2, max=3
// right=7 (b): b seen at 6, left=7, window=[7,7] "b",   len=1, max=3
// return 3 ✓

// ─────────────────────────────────────────────────────────────
// The Sliding Window Pattern — General Template
// ─────────────────────────────────────────────────────────────
/*
  The sliding window pattern applies when:
  - You need a contiguous subarray/substring
  - There is some constraint (no duplicates, sum <= k, at most k distinct chars)
  - You want to find max/min window satisfying the constraint

  Template:
    left = 0
    for right in [0, n-1]:
      expand window to include s[right]
      while constraint violated:
        shrink window from left (left++)
      update answer with current window
*/

// ─────────────────────────────────────────────────────────────
// Follow-Up Variants
// ─────────────────────────────────────────────────────────────

// Variant: At most K distinct characters
function lengthOfLongestSubstringKDistinct(s, k) {
  const freq = new Map();
  let left = 0, maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    freq.set(ch, (freq.get(ch) || 0) + 1);

    while (freq.size > k) {
      const leftChar = s[left++];
      freq.set(leftChar, freq.get(leftChar) - 1);
      if (freq.get(leftChar) === 0) freq.delete(leftChar);
    }

    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
console.log("=== Longest Substring Without Repeating Characters ===");
console.log(lengthOfLongestSubstringBrute("abcabcbb")); // 3
console.log(lengthOfLongestSubstring("abcabcbb"));      // 3
console.log(lengthOfLongestSubstring("bbbbb"));         // 1
console.log(lengthOfLongestSubstring("pwwkew"));        // 3
console.log(lengthOfLongestSubstring(""));              // 0
console.log(lengthOfLongestSubstring("dvdf"));          // 3

console.log("\n=== At Most K Distinct ===");
console.log(lengthOfLongestSubstringKDistinct("eceba", 2)); // 3 ("ece")
console.log(lengthOfLongestSubstringKDistinct("aa", 1));    // 2

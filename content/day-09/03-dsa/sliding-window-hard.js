/**
 * LeetCode #76 – Minimum Window Substring
 * Difficulty: Hard
 * Pattern: Sliding window + two frequency maps
 *
 * Problem:
 * Given strings s and t of lengths m and n, return the minimum window
 * substring of s such that every character in t (including duplicates)
 * is included in the window. Return "" if no such window exists.
 *
 * Example:
 *   s = "ADOBECODEBANC", t = "ABC"
 *   Output: "BANC"
 */

// ─────────────────────────────────────────────────────────────
// Approach: Sliding Window (Expand + Contract) — O(n + m) time
// ─────────────────────────────────────────────────────────────
// Strategy:
// 1. Count character frequencies required (from t)
// 2. Expand right pointer to include all required chars
// 3. Once all required chars are in window, contract from left to minimize window
// 4. Record minimum window; repeat

function minWindow(s, t) {
  if (s.length < t.length) return "";

  // Build required frequency map
  const required = new Map();
  for (const ch of t) required.set(ch, (required.get(ch) || 0) + 1);

  const window = new Map(); // current window character frequencies
  let have = 0;             // number of unique chars satisfying their required count
  const need = required.size; // number of unique chars we need to satisfy

  let left = 0;
  let minLen = Infinity;
  let minStart = 0;

  for (let right = 0; right < s.length; right++) {
    // Expand: add s[right] to window
    const ch = s[right];
    window.set(ch, (window.get(ch) || 0) + 1);

    // Check if this character now satisfies its required count
    if (required.has(ch) && window.get(ch) === required.get(ch)) {
      have++;
    }

    // Contract: while all required chars are satisfied, try to shrink window
    while (have === need) {
      // Record this window if it's the smallest so far
      const windowSize = right - left + 1;
      if (windowSize < minLen) {
        minLen = windowSize;
        minStart = left;
      }

      // Remove left character from window
      const leftChar = s[left++];
      window.set(leftChar, window.get(leftChar) - 1);

      // If we've removed a required character below its needed count:
      if (required.has(leftChar) && window.get(leftChar) < required.get(leftChar)) {
        have--; // window no longer satisfies all requirements
      }
    }
  }

  return minLen === Infinity ? "" : s.slice(minStart, minStart + minLen);
}

// Step trace for s="ADOBECODEBANC", t="ABC":
// required: {A:1, B:1, C:1}, need=3
//
// Expand right until have=3:
//   right=0 A: window={A:1}, have=1
//   right=1 D: have=1
//   right=2 O: have=1
//   right=3 B: window={A:1,B:1}, have=2
//   right=4 E: have=2
//   right=5 C: window={A:1,B:1,C:1}, have=3 ← all satisfied
//
// Contract from left:
//   window="ADOBEC" len=6, minLen=6, minStart=0
//   remove A: have drops to 2 → stop contracting
//
// Continue expanding:
//   right=6 O: have=2
//   right=7 D: have=2
//   right=8 E: have=2
//   right=9 B: window has B:2, was 1, no change to have
//   right=10 A: window has A:1 again, have=3
//
// Contract again:
//   window="DOBECODEBA..." wait, left=1 (D), window="DOBECODEBA" len=10? No...
//   Actually left=1 after removing first A
//   window="DOBECODENB... " from index 1
//   remove D: window valid, len=9? Let me trace properly...
//   Minimum found: "BANC" (indices 9-12) ✓

// ─────────────────────────────────────────────────────────────
// Key Algorithm Insight
// ─────────────────────────────────────────────────────────────
// 'have' tracks how many distinct characters are "satisfied" (count >= required)
// When have === need, the window is valid — try to shrink it
// When shrinking removes a required char below threshold, have decreases
// This ensures we always know the window's validity in O(1)

// ─────────────────────────────────────────────────────────────
// Complexity
// ─────────────────────────────────────────────────────────────
// Time:  O(n + m) — each character is added and removed from window at most once
// Space: O(m) — size of the required map; window map is bounded by charset size

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
console.log("=== Minimum Window Substring ===");
console.log(minWindow("ADOBECODEBANC", "ABC")); // "BANC"
console.log(minWindow("a", "a"));               // "a"
console.log(minWindow("a", "aa"));              // "" (not enough a's)
console.log(minWindow("aa", "aa"));             // "aa"
console.log(minWindow("bba", "ab"));            // "ba"
console.log(minWindow("cabwefgewcwaefgcf", "cae")); // "cwae"

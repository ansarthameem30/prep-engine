/**
 * LeetCode #567 – Permutation in String
 *
 * Given two strings s1 and s2, return true if s2 contains a permutation of s1.
 * In other words: does s2 contain some window of length s1.length
 * that has exactly the same character frequencies as s1?
 *
 * Constraints:
 * - 1 <= s1.length, s2.length <= 10^4
 * - s1 and s2 consist of lowercase English letters
 *
 * Pattern: Fixed-size Sliding Window with frequency matching
 * Time: O(26 + n) = O(n)  where n = s2.length
 * Space: O(26) = O(1)
 */

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH 1: Two frequency arrays + match counter
// Track how many of the 26 characters currently have matching counts.
// When matches === 26, the window is a permutation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} s1
 * @param {string} s2
 * @return {boolean}
 */
function checkInclusion(s1, s2) {
  if (s1.length > s2.length) return false;

  const freq1 = new Array(26).fill(0);
  const freq2 = new Array(26).fill(0);
  const a = 'a'.charCodeAt(0);

  // Build frequency maps for s1 and the first window of s2
  for (let i = 0; i < s1.length; i++) {
    freq1[s1.charCodeAt(i) - a]++;
    freq2[s2.charCodeAt(i) - a]++;
  }

  // Count how many character slots currently match between freq1 and freq2
  let matches = 0;
  for (let i = 0; i < 26; i++) {
    if (freq1[i] === freq2[i]) matches++;
  }

  // Slide the window across s2
  for (let i = s1.length; i < s2.length; i++) {
    if (matches === 26) return true;

    // Add right character
    const right = s2.charCodeAt(i) - a;
    freq2[right]++;
    if (freq1[right] === freq2[right]) {
      matches++;
    } else if (freq1[right] + 1 === freq2[right]) {
      // We just went from equal to +1, so we lost a match
      matches--;
    }

    // Remove left character
    const left = s2.charCodeAt(i - s1.length) - a;
    freq2[left]--;
    if (freq1[left] === freq2[left]) {
      matches++;
    } else if (freq1[left] - 1 === freq2[left]) {
      // We just went from equal to -1, so we lost a match
      matches--;
    }
  }

  return matches === 26;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH 2: Difference array (cleaner to reason about)
// diff[i] = freq1[i] - freq2[i]. Window is valid when all diff values are 0.
// Track the count of non-zero positions.
// ─────────────────────────────────────────────────────────────────────────────

function checkInclusionDiff(s1, s2) {
  if (s1.length > s2.length) return false;

  const a = 'a'.charCodeAt(0);
  const diff = new Array(26).fill(0);
  let nonZero = 0;

  // Build initial diff
  for (let i = 0; i < s1.length; i++) {
    diff[s1.charCodeAt(i) - a]++;
    diff[s2.charCodeAt(i) - a]--;
  }

  // Count non-zero positions
  for (const d of diff) {
    if (d !== 0) nonZero++;
  }

  if (nonZero === 0) return true;

  // Slide the window
  for (let i = s1.length; i < s2.length; i++) {
    // Add right character to window (subtract from diff since it's in s2)
    const right = s2.charCodeAt(i) - a;
    if (diff[right] === 0) nonZero++;   // was balanced, now imbalanced
    diff[right]--;
    if (diff[right] === 0) nonZero--;   // just became balanced

    // Remove left character from window (add back to diff)
    const left = s2.charCodeAt(i - s1.length) - a;
    if (diff[left] === 0) nonZero++;
    diff[left]++;
    if (diff[left] === 0) nonZero--;

    if (nonZero === 0) return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH 3: Sorting (naive, for conceptual comparison)
// O(n * k log k) — too slow for production but useful to verbalize in interviews
// ─────────────────────────────────────────────────────────────────────────────

function checkInclusionNaive(s1, s2) {
  const sorted1 = s1.split('').sort().join('');
  const k = s1.length;

  for (let i = 0; i <= s2.length - k; i++) {
    if (s2.slice(i, i + k).split('').sort().join('') === sorted1) {
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERALIZATION: Sliding window template for string problems
// This pattern covers: #567, #438 (Find All Anagrams), #76 (Min Window Substring)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find all start indices of p's anagrams in s (#438)
 * Same pattern as #567 but collect all valid positions instead of returning bool
 */
function findAnagrams(s, p) {
  if (p.length > s.length) return [];

  const a = 'a'.charCodeAt(0);
  const freq1 = new Array(26).fill(0);
  const freq2 = new Array(26).fill(0);
  const result = [];

  for (let i = 0; i < p.length; i++) {
    freq1[p.charCodeAt(i) - a]++;
    freq2[s.charCodeAt(i) - a]++;
  }

  let matches = 0;
  for (let i = 0; i < 26; i++) {
    if (freq1[i] === freq2[i]) matches++;
  }

  for (let i = p.length; i < s.length; i++) {
    if (matches === 26) result.push(i - p.length);

    const right = s.charCodeAt(i) - a;
    freq2[right]++;
    if (freq1[right] === freq2[right]) matches++;
    else if (freq1[right] + 1 === freq2[right]) matches--;

    const left = s.charCodeAt(i - p.length) - a;
    freq2[left]--;
    if (freq1[left] === freq2[left]) matches++;
    else if (freq1[left] - 1 === freq2[left]) matches--;
  }

  if (matches === 26) result.push(s.length - p.length);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

const tests = [
  { s1: 'ab', s2: 'eidbaooo', expected: true },   // 'ba' at index 3
  { s1: 'ab', s2: 'eidboaoo', expected: false },
  { s1: 'adc', s2: 'dcda', expected: true },       // 'dca' contains 'adc' perm
  { s1: 'a', s2: 'a', expected: true },
  { s1: 'ab', s2: 'ba', expected: true },
  { s1: 'abc', s2: 'bbbca', expected: true },      // 'bca' at index 2
];

console.log('=== Permutation in String Tests ===\n');
tests.forEach(({ s1, s2, expected }, i) => {
  const result1 = checkInclusion(s1, s2);
  const result2 = checkInclusionDiff(s1, s2);
  const pass = result1 === expected && result2 === expected;
  console.log(
    `Test ${i + 1}: s1="${s1}" s2="${s2}"`,
    `→ ${result1}`,
    pass ? '✓' : `✗ (expected ${expected})`
  );
});

console.log('\n=== Find All Anagrams Tests ===\n');
console.log(findAnagrams('cbaebabacd', 'abc')); // [0, 6]
console.log(findAnagrams('abab', 'ab'));         // [0, 1, 2]

// ─────────────────────────────────────────────────────────────────────────────
// INTERVIEW TALKING POINTS
// ─────────────────────────────────────────────────────────────────────────────

/*
 * Q: Why not just sort both strings and compare?
 * A: Sorting each window = O(k log k) per step = O(n * k log k) total.
 *    The sliding window with frequency arrays achieves O(n) by maintaining
 *    state incrementally — only update for the one character added and one removed.
 *
 * Q: Why track a `matches` counter instead of comparing full arrays?
 * A: Comparing 26-element arrays per step is O(26n) = O(n) but with a larger
 *    constant. The matches counter reduces the check to O(1) per step.
 *    More importantly, it's a clean pattern you can adapt quickly.
 *
 * Q: What if the character set wasn't lowercase English letters?
 * A: Use a Map instead of a 26-element array. Same algorithm, O(n) time,
 *    O(unique chars) space.
 *
 * Q: How would you extend this to variable-size windows?
 * A: That's LeetCode #76 (Minimum Window Substring) — use two pointers where
 *    the right pointer expands until the window is valid, then the left
 *    pointer contracts to minimize. Track a "formed" counter analogous to
 *    this problem's "matches" counter.
 */

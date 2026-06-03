/**
 * String Pattern Problems – Day 03
 * Problems: Valid Anagram (#242), Valid Palindrome (#125)
 * Pattern: Character frequency, Two pointers
 */

// ─────────────────────────────────────────────────────────────
// Problem 1: Valid Anagram (LeetCode #242)
// ─────────────────────────────────────────────────────────────
/**
 * Given two strings s and t, return true if t is an anagram of s.
 * An anagram uses all original characters, each exactly once.
 *
 * Example:
 *   "anagram", "nagaram" → true
 *   "rat", "car" → false
 */

// Approach 1: Sort (O(n log n), O(n) space — good baseline, not optimal)
function isAnagramSort(s, t) {
  if (s.length !== t.length) return false;
  return s.split("").sort().join("") === t.split("").sort().join("");
}

// Approach 2: Frequency Map — O(n) time, O(1) space (alphabet is fixed size)
function isAnagram(s, t) {
  if (s.length !== t.length) return false;

  const freq = new Array(26).fill(0);
  const base = "a".charCodeAt(0);

  for (let i = 0; i < s.length; i++) {
    freq[s.charCodeAt(i) - base]++;
    freq[t.charCodeAt(i) - base]--;
  }

  return freq.every(count => count === 0);
}

// Follow-up: what if inputs contain Unicode characters (not just a-z)?
// Use a Map instead of a fixed-size array:
function isAnagramUnicode(s, t) {
  if (s.length !== t.length) return false;

  const freq = new Map();
  for (const ch of s) freq.set(ch, (freq.get(ch) || 0) + 1);
  for (const ch of t) {
    if (!freq.has(ch)) return false;
    freq.set(ch, freq.get(ch) - 1);
    if (freq.get(ch) === 0) freq.delete(ch);
  }

  return freq.size === 0;
}

console.log("=== Valid Anagram ===");
console.log(isAnagram("anagram", "nagaram")); // true
console.log(isAnagram("rat", "car"));         // false
console.log(isAnagram("a", "a"));             // true
console.log(isAnagramUnicode("café", "éfac")); // true


// ─────────────────────────────────────────────────────────────
// Problem 2: Valid Palindrome (LeetCode #125)
// ─────────────────────────────────────────────────────────────
/**
 * Given a string s, return true if it is a palindrome, considering only
 * alphanumeric characters and ignoring case.
 *
 * Example:
 *   "A man, a plan, a canal: Panama" → true
 *   "race a car" → false
 */

// Approach 1: Clean then compare — O(n) time, O(n) space
function isPalindromeClean(s) {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned === cleaned.split("").reverse().join("");
}

// Approach 2: Two pointers — O(n) time, O(1) space (preferred)
function isPalindrome(s) {
  let left = 0;
  let right = s.length - 1;

  while (left < right) {
    // Skip non-alphanumeric characters
    while (left < right && !isAlphanumeric(s[left])) left++;
    while (left < right && !isAlphanumeric(s[right])) right--;

    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
    left++;
    right--;
  }

  return true;
}

function isAlphanumeric(ch) {
  return /[a-zA-Z0-9]/.test(ch);
  // Alternative without regex: check char codes
  // const code = ch.charCodeAt(0);
  // return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

console.log("\n=== Valid Palindrome ===");
console.log(isPalindrome("A man, a plan, a canal: Panama")); // true
console.log(isPalindrome("race a car"));                     // false
console.log(isPalindrome(" "));                              // true (empty after clean)
console.log(isPalindrome("Was it a car or a cat I saw?"));   // true

// ─────────────────────────────────────────────────────────────
// Complexity Analysis
// ─────────────────────────────────────────────────────────────
// Valid Anagram (frequency map):
//   Time:  O(n) — one pass through each string
//   Space: O(1) — fixed 26-element array regardless of input size
//
// Valid Palindrome (two pointers):
//   Time:  O(n) — each character visited at most once
//   Space: O(1) — only two pointer variables, no extra strings

/**
 * LeetCode #49 – Group Anagrams
 * Difficulty: Medium
 * Pattern: HashMap grouping
 *
 * Problem:
 * Given an array of strings strs, group the anagrams together.
 * Return the groups in any order.
 *
 * Example:
 *   Input:  ["eat","tea","tan","ate","nat","bat"]
 *   Output: [["bat"],["nat","tan"],["ate","eat","tea"]]
 */

// ─────────────────────────────────────────────────────────────
// Approach 1: Sort as Key — O(n * k log k) time
// ─────────────────────────────────────────────────────────────
// Anagrams have the same sorted string. Use sorted string as the Map key.

function groupAnagrams(strs) {
  const map = new Map(); // sortedStr → [original strings]

  for (const str of strs) {
    const key = str.split("").sort().join("");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(str);
  }

  return [...map.values()];
}

// ─────────────────────────────────────────────────────────────
// Approach 2: Frequency Count as Key — O(n * k) time
// ─────────────────────────────────────────────────────────────
// Instead of sorting (O(k log k)), build a 26-char frequency string as key.
// e.g., "aab" → "2#1#0#...#0" (26 counts separated by delimiter)
// Better for very long strings, same asymptotic space.

function groupAnagramsFreq(strs) {
  const map = new Map();

  for (const str of strs) {
    const count = new Array(26).fill(0);
    const base = "a".charCodeAt(0);
    for (const ch of str) count[ch.charCodeAt(0) - base]++;
    const key = count.join("#"); // delimiter prevents "1,11" collisions
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(str);
  }

  return [...map.values()];
}

// ─────────────────────────────────────────────────────────────
// Complexity
// ─────────────────────────────────────────────────────────────
// n = number of strings, k = max string length
//
// Approach 1: O(n * k log k) time, O(n * k) space
//   - Sorting each string costs O(k log k), done n times
//
// Approach 2: O(n * k) time, O(n * k) space
//   - Linear scan per string costs O(k), done n times
//   - Better time complexity, same space

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
console.log("=== Group Anagrams ===");
console.log(groupAnagrams(["eat","tea","tan","ate","nat","bat"]));
// [["eat","tea","ate"], ["tan","nat"], ["bat"]] (order may vary)

console.log(groupAnagramsFreq(["eat","tea","tan","ate","nat","bat"]));
console.log(groupAnagrams([""]));   // [[""]]
console.log(groupAnagrams(["a"]));  // [["a"]]

// ─────────────────────────────────────────────────────────────
// Bonus: Top K Frequent Words (HashMap + sort)
// ─────────────────────────────────────────────────────────────
/**
 * Given a string array words and an integer k, return the k most frequent words.
 * Sort by frequency descending; ties broken alphabetically ascending.
 */
function topKFrequent(words, k) {
  const freq = new Map();
  for (const word of words) freq.set(word, (freq.get(word) || 0) + 1);

  return [...freq.keys()]
    .sort((a, b) => {
      if (freq.get(b) !== freq.get(a)) return freq.get(b) - freq.get(a);
      return a < b ? -1 : 1; // alphabetical tiebreak
    })
    .slice(0, k);
}

console.log("\n=== Top K Frequent Words ===");
console.log(topKFrequent(["i","love","leetcode","i","love","coding"], 2));
// ["i","love"]
console.log(topKFrequent(["the","day","is","sunny","the","the","the","sunny","is","is"], 4));
// ["the","is","sunny","day"]

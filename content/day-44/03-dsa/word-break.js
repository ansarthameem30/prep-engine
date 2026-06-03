/**
 * Day 44 DSA — Word Break Problems
 *
 * Connection to NLP: tokenization algorithms (BPE, WordPiece)
 * are fundamentally word-break DP problems — given a sequence of
 * characters, find all valid segmentations into known vocabulary units.
 *
 * These DP problems use a "can this prefix be segmented?" approach.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LC #139: Word Break
// Time: O(n² * m) | Space: O(n) where m = avg word length
// ─────────────────────────────────────────────────────────────────────────────

/**
 * dp[i] = true if s[0..i-1] can be segmented into words from wordDict.
 *
 * For each position i, check all possible last words:
 * dp[i] = OR over all j < i where dp[j] = true AND s[j..i-1] is in dict
 *
 * Use a Set for O(1) dictionary lookup.
 * BFS approach: process positions in order (layer by layer).
 */
function wordBreak139(s, wordDict) {
  const wordSet = new Set(wordDict);
  const n = s.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true; // Empty string is always "segmented"

  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && wordSet.has(s.slice(j, i))) {
        dp[i] = true;
        break; // Found one valid segmentation, no need to continue
      }
    }
  }

  return dp[n];
}

// BFS approach — can be faster in practice if we stop at first valid path
function wordBreak139_BFS(s, wordDict) {
  const wordSet = new Set(wordDict);
  const n = s.length;
  const visited = new Set(); // Avoid revisiting positions
  const queue = [0]; // BFS from position 0

  while (queue.length > 0) {
    const start = queue.shift();
    if (visited.has(start)) continue;
    visited.add(start);

    for (let end = start + 1; end <= n; end++) {
      if (wordSet.has(s.slice(start, end))) {
        if (end === n) return true; // Reached the end!
        queue.push(end);
      }
    }
  }

  return false;
}

console.log("=== LC #139: Word Break ===");
console.log(wordBreak139("leetcode", ["leet", "code"])); // true
console.log(wordBreak139("applepenapple", ["apple", "pen"])); // true
console.log(wordBreak139("catsandog", ["cats", "dog", "sand", "and", "cat"])); // false
console.log(wordBreak139_BFS("leetcode", ["leet", "code"])); // true

// ─────────────────────────────────────────────────────────────────────────────
// LC #140: Word Break II — Return all valid segmentations
// Time: O(n * 2^n) worst case | Space: O(n * 2^n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DFS with memoization.
 * memo[i] = all valid segmentations of s[i..n-1]
 *
 * Start from position i, try all words from wordDict that match
 * starting at position i, then recursively solve from the end of that word.
 */
function wordBreak140(s, wordDict) {
  const wordSet = new Set(wordDict);
  const memo = new Map(); // position → array of strings

  function dfs(start) {
    if (memo.has(start)) return memo.get(start);
    if (start === s.length) return [""]; // Base case: reached end

    const results = [];
    for (let end = start + 1; end <= s.length; end++) {
      const word = s.slice(start, end);
      if (wordSet.has(word)) {
        const suffixes = dfs(end);
        for (const suffix of suffixes) {
          results.push(suffix === "" ? word : word + " " + suffix);
        }
      }
    }

    memo.set(start, results);
    return results;
  }

  return dfs(0);
}

console.log("\n=== LC #140: Word Break II ===");
console.log(wordBreak140("catsanddog", ["cat", "cats", "and", "sand", "dog"]));
// ["cats and dog", "cat sand dog"]
console.log(wordBreak140("pineapplepenapple", ["apple", "pen", "applepen", "pine", "pineapple"]));

// ─────────────────────────────────────────────────────────────────────────────
// LC #472: Concatenated Words
// Time: O(n * L²) | Space: O(n * L) where L = max word length
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A word is "concatenated" if it can be formed by at least 2 other words
 * in the dictionary. Sort by length (shorter words first).
 * For each word, run wordBreak139 using only shorter words as the dictionary.
 *
 * This ensures no word is "formed" by itself.
 */
function findAllConcatenatedWordsInADict(words) {
  // Sort by length — shorter words first (they form the building blocks)
  words.sort((a, b) => a.length - b.length);

  const result = [];
  const wordSet = new Set(); // Build incrementally to avoid self-reference

  for (const word of words) {
    if (word.length === 0) continue;

    // Can this word be formed by 2+ words in the set so far?
    if (wordSet.size > 0 && canForm(word, wordSet)) {
      result.push(word);
    }
    wordSet.add(word); // Add after checking (so word can't use itself)
  }

  return result;
}

function canForm(word, wordSet) {
  if (word.length === 0) return false;
  const n = word.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;

  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && wordSet.has(word.slice(j, i))) {
        dp[i] = true;
        break;
      }
    }
  }
  return dp[n];
}

console.log("\n=== LC #472: Concatenated Words ===");
console.log(findAllConcatenatedWordsInADict(["cat", "cats", "catsdogcats", "dog", "dogcatsdog", "hippopotamuses", "rat", "ratcatdogcat"]));
// ["catsdogcats", "dogcatsdog", "ratcatdogcat"]

// ─────────────────────────────────────────────────────────────────────────────
// NLP Connection: BPE Tokenization as Word Break
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tokenization with vocabulary: given a vocabulary (subword units),
 * segment a word into subword tokens (greedy approach, like BPE encoding).
 */
function tokenizeWithVocabulary(text, vocabulary) {
  // Simplified BPE-style tokenization: greedy longest match
  const vocabSet = new Set(vocabulary);
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    let found = false;
    // Try longest match first
    for (let j = text.length; j > i; j--) {
      const candidate = text.slice(i, j);
      if (vocabSet.has(candidate)) {
        tokens.push(candidate);
        i = j;
        found = true;
        break;
      }
    }
    if (!found) {
      // Unknown character: treat as individual token with special marker
      tokens.push("[UNK:" + text[i] + "]");
      i++;
    }
  }

  return tokens;
}

console.log("\n=== NLP: BPE-style Tokenization ===");
// Simulate how "unhappiness" gets tokenized with a vocabulary
const vocabulary = [
  "un", "happi", "ness", "happy", "happiness",
  "pre", "fix", "prefix", "suffix", "suf",
  "un", "like", "unlike", "ly", "unlike",
];
console.log('Tokenize "unhappiness":', tokenizeWithVocabulary("unhappiness", vocabulary));
console.log('Tokenize "prefix":', tokenizeWithVocabulary("prefix", vocabulary));

/**
 * CONNECTION SUMMARY
 *
 * Word Break DP ←→ Tokenization Algorithms:
 * - wordBreak139 = "Can this string be tokenized?" (valid or not)
 * - wordBreak140 = "All possible tokenizations" (multiple segmentations)
 * - BPE: greedily merges most-frequent adjacent pairs,
 *   effectively solving word-break with a learned vocabulary
 *
 * COMPLEXITY SUMMARY:
 * Problem                  Time       Space    Notes
 * ────────────────────     ──────     ──────   ───────────────────────
 * #139 Word Break          O(n²·m)   O(n)     DP, m = avg word length
 * #139 BFS                 O(n²·m)   O(n)     BFS stops early
 * #140 Word Break II       O(n·2^n)  O(2^n)   Backtracking + memo
 * #472 Concatenated Words  O(n·L²)   O(n·L)   Sort + word break per word
 */

// Test all solutions
console.log("\n=== All Tests ===");
console.assert(wordBreak139("leetcode", ["leet", "code"]) === true);
console.assert(wordBreak139("catsandog", ["cats", "dog", "sand", "and", "cat"]) === false);
console.assert(wordBreak139_BFS("leetcode", ["leet", "code"]) === true);
console.assert(wordBreak140("catsanddog", ["cat", "cats", "and", "sand", "dog"]).length === 2);
console.log("All tests passed!");

/**
 * Day 32 — DSA: Trie Implementation
 *
 * Problems:
 *   1. LeetCode #208 — Implement Trie (insert/search/startsWith)
 *   2. LeetCode #211 — Design Add and Search Words (wildcard '.' with DFS)
 *   3. LeetCode #677 — Map Sum Pairs (Trie with integer values)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: Implement Trie (LC #208)
//
// A Trie (prefix tree) supports:
//   insert(word)         — add word to trie
//   search(word)         — return true if exact word exists
//   startsWith(prefix)   — return true if any word starts with prefix
//
// Time:  O(L) per operation where L = word/prefix length
// Space: O(A × L × N) total where A = alphabet size, N = number of words
//        In practice much better due to prefix sharing
// ─────────────────────────────────────────────────────────────────────────────

class TrieNode {
  constructor() {
    this.children = {}; // char -> TrieNode  (alternatively: Array(26))
    this.isEnd = false; // marks end of a valid word
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Insert a word into the trie.
   * Time: O(L), Space: O(L) for new nodes
   */
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) {
        node.children[ch] = new TrieNode();
      }
      node = node.children[ch];
    }
    node.isEnd = true;
  }

  /**
   * Returns true if the exact word exists in the trie.
   * Time: O(L)
   */
  search(word) {
    const node = this._traverse(word);
    return node !== null && node.isEnd;
  }

  /**
   * Returns true if any word in the trie starts with the given prefix.
   * Time: O(L)
   */
  startsWith(prefix) {
    return this._traverse(prefix) !== null;
  }

  _traverse(str) {
    let node = this.root;
    for (const ch of str) {
      if (!node.children[ch]) return null;
      node = node.children[ch];
    }
    return node;
  }
}

console.log("=== Implement Trie (LC #208) ===");
const trie = new Trie();
trie.insert("apple");
trie.insert("app");
trie.insert("application");
trie.insert("banana");

console.log(trie.search("app"));         // true
console.log(trie.search("appl"));        // false (not a complete word)
console.log(trie.startsWith("appl"));    // true
console.log(trie.search("apple"));       // true
console.log(trie.startsWith("ban"));     // true
console.log(trie.startsWith("xyz"));     // false

/*
 * Why use an object for children instead of Array(26)?
 *
 * Array(26): O(1) access, but wastes 25 slots for sparse alphabets (Unicode words, filenames).
 *   Index: ch.charCodeAt(0) - 'a'.charCodeAt(0)
 *   Better when alphabet is small and dense (a-z only, many words share prefixes)
 *
 * Object/Map: O(1) average access, memory-efficient for sparse inputs.
 *   Better when words contain varied characters (case-sensitive, numbers, symbols).
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Design Add and Search Words (LC #211)
//
// Like a regular Trie, but search() supports '.' as a wildcard that matches
// any single character.
//
// Strategy: Regular traversal for normal characters, DFS branching for '.'.
//
// Time:  O(L) for addWord, O(A^D × L) worst case for search with D wildcards
//        where A = alphabet size (26), D = number of wildcards
// Space: O(A × L × N) for the trie nodes
// ─────────────────────────────────────────────────────────────────────────────

class WordDictionary {
  constructor() {
    this.root = new TrieNode();
  }

  addWord(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.isEnd = true;
  }

  search(word) {
    return this._dfs(this.root, word, 0);
  }

  _dfs(node, word, idx) {
    if (idx === word.length) return node.isEnd;

    const ch = word[idx];

    if (ch !== ".") {
      // Normal character — deterministic traversal
      if (!node.children[ch]) return false;
      return this._dfs(node.children[ch], word, idx + 1);
    } else {
      // Wildcard '.' — try all possible children
      for (const child of Object.values(node.children)) {
        if (this._dfs(child, word, idx + 1)) return true;
      }
      return false;
    }
  }
}

console.log("\n=== Add and Search Words (LC #211) ===");
const dict = new WordDictionary();
dict.addWord("bad");
dict.addWord("dad");
dict.addWord("mad");

console.log(dict.search("pad")); // false — p not in trie
console.log(dict.search("bad")); // true
console.log(dict.search(".ad")); // true  — matches bad/dad/mad
console.log(dict.search("b..")); // true  — matches bad
console.log(dict.search("...")); // true  — matches any 3-letter word

/*
 * Key insight: When we hit a '.', we branch into ALL children and short-circuit
 * as soon as any branch returns true. This is DFS with backtracking.
 *
 * Worst case: all wildcards → tries every path → exponential in wildcards
 * But in practice, words quickly diverge, pruning most branches early.
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 3: Map Sum Pairs (LC #677)
//
// Implement MapSum with:
//   insert(key, val) — insert key with integer value (overwrite if exists)
//   sum(prefix)      — return sum of values for all keys starting with prefix
//
// Strategy: Store values at terminal nodes. On sum(), DFS subtree summing all values.
// Optimization: Store prefix-sum at every node to make sum() O(L) instead of O(subtree_size)
//
// Time:  O(L) for both insert and sum (with prefix-sum optimization)
// Space: O(A × L × N)
// ─────────────────────────────────────────────────────────────────────────────

class MapSumNode {
  constructor() {
    this.children = {};
    this.val = 0;      // value of the word ending here (0 if not a word)
    this.prefixSum = 0; // sum of all values in this subtree (prefix-sum optimization)
  }
}

class MapSum {
  constructor() {
    this.root = new MapSumNode();
    this.map = new Map(); // key -> val for detecting overwrites
  }

  /**
   * Insert key with value. If key already exists, update and adjust prefix sums.
   * Time: O(L)
   */
  insert(key, val) {
    const delta = val - (this.map.get(key) ?? 0);
    this.map.set(key, val);

    let node = this.root;
    // Update prefix sums along the path
    node.prefixSum += delta;
    for (const ch of key) {
      if (!node.children[ch]) node.children[ch] = new MapSumNode();
      node = node.children[ch];
      node.prefixSum += delta;
    }
    node.val = val;
  }

  /**
   * Return sum of all values with the given prefix.
   * Time: O(L) — just traverse to prefix node and return its prefixSum
   */
  sum(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children[ch]) return 0;
      node = node.children[ch];
    }
    return node.prefixSum;
  }
}

console.log("\n=== Map Sum Pairs (LC #677) ===");
const ms = new MapSum();
ms.insert("apple", 3);
console.log(ms.sum("ap")); // 3  — only "apple"
ms.insert("app", 2);
console.log(ms.sum("ap")); // 5  — "apple"(3) + "app"(2)
ms.insert("apple", 5);     // overwrite "apple" from 3 to 5
console.log(ms.sum("ap")); // 7  — "apple"(5) + "app"(2), delta +2 applied up the path
ms.insert("banana", 4);
console.log(ms.sum("b"));  // 4  — only "banana"
console.log(ms.sum(""));   // 11 — sum of all (prefix "" matches everything via root)

/*
 * Why store prefixSum at each node?
 *
 * Without it: sum() would require DFS over all subtree nodes → O(subtree_size)
 *   For a trie with 1M words, sum("a") could traverse millions of nodes.
 *
 * With prefixSum: sum() is O(L) — just walk to the prefix node and read the value.
 *   The tradeoff: insert() must update O(L) nodes instead of just the terminal.
 *   Since L is bounded by max word length (~20-50), this is always O(1) amortized.
 *
 * The overwrite case is handled correctly by tracking the delta between new and old
 * value in this.map, then adding only the delta to prefix sums — not re-adding the full value.
 */

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * TIME/SPACE COMPLEXITY SUMMARY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Operation        | Trie (#208)    | WordDict (#211)     | MapSum (#677)
 * -----------------|----------------|---------------------|----------------
 * insert/addWord   | O(L)           | O(L)                | O(L)
 * search/contains  | O(L)           | O(A^D × L) worst*   | N/A
 * startsWith/sum   | O(L)           | N/A                 | O(L)
 * Space (total)    | O(A × L × N)   | O(A × L × N)        | O(A × L × N)
 *
 * L = word length, N = number of words, A = alphabet size (26), D = wildcard count
 * * Wildcard search is worst-case exponential but fast in practice (short-circuit)
 *
 * Trie vs HashMap for these problems:
 * - HashMap search("apple") → O(L) hash computation
 * - HashMap startsWith("app") → O(N × L) scan all keys
 * - Trie startsWith("app") → O(L) — this is where Trie wins
 *
 * Use Trie when: prefix queries, autocomplete, spell check, IP routing (CIDR)
 * Use HashMap when: exact lookups only, no prefix patterns
 */

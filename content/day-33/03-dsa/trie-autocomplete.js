/**
 * Day 33 — DSA: Trie Autocomplete & Advanced Trie Problems
 *
 * Problems:
 *   1. LeetCode #642  — Design Search Autocomplete System
 *   2. LeetCode #745  — Prefix and Suffix Search (WordFilter)
 *   3. LeetCode #425  — Word Squares
 *
 * Real-world connection: How search autocomplete works at scale
 */

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: Design Search Autocomplete System (LC #642)
//
// Design autocomplete for a search bar:
//   - sentences: list of historical sentences
//   - times: number of times each sentence was typed
//   - input(c): type character c; '#' = submit sentence
//   - Returns top 3 hot sentences (by frequency, then alphabetically) matching current prefix
//
// Strategy: Trie where each node stores the top-3 candidates for that prefix.
//           Update on submit ('#'). Return stored top-3 on each character input.
//
// Time:  O(L × 3) per input char, O(L × log N) to insert new sentence (maintain sorted top-3)
// Space: O(A × L × N × 3) for trie with top-3 at each node
// ─────────────────────────────────────────────────────────────────────────────

class AutocompleteNode {
  constructor() {
    this.children = {};
    this.top3 = []; // [{sentence, count}] sorted by count desc, then lexicographic asc
  }

  addSentence(sentence, count) {
    // Update or insert in top-3 (sorted: higher count first, then lex order)
    const idx = this.top3.findIndex((s) => s.sentence === sentence);
    if (idx !== -1) {
      this.top3[idx].count = count;
    } else {
      this.top3.push({ sentence, count });
    }

    this.top3.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count; // higher count first
      return a.sentence.localeCompare(b.sentence);       // alphabetical for ties
    });

    if (this.top3.length > 3) this.top3.pop(); // keep only top 3
  }
}

class AutocompleteSystem {
  constructor(sentences, times) {
    this.root = new AutocompleteNode();
    this.currentInput = "";
    this.allSentences = new Map(); // sentence -> count

    for (let i = 0; i < sentences.length; i++) {
      this._insert(sentences[i], times[i]);
    }
  }

  _insert(sentence, count) {
    this.allSentences.set(sentence, count);
    let node = this.root;
    node.addSentence(sentence, count);
    for (const ch of sentence) {
      if (!node.children[ch]) node.children[ch] = new AutocompleteNode();
      node = node.children[ch];
      node.addSentence(sentence, count);
    }
  }

  input(c) {
    if (c === "#") {
      // User submitted the sentence
      const count = (this.allSentences.get(this.currentInput) ?? 0) + 1;
      this._insert(this.currentInput, count);
      this.currentInput = "";
      return [];
    }

    this.currentInput += c;

    // Traverse to the current prefix node
    let node = this.root;
    for (const ch of this.currentInput) {
      if (!node.children[ch]) return []; // No completions for this prefix
      node = node.children[ch];
    }

    return node.top3.map((s) => s.sentence);
  }
}

console.log("=== Search Autocomplete System (LC #642) ===");
const autocomplete = new AutocompleteSystem(
  ["i love you", "island", "iroman", "i love leetcode"],
  [5, 3, 2, 2]
);

console.log(autocomplete.input("i"));    // ["i love you", "island", "i love leetcode"]
console.log(autocomplete.input(" "));   // ["i love you", "i love leetcode"]
console.log(autocomplete.input("a"));   // []
console.log(autocomplete.input("#"));   // [] — submits "i a", count becomes 1
console.log(autocomplete.input("i"));   // ["i love you", "island", "i love leetcode"] (i a has count 1, not top 3 yet)

/*
 * Real-world search autocomplete at scale:
 *
 * 1. Offline phase: Count query frequencies from logs (MapReduce/Spark job every N minutes)
 *    Build Trie with top-K candidates per prefix. Serialize to disk.
 *
 * 2. Online phase: Load Trie into memory. Each search request = O(L) Trie lookup.
 *    For Google-scale (1M QPS): shard Trie by prefix (a-f → server 1, g-m → server 2, ...)
 *    Each prefix shard fits in one machine's RAM.
 *
 * 3. Personalization: Blend global popularity with personal search history.
 *    score = 0.7 × global_count + 0.3 × personal_count
 *
 * 4. Cache: Top-50 character prefixes ("the", "how", "what") cached in Redis.
 *    98% of queries are from popular prefixes.
 *
 * 5. Updates: Batch update Trie every 15-60 minutes. For breaking news,
 *    hot-path updates to the relevant prefix nodes only.
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Prefix and Suffix Search — WordFilter (LC #745)
//
// Design a class that finds the largest index of a word matching both
// a given prefix AND suffix.
//
// Naive approach: O(N × L) per query — too slow for many queries
//
// Optimal: Trie with suffix#prefix keys
//   For word "apple" (index i), insert all combinations:
//     "e#apple", "le#apple", "ple#apple", "pple#apple", "apple#apple", "#apple"
//   Query(prefix, suffix) = lookup Trie with key "{suffix}#{prefix}"
//
// Time:  O(L²) per word for preprocessing, O(L) per query
// Space: O(N × L²) for the Trie
// ─────────────────────────────────────────────────────────────────────────────

class WordFilterNode {
  constructor() {
    this.children = {};
    this.index = -1; // largest index of word ending here
  }
}

class WordFilter {
  constructor(words) {
    this.root = new WordFilterNode();

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const L = word.length;
      // Insert all (suffix, prefix) combinations
      for (let j = 0; j <= L; j++) {
        const key = word.slice(L - j) + "#" + word; // e.g., "e#apple", "#apple"
        this._insert(key, i);
      }
    }
  }

  _insert(key, index) {
    let node = this.root;
    for (const ch of key) {
      if (!node.children[ch]) node.children[ch] = new WordFilterNode();
      node = node.children[ch];
      node.index = Math.max(node.index, index); // keep largest index
    }
  }

  f(prefix, suffix) {
    const queryKey = suffix + "#" + prefix;
    let node = this.root;
    for (const ch of queryKey) {
      if (!node.children[ch]) return -1;
      node = node.children[ch];
    }
    return node.index;
  }
}

console.log("\n=== Prefix and Suffix Search (LC #745) ===");
const wf = new WordFilter(["apple", "application", "apply", "banana"]);
console.log(wf.f("app", "le"));    // 0 (apple) — has prefix "app" AND suffix "le"
console.log(wf.f("app", "n"));     // 1 (application) — has prefix "app" AND suffix "n"
console.log(wf.f("app", "y"));     // 2 (apply) — has prefix "app" AND suffix "y"
console.log(wf.f("ban", "na"));    // 3 (banana)
console.log(wf.f("xyz", "le"));    // -1 (no match)

/*
 * Why this approach works:
 * key = "{suffix}#{prefix}" captures both constraints in one Trie path.
 * The '#' separator is a sentinel that cannot appear in real words.
 *
 * For word "apple" (length 5), we insert 6 keys:
 *   "#apple" (empty suffix)
 *   "e#apple" (suffix = "e")
 *   "le#apple" (suffix = "le")
 *   "ple#apple" (suffix = "ple")
 *   "pple#apple" (suffix = "pple")
 *   "apple#apple" (suffix = "apple")
 *
 * Query("app", "le") = search for "le#app" — finds "le#apple" prefix!
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 3: Word Squares (LC #425)
//
// Given a list of unique words (all same length), find all word squares.
// A word square is a matrix where the k-th row and k-th column are identical.
//
// Example (4×4 word square):
//   ball
//   area
//   lead
//   lady
//
// Strategy: Backtracking + Trie for efficient prefix lookup
//   At step k, we know the k-th column must start with row[0][k], row[1][k], ... row[k-1][k]
//   Use Trie to quickly find all words starting with this prefix.
//
// Time:  O(N × L × 26^L) worst case, but Trie pruning makes it much faster
// Space: O(N × L) for Trie + O(L) recursion depth
// ─────────────────────────────────────────────────────────────────────────────

class SquareTrieNode {
  constructor() {
    this.children = {};
    this.words = []; // all words that pass through this node (for backtracking)
  }
}

function wordSquares(words) {
  if (!words.length) return [];

  // Build Trie where each node stores words with that prefix
  const root = new SquareTrieNode();

  for (const word of words) {
    let node = root;
    node.words.push(word);
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = new SquareTrieNode();
      node = node.children[ch];
      node.words.push(word); // store word at each prefix node
    }
  }

  function getWordsWithPrefix(prefix) {
    let node = root;
    for (const ch of prefix) {
      if (!node.children[ch]) return [];
      node = node.children[ch];
    }
    return node.words;
  }

  const wordLen = words[0].length;
  const results = [];

  function backtrack(square) {
    if (square.length === wordLen) {
      results.push([...square]);
      return;
    }

    const step = square.length;
    // The next word's prefix is determined by the current column values
    const prefix = square.map((w) => w[step]).join("");
    const candidates = getWordsWithPrefix(prefix);

    for (const candidate of candidates) {
      square.push(candidate);
      backtrack(square);
      square.pop();
    }
  }

  for (const word of words) {
    backtrack([word]);
  }

  return results;
}

console.log("\n=== Word Squares (LC #425) ===");
const words1 = ["area", "lead", "wall", "lady", "ball"];
const squares = wordSquares(words1);
console.log(`Found ${squares.length} word square(s):`);
squares.forEach((sq, i) => {
  console.log(`\nSquare ${i + 1}:`);
  sq.forEach((row) => console.log(`  ${row}`));
});

/*
 * Complexity analysis:
 * - Without Trie: For each backtracking step, scan all N words to find matching prefix → O(N²L) per path
 * - With Trie: getWordsWithPrefix is O(L), returns only valid candidates
 *   → Dramatically reduces branching factor in backtracking
 *
 * The key insight: At step k, the first k characters of the k-th word are FIXED
 * (determined by the k-th column of words already placed). Trie lookups allow
 * O(L) prefix filtering instead of O(N×L) linear scan.
 *
 * This pattern (Trie + backtracking for constrained word placement) appears in:
 * - Crossword puzzle solvers
 * - Scrabble AI
 * - Boggle word finding
 * - DNA sequence matching with constraints
 */

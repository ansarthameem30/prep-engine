/**
 * Day 31 — DSA: Advanced Backtracking
 *
 * Problems:
 *   1. LeetCode #51  — N-Queens
 *   2. LeetCode #79  — Word Search (DFS backtracking on grid)
 *   3. LeetCode #212 — Word Search II (Trie + DFS, optimal)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: N-Queens (LC #51)
// Place N queens on an N×N chessboard so no two queens attack each other.
// Return all valid board configurations.
//
// Key insight: Use O(1) sets to track occupied columns and diagonals.
//   - Main diagonal (top-left to bottom-right): row - col is constant
//   - Anti-diagonal (top-right to bottom-left): row + col is constant
//
// Time:  O(N!) — there are at most N! ways to place queens
// Space: O(N) for recursion stack + O(N) for the three sets
// ─────────────────────────────────────────────────────────────────────────────

function solveNQueens(n) {
  const results = [];
  const cols = new Set();
  const diag1 = new Set(); // row - col
  const diag2 = new Set(); // row + col
  const queens = Array(n).fill(-1); // queens[row] = col

  function backtrack(row) {
    if (row === n) {
      // Build board representation
      const board = queens.map(
        (col) =>
          ".".repeat(col) + "Q" + ".".repeat(n - col - 1)
      );
      results.push(board);
      return;
    }

    for (let col = 0; col < n; col++) {
      if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) {
        continue; // This position is attacked
      }

      // Place queen
      cols.add(col);
      diag1.add(row - col);
      diag2.add(row + col);
      queens[row] = col;

      backtrack(row + 1);

      // Remove queen (backtrack)
      cols.delete(col);
      diag1.delete(row - col);
      diag2.delete(row + col);
    }
  }

  backtrack(0);
  return results;
}

console.log("=== N-Queens (n=4) ===");
const nQueensSolutions = solveNQueens(4);
console.log(`Solutions: ${nQueensSolutions.length}`); // 2
nQueensSolutions.forEach((board, i) => {
  console.log(`\nSolution ${i + 1}:`);
  board.forEach((row) => console.log(row));
});

/*
 * Complexity analysis:
 * - Time:  O(N!) — branching factor starts at N, reduces each row
 * - Space: O(N) recursion depth + O(N) for sets (not board copies until result)
 * - The O(1) column/diagonal check (Set.has) vs O(N) naive array check
 *   matters at scale but doesn't change asymptotic complexity
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Word Search (LC #79)
// Given an m×n grid of characters and a word, find if the word exists in the grid.
// Word can be constructed from horizontally/vertically adjacent cells.
// The same cell may not be used more than once.
//
// Time:  O(M × N × 4^L) where L is the word length, 4 directions per cell
// Space: O(L) for recursion depth (the word length)
// ─────────────────────────────────────────────────────────────────────────────

function wordSearch(board, word) {
  const rows = board.length;
  const cols = board[0].length;

  function dfs(r, c, idx) {
    if (idx === word.length) return true;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    if (board[r][c] !== word[idx]) return false;

    // Mark cell as visited by replacing with sentinel
    const temp = board[r][c];
    board[r][c] = "#";

    const found =
      dfs(r + 1, c, idx + 1) ||
      dfs(r - 1, c, idx + 1) ||
      dfs(r, c + 1, idx + 1) ||
      dfs(r, c - 1, idx + 1);

    // Restore cell
    board[r][c] = temp;
    return found;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dfs(r, c, 0)) return true;
    }
  }
  return false;
}

console.log("\n=== Word Search ===");
const board1 = [
  ["A", "B", "C", "E"],
  ["S", "F", "C", "S"],
  ["A", "D", "E", "E"],
];
console.log(wordSearch(board1, "ABCCED")); // true
console.log(wordSearch(board1, "SEE"));    // true
console.log(wordSearch(board1, "ABCB"));   // false

/*
 * Complexity:
 * - Time:  O(M × N × 4^L): worst case tries DFS from every cell, each DFS
 *          explores 4 directions for L levels
 * - Space: O(L) call stack; O(1) extra space (modify board in-place)
 * - Optimization: early termination when character count in board is less
 *   than required by word (count chars before starting DFS)
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 3: Word Search II (LC #212)
// Find ALL words from a dictionary that exist in the board.
// Naive: run Word Search once per word → O(W × M × N × 4^L) — TLE on large inputs
// Optimal: Build Trie from all words, run DFS once → O(M × N × 4 × max_word_length)
//
// Time:  O(M × N × 4^{max_L}) for the DFS traversal (much better than per-word search)
// Space: O(total characters in all words) for the Trie
// ─────────────────────────────────────────────────────────────────────────────

class TrieNode {
  constructor() {
    this.children = {};
    this.word = null; // Store complete word at terminal node
  }
}

function wordSearchII(board, words) {
  // Build Trie
  const root = new TrieNode();
  for (const word of words) {
    let node = root;
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.word = word;
  }

  const rows = board.length;
  const cols = board[0].length;
  const result = [];

  function dfs(r, c, node) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const ch = board[r][c];
    if (ch === "#" || !node.children[ch]) return;

    const nextNode = node.children[ch];

    if (nextNode.word !== null) {
      result.push(nextNode.word);
      nextNode.word = null; // Prevent duplicates
    }

    board[r][c] = "#"; // Mark visited
    dfs(r + 1, c, nextNode);
    dfs(r - 1, c, nextNode);
    dfs(r, c + 1, nextNode);
    dfs(r, c - 1, nextNode);
    board[r][c] = ch; // Restore

    // Pruning: remove leaf nodes from Trie to avoid revisiting
    if (Object.keys(nextNode.children).length === 0) {
      delete node.children[ch];
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dfs(r, c, root);
    }
  }
  return result;
}

console.log("\n=== Word Search II ===");
const board2 = [
  ["o", "a", "a", "n"],
  ["e", "t", "a", "e"],
  ["i", "h", "k", "r"],
  ["i", "f", "l", "v"],
];
const words2 = ["oath", "pea", "eat", "rain"];
console.log(wordSearchII(board2, words2)); // ["eat", "oath"]

/*
 * Why Trie + DFS is dramatically faster:
 *
 * Naive approach: W words × O(M×N×4^L) per word
 *   = 1000 words × O(100 × 4^10) ≈ 100 billion operations
 *
 * Trie approach: Single DFS traversal guided by Trie
 *   = O(M × N × 4^{max_L}) ≈ 100 × 4^10 ≈ 100 million operations
 *   → ~1000x speedup for large word lists
 *
 * Additional optimizations applied:
 * 1. Set word = null after finding (deduplication without extra Set)
 * 2. Prune Trie branches with no children (avoid dead-end DFS paths)
 * 3. In-place board marking avoids O(M×N) visited array per DFS call
 */

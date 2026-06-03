/**
 * Day 29 — DSA: Backtracking Patterns
 *
 * LeetCode #46: Permutations
 * LeetCode #47: Permutations II (with duplicates)
 * LeetCode #39: Combination Sum (reuse allowed)
 * LeetCode #40: Combination Sum II (no reuse)
 *
 * Template: choose → explore → unchoose
 */

// ─────────────────────────────────────────────
// Backtracking Framework
// ─────────────────────────────────────────────
/*
 * function backtrack(state, choices):
 *   if isSolution(state):
 *     record(state)
 *     return
 *
 *   for choice in choices:
 *     if isValid(state, choice):
 *       make(state, choice)       // CHOOSE
 *       backtrack(state, ...)     // EXPLORE
 *       undo(state, choice)       // UNCHOOSE
 */

// ─────────────────────────────────────────────
// LeetCode #46: Permutations
// ─────────────────────────────────────────────

/**
 * Approach: visited array
 * At each position, try every unvisited number.
 *
 * Time: O(n! * n) — n! permutations, each takes O(n) to copy
 * Space: O(n) — recursion depth + visited array
 */
function permute(nums) {
  const result = [];
  const visited = new Array(nums.length).fill(false);

  function backtrack(current) {
    if (current.length === nums.length) {
      result.push([...current]); // SOLUTION: copy and record
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (visited[i]) continue;

      visited[i] = true;       // CHOOSE
      current.push(nums[i]);
      backtrack(current);      // EXPLORE
      current.pop();           // UNCHOOSE
      visited[i] = false;
    }
  }

  backtrack([]);
  return result;
}

console.log('=== LeetCode #46: Permutations ===');
console.log('[1,2,3]:', JSON.stringify(permute([1, 2, 3])));
// 6 permutations: [1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]


// ─────────────────────────────────────────────
// LeetCode #47: Permutations II (with duplicates)
// ─────────────────────────────────────────────

/**
 * Problem: nums may contain duplicates. Return all unique permutations.
 *
 * Key insight: sort first, then skip duplicate choices at the same recursion level.
 * Skip condition: nums[i] === nums[i-1] AND !visited[i-1]
 *
 * Why !visited[i-1]? This means nums[i-1] was NOT used in the current path —
 * so we're at the same recursion level where nums[i-1] was already explored.
 * Using nums[i] again at this level would create a duplicate branch.
 *
 * If visited[i-1] IS true, nums[i-1] is part of the current path — we're
 * in a different branch, and using nums[i] is valid.
 *
 * Time: O(n! * n) worst case (all distinct)
 * Space: O(n)
 */
function permuteUnique(nums) {
  nums.sort((a, b) => a - b); // MUST sort to group duplicates
  const result = [];
  const visited = new Array(nums.length).fill(false);

  function backtrack(current) {
    if (current.length === nums.length) {
      result.push([...current]);
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (visited[i]) continue;

      // Skip duplicate: same value as previous AND previous not in current path
      // This means we're choosing the same value for the same position again
      if (i > 0 && nums[i] === nums[i - 1] && !visited[i - 1]) continue;

      visited[i] = true;
      current.push(nums[i]);
      backtrack(current);
      current.pop();
      visited[i] = false;
    }
  }

  backtrack([]);
  return result;
}

console.log('\n=== LeetCode #47: Permutations II (duplicates) ===');
console.log('[1,1,2]:', JSON.stringify(permuteUnique([1, 1, 2])));
// 3 unique: [1,1,2],[1,2,1],[2,1,1]  (not 6)
console.log('[1,2,3]:', permuteUnique([1, 2, 3]).length, 'permutations');  // 6


// ─────────────────────────────────────────────
// LeetCode #39: Combination Sum (reuse allowed)
// ─────────────────────────────────────────────

/**
 * Problem: find all combinations of candidates that sum to target.
 * Each candidate may be used unlimited times.
 *
 * Backtracking: at each step, choose a candidate >= current index (avoid reordering).
 * Allow choosing the same index again (unbounded selection).
 *
 * Time: O(N^(T/M)) where T = target, M = minimum candidate value
 * Space: O(T/M) — max recursion depth
 */
function combinationSum(candidates, target) {
  const result = [];
  candidates.sort((a, b) => a - b); // optional, but enables early termination

  function backtrack(start, current, remaining) {
    if (remaining === 0) {
      result.push([...current]); // found a valid combination
      return;
    }

    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break; // sorted → no point continuing

      current.push(candidates[i]);             // CHOOSE
      backtrack(i, current, remaining - candidates[i]); // EXPLORE (i not i+1 — can reuse)
      current.pop();                           // UNCHOOSE
    }
  }

  backtrack(0, [], target);
  return result;
}

console.log('\n=== LeetCode #39: Combination Sum (reuse allowed) ===');
console.log('[2,3,6,7] target=7:', JSON.stringify(combinationSum([2, 3, 6, 7], 7)));
// [[2,2,3],[7]]
console.log('[2,3,5] target=8:', JSON.stringify(combinationSum([2, 3, 5], 8)));
// [[2,2,2,2],[2,3,3],[3,5]]


// ─────────────────────────────────────────────
// LeetCode #40: Combination Sum II (no reuse, skip duplicates)
// ─────────────────────────────────────────────

/**
 * Problem: candidates may contain duplicates. Each number used at most once.
 * Return unique combinations.
 *
 * Same as Subsets II pattern:
 * - Sort to group duplicates
 * - Skip: if candidates[i] === candidates[i-1] AND i > start
 *   (we already explored this value at this recursion level)
 * - Move to i+1 (not i) to prevent reuse
 *
 * Time: O(2^n) — each element is included or excluded
 * Space: O(n) — recursion depth
 */
function combinationSum2(candidates, target) {
  candidates.sort((a, b) => a - b); // MUST sort
  const result = [];

  function backtrack(start, current, remaining) {
    if (remaining === 0) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break; // pruning

      // Skip duplicate at same recursion level
      if (i > start && candidates[i] === candidates[i - 1]) continue;

      current.push(candidates[i]);
      backtrack(i + 1, current, remaining - candidates[i]); // i+1 (no reuse)
      current.pop();
    }
  }

  backtrack(0, [], target);
  return result;
}

console.log('\n=== LeetCode #40: Combination Sum II (no reuse) ===');
console.log('[10,1,2,7,6,1,5] target=8:', JSON.stringify(combinationSum2([10,1,2,7,6,1,5], 8)));
// [[1,1,6],[1,2,5],[1,7],[2,6]]
console.log('[2,5,2,1,2] target=5:', JSON.stringify(combinationSum2([2,5,2,1,2], 5)));
// [[1,2,2],[5]]


// ─────────────────────────────────────────────
// Backtracking Template and Complexity Guide
// ─────────────────────────────────────────────
console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║              BACKTRACKING TEMPLATE + PATTERNS                     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║ Core template:                                                    ║
║   function backtrack(state):                                      ║
║     if isSolution(state): record; return                          ║
║     for choice in choices:                                        ║
║       if valid(choice):                                           ║
║         make(choice)      // CHOOSE                               ║
║         backtrack(state)  // EXPLORE                              ║
║         undo(choice)      // UNCHOOSE                             ║
║                                                                   ║
║ Preventing duplicates (sort first, then):                         ║
║   Permutations: if nums[i]==nums[i-1] && !visited[i-1]: skip     ║
║   Subsets/Combos: if nums[i]==nums[i-1] && i > start: skip       ║
║                                                                   ║
║ Reuse control:                                                     ║
║   Allow reuse: recurse with same index i                          ║
║   No reuse:    recurse with i+1                                   ║
║                                                                   ║
╠═══════════════════════════╦══════════════╦════════════════════════╣
║ Problem                   ║ Time         ║ Space                  ║
╠═══════════════════════════╬══════════════╬════════════════════════╣
║ Permutations              ║ O(n! * n)    ║ O(n)                   ║
║ Permutations II           ║ O(n! * n)    ║ O(n)                   ║
║ Combination Sum (reuse)   ║ O(N^T/M)     ║ O(T/M)                 ║
║ Combination Sum II        ║ O(2^n)       ║ O(n)                   ║
╚═══════════════════════════╩══════════════╩════════════════════════╝
`);

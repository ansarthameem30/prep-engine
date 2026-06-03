/**
 * Day 22 — DSA: Subsets + Permutations (Backtracking)
 *
 * LeetCode #78: Subsets
 * LeetCode #46: Permutations
 * LeetCode #90: Subsets II (with duplicates)
 */

// ─────────────────────────────────────────────
// LeetCode #78: Subsets
// ─────────────────────────────────────────────

/**
 * Approach 1: Iterative Bit Manipulation
 * For n elements, there are 2^n subsets (each element is either in or out).
 * Represent each subset as an n-bit number: bit i set means nums[i] is included.
 *
 * Time: O(n * 2^n) — 2^n subsets, each takes O(n) to construct
 * Space: O(n * 2^n) — storing all subsets
 */
function subsets_bitwise(nums) {
  const n = nums.length;
  const result = [];

  for (let mask = 0; mask < (1 << n); mask++) {
    const subset = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) { // bit i is set
        subset.push(nums[i]);
      }
    }
    result.push(subset);
  }
  return result;
}

/**
 * Approach 2: Recursive Backtracking
 * At each position, we choose to include or exclude the element.
 * Build subsets by DFS, pushing snapshot at every node.
 *
 * Time: O(n * 2^n)
 * Space: O(n) — recursion depth (excluding output)
 */
function subsets_backtrack(nums) {
  const result = [];

  function backtrack(start, current) {
    result.push([...current]); // every node is a valid subset (pre-order snapshot)

    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);        // choose
      backtrack(i + 1, current);    // explore
      current.pop();                // unchoose
    }
  }

  backtrack(0, []);
  return result;
}

console.log('=== LeetCode #78: Subsets ===');
console.log('Bitwise [1,2,3]:', JSON.stringify(subsets_bitwise([1, 2, 3])));
// [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]
console.log('Backtrack [1,2,3]:', JSON.stringify(subsets_backtrack([1, 2, 3])));
// [[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]] (different order, same subsets)


// ─────────────────────────────────────────────
// LeetCode #46: Permutations
// ─────────────────────────────────────────────

/**
 * Backtracking with visited array
 * Try each unused number at each position.
 *
 * Time: O(n! * n) — n! permutations, each takes O(n) to copy
 * Space: O(n) — recursion depth + visited array (excluding output)
 */
function permute_visited(nums) {
  const result = [];
  const visited = new Array(nums.length).fill(false);

  function backtrack(current) {
    if (current.length === nums.length) {
      result.push([...current]);
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (visited[i]) continue;
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

/**
 * Swap-based approach (Heap's algorithm variant)
 * Avoids visited array by swapping elements in-place.
 * More cache-friendly — mutates the array rather than allocating visited array.
 *
 * Time: O(n! * n)
 * Space: O(n) — recursion depth only
 */
function permute_swap(nums) {
  const result = [];
  nums = [...nums]; // don't mutate input

  function backtrack(start) {
    if (start === nums.length) {
      result.push([...nums]);
      return;
    }

    for (let i = start; i < nums.length; i++) {
      [nums[start], nums[i]] = [nums[i], nums[start]]; // swap in
      backtrack(start + 1);
      [nums[start], nums[i]] = [nums[i], nums[start]]; // swap back
    }
  }

  backtrack(0);
  return result;
}

console.log('\n=== LeetCode #46: Permutations ===');
console.log('Visited [1,2,3]:', JSON.stringify(permute_visited([1, 2, 3])));
console.log('Swap [1,2,3]:', JSON.stringify(permute_swap([1, 2, 3])));
// Both: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]


// ─────────────────────────────────────────────
// LeetCode #90: Subsets II (array has duplicates)
// ─────────────────────────────────────────────

/**
 * Problem: nums may contain duplicates. Return all unique subsets.
 *
 * Key insight: sort the array first, then skip duplicate elements at the same
 * recursion level. If nums[i] === nums[i-1] and i > start, we've already
 * explored the branch starting with nums[i-1] at this level — skip it.
 *
 * Why sorting works: after sorting, duplicates are adjacent. At each level
 * of the recursion tree, we only take the FIRST occurrence of each value.
 * Second and later occurrences at the same level produce duplicate subsets.
 *
 * Time: O(n * 2^n)
 * Space: O(n) — recursion depth
 */
function subsetsWithDup(nums) {
  nums.sort((a, b) => a - b); // sort to group duplicates together
  const result = [];

  function backtrack(start, current) {
    result.push([...current]);

    for (let i = start; i < nums.length; i++) {
      // Skip duplicate: same value as previous at this recursion level
      if (i > start && nums[i] === nums[i - 1]) continue;

      current.push(nums[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

console.log('\n=== LeetCode #90: Subsets II (with duplicates) ===');
console.log('[1,2,2]:', JSON.stringify(subsetsWithDup([1, 2, 2])));
// Expected: [[],[1],[1,2],[1,2,2],[2],[2,2]]
console.log('[0]:', JSON.stringify(subsetsWithDup([0])));
// Expected: [[],[0]]


// ─────────────────────────────────────────────
// Bonus: Why the skip condition is `i > start` not `i > 0`
// ─────────────────────────────────────────────
console.log(`
Explanation of skip condition in Subsets II:

Input: [1, 2, 2] (sorted)

backtrack(0, [])
  ├── include 1 → backtrack(1, [1])
  │     ├── include 2(index=1) → backtrack(2, [1,2])
  │     │     └── include 2(index=2) → [1,2,2] ✓
  │     └── SKIP 2(index=2) because i=2 > start=1 AND nums[2]==nums[1]
  ├── include 2(index=1) → backtrack(2, [2])
  │     └── include 2(index=2) → [2,2] ✓
  └── SKIP 2(index=2) because i=2 > start=0 AND nums[2]==nums[1]

The condition 'i > start' (not 'i > 0') means:
- At the FIRST level (start=0): skip if i > 0 — skip duplicate first elements
- At nested levels: skip if i > start — skip duplicates at THAT level
- But i === start is NEVER skipped — we must take the first occurrence
`);


// ─────────────────────────────────────────────
// Complexity Summary
// ─────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════════════════════╗
║              COMPLEXITY ANALYSIS SUMMARY                     ║
╠════════════════════════════╦═══════════════╦════════════════╣
║ Problem                    ║ Time          ║ Space (output) ║
╠════════════════════════════╬═══════════════╬════════════════╣
║ Subsets (bitwise)          ║ O(n·2^n)      ║ O(n·2^n)       ║
║ Subsets (backtracking)     ║ O(n·2^n)      ║ O(n)           ║
║ Permutations (visited)     ║ O(n!·n)       ║ O(n)           ║
║ Permutations (swap)        ║ O(n!·n)       ║ O(n)           ║
║ Subsets II (duplicates)    ║ O(n·2^n)      ║ O(n)           ║
╚════════════════════════════╩═══════════════╩════════════════╝

Interview insight:
- Subsets = 2^n choices (include/exclude each element)
- Permutations = n! choices (factorial — all orderings)
- Skip duplicates = sort first, then check nums[i] === nums[i-1] at same level
`);

/**
 * Day 20 — Trees & Graphs Week 2 Review
 * Solve these 4 problems FROM SCRATCH without looking at your notes.
 * These are the Week 2 DSA problems you're most likely to see in interviews.
 *
 * Problems:
 *  1. LeetCode #98  — Validate BST          O(n)       target: 10 min
 *  2. LeetCode #102 — Level Order Traversal O(n)       target: 8 min
 *  3. LeetCode #207 — Course Schedule       O(V+E)     target: 15 min
 *  4. LeetCode #33  — Search Rotated Array  O(log n)   target: 12 min
 */

// ─────────────────────────────────────────────────────────────────────────────
// #98 — Validate BST (10 min target)
// ─────────────────────────────────────────────────────────────────────────────
// Strategy: DFS with min/max bounds passed down the tree.
//           Left subtree nodes must be < current node value.
//           Right subtree nodes must be > current node value.
//           Pass bounds as you recurse.
//
// Common mistake: only checking node.left.val < node.val (direct child comparison).
//                 This fails for nodes deeper in the tree.
//
// Example of the bug: [5, 1, 4, null, null, 3, 6]
//   Node 4 < Node 5 (direct child check passes), but 4 is a RIGHT child of 5,
//   so it should be > 5. The bounds approach catches this.
//
// Time: O(n)   Space: O(h) — call stack depth

class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}

/**
 * @param {TreeNode} root
 * @return {boolean}
 */
function isValidBST(root) {
  function validate(node, min, max) {
    if (!node) return true;

    // Value must be strictly within (min, max) bounds
    if (node.val <= min || node.val >= max) return false;

    // Left subtree: max becomes current node's value
    // Right subtree: min becomes current node's value
    return validate(node.left, min, node.val) &&
           validate(node.right, node.val, max);
  }

  return validate(root, -Infinity, Infinity);
}

console.log('=== #98 Validate BST ===');
// Valid BST: [2, 1, 3]
const validBST = new TreeNode(2, new TreeNode(1), new TreeNode(3));
console.log(isValidBST(validBST)); // true

// Invalid BST: [5, 1, 4, null, null, 3, 6]
// 4 is right child of 5 but 4 < 5 — invalid
const invalidBST = new TreeNode(5,
  new TreeNode(1),
  new TreeNode(4, new TreeNode(3), new TreeNode(6))
);
console.log(isValidBST(invalidBST)); // false

// Edge case: duplicate values not allowed in BST
const dupBST = new TreeNode(2,
  new TreeNode(2), // duplicate — invalid (must be strictly less than parent)
  null
);
console.log(isValidBST(dupBST)); // false


// ─────────────────────────────────────────────────────────────────────────────
// #102 — Binary Tree Level Order Traversal (8 min target)
// ─────────────────────────────────────────────────────────────────────────────
// Strategy: BFS with queue. Record level size at start of each level.
//           Process exactly `levelSize` nodes per iteration.
//
// Time: O(n)   Space: O(n) — queue holds at most n/2 nodes at the widest level

/**
 * @param {TreeNode} root
 * @return {number[][]}
 */
function levelOrder(root) {
  if (!root) return [];

  const result = [];
  const queue = [root];

  while (queue.length > 0) {
    const levelSize = queue.length; // snapshot: process this many nodes
    const level = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift(); // remove from front
      level.push(node.val);
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(level);
  }

  return result;
}

console.log('\n=== #102 Level Order Traversal ===');
// [3,9,20,null,null,15,7]
const tree = new TreeNode(3,
  new TreeNode(9),
  new TreeNode(20, new TreeNode(15), new TreeNode(7))
);
console.log(JSON.stringify(levelOrder(tree)));    // [[3],[9,20],[15,7]]
console.log(JSON.stringify(levelOrder(null)));    // []
console.log(JSON.stringify(levelOrder(new TreeNode(1)))); // [[1]]


// ─────────────────────────────────────────────────────────────────────────────
// #207 — Course Schedule (Cycle Detection) (15 min target)
// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Build adjacency list, then DFS to detect cycles.
//           Use 3 states: 0 = unvisited, 1 = in-progress (current path), 2 = done.
//           If you reach a node with state 1 (in current path) → cycle found.
//
// Time: O(V+E)   Space: O(V+E)

/**
 * @param {number} numCourses
 * @param {number[][]} prerequisites
 * @return {boolean}
 */
function canFinish(numCourses, prerequisites) {
  // Build adjacency list
  const adj = Array.from({ length: numCourses }, () => []);
  for (const [course, prereq] of prerequisites) {
    adj[prereq].push(course); // prereq → course (take prereq first)
  }

  const state = new Array(numCourses).fill(0); // 0=unvisited, 1=visiting, 2=done

  function hasCycle(node) {
    if (state[node] === 1) return true;  // back edge → cycle
    if (state[node] === 2) return false; // already fully explored

    state[node] = 1; // mark as in current path

    for (const neighbor of adj[node]) {
      if (hasCycle(neighbor)) return true;
    }

    state[node] = 2; // fully explored, no cycle from here
    return false;
  }

  for (let i = 0; i < numCourses; i++) {
    if (state[i] === 0 && hasCycle(i)) return false;
  }

  return true;
}

console.log('\n=== #207 Course Schedule ===');
console.log(canFinish(2, [[1, 0]]));            // true: 0→1, no cycle
console.log(canFinish(2, [[1, 0], [0, 1]]));    // false: 0→1→0, cycle
console.log(canFinish(5, [[1,0],[2,0],[3,1],[4,1]])); // true
console.log(canFinish(3, [[0,1],[1,2],[2,0]])); // false: triangle cycle


// ─────────────────────────────────────────────────────────────────────────────
// #33 — Search in Rotated Sorted Array (12 min target)
// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Modified binary search. At each mid, one half is guaranteed sorted.
//           Determine which half is sorted, check if target is in that half,
//           then eliminate the other half.
//
// Key insight: if nums[lo] <= nums[mid], the LEFT half is sorted (no rotation point there).
//              Otherwise, the RIGHT half is sorted.
//
// Time: O(log n)   Space: O(1)

/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function search(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;

  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);

    if (nums[mid] === target) return mid;

    // Left half is sorted (no rotation point between lo and mid)
    if (nums[lo] <= nums[mid]) {
      if (target >= nums[lo] && target < nums[mid]) {
        hi = mid - 1; // target is in sorted left half
      } else {
        lo = mid + 1; // target is in right half
      }
    } else {
      // Right half is sorted
      if (target > nums[mid] && target <= nums[hi]) {
        lo = mid + 1; // target is in sorted right half
      } else {
        hi = mid - 1; // target is in left half
      }
    }
  }

  return -1;
}

console.log('\n=== #33 Search in Rotated Array ===');
console.log(search([4,5,6,7,0,1,2], 0)); // 4
console.log(search([4,5,6,7,0,1,2], 3)); // -1
console.log(search([1], 0));              // -1
console.log(search([1], 1));              // 0
console.log(search([3,1], 1));            // 1 (rotated by 1)
console.log(search([3,1], 3));            // 0


/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPLEXITY SUMMARY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * #98 Validate BST:
 *   Time:  O(n) — visit each node once
 *   Space: O(h) — call stack, O(log n) balanced, O(n) skewed
 *   Key:   bounds approach (not direct child comparison)
 *
 * #102 Level Order:
 *   Time:  O(n) — visit each node once
 *   Space: O(n) — queue holds up to n/2 nodes at widest level
 *   Key:   snapshot levelSize before inner loop
 *
 * #207 Course Schedule:
 *   Time:  O(V+E) — build adjacency list O(E) + DFS O(V+E)
 *   Space: O(V+E) — adjacency list + call stack
 *   Key:   3-state: unvisited / in-progress / done (not just visited/not)
 *
 * #33 Rotated Array:
 *   Time:  O(log n) — binary search with constant work per iteration
 *   Space: O(1)
 *   Key:   one half is always sorted — identify which one
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COMMON INTERVIEW MISTAKES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * #98: Comparing only direct child values (misses violations deeper in tree).
 *       Fix: pass min/max bounds down recursively.
 *
 * #102: Not snapshotting levelSize — the queue grows as you enqueue children.
 *        Fix: `const levelSize = queue.length` BEFORE the inner for loop.
 *
 * #207: Using only 2 states (visited/not). If a node is currently on the
 *        recursion stack (in-progress), you need to detect that separately.
 *        Fix: 3 states: 0, 1, 2.
 *
 * #33: Getting confused by the rotation — try drawing [4,5,6,7,0,1,2] and
 *       marking the pivot point. Then trace through with target=0 manually.
 */

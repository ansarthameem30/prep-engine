/**
 * LeetCode #102 – Binary Tree Level Order Traversal
 *
 * Given the root of a binary tree, return the level order traversal
 * of its nodes' values (i.e., from left to right, level by level).
 *
 * Example:
 *     3
 *    / \
 *   9  20
 *     /  \
 *    15   7
 *
 * Output: [[3], [9, 20], [15, 7]]
 *
 * Time: O(n) — visit each node once
 * Space: O(n) — output array + O(w) queue where w = max width of tree
 *               Worst case (perfect tree): w = n/2 = O(n)
 */

class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Helper: build tree from level-order array (null = missing node)
function buildTree(arr) {
  if (!arr.length || arr[0] === null) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length && i < arr.length) {
    const node = queue.shift();
    if (arr[i] !== null && arr[i] !== undefined) {
      node.left = new TreeNode(arr[i]);
      queue.push(node.left);
    }
    i++;
    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
      node.right = new TreeNode(arr[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH 1: BFS with Queue — Iterative (Preferred)
// Process one level at a time by tracking queue size before adding children.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {TreeNode} root
 * @return {number[][]}
 */
function levelOrder(root) {
  if (!root) return [];

  const result = [];
  const queue = [root];

  while (queue.length > 0) {
    const levelSize = queue.length; // nodes in current level
    const level = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);

      // Add children for the NEXT level
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(level);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH 2: DFS (Recursive) — track depth to build levels
// Less intuitive but shows you understand the tree structure
// ─────────────────────────────────────────────────────────────────────────────

function levelOrderDFS(root) {
  const result = [];

  function dfs(node, depth) {
    if (!node) return;

    // First time at this depth — create the level array
    if (result.length === depth) {
      result.push([]);
    }

    result[depth].push(node.val);
    dfs(node.left, depth + 1);
    dfs(node.right, depth + 1);
  }

  dfs(root, 0);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTS — Interviewers often ask follow-up questions:
// ─────────────────────────────────────────────────────────────────────────────

/**
 * #107 – Level Order Traversal II (bottom to top)
 * Same as above but reverse the result.
 */
function levelOrderBottom(root) {
  return levelOrder(root).reverse();
}

/**
 * #103 – Zigzag Level Order Traversal
 * Alternate direction: left→right for even levels, right→left for odd.
 */
function zigzagLevelOrder(root) {
  if (!root) return [];

  const result = [];
  const queue = [root];
  let leftToRight = true;

  while (queue.length) {
    const size = queue.length;
    const level = [];

    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      // Insert at front or back depending on direction
      if (leftToRight) {
        level.push(node.val);
      } else {
        level.unshift(node.val); // prepend for right-to-left
      }
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(level);
    leftToRight = !leftToRight;
  }

  return result;
}

/**
 * #199 – Binary Tree Right Side View
 * Return the value of the rightmost node at each level.
 */
function rightSideView(root) {
  if (!root) return [];

  const result = [];
  const queue = [root];

  while (queue.length) {
    const size = queue.length;

    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      // Last node in the level = rightmost visible node
      if (i === size - 1) result.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }

  return result;
}

/**
 * #513 – Find Bottom Left Tree Value
 * Return the leftmost value in the last row.
 */
function findBottomLeftValue(root) {
  let leftmost = root.val;
  const queue = [root];

  while (queue.length) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      if (i === 0) leftmost = node.val; // first node in each level
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }

  return leftmost;
}

/**
 * Maximum depth using BFS (depth = number of levels)
 */
function maxDepthBFS(root) {
  if (!root) return 0;
  let depth = 0;
  const queue = [root];

  while (queue.length) {
    depth++;
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }

  return depth;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

const tree1 = buildTree([3, 9, 20, null, null, 15, 7]);
const tree2 = buildTree([1]);
const tree3 = buildTree([]);

console.log('=== Level Order BFS ===');
console.log(JSON.stringify(levelOrder(tree1)));  // [[3],[9,20],[15,7]]
console.log(JSON.stringify(levelOrder(tree2)));  // [[1]]
console.log(JSON.stringify(levelOrder(null)));   // []

console.log('\n=== Level Order DFS ===');
console.log(JSON.stringify(levelOrderDFS(tree1))); // [[3],[9,20],[15,7]]

console.log('\n=== Zigzag ===');
console.log(JSON.stringify(zigzagLevelOrder(tree1))); // [[3],[20,9],[15,7]]

console.log('\n=== Right Side View ===');
console.log(rightSideView(tree1)); // [3, 20, 7]

console.log('\n=== Max Depth (BFS) ===');
console.log(maxDepthBFS(tree1)); // 3

/*
 * INTERVIEW TALKING POINTS:
 *
 * Q: When would you use BFS vs DFS for tree problems?
 * A: BFS is natural when the problem involves levels, depth, or "closest" nodes.
 *    DFS is natural for path problems, subtree problems, or when you need to
 *    process a node's subtrees before returning to the parent.
 *    BFS uses more memory (stores an entire level), DFS uses O(h) stack space.
 *    For wide trees (balanced), DFS is more memory-efficient.
 *    For deep trees (skewed), BFS is more memory-efficient.
 *
 * Q: What's the key pattern for level-by-level BFS processing?
 * A: Capture `queue.length` BEFORE the inner loop — this is the number of nodes
 *    at the current level. Process exactly that many nodes, then the loop ends
 *    with the queue containing only the next level's nodes.
 *
 * Q: Can you do zigzag without unshift (which is O(n) for arrays)?
 * A: Yes — allocate a fixed-size array and fill left-to-right or right-to-left
 *    using indices. Or use a deque (doubly-ended queue). unshift() is O(n)
 *    for a regular array, so for large trees this matters.
 */

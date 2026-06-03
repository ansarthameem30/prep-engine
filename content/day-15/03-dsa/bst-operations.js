/**
 * Day 15 DSA: Binary Search Tree Operations
 *
 * Problems:
 * - LeetCode #98: Validate Binary Search Tree
 * - BST Insert (LeetCode #701)
 * - BST Delete (LeetCode #450)
 */

class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Helper
function buildTree(arr) {
  if (!arr.length || arr[0] === null) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length && i < arr.length) {
    const node = queue.shift();
    if (arr[i] != null) { node.left = new TreeNode(arr[i]); queue.push(node.left); }
    i++;
    if (i < arr.length && arr[i] != null) { node.right = new TreeNode(arr[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

function inorder(root) {
  if (!root) return [];
  return [...inorder(root.left), root.val, ...inorder(root.right)];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM 1: VALIDATE BINARY SEARCH TREE (#98)
//
// BST Property: for every node N:
//   - ALL nodes in N's left subtree < N.val
//   - ALL nodes in N's right subtree > N.val
//
// COMMON MISTAKE: only check node vs its immediate children
//     5
//    / \
//   1   4
//      / \
//     3   6
// Node 4's right child is 6 (valid locally), but 4 < root's left bound 5 — INVALID tree!
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CORRECT APPROACH: Pass min/max bounds down the recursion
 * @param {TreeNode} root
 * @return {boolean}
 */
function isValidBST(root) {
  function validate(node, min, max) {
    if (!node) return true;

    // Node value must be strictly within the allowed range
    if (node.val <= min || node.val >= max) return false;

    // Left subtree: all values must be < node.val (new max)
    // Right subtree: all values must be > node.val (new min)
    return (
      validate(node.left, min, node.val) &&
      validate(node.right, node.val, max)
    );
  }

  return validate(root, -Infinity, Infinity);
}

/**
 * ALTERNATIVE: In-order traversal should produce strictly increasing sequence
 * BST in-order = sorted ascending — if we ever see a non-increasing step, it's invalid.
 */
function isValidBSTInorder(root) {
  let prev = -Infinity;

  function dfs(node) {
    if (!node) return true;
    if (!dfs(node.left)) return false; // left subtree invalid

    if (node.val <= prev) return false; // not strictly increasing
    prev = node.val;

    return dfs(node.right);
  }

  return dfs(root);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM 2: INSERT INTO BST (#701)
// O(h) time where h = height (O(log n) balanced, O(n) skewed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {TreeNode} root
 * @param {number} val
 * @return {TreeNode}
 */
function insertIntoBST(root, val) {
  // Base case: found the correct empty spot
  if (!root) return new TreeNode(val);

  if (val < root.val) {
    root.left = insertIntoBST(root.left, val);
  } else {
    root.right = insertIntoBST(root.right, val);
  }

  return root; // return root unchanged (BST property maintained)
}

// Iterative version (avoids stack overflow for deep trees)
function insertIntoBSTIterative(root, val) {
  const newNode = new TreeNode(val);
  if (!root) return newNode;

  let curr = root;
  while (true) {
    if (val < curr.val) {
      if (!curr.left) { curr.left = newNode; break; }
      curr = curr.left;
    } else {
      if (!curr.right) { curr.right = newNode; break; }
      curr = curr.right;
    }
  }
  return root;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM 3: DELETE NODE IN BST (#450)
//
// Three cases:
// 1. Node is a leaf → simply remove it
// 2. Node has one child → replace node with that child
// 3. Node has two children → find in-order successor (smallest in right subtree),
//    copy its value to current node, delete the successor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the minimum value node in a subtree (used for in-order successor)
 */
function findMin(node) {
  while (node.left) node = node.left;
  return node;
}

/**
 * @param {TreeNode} root
 * @param {number} key
 * @return {TreeNode}
 */
function deleteNode(root, key) {
  if (!root) return null;

  if (key < root.val) {
    root.left = deleteNode(root.left, key);
  } else if (key > root.val) {
    root.right = deleteNode(root.right, key);
  } else {
    // Found the node to delete

    // Case 1 & 2: Zero or one child
    if (!root.left) return root.right;
    if (!root.right) return root.left;

    // Case 3: Two children
    // Find in-order successor: smallest node in right subtree
    const successor = findMin(root.right);
    // Copy successor's value to current node
    root.val = successor.val;
    // Delete the successor from right subtree
    root.right = deleteNode(root.right, successor.val);
  }

  return root;
}

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: BST SEARCH AND RANGE QUERY
// ─────────────────────────────────────────────────────────────────────────────

function searchBST(root, val) {
  if (!root || root.val === val) return root;
  return val < root.val ? searchBST(root.left, val) : searchBST(root.right, val);
}

// Find all values in range [low, high] using BST property for pruning
// O(k + h) where k = number of values in range
function rangeSumBST(root, low, high) {
  if (!root) return 0;

  let sum = 0;
  if (root.val >= low && root.val <= high) sum += root.val;
  if (root.val > low) sum += rangeSumBST(root.left, low, high);   // prune right
  if (root.val < high) sum += rangeSumBST(root.right, low, high); // prune left
  return sum;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== Validate BST ===\n');

const valid1 = buildTree([2, 1, 3]);
const invalid1 = buildTree([5, 1, 4, null, null, 3, 6]); // 4 < 5, invalid
const invalid2 = buildTree([5, 4, 6, null, null, 3, 7]); // 3 < 5, invalid (the gotcha!)
const singleNode = buildTree([1]);

console.log('Valid [2,1,3]:', isValidBST(valid1));      // true
console.log('Invalid [5,1,4,null,null,3,6]:', isValidBST(invalid1)); // false
console.log('Invalid [5,4,6,null,null,3,7]:', isValidBST(invalid2)); // false — classic gotcha
console.log('Single node [1]:', isValidBST(singleNode)); // true

console.log('\n(Inorder variant):');
console.log('Valid [2,1,3]:', isValidBSTInorder(buildTree([2, 1, 3]))); // true
console.log('Invalid [5,4,6,null,null,3,7]:', isValidBSTInorder(buildTree([5, 4, 6, null, null, 3, 7]))); // false

console.log('\n=== BST Insert ===\n');
let tree = buildTree([4, 2, 7, 1, 3]);
console.log('Before:', inorder(tree)); // [1, 2, 3, 4, 7]
tree = insertIntoBST(tree, 5);
console.log('After inserting 5:', inorder(tree)); // [1, 2, 3, 4, 5, 7]

console.log('\n=== BST Delete ===\n');
let delTree = buildTree([5, 3, 6, 2, 4, null, 7]);
console.log('Original:', inorder(delTree)); // [2, 3, 4, 5, 6, 7]

// Delete leaf
let t1 = buildTree([5, 3, 6, 2, 4, null, 7]);
t1 = deleteNode(t1, 2);
console.log('Delete leaf 2:', inorder(t1)); // [3, 4, 5, 6, 7]

// Delete node with one child
let t2 = buildTree([5, 3, 6, 2, 4, null, 7]);
t2 = deleteNode(t2, 6);
console.log('Delete 6 (one child):', inorder(t2)); // [2, 3, 4, 5, 7]

// Delete node with two children
let t3 = buildTree([5, 3, 6, 2, 4, null, 7]);
t3 = deleteNode(t3, 3);
console.log('Delete 3 (two children):', inorder(t3)); // [2, 4, 5, 6, 7] — successor 4 replaces 3

/*
 * INTERVIEW TALKING POINTS:
 *
 * Q: Why does checking only immediate children fail for BST validation?
 * A: The BST property is a global invariant: ALL nodes in a subtree must satisfy
 *    the bound, not just direct children. Counter-example:
 *       5
 *      / \
 *     4   6
 *    / \
 *   3   7   ← 7 is locally correct (> 4) but violates the global rule (7 > 5)
 *
 * Q: Why use in-order successor (not predecessor) for deletion?
 * A: Either works. The in-order successor (smallest in right subtree) maintains
 *    BST order because it's the next value in sorted order after the deleted node.
 *    It has at most one child (right), so its deletion is a simpler sub-case.
 *
 * Q: What's the time complexity of BST operations in the worst case?
 * A: O(n) for a skewed (unbalanced) tree, O(log n) for a balanced tree.
 *    This is why AVL trees and Red-Black trees exist — they maintain balance
 *    to guarantee O(log n) operations. JavaScript doesn't have a built-in
 *    balanced BST, but you can use a sorted Map or implement AVL/RB.
 */

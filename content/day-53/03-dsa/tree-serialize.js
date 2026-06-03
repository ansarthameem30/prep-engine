/**
 * Day 53 — Tree Serialization Problems
 *
 * Problems:
 *  1. LeetCode #297 — Serialize and Deserialize Binary Tree
 *  2. LeetCode #428 — Serialize and Deserialize N-ary Tree
 *  3. LeetCode #652 — Find Duplicate Subtrees
 *  4. LeetCode #449 — Serialize and Deserialize BST
 */

class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// ─────────────────────────────────────────────────────────────
// #297 — Serialize and Deserialize Binary Tree
// ─────────────────────────────────────────────────────────────
/**
 * Approach A: BFS (Level-Order)
 * Serialize: BFS, encode null as '#'
 * Deserialize: use a queue of nodes, assign left/right from stream
 *
 * Approach B: Preorder DFS (shown below — simpler to implement)
 * Serialize: preorder DFS, encode null as '#'
 * Deserialize: use a pointer/iterator, build from preorder stream
 *
 * Time/Space: O(n) for both serialize and deserialize
 */

// Approach A: BFS serialize
function serializeBFS(root) {
  if (!root) return '#';
  const queue = [root];
  const parts = [];

  while (queue.length > 0) {
    const node = queue.shift();
    if (node === null) {
      parts.push('#');
    } else {
      parts.push(String(node.val));
      queue.push(node.left);
      queue.push(node.right);
    }
  }

  // Trim trailing nulls (optional optimization)
  while (parts[parts.length - 1] === '#') parts.pop();
  return parts.join(',');
}

function deserializeBFS(data) {
  if (data === '#' || !data) return null;
  const parts = data.split(',');
  const root = new TreeNode(parseInt(parts[0]));
  const queue = [root];
  let i = 1;

  while (queue.length > 0 && i < parts.length) {
    const node = queue.shift();

    if (i < parts.length && parts[i] !== '#') {
      node.left = new TreeNode(parseInt(parts[i]));
      queue.push(node.left);
    }
    i++;

    if (i < parts.length && parts[i] !== '#') {
      node.right = new TreeNode(parseInt(parts[i]));
      queue.push(node.right);
    }
    i++;
  }

  return root;
}

// Approach B: Preorder DFS — cleaner deserialize
function serializeDFS(root) {
  const parts = [];
  function dfs(node) {
    if (!node) { parts.push('#'); return; }
    parts.push(String(node.val));
    dfs(node.left);
    dfs(node.right);
  }
  dfs(root);
  return parts.join(',');
}

function deserializeDFS(data) {
  const parts = data.split(',');
  let idx = 0;
  function build() {
    if (parts[idx] === '#') { idx++; return null; }
    const node = new TreeNode(parseInt(parts[idx++]));
    node.left = build();
    node.right = build();
    return node;
  }
  return build();
}

function treeToArray(root) {
  if (!root) return [];
  const result = [];
  const q = [root];
  while (q.length) {
    const n = q.shift();
    result.push(n ? n.val : null);
    if (n) { q.push(n.left); q.push(n.right); }
  }
  while (result[result.length - 1] === null) result.pop();
  return result;
}

console.log('=== #297 Serialize/Deserialize Binary Tree ===');
const t1 = new TreeNode(1,
  new TreeNode(2),
  new TreeNode(3, new TreeNode(4), new TreeNode(5))
);
const bfsSerialized = serializeBFS(t1);
const dfsSerialized = serializeDFS(t1);
console.log('BFS serialized:', bfsSerialized);
console.log('DFS serialized:', dfsSerialized);
console.log('BFS restore:', treeToArray(deserializeBFS(bfsSerialized)));
console.log('DFS restore:', treeToArray(deserializeDFS(dfsSerialized)));

// ─────────────────────────────────────────────────────────────
// #428 — Serialize and Deserialize N-ary Tree
// ─────────────────────────────────────────────────────────────
/**
 * N-ary tree: each node has a list of children.
 * Serialize: preorder DFS, format: "val childCount child1 child2 ..."
 * This encodes the number of children alongside each node.
 */
class NaryNode {
  constructor(val, children = []) {
    this.val = val;
    this.children = children;
  }
}

function serializeNary(root) {
  const parts = [];
  function dfs(node) {
    if (!node) return;
    parts.push(String(node.val));
    parts.push(String(node.children.length));
    for (const child of node.children) dfs(child);
  }
  dfs(root);
  return parts.join(',');
}

function deserializeNary(data) {
  if (!data) return null;
  const parts = data.split(',');
  let idx = 0;
  function build() {
    if (idx >= parts.length) return null;
    const val = parseInt(parts[idx++]);
    const childCount = parseInt(parts[idx++]);
    const children = [];
    for (let i = 0; i < childCount; i++) children.push(build());
    return new NaryNode(val, children);
  }
  return build();
}

console.log('\n=== #428 Serialize/Deserialize N-ary Tree ===');
const nary = new NaryNode(1, [
  new NaryNode(3, [new NaryNode(5), new NaryNode(6)]),
  new NaryNode(2),
  new NaryNode(4),
]);
const narySerialized = serializeNary(nary);
console.log('N-ary serialized:', narySerialized);
const naryRestored = deserializeNary(narySerialized);
console.log('N-ary root:', naryRestored.val, '| children:', naryRestored.children.map(c => c.val));

// ─────────────────────────────────────────────────────────────
// #652 — Find Duplicate Subtrees
// ─────────────────────────────────────────────────────────────
/**
 * Key insight: Serialize each subtree as a string using postorder DFS.
 * Use a Map to count how many times each serialized form appears.
 * When count reaches 2 for the first time, add root of that subtree to result.
 *
 * Why postorder? Because we need children serialized before the parent —
 * the serialization represents the full subtree structure.
 *
 * Time: O(n^2) naively (string concatenation per node), O(n) with integer IDs
 * Space: O(n)
 */
function findDuplicateSubtrees(root) {
  const counts = new Map();
  const result = [];

  function serialize(node) {
    if (!node) return '#';
    const left  = serialize(node.left);
    const right = serialize(node.right);
    const key = `${node.val},${left},${right}`; // postorder serialization

    const count = (counts.get(key) || 0) + 1;
    counts.set(key, count);
    if (count === 2) result.push(node); // first time we see a duplicate

    return key;
  }

  serialize(root);
  return result;
}

console.log('\n=== #652 Find Duplicate Subtrees ===');
const t2 = new TreeNode(1,
  new TreeNode(2, new TreeNode(4), null),
  new TreeNode(3,
    new TreeNode(2, new TreeNode(4), null),
    new TreeNode(4)
  )
);
const dupes = findDuplicateSubtrees(t2);
console.log('Duplicate subtree roots:', dupes.map(n => n.val)); // [2, 4]

// ─────────────────────────────────────────────────────────────
// #449 — Serialize and Deserialize BST
// ─────────────────────────────────────────────────────────────
/**
 * Key insight: For a BST, preorder traversal gives a unique representation.
 * We don't need null markers! Given a preorder traversal, we can reconstruct
 * the BST uniquely because BST property constrains where each node goes.
 *
 * Serialize: preorder DFS, join values
 * Deserialize: use a queue + min/max bounds to place each value correctly
 *
 * This is more space-efficient than the binary tree version (no '#' nulls).
 *
 * Time: O(n) for both, Space: O(n)
 */
function serializeBST(root) {
  const parts = [];
  function preorder(node) {
    if (!node) return;
    parts.push(node.val);
    preorder(node.left);
    preorder(node.right);
  }
  preorder(root);
  return parts.join(',');
}

function deserializeBST(data) {
  if (!data) return null;
  const nums = data.split(',').map(Number);
  let idx = 0;

  function build(min, max) {
    if (idx >= nums.length || nums[idx] < min || nums[idx] > max) return null;
    const val = nums[idx++];
    const node = new TreeNode(val);
    node.left  = build(min, val);    // left subtree: values < val
    node.right = build(val, max);    // right subtree: values > val
    return node;
  }

  return build(-Infinity, Infinity);
}

console.log('\n=== #449 Serialize/Deserialize BST ===');
const bst = new TreeNode(4,
  new TreeNode(2, new TreeNode(1), new TreeNode(3)),
  new TreeNode(5)
);
const bstSerialized = serializeBST(bst);
console.log('BST serialized (no nulls):', bstSerialized); // "4,2,1,3,5"
console.log('BST restored:', treeToArray(deserializeBST(bstSerialized)));

/**
 * COMPARISON TABLE
 * ─────────────────────────────────────────────────────────────
 * Problem  | Serialize           | Deserialize      | Space Note
 * #297 DFS | Preorder + '#'      | Stream pointer   | O(n) — nulls included
 * #297 BFS | Level-order + '#'   | Queue            | O(n)
 * #428     | Preorder + childCnt | Recursive build  | O(n)
 * #652     | Postorder keys      | HashMap count    | O(n^2) keys naively
 * #449     | Preorder, no nulls  | Min/max bounds   | O(n) — more compact
 *
 * Key insight: BST serialization is more compact because BST property
 * replaces the need for null markers (they're implicitly encoded in the
 * min/max constraints during reconstruction).
 */

/**
 * Day 56 — Frontend-Relevant DSA
 *
 * Problems:
 *  1. LeetCode #20  — Valid Parentheses                 O(n)  — HTML/JSX parser analogy
 *  2. LeetCode #341 — Flatten Nested List Iterator      O(n)  — tree traversal iterator
 *  3. LeetCode #236 — Lowest Common Ancestor of BT      O(n)  — DOM/component tree
 */

// ─────────────────────────────────────────────────────────────
// #20 — Valid Parentheses
// ─────────────────────────────────────────────────────────────
/**
 * Relevant to frontend: HTML/JSX parsers use the same stack-based approach
 * to match opening/closing tags. A JSX linter essentially runs this algorithm.
 *
 * Approach: Stack
 *   - Push opening brackets
 *   - On closing bracket: check if top of stack is matching open bracket
 *   - At end: stack must be empty
 *
 * Time: O(n), Space: O(n)
 */
function isValid(s) {
  const stack = [];
  const pairs = { ')': '(', '}': '{', ']': '[' };

  for (const ch of s) {
    if ('({['.includes(ch)) {
      stack.push(ch);
    } else {
      // Closing bracket: must match top of stack
      if (stack.length === 0 || stack[stack.length - 1] !== pairs[ch]) {
        return false;
      }
      stack.pop();
    }
  }

  return stack.length === 0;
}

console.log('=== #20 Valid Parentheses ===');
console.log(isValid('()'));      // true
console.log(isValid('()[]{}')); // true
console.log(isValid('(]'));      // false
console.log(isValid('([)]'));    // false
console.log(isValid('{[]}'));    // true
console.log(isValid(''));        // true (empty is valid)

/**
 * Frontend relevance:
 * A real HTML validator uses the same principle:
 *   "<div><span></span></div>" → valid
 *   "<div><span></div></span>" → invalid (span closed before div)
 * The stack tracks unclosed tags. When a closing tag is seen,
 * it must match the most recently opened tag.
 */

// ─────────────────────────────────────────────────────────────
// #341 — Flatten Nested List Iterator
// ─────────────────────────────────────────────────────────────
/**
 * Relevant to frontend: React's virtual DOM tree, file system explorer,
 * recursive component rendering all follow this pattern.
 *
 * Approach: Lazy stack-based iterator
 *   Initialize stack with the input list (reversed for LIFO order)
 *   hasNext: flatten the stack until top is an integer
 *   next: pop and return the integer
 *
 * This is a lazy iterator — doesn't pre-flatten everything,
 * just flattens as much as needed for the next element.
 *
 * Time: O(n) amortized for all calls, Space: O(depth)
 */

// NestedInteger interface (as per LeetCode)
class NestedInteger {
  constructor(val) {
    if (typeof val === 'number') {
      this._val = val;
      this._list = null;
    } else {
      this._val = null;
      this._list = val; // array of NestedIntegers
    }
  }
  isInteger() { return this._val !== null; }
  getInteger() { return this._val; }
  getList() { return this._list; }
}

class NestedIterator {
  constructor(nestedList) {
    // Stack stores NestedIntegers and index pairs for lists: [list, index]
    // Alternatively, push all elements and use lazy unrolling
    this.stack = [...nestedList].reverse(); // reverse so we pop from front
  }

  _flatten() {
    // Unroll list elements until top is an integer
    while (this.stack.length > 0 && !this.stack[this.stack.length - 1].isInteger()) {
      const top = this.stack.pop();
      const list = top.getList();
      // Push list elements in reverse (so first element is on top)
      for (let i = list.length - 1; i >= 0; i--) {
        this.stack.push(list[i]);
      }
    }
  }

  hasNext() {
    this._flatten();
    return this.stack.length > 0;
  }

  next() {
    this._flatten();
    return this.stack.pop().getInteger();
  }
}

console.log('\n=== #341 Flatten Nested List Iterator ===');
// [[1,1],2,[1,1]] → 1,1,2,1,1
const nested = [
  new NestedInteger([new NestedInteger(1), new NestedInteger(1)]),
  new NestedInteger(2),
  new NestedInteger([new NestedInteger(1), new NestedInteger(1)]),
];
const iter = new NestedIterator(nested);
const result = [];
while (iter.hasNext()) result.push(iter.next());
console.log(result); // [1, 1, 2, 1, 1]

// Deeply nested: [1,[4,[6]]]
const deep = [
  new NestedInteger(1),
  new NestedInteger([
    new NestedInteger(4),
    new NestedInteger([new NestedInteger(6)]),
  ]),
];
const iter2 = new NestedIterator(deep);
const result2 = [];
while (iter2.hasNext()) result2.push(iter2.next());
console.log(result2); // [1, 4, 6]

/**
 * React tree traversal analogy:
 * React's reconciler traverses a tree of fibers (virtual DOM nodes).
 * Each fiber can have children (a "list" in this problem).
 * The work loop uses an iterative approach to traverse:
 *   beginWork(fiber) → go to first child (if any)
 *   completeWork(fiber) → go to sibling (if any), or return to parent
 * This is essentially the same lazy stack/iterator pattern.
 */

// ─────────────────────────────────────────────────────────────
// #236 — Lowest Common Ancestor of a Binary Tree
// ─────────────────────────────────────────────────────────────
/**
 * Relevant to frontend: Finding the LCA of two React components in the component tree
 * determines where to "lift state up" — state that must be shared between two components
 * lives at their LCA.
 *
 * Approach: Postorder DFS
 *   At each node, ask: "does this subtree contain p? does it contain q?"
 *   If yes to both → this node is the LCA
 *   If yes to one → return that node upward
 *
 * Time: O(n) — visit each node once
 * Space: O(h) — recursion stack
 */
class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}

function lowestCommonAncestor(root, p, q) {
  if (!root) return null;

  // Base case: if root is p or q, it's the LCA (or contributes to finding it)
  if (root === p || root === q) return root;

  const left  = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);

  // If both subtrees return a node, current node is the LCA
  if (left && right) return root;

  // Otherwise, one subtree found both p and q
  return left || right;
}

console.log('\n=== #236 Lowest Common Ancestor ===');
// Build tree: [3,5,1,6,2,0,8,null,null,7,4]
const n3  = new TreeNode(3);
const n5  = new TreeNode(5);
const n1  = new TreeNode(1);
const n6  = new TreeNode(6);
const n2  = new TreeNode(2);
const n0  = new TreeNode(0);
const n8  = new TreeNode(8);
const n7  = new TreeNode(7);
const n4  = new TreeNode(4);
n3.left = n5; n3.right = n1;
n5.left = n6; n5.right = n2;
n1.left = n0; n1.right = n8;
n2.left = n7; n2.right = n4;

console.log('LCA(5, 1):', lowestCommonAncestor(n3, n5, n1).val); // 3
console.log('LCA(5, 4):', lowestCommonAncestor(n3, n5, n4).val); // 5 (5 is ancestor of 4)
console.log('LCA(7, 4):', lowestCommonAncestor(n3, n7, n4).val); // 2

/**
 * Component tree analogy:
 *
 * <App>              ← tree root
 *   <Sidebar>        ← n5 equivalent
 *     <NavItem />   ← n6
 *     <UserMenu />  ← n2
 *   </Sidebar>
 *   <Main>           ← n1 equivalent
 *     <Feed />       ← n0
 *     <Chat />       ← n8
 *   </Main>
 * </App>
 *
 * If <UserMenu> and <Chat> need to share state (e.g., current user),
 * their LCA is <App>. Lift the state to <App>.
 *
 * If <NavItem> and <UserMenu> share state, LCA is <Sidebar>. Keep state local.
 *
 * This is exactly the "lifting state up" principle in React.
 */

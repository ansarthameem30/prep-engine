/**
 * Day 54 — Mixed Hard DSA Review
 *
 * Problems:
 *  1. LeetCode #124 — Binary Tree Maximum Path Sum    O(n)
 *  2. LeetCode #239 — Sliding Window Maximum          O(n)
 *  3. LeetCode #23  — Merge K Sorted Lists            O(n log k) — final polished
 *  4. LeetCode #295 — Find Median from Data Stream    O(log n) insert, O(1) query
 */

class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}
class ListNode {
  constructor(val, next = null) {
    this.val = val; this.next = next;
  }
}

// ─────────────────────────────────────────────────────────────
// #124 — Binary Tree Maximum Path Sum
// ─────────────────────────────────────────────────────────────
/**
 * A path is any sequence of nodes where each pair of adjacent nodes has an edge.
 * A path must contain at least one node, and it does not need to go through the root.
 *
 * Key insight: At each node, the path can either:
 *   (a) Pass through the node and connect left + node + right (contributes to answer)
 *   (b) Extend upward: return node + max(left, right) to parent (can only go one direction up)
 *
 * We maintain a global max and return (b) for the recursive calls.
 *
 * Time: O(n) — visit each node once
 * Space: O(h) — recursion stack, h = tree height
 */
function maxPathSum(root) {
  let globalMax = -Infinity;

  function dfs(node) {
    if (!node) return 0;

    // Only take positive contributions (ignore negative subtrees)
    const leftGain  = Math.max(dfs(node.left), 0);
    const rightGain = Math.max(dfs(node.right), 0);

    // Path through this node (left → node → right): candidate for global max
    const pathThroughNode = node.val + leftGain + rightGain;
    globalMax = Math.max(globalMax, pathThroughNode);

    // For parent: can only extend in one direction
    return node.val + Math.max(leftGain, rightGain);
  }

  dfs(root);
  return globalMax;
}

console.log('=== #124 Binary Tree Maximum Path Sum ===');
// Tree: [1,2,3] → path 2→1→3 = 6
console.log(maxPathSum(new TreeNode(1, new TreeNode(2), new TreeNode(3)))); // 6
// Tree: [-10,9,20,null,null,15,7] → path 15→20→7 = 42
const t = new TreeNode(-10, new TreeNode(9),
  new TreeNode(20, new TreeNode(15), new TreeNode(7)));
console.log(maxPathSum(t)); // 42
// All negatives: single node should be answer
console.log(maxPathSum(new TreeNode(-3))); // -3

// ─────────────────────────────────────────────────────────────
// #239 — Sliding Window Maximum
// ─────────────────────────────────────────────────────────────
/**
 * Find the maximum in each window of size k as it slides across the array.
 *
 * Naive approach: O(n*k) — find max in every window
 * Optimal approach: Monotonic Deque (Decreasing) — O(n)
 *
 * Invariant: deque stores indices in decreasing order of their values.
 * The front of the deque is always the max of the current window.
 *
 * For each new element nums[i]:
 *   1. Remove indices outside the window from front
 *   2. Remove all indices from back whose values are <= nums[i] (they can never be max)
 *   3. Add i to back
 *   4. The front of deque is the max of current window
 *
 * Time: O(n) — each element pushed/popped from deque at most once
 * Space: O(k) — deque holds at most k elements
 */
function maxSlidingWindow(nums, k) {
  const result = [];
  const deque = []; // stores indices, values are decreasing

  for (let i = 0; i < nums.length; i++) {
    // Remove indices outside the window
    while (deque.length > 0 && deque[0] < i - k + 1) {
      deque.shift();
    }

    // Maintain decreasing order: remove smaller elements from back
    while (deque.length > 0 && nums[deque[deque.length - 1]] <= nums[i]) {
      deque.pop();
    }

    deque.push(i);

    // Start recording results once first window is complete
    if (i >= k - 1) {
      result.push(nums[deque[0]]);
    }
  }

  return result;
}

console.log('\n=== #239 Sliding Window Maximum ===');
console.log(maxSlidingWindow([1,3,-1,-3,5,3,6,7], 3)); // [3,3,5,5,6,7]
console.log(maxSlidingWindow([1], 1));                   // [1]
console.log(maxSlidingWindow([1,-1], 1));                // [1,-1]
console.log(maxSlidingWindow([9,11], 2));                // [11]

// ─────────────────────────────────────────────────────────────
// #23 — Merge K Sorted Lists (Final Polished Solution)
// ─────────────────────────────────────────────────────────────
/**
 * Divide and Conquer approach — the clean production solution.
 * Time: O(n log k), Space: O(log k) stack
 *
 * This is what you write in an interview without hesitation.
 */
function mergeKLists(lists) {
  if (!lists || lists.length === 0) return null;

  function mergeTwoLists(l1, l2) {
    const dummy = new ListNode(0);
    let cur = dummy;
    while (l1 && l2) {
      if (l1.val <= l2.val) { cur.next = l1; l1 = l1.next; }
      else                  { cur.next = l2; l2 = l2.next; }
      cur = cur.next;
    }
    cur.next = l1 ?? l2;
    return dummy.next;
  }

  while (lists.length > 1) {
    const merged = [];
    for (let i = 0; i < lists.length; i += 2) {
      merged.push(mergeTwoLists(lists[i], lists[i + 1] ?? null));
    }
    lists = merged;
  }

  return lists[0];
}

function arrayToList(arr) {
  let dummy = new ListNode(0), cur = dummy;
  for (const v of arr) { cur.next = new ListNode(v); cur = cur.next; }
  return dummy.next;
}
function listToArray(head) {
  const r = []; while (head) { r.push(head.val); head = head.next; } return r;
}

console.log('\n=== #23 Merge K Sorted Lists ===');
console.log(listToArray(mergeKLists([
  arrayToList([1, 4, 5]),
  arrayToList([1, 3, 4]),
  arrayToList([2, 6]),
]))); // [1,1,2,3,4,4,5,6]

// ─────────────────────────────────────────────────────────────
// #295 — Find Median from Data Stream
// ─────────────────────────────────────────────────────────────
/**
 * Maintain two heaps:
 *   maxHeap (lower half): max at top
 *   minHeap (upper half): min at top
 *
 * Invariant: maxHeap.size === minHeap.size OR maxHeap.size === minHeap.size + 1
 *
 * addNum:
 *   1. Add to maxHeap (push, negate for max-heap using min-heap implementation)
 *   2. Balance: if maxHeap.top > minHeap.top, move max to minHeap
 *   3. Rebalance sizes: if minHeap is larger, move its min to maxHeap
 *
 * findMedian:
 *   - If odd total: return maxHeap.top
 *   - If even total: return average of both tops
 *
 * Time: O(log n) for addNum, O(1) for findMedian
 * Space: O(n)
 */
class MinHeap {
  constructor() { this.heap = []; }

  push(val) {
    this.heap.push(val);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  peek() { return this.heap[0]; }
  size() { return this.heap.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent] <= this.heap[i]) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _siftDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l] < this.heap[smallest]) smallest = l;
      if (r < n && this.heap[r] < this.heap[smallest]) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

class MedianFinder {
  constructor() {
    this.maxHeap = new MinHeap(); // lower half, negated values = max-heap
    this.minHeap = new MinHeap(); // upper half
  }

  addNum(num) {
    // Push to maxHeap (negate for max-heap behavior)
    this.maxHeap.push(-num);

    // Ensure maxHeap.top <= minHeap.top (cross-balance)
    if (this.minHeap.size() > 0 && -this.maxHeap.peek() > this.minHeap.peek()) {
      this.minHeap.push(-this.maxHeap.pop());
    }

    // Rebalance sizes: maxHeap can only be 1 larger than minHeap
    if (this.maxHeap.size() > this.minHeap.size() + 1) {
      this.minHeap.push(-this.maxHeap.pop());
    } else if (this.minHeap.size() > this.maxHeap.size()) {
      this.maxHeap.push(-this.minHeap.pop());
    }
  }

  findMedian() {
    if (this.maxHeap.size() > this.minHeap.size()) {
      return -this.maxHeap.peek();
    }
    return (-this.maxHeap.peek() + this.minHeap.peek()) / 2;
  }
}

console.log('\n=== #295 Find Median from Data Stream ===');
const mf = new MedianFinder();
mf.addNum(1); console.log(mf.findMedian()); // 1.0
mf.addNum(2); console.log(mf.findMedian()); // 1.5
mf.addNum(3); console.log(mf.findMedian()); // 2.0
mf.addNum(4); console.log(mf.findMedian()); // 2.5
mf.addNum(5); console.log(mf.findMedian()); // 3.0

/**
 * COMPLEXITY SUMMARY
 * ─────────────────────────────────────────────────────────────
 * #124 Binary Tree Maximum Path Sum:
 *   Single DFS. At each node: compute path through it (global max candidate).
 *   Return only one direction (can't use both in upward path).
 *   O(n) time, O(h) space.
 *
 * #239 Sliding Window Maximum:
 *   Monotonic deque: each element is pushed and popped at most once → O(n) amortized.
 *   The deque maintains the invariant that front = max of current window.
 *   O(n) time, O(k) space.
 *
 * #23 Merge K Sorted Lists:
 *   Iterative divide and conquer. Each pass reduces k by half.
 *   log(k) passes, each pass processes n total nodes → O(n log k).
 *   Iterative version avoids recursive stack overflow for large k.
 *
 * #295 Find Median from Data Stream:
 *   Two heaps maintain sorted order implicitly.
 *   addNum: O(log n) due to heap operations.
 *   findMedian: O(1) — just peek at heap tops.
 *   The invariant that maxHeap ≤ minHeap and sizes differ by at most 1
 *   guarantees the median is always at the tops.
 */

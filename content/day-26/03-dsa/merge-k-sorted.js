/**
 * Day 26 — DSA: Merge K Sorted Lists + Priority Queue
 *
 * LeetCode #23: Merge K Sorted Lists
 * LeetCode #264: Ugly Number II
 * Priority Queue using min-heap array
 */

// ─────────────────────────────────────────────
// Priority Queue (reusable)
// ─────────────────────────────────────────────
class PriorityQueue {
  constructor(comparator = (a, b) => a - b) {
    this.heap = [];
    this.cmp = comparator;
  }
  get size() { return this.heap.length; }
  isEmpty() { return this.heap.length === 0; }
  peek() { return this.heap[0]; }

  push(val) {
    this.heap.push(val);
    let i = this.heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.cmp(this.heap[i], this.heap[parent]) < 0) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
        i = parent;
      } else break;
    }
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      let i = 0;
      while (true) {
        let smallest = i;
        const l = 2 * i + 1, r = 2 * i + 2;
        if (l < this.heap.length && this.cmp(this.heap[l], this.heap[smallest]) < 0) smallest = l;
        if (r < this.heap.length && this.cmp(this.heap[r], this.heap[smallest]) < 0) smallest = r;
        if (smallest === i) break;
        [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
        i = smallest;
      }
    }
    return top;
  }
}

// ─────────────────────────────────────────────
// LeetCode #23: Merge K Sorted Lists
// ─────────────────────────────────────────────

class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function arrayToList(arr) {
  if (!arr.length) return null;
  const head = new ListNode(arr[0]);
  let curr = head;
  for (let i = 1; i < arr.length; i++) {
    curr.next = new ListNode(arr[i]);
    curr = curr.next;
  }
  return head;
}

function listToArray(head) {
  const result = [];
  while (head) { result.push(head.val); head = head.next; }
  return result;
}

/**
 * Naive approach: collect all values, sort, rebuild list
 * Time: O(N log N) where N = total nodes across all lists
 * Space: O(N)
 * Not optimal because we're ignoring the sorted property of input lists.
 */
function mergeKLists_naive(lists) {
  const all = [];
  for (const head of lists) {
    let curr = head;
    while (curr) { all.push(curr.val); curr = curr.next; }
  }
  all.sort((a, b) => a - b);
  return arrayToList(all);
}

/**
 * Min-Heap approach (optimal):
 * Initialize the heap with the head of each list.
 * Repeatedly pop the minimum, add it to result, and push that node's next.
 *
 * Time: O(N log k) where N = total nodes, k = number of lists
 *   - Each of N nodes is pushed and popped once: O(log k) per operation
 * Space: O(k) — heap holds at most k nodes at any time
 *
 * This is the canonical solution — demonstrates "merge sorted streams" pattern
 * used in external sorting, log merging, and database merge joins.
 */
function mergeKLists(lists) {
  // Min-heap ordered by node value
  const pq = new PriorityQueue((a, b) => a.val - b.val);

  // Initialize heap with head of each non-empty list
  for (const head of lists) {
    if (head !== null) pq.push(head);
  }

  const dummy = new ListNode(0);
  let curr = dummy;

  while (!pq.isEmpty()) {
    const node = pq.pop(); // smallest current head
    curr.next = node;
    curr = curr.next;

    if (node.next !== null) {
      pq.push(node.next); // push the next node from that list
    }
  }

  return dummy.next;
}

/**
 * Divide and Conquer approach:
 * Recursively merge pairs of lists, halving the problem at each step.
 * Time: O(N log k) — log k levels of merging, each level touches N nodes total
 * Space: O(log k) — recursion depth
 */
function mergeKLists_divideConquer(lists) {
  if (!lists.length) return null;

  function mergeTwoLists(l1, l2) {
    const dummy = new ListNode(0);
    let curr = dummy;
    while (l1 && l2) {
      if (l1.val <= l2.val) { curr.next = l1; l1 = l1.next; }
      else { curr.next = l2; l2 = l2.next; }
      curr = curr.next;
    }
    curr.next = l1 || l2;
    return dummy.next;
  }

  let step = 1;
  while (step < lists.length) {
    for (let i = 0; i < lists.length - step; i += step * 2) {
      lists[i] = mergeTwoLists(lists[i], lists[i + step]);
    }
    step *= 2;
  }

  return lists[0];
}

console.log('=== LeetCode #23: Merge K Sorted Lists ===');
const lists1 = [
  arrayToList([1, 4, 5]),
  arrayToList([1, 3, 4]),
  arrayToList([2, 6])
];
const lists2 = [
  arrayToList([1, 4, 5]),
  arrayToList([1, 3, 4]),
  arrayToList([2, 6])
];
console.log('Heap approach:', listToArray(mergeKLists(lists1)));
// Expected: [1,1,2,3,4,4,5,6]
console.log('Divide+Conquer:', listToArray(mergeKLists_divideConquer(lists2)));
// Expected: [1,1,2,3,4,4,5,6]


// ─────────────────────────────────────────────
// LeetCode #264: Ugly Number II
// ─────────────────────────────────────────────
/**
 * Ugly numbers: positive numbers whose only prime factors are 2, 3, and 5.
 * Sequence: 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, ...
 * Find the nth ugly number.
 *
 * Approach 1: Min-heap
 * Start with {1}. Pop minimum, push min*2, min*3, min*5.
 * Deduplicate using a Set.
 * Time: O(n log n) — n pops, each pop is O(log heap_size)
 * Space: O(n)
 */
function nthUglyNumber_heap(n) {
  const pq = new PriorityQueue((a, b) => a - b);
  const seen = new Set([1]);
  pq.push(1);

  let result = 1;
  for (let i = 0; i < n; i++) {
    result = pq.pop();
    for (const factor of [2, 3, 5]) {
      const next = result * factor;
      if (!seen.has(next)) {
        seen.add(next);
        pq.push(next);
      }
    }
  }
  return result;
}

/**
 * Approach 2: Three-pointer DP (optimal)
 * Maintain three pointers: p2, p3, p5 into the ugly number array.
 * Each points to the next ugly number to be multiplied by 2, 3, or 5.
 * The next ugly number is min(ugly[p2]*2, ugly[p3]*3, ugly[p5]*5).
 *
 * Time: O(n) — single pass
 * Space: O(n) — DP table
 *
 * Key insight: this is "merge three sorted streams" where each stream
 * is (ugly numbers) * 2, (ugly numbers) * 3, (ugly numbers) * 5.
 * Similar to merging K sorted lists, but with implicit streams.
 */
function nthUglyNumber_dp(n) {
  const dp = new Array(n + 1);
  dp[1] = 1;

  let p2 = 1, p3 = 1, p5 = 1; // pointers into dp array

  for (let i = 2; i <= n; i++) {
    const next2 = dp[p2] * 2;
    const next3 = dp[p3] * 3;
    const next5 = dp[p5] * 5;

    dp[i] = Math.min(next2, next3, next5);

    // Advance all pointers that produced the minimum (handles duplicates)
    if (dp[i] === next2) p2++;
    if (dp[i] === next3) p3++;
    if (dp[i] === next5) p5++;
  }

  return dp[n];
}

console.log('\n=== LeetCode #264: Ugly Number II ===');
console.log('Heap  n=10:', nthUglyNumber_heap(10));   // 12
console.log('DP    n=10:', nthUglyNumber_dp(10));     // 12
console.log('Heap  n=1:', nthUglyNumber_heap(1));     // 1
console.log('DP    n=12:', nthUglyNumber_dp(12));     // 18

// Print first 15 ugly numbers
const uglies = Array.from({ length: 15 }, (_, i) => nthUglyNumber_dp(i + 1));
console.log('First 15 ugly numbers:', uglies);
// [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24]


// ─────────────────────────────────────────────
// Complexity Summary
// ─────────────────────────────────────────────
console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║              MERGE K SORTED COMPLEXITY SUMMARY                    ║
╠═════════════════════════════╦══════════════════╦═════════════════╣
║ Approach                    ║ Time             ║ Space           ║
╠═════════════════════════════╬══════════════════╬═════════════════╣
║ Merge K Lists (naive)       ║ O(N log N)       ║ O(N)            ║
║ Merge K Lists (heap)        ║ O(N log k)       ║ O(k)            ║
║ Merge K Lists (div+conq)    ║ O(N log k)       ║ O(log k)        ║
║ Ugly Number II (heap)       ║ O(n log n)       ║ O(n)            ║
║ Ugly Number II (3-pointer)  ║ O(n)             ║ O(n)            ║
╠═════════════════════════════╩══════════════════╩═════════════════╣
║ Key insight: When merging sorted streams, a min-heap of size k   ║
║ (one entry per stream) gives O(N log k) — far better than        ║
║ O(N log N) from sorting all elements. Use this pattern for:      ║
║ - External sort (merge sorted file chunks)                        ║
║ - Log aggregation (merge timestamp-sorted logs from N servers)   ║
║ - Database merge join                                             ║
╚═══════════════════════════════════════════════════════════════════╝
`);

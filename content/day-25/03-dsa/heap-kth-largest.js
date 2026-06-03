/**
 * Day 25 — DSA: Heap / Priority Queue
 *
 * LeetCode #215: Kth Largest Element
 * LeetCode #347: Top K Frequent Elements
 * Min-Heap implementation from scratch
 */

// ─────────────────────────────────────────────
// Min-Heap Implementation from Scratch
// ─────────────────────────────────────────────
/**
 * A min-heap is a complete binary tree where every parent is <= both children.
 * Stored as an array: for node at index i:
 *   - left child: 2*i + 1
 *   - right child: 2*i + 2
 *   - parent: Math.floor((i - 1) / 2)
 *
 * Operations:
 *   push(val)  → O(log n) — add to end, sift up
 *   pop()      → O(log n) — remove root, move last to root, sift down
 *   peek()     → O(1) — root is the minimum
 */
class MinHeap {
  constructor(comparator = (a, b) => a - b) {
    this.heap = [];
    this.comparator = comparator; // negative = a should be higher priority (lower in min-heap)
  }

  get size() { return this.heap.length; }
  peek() { return this.heap[0]; }

  push(val) {
    this.heap.push(val);
    this._siftUp(this.heap.length - 1);
  }

  pop() {
    if (this.size === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.size > 0) {
      this.heap[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  _siftUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.comparator(this.heap[i], this.heap[parent]) < 0) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
        i = parent;
      } else break;
    }
  }

  _siftDown(i) {
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < this.size && this.comparator(this.heap[left], this.heap[smallest]) < 0)
        smallest = left;
      if (right < this.size && this.comparator(this.heap[right], this.heap[smallest]) < 0)
        smallest = right;

      if (smallest !== i) {
        [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
        i = smallest;
      } else break;
    }
  }
}

// Verify MinHeap
const h = new MinHeap();
[5, 3, 8, 1, 4].forEach(v => h.push(v));
const sorted = [];
while (h.size) sorted.push(h.pop());
console.log('MinHeap sorted output:', sorted); // [1,3,4,5,8]


// ─────────────────────────────────────────────
// LeetCode #215: Kth Largest Element in Array
// ─────────────────────────────────────────────

/**
 * Approach 1: Quickselect (average O(n), worst O(n^2))
 * Uses the partition step from QuickSort.
 * After partitioning, the pivot is in its final sorted position.
 * If pivot_pos == k-1 (0-indexed from right): we found it!
 * Otherwise recurse on the left or right half.
 *
 * Average Time: O(n) — each partition reduces search space by ~half
 * Worst Time: O(n^2) — already sorted array with bad pivot choice
 * Space: O(1) — in-place
 */
function findKthLargest_quickselect(nums, k) {
  // We want kth largest = (n-k)th smallest (0-indexed)
  const target = nums.length - k;
  nums = [...nums]; // don't mutate input

  function partition(left, right) {
    // Randomized pivot to avoid worst-case O(n^2)
    const pivotIdx = left + Math.floor(Math.random() * (right - left + 1));
    [nums[pivotIdx], nums[right]] = [nums[right], nums[pivotIdx]];
    const pivot = nums[right];

    let i = left; // i = boundary of "less than pivot" section
    for (let j = left; j < right; j++) {
      if (nums[j] <= pivot) {
        [nums[i], nums[j]] = [nums[j], nums[i]];
        i++;
      }
    }
    [nums[i], nums[right]] = [nums[right], nums[i]]; // place pivot
    return i;
  }

  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const pivotPos = partition(left, right);
    if (pivotPos === target) return nums[pivotPos];
    else if (pivotPos < target) left = pivotPos + 1;
    else right = pivotPos - 1;
  }

  return -1; // unreachable
}

/**
 * Approach 2: Min-Heap of size k
 * Maintain a min-heap with exactly k elements.
 * The root is the kth largest seen so far.
 * For each element: if > heap root, pop root, push new element.
 *
 * Time: O(n log k) — n elements, each push/pop is O(log k)
 * Space: O(k)
 *
 * Better when k << n. When k ≈ n, quickselect is better.
 */
function findKthLargest_heap(nums, k) {
  const heap = new MinHeap();

  for (const num of nums) {
    heap.push(num);
    if (heap.size > k) heap.pop(); // remove the smallest — keep k largest
  }

  return heap.peek(); // root = kth largest
}

console.log('\n=== LeetCode #215: Kth Largest Element ===');
console.log('Quickselect [3,2,1,5,6,4] k=2:', findKthLargest_quickselect([3, 2, 1, 5, 6, 4], 2)); // 5
console.log('Heap        [3,2,1,5,6,4] k=2:', findKthLargest_heap([3, 2, 1, 5, 6, 4], 2));        // 5
console.log('Quickselect [3,2,3,1,2,4,5,5,6] k=4:', findKthLargest_quickselect([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)); // 4
console.log('Heap        [3,2,3,1,2,4,5,5,6] k=4:', findKthLargest_heap([3, 2, 3, 1, 2, 4, 5, 5, 6], 4));        // 4


// ─────────────────────────────────────────────
// LeetCode #347: Top K Frequent Elements
// ─────────────────────────────────────────────

/**
 * Approach 1: Min-Heap
 * Build frequency map, then maintain a min-heap of size k by frequency.
 *
 * Time: O(n log k)
 * Space: O(n + k)
 */
function topKFrequent_heap(nums, k) {
  // Step 1: Count frequencies
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);

  // Step 2: Min-heap ordered by frequency (smallest freq at top)
  const heap = new MinHeap((a, b) => a[1] - b[1]); // compare by frequency

  for (const [num, count] of freq.entries()) {
    heap.push([num, count]);
    if (heap.size > k) heap.pop(); // remove least frequent
  }

  return heap.heap.map(([num]) => num);
}

/**
 * Approach 2: Bucket Sort (O(n) — optimal)
 * Frequency can be at most n. Create an array of n+1 buckets where
 * bucket[freq] contains all numbers with that frequency.
 * Then collect the top k from highest-frequency buckets.
 *
 * Time: O(n)
 * Space: O(n)
 */
function topKFrequent_bucket(nums, k) {
  // Build frequency map
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);

  // Create buckets: buckets[i] = array of numbers appearing i times
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [num, count] of freq.entries()) {
    buckets[count].push(num);
  }

  // Collect top k from highest buckets
  const result = [];
  for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
    result.push(...buckets[i]);
  }

  return result.slice(0, k);
}

console.log('\n=== LeetCode #347: Top K Frequent Elements ===');
console.log('Heap   [1,1,1,2,2,3] k=2:', topKFrequent_heap([1, 1, 1, 2, 2, 3], 2));     // [1,2]
console.log('Bucket [1,1,1,2,2,3] k=2:', topKFrequent_bucket([1, 1, 1, 2, 2, 3], 2));   // [1,2]
console.log('Bucket [1] k=1:', topKFrequent_bucket([1], 1));                             // [1]


// ─────────────────────────────────────────────
// Complexity Summary
// ─────────────────────────────────────────────
console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║              HEAP PROBLEMS COMPLEXITY SUMMARY                     ║
╠═════════════════════════════╦══════════════════╦═════════════════╣
║ Approach                    ║ Time             ║ Space           ║
╠═════════════════════════════╬══════════════════╬═════════════════╣
║ Kth Largest (sort)          ║ O(n log n)       ║ O(1)            ║
║ Kth Largest (quickselect)   ║ O(n) avg         ║ O(1)            ║
║ Kth Largest (min-heap k)    ║ O(n log k)       ║ O(k)            ║
║ Top K Frequent (heap)       ║ O(n log k)       ║ O(n)            ║
║ Top K Frequent (bucket)     ║ O(n)             ║ O(n)            ║
╠═════════════════════════════╩══════════════════╩═════════════════╣
║ When to choose which:                                             ║
║ - Quickselect: k ≈ n, single query, don't need stream processing  ║
║ - Min-heap k: streaming data, k << n, or need top-k dynamically  ║
║ - Bucket sort: all elements fit in memory, O(n) is required       ║
╚═══════════════════════════════════════════════════════════════════╝
`);

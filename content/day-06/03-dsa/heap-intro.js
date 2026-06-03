/**
 * LeetCode #347 – Top K Frequent Elements
 * Difficulty: Medium
 * Pattern: HashMap + Bucket Sort
 *
 * Problem:
 * Given an integer array nums and an integer k,
 * return the k most frequent elements.
 * You may return the answer in any order.
 * Your algorithm must be better than O(n log n).
 *
 * Example:
 *   nums = [1,1,1,2,2,3], k = 2  →  [1, 2]
 *   nums = [1], k = 1             →  [1]
 */

// ─────────────────────────────────────────────────────────────
// Approach 1: Sort by Frequency — O(n log n)
// ─────────────────────────────────────────────────────────────
function topKFrequentSort(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([num]) => num);
}

// ─────────────────────────────────────────────────────────────
// Approach 2: Bucket Sort — O(n) time, O(n) space
// ─────────────────────────────────────────────────────────────
// KEY INSIGHT: A number's frequency can be at most n (if all elements are equal).
// Create n+1 buckets where bucket[i] = all numbers with frequency i.
// Then scan buckets from high to low, collecting until we have k elements.

function topKFrequent(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);

  // buckets[i] = array of numbers with frequency exactly i
  const buckets = new Array(nums.length + 1).fill(null).map(() => []);

  for (const [num, count] of freq) {
    buckets[count].push(num);
  }

  const result = [];
  // Scan from highest frequency to lowest
  for (let i = buckets.length - 1; i >= 1 && result.length < k; i--) {
    result.push(...buckets[i]);
  }

  return result.slice(0, k);
}

// Step trace for [1,1,1,2,2,3], k=2:
// freq: {1→3, 2→2, 3→1}
// buckets: [[], [3], [2], [1], [], [], []]
//           ^0   ^1   ^2   ^3
// Scan from i=6 down:
//   i=3: buckets[3]=[1] → result=[1], length=1
//   i=2: buckets[2]=[2] → result=[1,2], length=2
// return [1, 2] ✓

// ─────────────────────────────────────────────────────────────
// Approach 3: Min-Heap — O(n log k) time (better for large n, small k)
// ─────────────────────────────────────────────────────────────
// Maintain a min-heap of size k. For each element:
// - If heap < k: push
// - If heap = k and current freq > heap minimum: replace min
// JS doesn't have a built-in heap, so implement MinHeap or use sorted array approximation.

// Simple simulation (not true heap, but illustrates the algorithm):
function topKFrequentHeap(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);

  // Using sorted array as a min-heap simulation
  const heap = []; // [freq, num] pairs, min-heap by freq

  for (const [num, count] of freq) {
    heap.push([count, num]);
    heap.sort((a, b) => a[0] - b[0]); // sort ascending (min first)
    if (heap.length > k) heap.shift(); // remove minimum
  }

  return heap.map(([, num]) => num);
}

// ─────────────────────────────────────────────────────────────
// Complexity Comparison
// ─────────────────────────────────────────────────────────────
// Sort:        O(n log n) — too slow, violates problem constraint
// Bucket sort: O(n) time, O(n) space — optimal for this problem
// Min-heap:    O(n log k) time, O(n + k) space — better when k << n

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
console.log("=== Top K Frequent Elements ===");
console.log(topKFrequentSort([1,1,1,2,2,3], 2)); // [1, 2]
console.log(topKFrequent([1,1,1,2,2,3], 2));     // [1, 2]
console.log(topKFrequentHeap([1,1,1,2,2,3], 2)); // [1, 2] or [2, 1]
console.log(topKFrequent([1], 1));                // [1]
console.log(topKFrequent([4,1,1,4,2,3,4], 2));   // [4, 1]

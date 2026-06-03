/**
 * Day 51 — Hard Divide and Conquer Problems
 *
 * Problems:
 *  1. LeetCode #4  — Median of Two Sorted Arrays         O(log(min(m,n)))
 *  2. LeetCode #23 — Merge K Sorted Lists                O(n log k)
 *  3. LeetCode #315 — Count of Smaller Numbers After Self O(n log n)
 */

// ─────────────────────────────────────────────────────────────
// #4 — Median of Two Sorted Arrays
// ─────────────────────────────────────────────────────────────
/**
 * Approach: Binary search on the partition point of the smaller array.
 *
 * Key insight: For two sorted arrays combined of size N,
 * there's a "left half" and "right half". We need to find the partition
 * where max(left) <= min(right) for both arrays simultaneously.
 *
 * We do binary search on the smaller array (nums1) to find its partition.
 * The partition of nums2 is determined: partition2 = (m+n+1)/2 - partition1
 *
 * Time:  O(log(min(m,n)))
 * Space: O(1)
 */
function findMedianSortedArrays(nums1, nums2) {
  // Always binary search on the smaller array
  if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);

  const m = nums1.length;
  const n = nums2.length;
  const halfLen = Math.floor((m + n + 1) / 2); // size of the left half

  let lo = 0;
  let hi = m;

  while (lo <= hi) {
    const p1 = Math.floor((lo + hi) / 2); // partition in nums1
    const p2 = halfLen - p1;              // partition in nums2

    // Elements just left/right of partition in each array
    const maxLeft1  = p1 === 0 ? -Infinity : nums1[p1 - 1];
    const minRight1 = p1 === m ? +Infinity : nums1[p1];
    const maxLeft2  = p2 === 0 ? -Infinity : nums2[p2 - 1];
    const minRight2 = p2 === n ? +Infinity : nums2[p2];

    if (maxLeft1 <= minRight2 && maxLeft2 <= minRight1) {
      // Found correct partition
      const maxLeft  = Math.max(maxLeft1, maxLeft2);
      const minRight = Math.min(minRight1, minRight2);

      if ((m + n) % 2 === 1) return maxLeft;          // odd total: median is maxLeft
      return (maxLeft + minRight) / 2;                 // even total: average of middle two
    } else if (maxLeft1 > minRight2) {
      hi = p1 - 1; // p1 too large, move left
    } else {
      lo = p1 + 1; // p1 too small, move right
    }
  }

  throw new Error('Input arrays are not sorted');
}

// Tests
console.log('=== #4 Median of Two Sorted Arrays ===');
console.log(findMedianSortedArrays([1,3], [2]));         // 2.0
console.log(findMedianSortedArrays([1,2], [3,4]));       // 2.5
console.log(findMedianSortedArrays([0,0], [0,0]));       // 0.0
console.log(findMedianSortedArrays([], [1]));             // 1.0
console.log(findMedianSortedArrays([2], []));             // 2.0

// ─────────────────────────────────────────────────────────────
// #23 — Merge K Sorted Lists
// ─────────────────────────────────────────────────────────────
/**
 * Two approaches shown:
 *
 * Approach A: Divide and Conquer — recursively merge pairs of lists.
 *   Like merge sort: split k lists into two halves, merge each half, then merge results.
 *   Time:  O(n log k) where n = total nodes
 *   Space: O(log k) recursive stack
 *
 * Approach B: Min-Heap — maintain a heap of (value, listIndex, nodeRef).
 *   Pop min, add to result, push next node from same list.
 *   Time:  O(n log k)
 *   Space: O(k) for the heap
 *
 * Both are O(n log k). Divide & Conquer avoids heap overhead and is often faster in practice.
 */

class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function arrayToList(arr) {
  let dummy = new ListNode(0);
  let cur = dummy;
  for (const v of arr) { cur.next = new ListNode(v); cur = cur.next; }
  return dummy.next;
}

function listToArray(head) {
  const result = [];
  while (head) { result.push(head.val); head = head.next; }
  return result;
}

// Merge two sorted linked lists
function mergeTwoLists(l1, l2) {
  const dummy = new ListNode(0);
  let cur = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { cur.next = l1; l1 = l1.next; }
    else                  { cur.next = l2; l2 = l2.next; }
    cur = cur.next;
  }
  cur.next = l1 || l2;
  return dummy.next;
}

// Approach A: Divide and Conquer
function mergeKLists(lists) {
  if (!lists || lists.length === 0) return null;
  return mergeRange(lists, 0, lists.length - 1);
}

function mergeRange(lists, lo, hi) {
  if (lo === hi) return lists[lo];
  const mid = Math.floor((lo + hi) / 2);
  const left  = mergeRange(lists, lo, mid);
  const right = mergeRange(lists, mid + 1, hi);
  return mergeTwoLists(left, right);
}

// Approach B: Min-Heap (using sorted array as simplified heap for demo)
function mergeKListsHeap(lists) {
  // In an interview, implement a proper MinHeap or state you would use a library.
  // For clarity here: we use a sorted array insertion (O(n log k) is preserved conceptually).
  const heap = [];

  for (let i = 0; i < lists.length; i++) {
    if (lists[i]) heap.push({ val: lists[i].val, node: lists[i] });
  }

  const heapPush = (item) => {
    heap.push(item);
    heap.sort((a, b) => a.val - b.val); // simplified — real heap is O(log k)
  };
  const heapPop = () => heap.shift();

  heap.sort((a, b) => a.val - b.val);

  const dummy = new ListNode(0);
  let cur = dummy;

  while (heap.length > 0) {
    const { node } = heapPop();
    cur.next = node;
    cur = cur.next;
    if (node.next) heapPush({ val: node.next.val, node: node.next });
  }

  return dummy.next;
}

console.log('\n=== #23 Merge K Sorted Lists ===');
const lists = [
  arrayToList([1, 4, 5]),
  arrayToList([1, 3, 4]),
  arrayToList([2, 6]),
];
console.log('Divide & Conquer:', listToArray(mergeKLists([...lists.map(l => arrayToList(listToArray(l)))])));
// [1,1,2,3,4,4,5,6]

// ─────────────────────────────────────────────────────────────
// #315 — Count of Smaller Numbers After Self
// ─────────────────────────────────────────────────────────────
/**
 * Approach: Modified Merge Sort (Divide and Conquer)
 *
 * Key insight: During the merge step, when we pick an element from the RIGHT
 * half before an element from the LEFT half, all remaining elements in the
 * LEFT half are greater than this right element.
 * So: count[leftElement] += rightPointer - rightStart
 *
 * We augment each element with its original index to track counts.
 *
 * Time:  O(n log n)
 * Space: O(n)
 */
function countSmaller(nums) {
  const n = nums.length;
  const counts = new Array(n).fill(0);
  // Pair each number with its original index
  let indexed = nums.map((val, idx) => [val, idx]);

  function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left  = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));
    return merge(left, right);
  }

  function merge(left, right) {
    const result = [];
    let l = 0, r = 0;

    while (l < left.length && r < right.length) {
      if (left[l][0] <= right[r][0]) {
        // left[l] goes to result. All elements in right[0..r-1] were placed before left[l],
        // meaning r elements from the right half are smaller than left[l].
        counts[left[l][1]] += r;
        result.push(left[l++]);
      } else {
        result.push(right[r++]);
      }
    }

    // Remaining left elements — each has r right elements smaller (all right processed so far)
    while (l < left.length) {
      counts[left[l][1]] += r;
      result.push(left[l++]);
    }

    while (r < right.length) {
      result.push(right[r++]);
    }

    return result;
  }

  mergeSort(indexed);
  return counts;
}

console.log('\n=== #315 Count of Smaller Numbers After Self ===');
console.log(countSmaller([5, 2, 6, 1]));   // [2, 1, 1, 0]
console.log(countSmaller([-1]));            // [0]
console.log(countSmaller([-1, -1]));        // [0, 0]
console.log(countSmaller([1, 9, 7, 8, 5])); // [0, 3, 1, 1, 0]

/**
 * ─────────────────────────────────────────────────────────────
 * COMPLEXITY ANALYSIS SUMMARY
 * ─────────────────────────────────────────────────────────────
 *
 * #4 Median of Two Sorted Arrays:
 *   Time:  O(log(min(m,n))) — binary search on the smaller array
 *   Space: O(1) — no extra arrays
 *   Why not O(m+n)? Merging both arrays is O(m+n) but unnecessary.
 *   Binary search finds the partition without materializing the merged array.
 *
 * #23 Merge K Sorted Lists:
 *   Naive (sequential merge): O(k*n) — first merge has n nodes, second has 2n, etc.
 *   Divide & Conquer: O(n log k)
 *     - log k levels of merging (like merge sort levels)
 *     - Each level processes all n nodes total
 *     - => O(n log k)
 *   Min-Heap: O(n log k)
 *     - n insertions/deletions from heap of size k
 *     - Each heap operation is O(log k)
 *
 * #315 Count of Smaller Numbers After Self:
 *   Time:  O(n log n) — same as merge sort
 *   Space: O(n) — for the indexed array and recursion stack
 *   Why merge sort? The merge step naturally compares elements across the "split"
 *   in a way that counts smaller elements to the right.
 *   Alternative: Binary Indexed Tree (BIT/Fenwick) — also O(n log n) but harder to explain.
 */

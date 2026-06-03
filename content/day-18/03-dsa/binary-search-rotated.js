/**
 * LeetCode #33 – Search in Rotated Sorted Array
 *
 * A sorted array has been rotated at some unknown pivot index.
 * e.g., [0,1,2,4,5,6,7] rotated at index 3 → [4,5,6,7,0,1,2]
 * Given target, return index or -1 if not found. Must be O(log n).
 *
 * Key Insight: Even after rotation, one half of the array is ALWAYS sorted.
 * Use this to determine which half contains the target.
 */

/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function search(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (nums[mid] === target) return mid;

    // Determine which half is sorted
    if (nums[left] <= nums[mid]) {
      // LEFT HALF IS SORTED: [nums[left] ... nums[mid]]
      if (nums[left] <= target && target < nums[mid]) {
        // Target is in the sorted left half
        right = mid - 1;
      } else {
        // Target is in the unsorted right half
        left = mid + 1;
      }
    } else {
      // RIGHT HALF IS SORTED: [nums[mid] ... nums[right]]
      if (nums[mid] < target && target <= nums[right]) {
        // Target is in the sorted right half
        left = mid + 1;
      } else {
        // Target is in the unsorted left half
        right = mid - 1;
      }
    }
  }

  return -1;
}

/**
 * VISUAL WALKTHROUGH:
 *
 * nums = [4,5,6,7,0,1,2], target = 0
 *
 * Iteration 1: left=0, right=6, mid=3
 *   nums[mid]=7, nums[left]=4
 *   4 <= 7, so left half [4,5,6,7] is sorted
 *   Is 4 <= 0 < 7? No (0 is not in this range)
 *   → Search right: left = 4
 *
 * Iteration 2: left=4, right=6, mid=5
 *   nums[mid]=1, nums[left]=0
 *   0 <= 1, so left half [0,1] is sorted
 *   Is 0 <= 0 < 1? Yes!
 *   → Search left: right = 4
 *
 * Iteration 3: left=4, right=4, mid=4
 *   nums[mid]=0 === target=0 → return 4
 */

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT: #81 – Search in Rotated Sorted Array II (with duplicates)
// Duplicates mean we can't always determine which half is sorted when
// nums[left] === nums[mid]. In that case, just shrink left boundary.
// Time: O(n) worst case (all duplicates)
// ─────────────────────────────────────────────────────────────────────────────

function searchWithDuplicates(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (nums[mid] === target) return true;

    // Can't determine sorted half when left equals mid
    if (nums[left] === nums[mid]) {
      left++; // shrink left boundary — worst case O(n)
      continue;
    }

    if (nums[left] < nums[mid]) {
      // Left half sorted
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      // Right half sorted
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: Find Minimum in Rotated Sorted Array (#153)
// The minimum is always in the unsorted half.
// ─────────────────────────────────────────────────────────────────────────────

function findMin(nums) {
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);

    if (nums[mid] > nums[right]) {
      // Minimum is in the right half (after the rotation point)
      left = mid + 1;
    } else {
      // Minimum is in the left half (including mid)
      right = mid;
    }
  }

  return nums[left];
}

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: Classic Binary Search Template
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard binary search — use as mental template
 * Condition: nums is sorted ascending, find exact target
 */
function binarySearch(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (nums[mid] === target) return mid;
    if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}

/**
 * Binary search for leftmost insert position (lower bound)
 * Returns index where target would be inserted
 */
function lowerBound(nums, target) {
  let left = 0;
  let right = nums.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

const tests = [
  { nums: [4,5,6,7,0,1,2], target: 0, expected: 4 },
  { nums: [4,5,6,7,0,1,2], target: 3, expected: -1 },
  { nums: [1], target: 0, expected: -1 },
  { nums: [1], target: 1, expected: 0 },
  { nums: [3,1], target: 1, expected: 1 },
  { nums: [5,1,3], target: 3, expected: 2 },
  { nums: [1,3,5], target: 5, expected: 2 },    // no rotation
  { nums: [6,7,1,2,3,4,5], target: 7, expected: 1 },
];

console.log('=== Search in Rotated Sorted Array ===\n');
tests.forEach(({ nums, target, expected }, i) => {
  const result = search(nums, target);
  const pass = result === expected;
  console.log(
    `Test ${i+1}: [${nums}] target=${target}`,
    `→ ${result}`,
    pass ? '✓' : `✗ (expected ${expected})`
  );
});

console.log('\n=== With Duplicates ===\n');
console.log(searchWithDuplicates([2,5,6,0,0,1,2], 0)); // true
console.log(searchWithDuplicates([2,5,6,0,0,1,2], 3)); // false

console.log('\n=== Find Minimum ===\n');
console.log(findMin([3,4,5,1,2])); // 1
console.log(findMin([4,5,6,7,0,1,2])); // 0
console.log(findMin([11,13,15,17])); // 11 (not rotated)

/*
 * INTERVIEW TALKING POINTS:
 *
 * Q: What's the key insight that makes this O(log n)?
 * A: Even after rotation, at least one half of the array around `mid` is always
 *    sorted. I check which half is sorted by comparing `nums[left]` to `nums[mid]`.
 *    If nums[left] <= nums[mid], the left half is sorted. I then check if the
 *    target falls within that sorted range to decide which half to search.
 *
 * Q: Why does the duplicate variant have O(n) worst case?
 * A: When nums[left] === nums[mid], we can't determine which half is sorted.
 *    Example: [1,3,1,1,1] — mid=2, nums[left]=1=nums[mid]=1. Is left sorted?
 *    We can't know, so we must shrink by one (left++). In the worst case
 *    (all same elements), we shrink one at a time → O(n).
 *
 * Q: What edge cases should you test?
 * A: Single element, target at pivot, target at boundaries (first/last),
 *    no rotation (already sorted), target not in array.
 */

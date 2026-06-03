/**
 * LeetCode #53 – Maximum Subarray (Kadane's Algorithm)
 * Difficulty: Medium
 * Pattern: Dynamic Programming / Greedy running sum
 *
 * Problem:
 * Given an integer array nums, find the subarray with the largest sum
 * and return its sum.
 *
 * Example:
 *   Input:  [-2, 1, -3, 4, -1, 2, 1, -5, 4]
 *   Output: 6  (subarray [4, -1, 2, 1])
 */

// ─────────────────────────────────────────────────────────────
// Approach 1: Brute Force — O(n²) time, O(1) space
// ─────────────────────────────────────────────────────────────
function maxSubarrayBrute(nums) {
  let maxSum = -Infinity;

  for (let i = 0; i < nums.length; i++) {
    let currentSum = 0;
    for (let j = i; j < nums.length; j++) {
      currentSum += nums[j];
      maxSum = Math.max(maxSum, currentSum);
    }
  }

  return maxSum;
}

// ─────────────────────────────────────────────────────────────
// Approach 2: Kadane's Algorithm — O(n) time, O(1) space
// ─────────────────────────────────────────────────────────────
// Key insight: at each index i, the max subarray ending AT i is either:
//   (a) nums[i] alone (start fresh — previous sum was dragging us negative)
//   (b) nums[i] + maxSumEndingHere (extend the previous subarray)
// We greedily take whichever is larger.

function maxSubarray(nums) {
  let maxSumEndingHere = nums[0]; // best sum for subarray ending at current index
  let globalMax = nums[0];        // best sum seen overall

  for (let i = 1; i < nums.length; i++) {
    // Either start fresh at nums[i], or extend existing subarray
    maxSumEndingHere = Math.max(nums[i], maxSumEndingHere + nums[i]);
    globalMax = Math.max(globalMax, maxSumEndingHere);
  }

  return globalMax;
}

// Step-by-step trace for [-2, 1, -3, 4, -1, 2, 1, -5, 4]:
// i=0: maxHere=-2, globalMax=-2
// i=1: max(1, -2+1=-1) = 1  → maxHere=1,  globalMax=1
// i=2: max(-3, 1-3=-2) = -2 → maxHere=-2, globalMax=1
// i=3: max(4, -2+4=2)  = 4  → maxHere=4,  globalMax=4
// i=4: max(-1, 4-1=3)  = 3  → maxHere=3,  globalMax=4
// i=5: max(2, 3+2=5)   = 5  → maxHere=5,  globalMax=5
// i=6: max(1, 5+1=6)   = 6  → maxHere=6,  globalMax=6
// i=7: max(-5, 6-5=1)  = 1  → maxHere=1,  globalMax=6
// i=8: max(4, 1+4=5)   = 5  → maxHere=5,  globalMax=6
// return 6 ✓

// ─────────────────────────────────────────────────────────────
// Edge Cases
// ─────────────────────────────────────────────────────────────
// All negatives: [-3, -1, -2] → answer is -1 (we must pick at least one element)
// Single element: [7] → answer is 7
// All positives: [1, 2, 3] → answer is 6 (entire array)
// Mixed: always pick the contiguous run that maximizes sum

console.log(maxSubarray([-3, -1, -2])); // -1 ✓ (not 0 — subarray must be non-empty)
console.log(maxSubarray([7]));          // 7
console.log(maxSubarray([1, 2, 3]));    // 6

// ─────────────────────────────────────────────────────────────
// Extension: Return the Actual Subarray (not just the sum)
// ─────────────────────────────────────────────────────────────
function maxSubarrayWithIndices(nums) {
  let maxSumEndingHere = nums[0];
  let globalMax = nums[0];

  let start = 0;      // start of current candidate subarray
  let bestStart = 0;  // start of best subarray found
  let bestEnd = 0;    // end of best subarray found

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] > maxSumEndingHere + nums[i]) {
      // Start fresh — drop everything before i
      maxSumEndingHere = nums[i];
      start = i;
    } else {
      maxSumEndingHere += nums[i];
    }

    if (maxSumEndingHere > globalMax) {
      globalMax = maxSumEndingHere;
      bestStart = start;
      bestEnd = i;
    }
  }

  return {
    sum: globalMax,
    subarray: nums.slice(bestStart, bestEnd + 1),
    indices: [bestStart, bestEnd]
  };
}

console.log("\n=== With Indices ===");
console.log(maxSubarrayWithIndices([-2, 1, -3, 4, -1, 2, 1, -5, 4]));
// { sum: 6, subarray: [4, -1, 2, 1], indices: [3, 6] }

// ─────────────────────────────────────────────────────────────
// Bonus: Move Zeroes (LeetCode #283)
// ─────────────────────────────────────────────────────────────
/**
 * Given an integer array nums, move all zeroes to the end
 * while maintaining the relative order of non-zero elements.
 * Do it in-place without making a copy.
 *
 * Example: [0, 1, 0, 3, 12] → [1, 3, 12, 0, 0]
 */
function moveZeroes(nums) {
  // Two-pointer: insertPos tracks where the next non-zero should go
  let insertPos = 0;

  // Pass 1: overwrite from front with all non-zero elements (in order)
  for (const num of nums) {
    if (num !== 0) nums[insertPos++] = num;
  }

  // Pass 2: fill the rest with zeros
  for (let i = insertPos; i < nums.length; i++) {
    nums[i] = 0;
  }

  return nums;
}

console.log("\n=== Move Zeroes ===");
console.log(moveZeroes([0, 1, 0, 3, 12])); // [1, 3, 12, 0, 0]
console.log(moveZeroes([0, 0, 1]));         // [1, 0, 0]
console.log(moveZeroes([0]));               // [0]

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
console.log("\n=== Kadane Tests ===");
console.log(maxSubarrayBrute([-2, 1, -3, 4, -1, 2, 1, -5, 4])); // 6
console.log(maxSubarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]));      // 6
console.log(maxSubarray([1]));                                    // 1
console.log(maxSubarray([5, 4, -1, 7, 8]));                      // 23

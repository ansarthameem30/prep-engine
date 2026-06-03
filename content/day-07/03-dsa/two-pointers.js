/**
 * LeetCode #15 – 3Sum
 * Difficulty: Medium
 * Pattern: Sort + Two Pointers
 *
 * Problem:
 * Given an integer array nums, return all triplets [nums[i], nums[j], nums[k]]
 * such that i != j != k and nums[i] + nums[j] + nums[k] == 0.
 * The solution set must not contain duplicate triplets.
 *
 * Example:
 *   Input:  [-1, 0, 1, 2, -1, -4]
 *   Output: [[-1,-1,2],[-1,0,1]]
 */

// ─────────────────────────────────────────────────────────────
// Approach: Sort + Two Pointers — O(n²) time, O(1) extra space
// ─────────────────────────────────────────────────────────────
// 1. Sort the array — enables two-pointer technique and easy duplicate skipping
// 2. For each element nums[i], use two pointers left=i+1, right=n-1
//    to find pairs that sum to -nums[i]
// 3. Skip duplicates at each position to avoid duplicate triplets

function threeSum(nums) {
  nums.sort((a, b) => a - b); // sort ascending
  const result = [];

  for (let i = 0; i < nums.length - 2; i++) {
    // Skip duplicates for the outer pointer
    if (i > 0 && nums[i] === nums[i - 1]) continue;

    // Optimization: if smallest possible sum > 0, no solution exists
    if (nums[i] > 0) break;

    let left = i + 1;
    let right = nums.length - 1;

    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];

      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]]);

        // Skip duplicates for left and right pointers
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;

        left++;
        right--;
      } else if (sum < 0) {
        left++; // need larger sum
      } else {
        right--; // need smaller sum
      }
    }
  }

  return result;
}

// Step trace for [-1, 0, 1, 2, -1, -4]:
// After sort: [-4, -1, -1, 0, 1, 2]
//
// i=0 (nums[i]=-4): left=1, right=5
//   sum=-4+-1+2=-3 < 0 → left++
//   sum=-4+-1+2=-3 < 0 → left++ (left=2 now, but skip dup: nums[2]==-1==nums[1])
//   ... eventually nothing sums to 0 with -4 as first element
//
// i=1 (nums[i]=-1): left=2, right=5
//   sum=-1+-1+2=0 → add [-1,-1,2], skip dups, left=3, right=4
//   sum=-1+0+1=0  → add [-1,0,1], skip dups, left=4, right=3 → exit
//
// i=2 (nums[i]=-1): skip — nums[2]==nums[1]==-1
//
// i=3 (nums[i]=0):  left=4, right=5
//   sum=0+1+2=3 > 0 → right--
//   left >= right → exit
//
// return [[-1,-1,2],[-1,0,1]] ✓

// ─────────────────────────────────────────────────────────────
// Two-Pointer Pattern Template
// ─────────────────────────────────────────────────────────────
/*
  Sort + Two Pointers applies when:
  - Array is (or can be) sorted
  - You need pairs/triplets with a sum or difference constraint
  - You need to avoid duplicates in results

  Template:
    sort(arr)
    for i in [0, n]:
      if duplicate: skip
      left = i + 1, right = n - 1
      while left < right:
        evaluate sum = arr[i] + arr[left] + arr[right]
        if sum == target: record, skip inner duplicates, left++, right--
        elif sum < target: left++
        else: right--
*/

// ─────────────────────────────────────────────────────────────
// Follow-Up: 4Sum (LeetCode #18)
// ─────────────────────────────────────────────────────────────
function fourSum(nums, target) {
  nums.sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < nums.length - 3; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;

    for (let j = i + 1; j < nums.length - 2; j++) {
      if (j > i + 1 && nums[j] === nums[j - 1]) continue;

      let left = j + 1, right = nums.length - 1;
      while (left < right) {
        const sum = nums[i] + nums[j] + nums[left] + nums[right];
        if (sum === target) {
          result.push([nums[i], nums[j], nums[left], nums[right]]);
          while (left < right && nums[left] === nums[left + 1]) left++;
          while (left < right && nums[right] === nums[right - 1]) right--;
          left++; right--;
        } else if (sum < target) left++;
        else right--;
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
console.log("=== 3Sum ===");
console.log(threeSum([-1, 0, 1, 2, -1, -4]));  // [[-1,-1,2],[-1,0,1]]
console.log(threeSum([0, 1, 1]));               // []
console.log(threeSum([0, 0, 0]));               // [[0,0,0]]
console.log(threeSum([-2, 0, 1, 1, 2]));        // [[-2,0,2],[-2,1,1]]

console.log("\n=== 4Sum ===");
console.log(fourSum([1, 0, -1, 0, -2, 2], 0)); // [[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]

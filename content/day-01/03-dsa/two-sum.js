/**
 * LeetCode #1 – Two Sum
 * Difficulty: Easy
 * Pattern: HashMap (complement lookup)
 *
 * Problem:
 * Given an array of integers `nums` and an integer `target`,
 * return indices of the two numbers such that they add up to target.
 * You may assume exactly one solution exists. Do not use the same element twice.
 *
 * Example:
 *   Input:  nums = [2, 7, 11, 15], target = 9
 *   Output: [0, 1]   (nums[0] + nums[1] = 2 + 7 = 9)
 */

// ─────────────────────────────────────────────────────────────
// Approach 1: Brute Force — O(n²) time, O(1) space
// ─────────────────────────────────────────────────────────────
// Check every pair. For each element i, scan all j > i.
// Works but fails at scale (10^4 elements = 10^8 operations).

function twoSumBrute(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return []; // no solution (problem guarantees one exists)
}

// ─────────────────────────────────────────────────────────────
// Approach 2: HashMap (One-Pass) — O(n) time, O(n) space
// ─────────────────────────────────────────────────────────────
// Key insight: for each element x, we need target - x.
// Store each element's index as we go. Check if complement was seen.

function twoSum(nums, target) {
  const seen = new Map(); // value → index

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];

    if (seen.has(complement)) {
      return [seen.get(complement), i];
      // seen.get(complement) is the index of the complement
    }

    seen.set(nums[i], i);
    // Store AFTER checking — prevents using same element twice
    // e.g. target=6, nums=[3,3] → first iteration: seen is empty, no match, store 3→0
    //       second iteration: complement=3, seen has 3→0, return [0,1] ✓
  }

  return [];
}

// Step-by-step trace for nums=[2,7,11,15], target=9:
// i=0: complement=7, seen={} → no hit. seen={2:0}
// i=1: complement=2, seen={2:0} → HIT! return [0, 1]

// ─────────────────────────────────────────────────────────────
// Complexity Analysis
// ─────────────────────────────────────────────────────────────
// Brute Force:
//   Time:  O(n²) — nested loops
//   Space: O(1)  — no extra data structure
//
// HashMap (Optimal):
//   Time:  O(n)  — single pass, Map operations are O(1) amortized
//   Space: O(n)  — in worst case, store all elements before finding answer
//
// Trade-off: We trade O(n) space to reduce time from O(n²) to O(n).
// Always the right call at interview unless interviewer explicitly asks for O(1) space.

// ─────────────────────────────────────────────────────────────
// Follow-Up: What if the array is sorted?
// ─────────────────────────────────────────────────────────────
// Use two pointers — O(n) time, O(1) space. No HashMap needed.

function twoSumSorted(nums, target) {
  // Assumes nums is sorted in ascending order
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === target) return [left, right];
    else if (sum < target) left++;   // need larger sum → move left pointer right
    else right--;                    // need smaller sum → move right pointer left
  }

  return [];
}

// Why this works: sorted array lets us deterministically adjust the window.
// If sum < target, the only way to increase it is to move left pointer right.
// If sum > target, the only way to decrease it is to move right pointer left.

// ─────────────────────────────────────────────────────────────
// Bonus: Best Time to Buy and Sell Stock (#121)
// ─────────────────────────────────────────────────────────────
/**
 * Given prices array where prices[i] = price on day i,
 * return the max profit. Buy once, sell once. If no profit possible, return 0.
 *
 * Example:
 *   Input:  [7, 1, 5, 3, 6, 4]
 *   Output: 5  (buy at 1, sell at 6)
 */

function maxProfit(prices) {
  let minPrice = Infinity; // track the lowest buy price seen so far
  let maxProfit = 0;       // track best profit seen so far

  for (const price of prices) {
    if (price < minPrice) {
      minPrice = price;    // found a cheaper buy day
    } else if (price - minPrice > maxProfit) {
      maxProfit = price - minPrice; // found a better sell day
    }
  }

  return maxProfit;
}

// Trace for [7, 1, 5, 3, 6, 4]:
// price=7: minPrice=7, profit=0
// price=1: minPrice=1
// price=5: profit=4
// price=3: no update
// price=6: profit=5 ✓
// price=4: no update
// return 5

// Time: O(n), Space: O(1) — classic greedy / sliding minimum pattern

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
console.log("=== Two Sum ===");
console.log(twoSumBrute([2, 7, 11, 15], 9));  // [0, 1]
console.log(twoSum([2, 7, 11, 15], 9));        // [0, 1]
console.log(twoSum([3, 2, 4], 6));             // [1, 2]
console.log(twoSum([3, 3], 6));               // [0, 1]

console.log("\n=== Two Sum Sorted ===");
console.log(twoSumSorted([2, 7, 11, 15], 9)); // [0, 1]

console.log("\n=== Max Profit ===");
console.log(maxProfit([7, 1, 5, 3, 6, 4])); // 5
console.log(maxProfit([7, 6, 4, 3, 1]));    // 0 (prices only fall)

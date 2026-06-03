/**
 * LeetCode #11 – Container With Most Water
 * Difficulty: Medium
 * Pattern: Two Pointers (greedy)
 *
 * Problem:
 * Given n non-negative integers representing heights, where each forms a
 * vertical line at that x position, find two lines that together with the
 * x-axis form a container that holds the most water.
 *
 * Example:
 *   Input:  [1, 8, 6, 2, 5, 4, 8, 3, 7]
 *   Output: 49  (lines at index 1 and 8: min(8,7) * (8-1) = 7 * 7 = 49)
 */

// ─────────────────────────────────────────────────────────────
// Approach 1: Brute Force — O(n²) time, O(1) space
// ─────────────────────────────────────────────────────────────
function maxAreaBrute(height) {
  let max = 0;
  for (let i = 0; i < height.length; i++) {
    for (let j = i + 1; j < height.length; j++) {
      const area = Math.min(height[i], height[j]) * (j - i);
      max = Math.max(max, area);
    }
  }
  return max;
}

// ─────────────────────────────────────────────────────────────
// Approach 2: Two Pointers — O(n) time, O(1) space
// ─────────────────────────────────────────────────────────────
// KEY GREEDY INSIGHT:
// Area = min(height[left], height[right]) * (right - left)
// Starting with the widest possible container (left=0, right=n-1),
// we want to maximize area by moving inward.
//
// Which pointer should we move? Always move the SHORTER side.
// PROOF: If we move the taller side, the width decreases AND the height
// is limited by the shorter side (unchanged), so area can only decrease.
// By moving the shorter side, the width decreases, but the height might
// increase — giving us a chance at a larger area.

function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let maxWater = 0;

  while (left < right) {
    const h = Math.min(height[left], height[right]);
    const w = right - left;
    maxWater = Math.max(maxWater, h * w);

    // Move the pointer with the shorter height
    if (height[left] <= height[right]) {
      left++;
    } else {
      right--;
    }
  }

  return maxWater;
}

// Step trace for [1, 8, 6, 2, 5, 4, 8, 3, 7]:
// l=0(h=1), r=8(h=7): area=min(1,7)*8=8,   max=8  → move left (shorter)
// l=1(h=8), r=8(h=7): area=min(8,7)*7=49,  max=49 → move right (shorter)
// l=1(h=8), r=7(h=3): area=min(8,3)*6=18,  max=49 → move right
// l=1(h=8), r=6(h=8): area=min(8,8)*5=40,  max=49 → move left (equal)
// l=2(h=6), r=6(h=8): area=min(6,8)*4=24,  max=49 → move left
// l=3(h=2), r=6(h=8): area=min(2,8)*3=6,   max=49 → move left
// l=4(h=5), r=6(h=8): area=min(5,8)*2=10,  max=49 → move left
// l=5(h=4), r=6(h=8): area=min(4,8)*1=4,   max=49 → move left
// l=6 >= r=6: exit
// return 49 ✓

// ─────────────────────────────────────────────────────────────
// Complexity
// ─────────────────────────────────────────────────────────────
// Brute force: O(n²) time, O(1) space
// Two pointers: O(n) time, O(1) space
// Improvement factor: for n=10,000: ~50M ops vs ~10K ops

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
console.log("=== Container With Most Water ===");
console.log(maxAreaBrute([1, 8, 6, 2, 5, 4, 8, 3, 7])); // 49
console.log(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]));      // 49
console.log(maxArea([1, 1]));                             // 1
console.log(maxArea([4, 3, 2, 1, 4]));                   // 16
console.log(maxArea([1, 2, 1]));                         // 2

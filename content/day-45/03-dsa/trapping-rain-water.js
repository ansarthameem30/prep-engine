/**
 * Day 45 DSA — Trapping Rain Water and Monotonic Stack Problems
 *
 * These problems use two-pointer or monotonic stack techniques.
 * The key insight: instead of computing water per column directly,
 * think about what determines water level at each position.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LC #42: Trapping Rain Water
// Time: O(n) | Space: O(1) — two pointer approach
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Key insight: water at position i = min(maxLeft[i], maxRight[i]) - height[i]
 * Two pointer approach avoids precomputing these arrays:
 *
 * Maintain left pointer, right pointer, maxLeft, maxRight.
 * If height[left] < height[right]:
 *   - We know maxRight >= height[right] (there's a wall on the right)
 *   - Water at left = max(0, maxLeft - height[left])
 *   - Move left pointer right
 * Else: symmetric logic for right pointer
 *
 * We process the side with the smaller height first, because that side's
 * water is fully determined by maxLeft/maxRight already computed.
 */
function trap(height) {
  let left = 0, right = height.length - 1;
  let maxLeft = 0, maxRight = 0;
  let water = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      // Left side is lower: water determined by maxLeft
      if (height[left] >= maxLeft) {
        maxLeft = height[left]; // Update water wall
      } else {
        water += maxLeft - height[left]; // Water fills to maxLeft level
      }
      left++;
    } else {
      // Right side is lower: water determined by maxRight
      if (height[right] >= maxRight) {
        maxRight = height[right];
      } else {
        water += maxRight - height[right];
      }
      right--;
    }
  }

  return water;
}

// Monotonic stack approach — also O(n) but O(n) space
// Useful for understanding the "layer by layer" perspective
function trap_stack(height) {
  const stack = []; // Stores indices, maintaining decreasing heights
  let water = 0;

  for (let i = 0; i < height.length; i++) {
    // When we find a taller bar, it can trap water with items in the stack
    while (stack.length > 0 && height[i] > height[stack[stack.length - 1]]) {
      const bottom = stack.pop();
      if (stack.length === 0) break; // No left wall

      const leftWall = stack[stack.length - 1];
      const width = i - leftWall - 1;
      const boundedHeight = Math.min(height[leftWall], height[i]) - height[bottom];
      water += width * boundedHeight;
    }
    stack.push(i);
  }

  return water;
}

console.log("=== LC #42: Trapping Rain Water ===");
console.log(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])); // 6
console.log(trap([4, 2, 0, 3, 2, 5])); // 9
console.log(trap_stack([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])); // 6

// ─────────────────────────────────────────────────────────────────────────────
// LC #11: Container With Most Water
// Time: O(n) | Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Two lines form the walls. Area = min(height[l], height[r]) * (r - l).
 * Greedy: always move the pointer with the SMALLER height inward.
 * Why? Moving the larger height can only decrease width (r-l decreases by 1)
 * and cannot increase the bounded height (still limited by the smaller side).
 * Moving the smaller height might find a taller wall, potentially increasing area.
 */
function maxArea(height) {
  let left = 0, right = height.length - 1;
  let maxWater = 0;

  while (left < right) {
    const area = Math.min(height[left], height[right]) * (right - left);
    maxWater = Math.max(maxWater, area);

    // Move the shorter wall inward
    if (height[left] < height[right]) left++;
    else right--;
  }

  return maxWater;
}

console.log("\n=== LC #11: Container With Most Water ===");
console.log(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])); // 49
console.log(maxArea([1, 1])); // 1

// ─────────────────────────────────────────────────────────────────────────────
// LC #84: Largest Rectangle in Histogram
// Time: O(n) | Space: O(n) — monotonic stack
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Use a monotonic increasing stack.
 * For each bar, when we encounter a shorter bar, we can calculate
 * the area for all bars in the stack that are taller than the current bar.
 *
 * For a popped bar at index i:
 *   Height = heights[i]
 *   Width = current_index - stack_top_after_pop - 1 (or full width if stack empty)
 *
 * Add sentinel 0s at both ends to flush remaining bars at the end.
 */
function largestRectangleArea(heights) {
  const h = [0, ...heights, 0]; // Sentinels: 0 at start and end
  const stack = [0]; // Stack of indices, bottom has sentinel
  let maxArea = 0;

  for (let i = 1; i < h.length; i++) {
    while (h[i] < h[stack[stack.length - 1]]) {
      const topIdx = stack.pop();
      const width = i - stack[stack.length - 1] - 1;
      maxArea = Math.max(maxArea, h[topIdx] * width);
    }
    stack.push(i);
  }

  return maxArea;
}

console.log("\n=== LC #84: Largest Rectangle in Histogram ===");
console.log(largestRectangleArea([2, 1, 5, 6, 2, 3])); // 10
console.log(largestRectangleArea([2, 4])); // 4

// ─────────────────────────────────────────────────────────────────────────────
// LC #85: Maximal Rectangle
// Time: O(n*m) | Space: O(m)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reduce to a series of histogram problems.
 * For each row, compute the height of consecutive 1s ending at that row.
 * heights[j] = number of consecutive 1s above (and including) cell (i, j).
 * Then apply largestRectangleArea on the heights array.
 */
function maximalRectangle(matrix) {
  if (!matrix.length || !matrix[0].length) return 0;

  const m = matrix.length, n = matrix[0].length;
  const heights = new Array(n).fill(0);
  let maxRect = 0;

  for (let i = 0; i < m; i++) {
    // Update heights: extend column of 1s, reset on 0
    for (let j = 0; j < n; j++) {
      heights[j] = matrix[i][j] === "1" ? heights[j] + 1 : 0;
    }
    // Apply histogram solution on current row's heights
    maxRect = Math.max(maxRect, largestRectangleArea(heights));
  }

  return maxRect;
}

console.log("\n=== LC #85: Maximal Rectangle ===");
console.log(maximalRectangle([
  ["1","0","1","0","0"],
  ["1","0","1","1","1"],
  ["1","1","1","1","1"],
  ["1","0","0","1","0"],
])); // 6

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TWO-POINTER PATTERN (O(n) space O(1)):
 * - Works when you can process from both ends toward center
 * - Container with most water: always move the shorter side
 * - Trapping rain water: always process the side with smaller max boundary
 * - Key: establish invariants about what each pointer "knows"
 *
 * MONOTONIC STACK PATTERN (O(n) space O(n)):
 * - Works when you need "next greater element" or "previous smaller element"
 * - Maintain invariant on stack (increasing or decreasing)
 * - When invariant is violated, pop and compute the "trapped" quantity
 * - Histogram: maintain increasing stack, pop when shorter bar found
 *
 * COMPLEXITY SUMMARY:
 * Problem            Algorithm            Time   Space
 * ───────────────    ─────────────────    ────   ─────
 * #42 Rain Water     Two pointer          O(n)   O(1)  ← preferred
 * #42 Rain Water     Monotonic stack      O(n)   O(n)
 * #11 Container      Two pointer          O(n)   O(1)
 * #84 Histogram      Monotonic stack      O(n)   O(n)
 * #85 Max Rectangle  Row histogram + #84  O(nm)  O(m)
 */

// Tests
console.log("\n=== All Tests ===");
console.assert(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]) === 6, "#42 two pointer failed");
console.assert(trap_stack([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]) === 6, "#42 stack failed");
console.assert(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]) === 49, "#11 failed");
console.assert(largestRectangleArea([2, 1, 5, 6, 2, 3]) === 10, "#84 failed");
console.log("All tests passed!");

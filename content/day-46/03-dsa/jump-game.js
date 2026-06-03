/**
 * Day 46 DSA — Jump Game Problems
 *
 * Jump game problems test greedy reasoning and BFS on implicit graphs.
 * Key patterns:
 * - Greedy (farthest reach): for reachability, O(n)
 * - Greedy (interval coverage): for min jumps, O(n)
 * - BFS: when we need minimum steps, O(n) or O(n + edges)
 */

// ─────────────────────────────────────────────────────────────────────────────
// LC #55: Jump Game — Can you reach the end?
// Time: O(n) | Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Greedy: track the maximum index reachable at any point.
 * If we ever reach a position beyond maxReach, we're stuck.
 * If maxReach >= last index, we can reach the end.
 */
function canJump55(nums) {
  let maxReach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > maxReach) return false; // Can't reach position i
    maxReach = Math.max(maxReach, i + nums[i]);
    if (maxReach >= nums.length - 1) return true;
  }
  return maxReach >= nums.length - 1;
}

// Alternative: greedy from right (easier to understand)
function canJump55_right(nums) {
  let lastGood = nums.length - 1;
  for (let i = nums.length - 2; i >= 0; i--) {
    if (i + nums[i] >= lastGood) {
      lastGood = i; // i can reach the last good position
    }
  }
  return lastGood === 0; // Can we reach position 0?
}

console.log("=== LC #55: Jump Game ===");
console.log(canJump55([2, 3, 1, 1, 4])); // true
console.log(canJump55([3, 2, 1, 0, 4])); // false (stuck at index 3)
console.log(canJump55_right([2, 3, 1, 1, 4])); // true

// ─────────────────────────────────────────────────────────────────────────────
// LC #45: Jump Game II — Minimum Jumps to Reach End
// Time: O(n) | Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Greedy with interval tracking.
 * Think of it as: at each "level", what's the farthest we can reach?
 * - currentEnd: the end of the current jump's range
 * - farthest: the farthest we can reach from any position in current range
 * When we reach currentEnd, we must jump — take farthest as our new range.
 *
 * This is equivalent to BFS where each "level" = one jump.
 */
function jump45(nums) {
  let jumps = 0;
  let currentEnd = 0; // End of current reachable range
  let farthest = 0;   // Farthest position reachable from current range

  // No need to process last element — if we reach it, we're done
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);

    if (i === currentEnd) {
      // Must jump! Expand to farthest reachable position
      jumps++;
      currentEnd = farthest;

      if (currentEnd >= nums.length - 1) break; // Reached or passed end
    }
  }

  return jumps;
}

console.log("\n=== LC #45: Jump Game II ===");
console.log(jump45([2, 3, 1, 1, 4])); // 2 jumps: [0→1→4]
console.log(jump45([2, 3, 0, 1, 4])); // 2 jumps: [0→1→4]
console.log(jump45([1])); // 0 jumps (already at end)

// ─────────────────────────────────────────────────────────────────────────────
// LC #1306: Jump Game III — Can You Reach Index with Value 0?
// Time: O(n) | Space: O(n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * From index i, you can jump to i + arr[i] OR i - arr[i].
 * Can you reach any index with value 0?
 *
 * BFS or DFS — treat as graph problem.
 * Each index is a node, edges go to i+arr[i] and i-arr[i].
 */
function canReach1306(arr, start) {
  const n = arr.length;
  const visited = new Set();
  const queue = [start];

  while (queue.length > 0) {
    const i = queue.shift();

    if (i < 0 || i >= n || visited.has(i)) continue;
    if (arr[i] === 0) return true;

    visited.add(i);
    queue.push(i + arr[i]);
    queue.push(i - arr[i]);
  }

  return false;
}

console.log("\n=== LC #1306: Jump Game III ===");
console.log(canReach1306([4, 2, 3, 0, 3, 1, 2], 5)); // true (5→4→1→3, arr[3]=0)
console.log(canReach1306([4, 2, 3, 0, 3, 1, 2], 0)); // true
console.log(canReach1306([3, 0, 2, 1, 2], 2)); // false (can't reach index with 0)

// ─────────────────────────────────────────────────────────────────────────────
// LC #1345: Jump Game IV — Minimum Jumps (Including Same-Value Jumps)
// Time: O(n) | Space: O(n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * From index i, you can jump to i-1, i+1, or any j where arr[j] === arr[i].
 * Find minimum jumps to reach last index from index 0.
 *
 * BFS for minimum steps. Optimization: after visiting all same-value indices,
 * clear them from the map (they won't lead to shorter paths to any unvisited node).
 *
 * Without this optimization, same-value indices could be revisited O(n) times each,
 * leading to O(n²). Clearing the group after first visit = O(n) total.
 */
function minJumps1345(arr) {
  const n = arr.length;
  if (n === 1) return 0;

  // Build map: value → list of indices with that value
  const sameValueMap = new Map();
  for (let i = 0; i < n; i++) {
    if (!sameValueMap.has(arr[i])) sameValueMap.set(arr[i], []);
    sameValueMap.get(arr[i]).push(i);
  }

  const visited = new Set([0]);
  const queue = [0];
  let steps = 0;

  while (queue.length > 0) {
    steps++;
    const size = queue.length;

    for (let k = 0; k < size; k++) {
      const i = queue.shift();
      const neighbors = [i - 1, i + 1];

      // Add all same-value neighbors
      if (sameValueMap.has(arr[i])) {
        neighbors.push(...sameValueMap.get(arr[i]));
        sameValueMap.delete(arr[i]); // Key optimization: clear to avoid revisiting
      }

      for (const j of neighbors) {
        if (j === n - 1) return steps;
        if (j >= 0 && j < n && !visited.has(j)) {
          visited.add(j);
          queue.push(j);
        }
      }
    }
  }

  return -1; // Should not reach here if problem guarantees reachability
}

console.log("\n=== LC #1345: Jump Game IV ===");
console.log(minJumps1345([100, -23, -23, 404, 100, 23, 23, 23, 3, 404])); // 3
console.log(minJumps1345([7])); // 0
console.log(minJumps1345([7, 6, 9, 6, 9, 6, 9, 7])); // 1

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * JUMP GAME PATTERN GUIDE
 *
 * Problem  | Question            | Approach           | Time   | Space
 * ──────── | ─────────────────── | ────────────────── | ────── | ──────
 * #55      | Can you reach end?  | Greedy (maxReach)  | O(n)   | O(1)
 * #45      | Min jumps to end?   | Greedy (intervals) | O(n)   | O(1)
 * #1306    | Can you reach 0?    | BFS/DFS            | O(n)   | O(n)
 * #1345    | Min jumps (teleport)| BFS + map clearing | O(n)   | O(n)
 *
 * KEY INSIGHT for #45: BFS levels correspond to jumps.
 * At each "level", we extend as far as possible within current range.
 * This is the same as: "cover the interval with minimum jumps" (greedy interval cover).
 *
 * KEY INSIGHT for #1345: The BFS map-clearing optimization is critical.
 * If you don't clear the same-value group after visiting, every node in a
 * large group (e.g., 50000 nodes with same value) gets explored 50000 times → O(n²).
 * After first visit of a group, any remaining unvisited group members that
 * could be reached will be at distance+1, same as any other neighbor.
 */

// Tests
console.log("\n=== All Tests ===");
console.assert(canJump55([2, 3, 1, 1, 4]) === true, "#55 test 1 failed");
console.assert(canJump55([3, 2, 1, 0, 4]) === false, "#55 test 2 failed");
console.assert(jump45([2, 3, 1, 1, 4]) === 2, "#45 test 1 failed");
console.assert(jump45([1]) === 0, "#45 single element failed");
console.assert(canReach1306([4, 2, 3, 0, 3, 1, 2], 5) === true, "#1306 test 1 failed");
console.assert(minJumps1345([7]) === 0, "#1345 single element failed");
console.log("All tests passed!");

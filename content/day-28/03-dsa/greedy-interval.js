/**
 * Day 28 — DSA: Greedy Interval Problems
 *
 * LeetCode #134: Gas Station
 * LeetCode #435: Non-overlapping Intervals
 * LeetCode #56: Merge Intervals
 * LeetCode #57: Insert Interval
 */

// ─────────────────────────────────────────────
// LeetCode #134: Gas Station
// ─────────────────────────────────────────────
// Find the starting index of a circular route where you can complete the circuit.
// gas[i] = gas added at station i, cost[i] = gas to drive from i to i+1.

/**
 * Greedy observation:
 * 1. If total(gas) < total(cost), there's no solution.
 * 2. If total(gas) >= total(cost), a solution exists.
 * 3. The solution is the station where we reset after running out of gas.
 *
 * Proof: If we start at station `start` and run out of gas at some station j,
 * then no station between `start` and j can be the answer
 * (we'd have less gas arriving there than if we started at `start`).
 * Reset `start` to j+1 and continue.
 *
 * Time: O(n) — single pass
 * Space: O(1)
 */
function canCompleteCircuit(gas, cost) {
  let totalTank = 0;    // track if a solution exists
  let currentTank = 0;  // track current gas balance from start
  let start = 0;        // candidate starting station

  for (let i = 0; i < gas.length; i++) {
    const net = gas[i] - cost[i];
    totalTank += net;
    currentTank += net;

    if (currentTank < 0) {
      // Can't reach station i+1 from current start → reset
      start = i + 1;
      currentTank = 0;
    }
  }

  return totalTank >= 0 ? start : -1;
}

console.log('=== LeetCode #134: Gas Station ===');
console.log('[1,2,3,4,5] cost [3,4,5,1,2]:', canCompleteCircuit([1,2,3,4,5], [3,4,5,1,2])); // 3
console.log('[2,3,4] cost [3,4,3]:', canCompleteCircuit([2,3,4], [3,4,3]));                  // -1
console.log('[5,1,2,3,4] cost [4,4,1,5,1]:', canCompleteCircuit([5,1,2,3,4], [4,4,1,5,1])); // 4


// ─────────────────────────────────────────────
// LeetCode #435: Non-overlapping Intervals
// ─────────────────────────────────────────────
// Minimum number of intervals to remove to make them non-overlapping.

/**
 * Equivalent to: find the maximum number of non-overlapping intervals,
 * then answer = total - max_non_overlapping.
 *
 * Greedy: sort by END time. Always keep the interval that ends earliest.
 * When we see an overlap, remove the interval that ends later (not the current one).
 * This leaves the most "room" for future intervals.
 *
 * Exchange argument: suppose an optimal solution keeps interval A instead of the
 * earliest-ending B. Since B ends before A (B ends ≤ A ends), swapping A→B still
 * produces a valid non-overlapping set (B leaves at least as much room as A).
 *
 * Time: O(n log n)
 * Space: O(1)
 */
function eraseOverlapIntervals(intervals) {
  if (!intervals.length) return 0;
  intervals.sort((a, b) => a[1] - b[1]); // sort by end time

  let count = 0;           // intervals removed
  let lastEnd = -Infinity; // end time of last kept interval

  for (const [start, end] of intervals) {
    if (start >= lastEnd) {
      // No overlap — keep this interval
      lastEnd = end;
    } else {
      // Overlap — remove this interval (it ends later than the previous kept one)
      count++;
    }
  }

  return count;
}

console.log('\n=== LeetCode #435: Non-overlapping Intervals ===');
console.log('[[1,2],[2,3],[3,4],[1,3]]:', eraseOverlapIntervals([[1,2],[2,3],[3,4],[1,3]])); // 1
console.log('[[1,2],[1,2],[1,2]]:', eraseOverlapIntervals([[1,2],[1,2],[1,2]]));             // 2
console.log('[[1,2],[2,3]]:', eraseOverlapIntervals([[1,2],[2,3]]));                         // 0


// ─────────────────────────────────────────────
// LeetCode #56: Merge Intervals
// ─────────────────────────────────────────────
// Merge all overlapping intervals.

/**
 * Sort by start time. Maintain a "current" interval.
 * If next interval overlaps with current (next.start <= current.end):
 *   extend current.end = max(current.end, next.end)
 * Else: push current to result, start new current.
 *
 * Time: O(n log n) for sorting
 * Space: O(n) for output
 */
function merge(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]); // sort by start time

  const result = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const current = result[result.length - 1];
    const [start, end] = intervals[i];

    if (start <= current[1]) {
      // Overlap: merge by extending end
      current[1] = Math.max(current[1], end);
    } else {
      // No overlap: add new interval
      result.push([start, end]);
    }
  }

  return result;
}

console.log('\n=== LeetCode #56: Merge Intervals ===');
console.log('[[1,3],[2,6],[8,10],[15,18]]:', JSON.stringify(merge([[1,3],[2,6],[8,10],[15,18]]))); // [[1,6],[8,10],[15,18]]
console.log('[[1,4],[4,5]]:', JSON.stringify(merge([[1,4],[4,5]]))); // [[1,5]] (touching = overlap)
console.log('[[1,4],[0,4]]:', JSON.stringify(merge([[1,4],[0,4]]))); // [[0,4]]


// ─────────────────────────────────────────────
// LeetCode #57: Insert Interval
// ─────────────────────────────────────────────
// Given a sorted non-overlapping list, insert a new interval and merge if needed.

/**
 * Three phases:
 * 1. Add all intervals that end before the new interval starts (no overlap)
 * 2. Merge all intervals that overlap with the new interval
 * 3. Add all remaining intervals (start after new interval ends)
 *
 * Time: O(n) — single pass
 * Space: O(n) for output
 */
function insert(intervals, newInterval) {
  const result = [];
  let i = 0;
  const n = intervals.length;

  // Phase 1: intervals that end before newInterval starts — no overlap
  while (i < n && intervals[i][1] < newInterval[0]) {
    result.push(intervals[i++]);
  }

  // Phase 2: merge overlapping intervals
  // An interval overlaps if it starts before newInterval ends
  while (i < n && intervals[i][0] <= newInterval[1]) {
    newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
    newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
    i++;
  }
  result.push(newInterval); // push merged interval

  // Phase 3: intervals that start after newInterval ends — no overlap
  while (i < n) {
    result.push(intervals[i++]);
  }

  return result;
}

console.log('\n=== LeetCode #57: Insert Interval ===');
console.log('[[1,3],[6,9]] insert [2,5]:', JSON.stringify(insert([[1,3],[6,9]], [2,5]))); // [[1,5],[6,9]]
console.log('[[1,2],[3,5],[6,7],[8,10],[12,16]] insert [4,8]:', JSON.stringify(insert([[1,2],[3,5],[6,7],[8,10],[12,16]], [4,8]))); // [[1,2],[3,10],[12,16]]
console.log('[] insert [5,7]:', JSON.stringify(insert([], [5,7]))); // [[5,7]]


// ─────────────────────────────────────────────
// Why Greedy Works: Exchange Argument
// ─────────────────────────────────────────────
console.log(`
Why Greedy Works (Exchange Argument for Non-overlapping Intervals):

Claim: Sorting by end time and always keeping the earliest-ending interval
       yields the maximum number of non-overlapping intervals.

Proof sketch:
  Let OPT be any optimal solution, G be our greedy solution.
  Suppose OPT and G diverge at interval k: OPT picks interval A, G picks interval B.
  B ends no later than A (G always picks earliest-ending non-overlapping interval).
  Therefore: swapping A → B in OPT:
    - Still non-overlapping (B ends ≤ A ends, so B doesn't conflict with anything A didn't)
    - Has at least as many intervals as OPT
  We can transform OPT into G without decreasing the count → G is optimal. QED

╔═══════════════════════════════════════════════════════════════════╗
║              INTERVAL GREEDY COMPLEXITY SUMMARY                   ║
╠═════════════════════════════╦══════════════╦════════════════════╣
║ Problem                     ║ Time         ║ Space              ║
╠═════════════════════════════╬══════════════╬════════════════════╣
║ Gas Station                 ║ O(n)         ║ O(1)               ║
║ Non-overlapping Intervals   ║ O(n log n)   ║ O(1)               ║
║ Merge Intervals             ║ O(n log n)   ║ O(n)               ║
║ Insert Interval             ║ O(n)         ║ O(n)               ║
╚═════════════════════════════╩══════════════╩════════════════════╝
`);

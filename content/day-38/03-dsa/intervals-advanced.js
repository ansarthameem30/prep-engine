/**
 * Day 38 — DSA: Advanced Interval Problems
 *
 * Problems:
 *   1. LeetCode #986  — Interval List Intersections (two-pointer)
 *   2. LeetCode #452  — Minimum Arrows to Burst Balloons (greedy)
 *   3. LeetCode #1235 — Maximum Profit in Job Scheduling (DP + binary search)
 *   4. LeetCode #759  — Employee Free Time (merge sorted intervals)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: Interval List Intersections (LC #986)
// Given two sorted lists of closed intervals, return their intersection.
//
// Strategy: Two pointers, one per list.
//   Intersection of [a,b] and [c,d] is [max(a,c), min(b,d)] if max(a,c) <= min(b,d)
//   Advance the pointer whose interval ends earlier (it can't intersect anything further right)
//
// Time:  O(M + N) where M, N are lengths of the two lists
// Space: O(M + N) for output
// ─────────────────────────────────────────────────────────────────────────────

function intervalIntersection(firstList, secondList) {
  const result = [];
  let i = 0, j = 0;

  while (i < firstList.length && j < secondList.length) {
    const [a, b] = firstList[i];
    const [c, d] = secondList[j];

    // Find intersection
    const lo = Math.max(a, c);
    const hi = Math.min(b, d);

    if (lo <= hi) {
      result.push([lo, hi]);
    }

    // Advance the pointer whose interval ends first
    if (b < d) i++;
    else j++;
  }

  return result;
}

console.log("=== Interval List Intersections (LC #986) ===");
console.log(intervalIntersection(
  [[0,2],[5,10],[13,23],[24,25]],
  [[1,5],[8,12],[15,24],[25,26]]
));
// [[1,2],[5,5],[8,10],[15,23],[24,24],[25,25]]

console.log(intervalIntersection([[1,3],[5,9]], [])); // []
console.log(intervalIntersection([], [[4,8]]));       // []

/*
 * Why advance the pointer with the smaller end?
 * The interval that ends sooner cannot intersect with any future interval of the other list
 * (all future intervals start at or after the current one — which starts no earlier than the ended interval).
 * So we can safely move past it.
 *
 * This two-pointer technique for merging/intersecting sorted arrays is fundamental.
 * It appears in: merge two sorted arrays, find common elements, and many interval problems.
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Minimum Arrows to Burst Balloons (LC #452)
// Balloons as intervals [xstart, xend]. Arrow at position x bursts all balloons [a,b] where a <= x <= b.
// Find minimum number of arrows.
//
// Key insight: This is equivalent to finding maximum non-overlapping intervals,
// then each "group" of overlapping balloons can be popped by one arrow.
//
// Strategy: Sort by END position. Greedily shoot at the end of the first balloon.
//   This one arrow bursts all balloons overlapping with this first balloon.
//   Move past all burst balloons. Shoot the next unpopped balloon at its end. Repeat.
//
// Time:  O(N log N) for sort + O(N) scan = O(N log N)
// Space: O(1) extra
// ─────────────────────────────────────────────────────────────────────────────

function findMinArrowShots(points) {
  if (!points.length) return 0;

  // Sort by end position
  points.sort((a, b) => a[1] - b[1]);

  let arrows = 1;
  let arrowPos = points[0][1]; // Shoot at end of first balloon

  for (let i = 1; i < points.length; i++) {
    if (points[i][0] > arrowPos) {
      // This balloon starts after our last arrow — needs a new arrow
      arrows++;
      arrowPos = points[i][1]; // Shoot at end of this balloon
    }
    // Otherwise, this balloon is burst by the existing arrow (starts <= arrowPos)
  }

  return arrows;
}

console.log("\n=== Minimum Arrows to Burst Balloons (LC #452) ===");
console.log(findMinArrowShots([[10,16],[2,8],[1,6],[7,12]])); // 2
console.log(findMinArrowShots([[1,2],[3,4],[5,6],[7,8]]));    // 4 (no overlaps)
console.log(findMinArrowShots([[1,2],[2,3],[3,4],[4,5]]));    // 2 (1→2 and 2→3→4 chains)

/*
 * Connection to non-overlapping intervals (LC #435):
 * - LC #435 asks: minimum intervals to REMOVE so the rest don't overlap
 * - LC #452 asks: minimum arrows to burst all balloon groups
 * Both use the same greedy (sort by end, process groups).
 * The answers differ by exactly 1: LC #435 answer = N - (number of non-overlapping groups)
 *                                   LC #452 answer = number of non-overlapping groups
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 3: Maximum Profit in Job Scheduling (LC #1235)
// Jobs with [startTime, endTime, profit]. Pick non-overlapping jobs to maximize profit.
//
// Strategy: DP with binary search
//   Sort jobs by end time.
//   dp[i] = max profit considering the first i jobs
//   For each job i: find the latest job j that ends by job i's start time (binary search)
//   dp[i] = max(dp[i-1],  dp[j] + profit[i])
//            ^^skip job i  ^^take job i (profit + best before it)
//
// Time:  O(N log N) for sort + O(N log N) for N binary searches = O(N log N)
// Space: O(N) for dp array
// ─────────────────────────────────────────────────────────────────────────────

function jobScheduling(startTime, endTime, profit) {
  const n = startTime.length;

  // Combine and sort by end time
  const jobs = Array.from({ length: n }, (_, i) => [startTime[i], endTime[i], profit[i]]);
  jobs.sort((a, b) => a[1] - b[1]);

  // dp[i] = max profit using first i jobs (dp[0] = 0 means no jobs taken)
  const dp = new Array(n + 1).fill(0);

  for (let i = 0; i < n; i++) {
    const [start, end, p] = jobs[i];

    // Binary search: find the rightmost job that ends <= start of current job
    // In the dp array, dp[j+1] corresponds to jobs[0..j]
    let lo = 0, hi = i;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (jobs[mid - 1][1] <= start) lo = mid;
      else hi = mid - 1;
    }
    // lo is the number of jobs we can take before current job starts

    dp[i + 1] = Math.max(dp[i], dp[lo] + p);
  }

  return dp[n];
}

console.log("\n=== Maximum Profit in Job Scheduling (LC #1235) ===");
console.log(jobScheduling([1,2,3,3], [3,4,5,6], [50,10,40,70])); // 120 (jobs 1 and 4)
console.log(jobScheduling([1,2,3,4,6], [3,5,10,6,9], [20,20,100,200,100])); // 200 (job 4 alone)
console.log(jobScheduling([1,1,1], [2,3,4], [5,6,4])); // 6

/*
 * The binary search finds: how many jobs (out of our sorted list) end at or before
 * the current job's start time. dp[lo] = best profit from those jobs.
 * We then choose: take current job (dp[lo] + profit) OR skip it (dp[i]).
 *
 * This is Weighted Interval Scheduling — a classic DP problem.
 * The key is the binary search to find the "compatible" subset efficiently.
 *
 * Real-world applications:
 * - Cloud instance reservation optimization (choose non-overlapping time slots to maximize savings)
 * - Staff scheduling (non-overlapping shifts for maximum coverage)
 * - Ad slot allocation (maximize revenue from non-overlapping ad slots)
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 4: Employee Free Time (LC #759)
// Given list of employees' work schedules (sorted within each employee),
// find intervals when ALL employees are free.
//
// Strategy: Merge all intervals across all employees into one sorted list,
//           then find gaps between merged intervals.
//
// Time:  O(N log N) where N = total intervals across all employees
// Space: O(N) for merged list
// ─────────────────────────────────────────────────────────────────────────────

function employeeFreeTime(schedules) {
  // Flatten all intervals from all employees
  const allIntervals = schedules.flat().sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  if (!allIntervals.length) return [];

  // Merge overlapping intervals
  const merged = [allIntervals[0].slice()];
  for (let i = 1; i < allIntervals.length; i++) {
    const [start, end] = allIntervals[i];
    const last = merged[merged.length - 1];
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  // Find gaps between consecutive merged intervals
  const freeTimes = [];
  for (let i = 1; i < merged.length; i++) {
    freeTimes.push([merged[i - 1][1], merged[i][0]]);
  }

  return freeTimes;
}

console.log("\n=== Employee Free Time (LC #759) ===");

// Employee 1: [1,3],[6,7]   Employee 2: [2,4]   Employee 3: [2,5],[9,12]
const schedules1 = [[1,3],[6,7]], schedules2 = [[2,4]], schedules3 = [[2,5],[9,12]];
const free1 = employeeFreeTime([schedules1, schedules2, schedules3]);
console.log("Free times:", free1); // [[5,6],[7,9]] — gaps between merged work intervals

// Employee 1: [1,3],[6,7]   Employee 2: [2,4]
const free2 = employeeFreeTime([[1,3],[6,7]], [[2,4]]);
console.log("Free times (2 employees):", free2);

/*
 * Why this works:
 * After merging all employees' work intervals, any gap between merged intervals
 * is a time when NO employee is working (everyone is free simultaneously).
 *
 * Alternative approach: Priority queue
 * Process intervals in order using a min-heap sorted by start time.
 * Track the "latest end" seen so far. When the next interval's start > latest end,
 * we found a free time gap. This avoids sorting the flattened list separately.
 *
 * The flatten → sort → merge → find-gaps pattern is common for multi-source interval problems.
 */

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * INTERVAL PROBLEM SELECTION GUIDE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Merge overlapping intervals (single list)     → Sort by start, linear merge
 * Insert new interval into sorted list          → 3-phase: before, merge, after
 * Count max overlaps at any point               → Sweep line (sort events)
 * Min rooms / max concurrent (resource count)   → Min-heap of end times
 * Min removals for non-overlapping              → Sort by end, greedy keep
 * Min arrows / shots to cover all groups        → Sort by end, greedy shoot at end
 * Intersection of two interval lists            → Two-pointer
 * Free time (union of busy times → gaps)        → Merge all, find gaps
 * Max profit, pick non-overlapping              → Sort by end, DP + binary search
 */

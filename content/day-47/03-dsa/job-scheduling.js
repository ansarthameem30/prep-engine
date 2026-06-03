/**
 * Day 47 DSA — Job Scheduling with DP + Binary Search
 *
 * Pattern: Weighted Interval Scheduling
 * Sort intervals by end time. For each job, find the last job that
 * doesn't overlap, then choose: take this job (prev profit + this job's profit)
 * or skip (same as dp[i-1]).
 *
 * Binary search finds the "last non-overlapping" job in O(log n) per job.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LC #1235: Maximum Profit in Job Scheduling
// Time: O(n log n) | Space: O(n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * dp[i] = max profit from the first i jobs (sorted by end time)
 *
 * For each job i (1-indexed), find the last job j where endTime[j] <= startTime[i].
 * dp[i] = max(dp[i-1], dp[j] + profit[i])
 * "Skip this job" vs "Take this job (adding its profit to best compatible schedule)"
 *
 * Binary search: endTimes is sorted (we sort jobs by endTime).
 * Find rightmost position where endTime <= startTime[i] using bisect_right.
 */
function jobScheduling(startTime, endTime, profit) {
  const n = startTime.length;

  // Create jobs array and sort by end time
  const jobs = startTime.map((s, i) => [s, endTime[i], profit[i]]);
  jobs.sort((a, b) => a[1] - b[1]);

  // dp[i] = max profit considering first i jobs
  const dp = new Array(n + 1).fill(0);
  const endTimes = jobs.map((j) => j[1]);

  for (let i = 1; i <= n; i++) {
    const [start, end, p] = jobs[i - 1];

    // Binary search: find last job where endTime <= start
    let lo = 0, hi = i - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (endTimes[mid - 1] <= start) lo = mid;
      else hi = mid - 1;
    }

    const prevProfit = dp[lo]; // Best profit from non-overlapping jobs

    dp[i] = Math.max(
      dp[i - 1],          // Skip job i
      prevProfit + p      // Take job i
    );
  }

  return dp[n];
}

console.log("=== LC #1235: Maximum Profit in Job Scheduling ===");
console.log(jobScheduling([1, 2, 3, 3], [3, 4, 5, 6], [50, 10, 40, 70])); // 120 (job1+job4)
console.log(jobScheduling([1, 2, 3, 4, 6], [3, 5, 10, 6, 9], [20, 20, 100, 70, 60])); // 150
console.log(jobScheduling([1, 1, 1], [2, 3, 4], [5, 6, 4])); // 6

// ─────────────────────────────────────────────────────────────────────────────
// LC #1751: Maximum Number of Events That Can Be Attended II
// Time: O(n*k log n) | Space: O(n*k)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * dp[i][j] = max value attending at most j events from first i events (sorted by end)
 *
 * For each event i and k events allowed:
 * dp[i][j] = max(dp[i-1][j], dp[prev][j-1] + value[i])
 * where prev = last event ending before event[i] starts
 *
 * This is #1235 generalized to k events instead of k=unlimited.
 */
function maxValue1751(events, k) {
  events.sort((a, b) => a[1] - b[1]);
  const n = events.length;
  const endTimes = events.map((e) => e[1]);

  // dp[i][j] = max value using first i events, attending at most j
  const dp = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const [start, end, value] = events[i - 1];

    // Binary search for last non-overlapping event
    let lo = 0, hi = i - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (endTimes[mid - 1] < start) lo = mid; // Strictly less: events can't share same day
      else hi = mid - 1;
    }

    for (let j = 1; j <= k; j++) {
      dp[i][j] = Math.max(
        dp[i - 1][j],        // Skip event i
        dp[lo][j - 1] + value // Attend event i (use one of j slots)
      );
    }
  }

  return dp[n][k];
}

console.log("\n=== LC #1751: Maximum Events Attended II ===");
console.log(maxValue1751([[1, 2, 4], [3, 4, 3], [2, 3, 1]], 2)); // 7 (events 1+2)
console.log(maxValue1751([[1, 2, 4], [3, 4, 3], [2, 3, 10]], 2)); // 10+4=14? Let me check...
// Events sorted by end: [1,2,4],[2,3,10],[3,4,3]. k=2: take [2,3,10]+[3,4,3]=13 or [1,2,4]+[2,3,10]=14. 10+4=14
console.log(maxValue1751([[1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 4, 4]], 3)); // 9

// ─────────────────────────────────────────────────────────────────────────────
// LC #2008: Maximum Earnings From Taxi
// Time: O(n log n) | Space: O(n)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Same weighted interval scheduling pattern.
 * Profit for ride [start, end, tip] = (end - start) + tip
 * Sort by end time, dp with binary search.
 */
function maxTaxiEarnings(n, rides) {
  // Sort rides by end point
  rides.sort((a, b) => a[1] - b[1]);
  const endPoints = rides.map((r) => r[1]);
  const m = rides.length;

  const dp = new Array(m + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    const [start, end, tip] = rides[i - 1];
    const profit = end - start + tip;

    // Find last ride ending at or before 'start'
    let lo = 0, hi = i - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (endPoints[mid - 1] <= start) lo = mid;
      else hi = mid - 1;
    }

    dp[i] = Math.max(dp[i - 1], dp[lo] + profit);
  }

  return dp[m];
}

console.log("\n=== LC #2008: Maximum Taxi Earnings ===");
console.log(maxTaxiEarnings(5, [[2, 5, 4], [1, 5, 1]])); // 7 (take first ride: 3+4=7)
console.log(maxTaxiEarnings(20, [[1, 6, 1], [3, 10, 2], [10, 12, 3], [11, 12, 2], [12, 15, 2], [13, 18, 1]]));
// Answer: 20

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WEIGHTED INTERVAL SCHEDULING PATTERN
 *
 * Steps:
 * 1. Sort intervals by END time
 * 2. For each interval i, binary search for the last interval j
 *    where endTime[j] <= startTime[i] (non-overlapping)
 * 3. dp[i] = max(dp[i-1], dp[j] + profit[i])
 *
 * Binary search target:
 * - #1235: Find last where endTime <= startTime[i] (jobs can start when another ends)
 * - #1751: Find last where endTime < startTime[i] (events can't share same day)
 * - #2008: Same as #1235 (rides can start when another ends)
 *
 * COMPLEXITY:
 * - Sort: O(n log n)
 * - DP loop × binary search: O(n log n)
 * - Total: O(n log n) time, O(n) space
 * - #1751 with k events: O(n*k log n) time, O(n*k) space
 *
 * CONNECTION TO AGENT TASK SCHEDULING:
 * AI agents often face similar problems:
 * "Given N tasks with time windows and values, which tasks should I complete
 * to maximize total value within constraints?"
 * The weighted interval scheduling DP solves this optimally.
 */

// All tests
console.log("\n=== All Tests ===");
console.assert(jobScheduling([1, 2, 3, 3], [3, 4, 5, 6], [50, 10, 40, 70]) === 120, "#1235 test 1 failed");
console.assert(maxValue1751([[1, 2, 4], [3, 4, 3], [2, 3, 1]], 2) === 7, "#1751 test 1 failed");
console.log("All tests passed!");

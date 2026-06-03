/**
 * Day 37 — DSA: Interval Problems
 *
 * Problems:
 *   1. LeetCode #56  — Merge Intervals
 *   2. LeetCode #57  — Insert Interval
 *   3. LeetCode #253 — Meeting Rooms II
 *   4. LeetCode #435 — Non-overlapping Intervals
 *
 * Core pattern: Sort by start time, then linear scan/merge
 */

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: Merge Intervals (LC #56)
// Given intervals, merge all overlapping intervals.
//
// Strategy: Sort by start time. Merge current interval into result if
//           it overlaps with the last interval in result (start <= last.end).
//           Otherwise, append as new interval.
//
// Time:  O(N log N) for sorting + O(N) for linear merge = O(N log N)
// Space: O(N) for output array (or O(log N) if we count sort stack space)
// ─────────────────────────────────────────────────────────────────────────────

function mergeIntervals(intervals) {
  if (!intervals.length) return [];

  // Sort by start time
  intervals.sort((a, b) => a[0] - b[0]);

  const result = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const [curStart, curEnd] = intervals[i];
    const lastMerged = result[result.length - 1];

    if (curStart <= lastMerged[1]) {
      // Overlapping or touching: extend the last interval's end
      lastMerged[1] = Math.max(lastMerged[1], curEnd);
    } else {
      // No overlap: add as new interval
      result.push([curStart, curEnd]);
    }
  }

  return result;
}

console.log("=== Merge Intervals (LC #56) ===");
console.log(mergeIntervals([[1,3],[2,6],[8,10],[15,18]]));  // [[1,6],[8,10],[15,18]]
console.log(mergeIntervals([[1,4],[4,5]]));                  // [[1,5]] — touching intervals merge
console.log(mergeIntervals([[1,4],[2,3]]));                  // [[1,4]] — nested interval
console.log(mergeIntervals([[1,1]]));                        // [[1,1]] — single interval

/*
 * Why sort by start time?
 * After sorting, if interval[i] doesn't overlap with interval[i-1], then
 * no subsequent interval can overlap with interval[i-1] (they all start even later).
 * This lets us process the result array as a stack: only check the last element.
 *
 * Common edge cases:
 * - Touching intervals [1,2],[2,3]: curStart (2) <= lastEnd (2) → merge → [1,3] ✓
 * - Nested intervals [1,5],[2,3]: max(5,3) = 5 → [1,5] ✓
 * - Identical intervals [1,3],[1,3]: merge to [1,3] ✓
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Insert Interval (LC #57)
// Given sorted non-overlapping intervals and a new interval, insert it
// (merging as necessary) while maintaining sorted order.
//
// Strategy: Three phases:
//   1. Add all intervals that come entirely before the new interval (end < newStart)
//   2. Merge all intervals that overlap with the new interval
//   3. Add all remaining intervals (start > newEnd)
//
// Time:  O(N) — single pass
// Space: O(N) for output
// ─────────────────────────────────────────────────────────────────────────────

function insertInterval(intervals, newInterval) {
  const result = [];
  let i = 0;
  const n = intervals.length;
  let [newStart, newEnd] = newInterval;

  // Phase 1: Add intervals entirely before newInterval
  while (i < n && intervals[i][1] < newStart) {
    result.push(intervals[i++]);
  }

  // Phase 2: Merge overlapping intervals
  while (i < n && intervals[i][0] <= newEnd) {
    newStart = Math.min(newStart, intervals[i][0]);
    newEnd = Math.max(newEnd, intervals[i][1]);
    i++;
  }
  result.push([newStart, newEnd]);

  // Phase 3: Add remaining intervals
  while (i < n) {
    result.push(intervals[i++]);
  }

  return result;
}

console.log("\n=== Insert Interval (LC #57) ===");
console.log(insertInterval([[1,3],[6,9]], [2,5]));               // [[1,5],[6,9]]
console.log(insertInterval([[1,2],[3,5],[6,7],[8,10],[12,16]], [4,8])); // [[1,2],[3,10],[12,16]]
console.log(insertInterval([], [5,7]));                           // [[5,7]]
console.log(insertInterval([[1,5]], [2,3]));                      // [[1,5]] — new interval is nested
console.log(insertInterval([[1,5]], [6,8]));                      // [[1,5],[6,8]] — no overlap


// ─────────────────────────────────────────────────────────────────────────────
// Problem 3: Meeting Rooms II (LC #253)
// Find the minimum number of conference rooms required to hold all meetings.
//
// Strategy 1: Min-heap of end times
//   - Sort by start time
//   - Maintain a min-heap of meeting end times (earliest end = top of heap)
//   - For each meeting: if it starts after the earliest-ending meeting, reuse that room
//   - Otherwise, allocate a new room (push end time to heap)
//   - Heap size = number of rooms in use
//
// Strategy 2: Chronological ordering (sort events)
//   - Treat start and end times as separate events
//   - Sort all events: on tie, end before start (room freed before new meeting starts)
//   - Track running "rooms in use" counter
//   - Answer = max rooms in use at any point
//
// Time:  O(N log N) for sort + O(N log N) for heap operations = O(N log N)
// Space: O(N) for heap
// ─────────────────────────────────────────────────────────────────────────────

// Min-heap implementation (JavaScript doesn't have a built-in)
class MinHeap {
  constructor() { this.heap = []; }
  push(val) {
    this.heap.push(val);
    this._bubbleUp(this.heap.length - 1);
  }
  pop() {
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }
  peek() { return this.heap[0]; }
  size() { return this.heap.length; }
  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent] <= this.heap[i]) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }
  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let min = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l] < this.heap[min]) min = l;
      if (r < n && this.heap[r] < this.heap[min]) min = r;
      if (min === i) break;
      [this.heap[min], this.heap[i]] = [this.heap[i], this.heap[min]];
      i = min;
    }
  }
}

function minMeetingRooms(intervals) {
  if (!intervals.length) return 0;

  // Sort by start time
  intervals.sort((a, b) => a[0] - b[0]);

  const endTimes = new MinHeap();
  endTimes.push(intervals[0][1]);

  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    if (start >= endTimes.peek()) {
      // Current meeting starts after/when the earliest-ending meeting ends
      // Reuse that room: pop its end time, push new end time
      endTimes.pop();
    }
    // Whether reusing or new room: push the current meeting's end time
    endTimes.push(end);
  }

  return endTimes.size();
}

// Alternative O(N log N) approach without heap — chronological event sweep
function minMeetingRoomsChronological(intervals) {
  const starts = intervals.map((i) => i[0]).sort((a, b) => a - b);
  const ends = intervals.map((i) => i[1]).sort((a, b) => a - b);

  let rooms = 0, maxRooms = 0, endPtr = 0;
  for (let i = 0; i < intervals.length; i++) {
    if (starts[i] < ends[endPtr]) {
      rooms++; // New room needed (current meeting starts before any meeting ends)
    } else {
      endPtr++; // Reuse a room (one meeting ended)
    }
    maxRooms = Math.max(maxRooms, rooms);
  }

  return maxRooms;
}

console.log("\n=== Meeting Rooms II (LC #253) ===");
console.log(minMeetingRooms([[0,30],[5,10],[15,20]]));    // 2
console.log(minMeetingRooms([[7,10],[2,4]]));              // 1 — sequential meetings
console.log(minMeetingRooms([[1,10],[2,7],[3,19],[8,12],[10,20],[11,30]])); // 3

console.log("Chronological approach:");
console.log(minMeetingRoomsChronological([[0,30],[5,10],[15,20]])); // 2
console.log(minMeetingRoomsChronological([[7,10],[2,4]]));           // 1


// ─────────────────────────────────────────────────────────────────────────────
// Problem 4: Non-overlapping Intervals (LC #435)
// Find the minimum number of intervals to remove to make the rest non-overlapping.
//
// Strategy: Greedy — sort by END time, keep intervals that don't overlap with
//           the last kept interval. This maximizes the number of intervals we CAN keep.
//           Answer = total - kept.
//
// Greedy insight: Sort by end time. For each interval, if it overlaps with the
//   last kept, discard it (it ends later and would block more future intervals).
//   If it doesn't overlap, keep it (and update the boundary).
//
// Time:  O(N log N) for sort + O(N) scan = O(N log N)
// Space: O(1) extra
// ─────────────────────────────────────────────────────────────────────────────

function eraseOverlapIntervals(intervals) {
  if (!intervals.length) return 0;

  // Sort by end time (greedy: keep interval that ends earliest)
  intervals.sort((a, b) => a[1] - b[1]);

  let kept = 1;
  let lastEnd = intervals[0][1];

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] >= lastEnd) {
      // Non-overlapping: keep this interval
      kept++;
      lastEnd = intervals[i][1];
    }
    // Overlapping: discard this interval (it ends later, worse for future)
  }

  return intervals.length - kept; // number removed
}

console.log("\n=== Non-overlapping Intervals (LC #435) ===");
console.log(eraseOverlapIntervals([[1,2],[2,3],[3,4],[1,3]])); // 1 — remove [1,3]
console.log(eraseOverlapIntervals([[1,2],[1,2],[1,2]]));       // 2 — keep one
console.log(eraseOverlapIntervals([[1,2],[2,3]]));             // 0 — already non-overlapping

/*
 * Why sort by END time (not start time) for this greedy?
 *
 * Goal: maximize intervals kept = minimize intervals removed.
 * Greedy choice: always keep the interval that ends earliest.
 *
 * Why? An interval that ends earlier leaves more "room" for future intervals.
 * Keeping an interval that ends later blocks more future intervals.
 *
 * Proof by exchange argument:
 * Suppose optimal solution keeps interval A that ends at time T.
 * If there's interval B ending at T' < T that starts at same time,
 * swapping A with B is always at least as good (B ends earlier, blocks less).
 *
 * This is the same greedy insight as Activity Selection Problem (classic CS problem).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTERVAL PROBLEMS PATTERN SUMMARY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * "Sort by start" works for: merge intervals, insert interval, most counting problems
 * "Sort by end" works for: maximizing number of non-overlapping intervals (greedy)
 *
 * Two intervals overlap if: a.start < b.end AND b.start < a.end
 * (or equivalently: NOT (a.end <= b.start OR b.end <= a.start))
 *
 * "Touching" intervals (a.end == b.start): typically merge-able (problem dependent)
 *
 * Min-heap pattern: when you need to track the "smallest end time" across active intervals
 * Sweep line pattern: when you need to count max overlaps at any point in time
 */

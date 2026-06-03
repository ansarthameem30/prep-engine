/**
 * Day 27 — DSA: Greedy Patterns
 *
 * LeetCode #55: Jump Game
 * LeetCode #45: Jump Game II
 * LeetCode #252: Meeting Rooms
 * LeetCode #253: Meeting Rooms II
 *
 * Greedy Framework: at each step, make the locally optimal choice.
 * Proof: "exchange argument" — show swapping any non-greedy choice to the greedy choice
 * doesn't worsen the result (and often improves it).
 */

// ─────────────────────────────────────────────
// LeetCode #55: Jump Game
// ─────────────────────────────────────────────
// Can you reach the last index? nums[i] = max jump length from position i.

/**
 * Greedy: track the furthest index reachable at any point.
 * For each position i <= maxReach, update maxReach = max(maxReach, i + nums[i]).
 * If maxReach < i at any point, we're stuck — return false.
 *
 * Time: O(n)
 * Space: O(1)
 *
 * Proof by exchange argument: if the greedy max-reach strategy says "reachable",
 * any other strategy that can reach the end can be shown to also work greedily.
 */
function canJump(nums) {
  let maxReach = 0;

  for (let i = 0; i < nums.length; i++) {
    if (i > maxReach) return false; // can't reach position i
    maxReach = Math.max(maxReach, i + nums[i]);
    if (maxReach >= nums.length - 1) return true; // early exit
  }

  return true;
}

console.log('=== LeetCode #55: Jump Game ===');
console.log('[2,3,1,1,4]:', canJump([2, 3, 1, 1, 4]));  // true
console.log('[3,2,1,0,4]:', canJump([3, 2, 1, 0, 4]));  // false
console.log('[0]:', canJump([0]));                        // true (already at end)
console.log('[2,0,0]:', canJump([2, 0, 0]));              // true


// ─────────────────────────────────────────────
// LeetCode #45: Jump Game II
// ─────────────────────────────────────────────
// Minimum number of jumps to reach the last index.

/**
 * Greedy: BFS-level approach.
 * Track the furthest reachable position within the current "level" (jump count).
 * When we exhaust the current level (i > currentEnd), increment jumps and extend to nextEnd.
 *
 * Intuition: from the current jump, what's the furthest we can reach?
 * That defines the boundary of our next jump. We take the jump at the last possible moment.
 *
 * Time: O(n)
 * Space: O(1)
 */
function jump(nums) {
  let jumps = 0;
  let currentEnd = 0;  // boundary of current jump level
  let farthest = 0;    // furthest reachable from all positions in current level

  // We don't need to jump from the last position
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);

    if (i === currentEnd) {
      // We've exhausted the current jump's range — must jump
      jumps++;
      currentEnd = farthest;

      if (currentEnd >= nums.length - 1) break; // reached end
    }
  }

  return jumps;
}

console.log('\n=== LeetCode #45: Jump Game II ===');
console.log('[2,3,1,1,4]:', jump([2, 3, 1, 1, 4]));  // 2 (0→1→4)
console.log('[2,3,0,1,4]:', jump([2, 3, 0, 1, 4]));  // 2 (0→1→4)
console.log('[1,1,1,1]:', jump([1, 1, 1, 1]));        // 3


// ─────────────────────────────────────────────
// LeetCode #252: Meeting Rooms (Can attend all meetings?)
// ─────────────────────────────────────────────
// Given meeting intervals [[start,end]], can one person attend all?
// i.e., are there any overlapping intervals?

/**
 * Sort by start time. If any meeting starts before the previous one ends → overlap.
 *
 * Time: O(n log n) for sorting
 * Space: O(1) (O(log n) for sort stack)
 */
function canAttendMeetings(intervals) {
  intervals.sort((a, b) => a[0] - b[0]); // sort by start time

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] < intervals[i - 1][1]) {
      return false; // current meeting starts before previous ends → overlap
    }
  }

  return true;
}

console.log('\n=== LeetCode #252: Meeting Rooms ===');
console.log('[[0,30],[5,10],[15,20]]:', canAttendMeetings([[0, 30], [5, 10], [15, 20]])); // false
console.log('[[7,10],[2,4]]:', canAttendMeetings([[7, 10], [2, 4]]));                     // true


// ─────────────────────────────────────────────
// LeetCode #253: Meeting Rooms II
// ─────────────────────────────────────────────
// Minimum number of conference rooms needed.

/**
 * Approach 1: Min-heap of room end times
 * Sort by start time. For each meeting, if the earliest-ending room is done by
 * this meeting's start, reuse it (update end time). Otherwise, add a new room.
 * The heap size at the end = minimum rooms needed.
 *
 * Time: O(n log n) — sort + heap operations
 * Space: O(n) — heap
 */
function minMeetingRooms_heap(intervals) {
  if (!intervals.length) return 0;
  intervals.sort((a, b) => a[0] - b[0]);

  // Min-heap storing end times of currently occupied rooms
  class MinHeap {
    constructor() { this.h = []; }
    push(v) {
      this.h.push(v);
      let i = this.h.length - 1;
      while (i > 0 && this.h[i] < this.h[(i - 1) >> 1]) {
        const p = (i - 1) >> 1;
        [this.h[i], this.h[p]] = [this.h[p], this.h[i]];
        i = p;
      }
    }
    pop() {
      const top = this.h[0];
      this.h[0] = this.h.pop();
      let i = 0;
      while (true) {
        let s = i; const l = 2*i+1, r = 2*i+2;
        if (l < this.h.length && this.h[l] < this.h[s]) s = l;
        if (r < this.h.length && this.h[r] < this.h[s]) s = r;
        if (s === i) break;
        [this.h[i], this.h[s]] = [this.h[s], this.h[i]]; i = s;
      }
      return top;
    }
    peek() { return this.h[0]; }
    get size() { return this.h.length; }
  }

  const rooms = new MinHeap();
  rooms.push(intervals[0][1]); // first meeting → one room

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] >= rooms.peek()) {
      rooms.pop(); // reuse the room whose meeting ended earliest
    }
    rooms.push(intervals[i][1]); // assign room with current meeting's end time
  }

  return rooms.size; // rooms in use = min rooms needed
}

/**
 * Approach 2: Chronological event ordering (O(n log n), O(n) space)
 * Create separate arrays of start times and end times. Sort both.
 * Use two pointers: if next start < current end → need new room.
 * Otherwise → reuse existing room.
 *
 * This is the most elegant approach — no heap needed.
 */
function minMeetingRooms_twoPointers(intervals) {
  const starts = intervals.map(i => i[0]).sort((a, b) => a - b);
  const ends = intervals.map(i => i[1]).sort((a, b) => a - b);

  let rooms = 0;
  let endPointer = 0;

  for (let i = 0; i < starts.length; i++) {
    if (starts[i] < ends[endPointer]) {
      rooms++; // new meeting starts before any room is free → need new room
    } else {
      endPointer++; // a meeting ended — reuse that room (don't increment rooms)
    }
  }

  return rooms;
}

console.log('\n=== LeetCode #253: Meeting Rooms II ===');
const m1 = [[0, 30], [5, 10], [15, 20]];
const m2 = [[7, 10], [2, 4]];
const m3 = [[1, 5], [2, 6], [3, 7]];
console.log('Heap   [[0,30],[5,10],[15,20]]:', minMeetingRooms_heap([...m1]));             // 2
console.log('2Ptr   [[0,30],[5,10],[15,20]]:', minMeetingRooms_twoPointers([...m1]));      // 2
console.log('Heap   [[7,10],[2,4]]:', minMeetingRooms_heap([...m2]));                      // 1
console.log('Heap   [[1,5],[2,6],[3,7]]:', minMeetingRooms_heap([...m3]));                 // 3


// ─────────────────────────────────────────────
// Greedy Framework Summary
// ─────────────────────────────────────────────
console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                GREEDY FRAMEWORK                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║ 1. IDENTIFY greedy choice: What's the locally optimal decision?   ║
║    - Jump Game: maximize reach at each step                       ║
║    - Jump Game II: jump at boundary, extend to max reach          ║
║    - Meeting Rooms: reuse the earliest-ending room                ║
║                                                                   ║
║ 2. PROVE correctness: exchange argument                           ║
║    "If we swap a non-greedy choice to the greedy one,             ║
║     the solution doesn't get worse"                               ║
║                                                                   ║
║ 3. GREEDY ≠ DP: Greedy makes an irrevocable decision at each step ║
║    DP considers all options and picks the best                     ║
║    Greedy is faster but only works when greedy choice is proven   ║
║    safe (optimal substructure + greedy choice property)           ║
║                                                                   ║
╠═══════════════════════════╦══════════════╦════════════════════════╣
║ Problem                   ║ Time         ║ Space                  ║
╠═══════════════════════════╬══════════════╬════════════════════════╣
║ Jump Game (can reach?)    ║ O(n)         ║ O(1)                   ║
║ Jump Game II (min jumps)  ║ O(n)         ║ O(1)                   ║
║ Meeting Rooms (overlap?)  ║ O(n log n)   ║ O(1)                   ║
║ Meeting Rooms II (min)    ║ O(n log n)   ║ O(n) heap / O(n) sort  ║
╚═══════════════════════════╩══════════════╩════════════════════════╝
`);

/**
 * Day 10 — DSA Week 1 Review
 * Solve the hardest problems from the week again FROM SCRATCH.
 * Do NOT look at your previous solutions. Talk through your approach first.
 *
 * Problems:
 *  1. Minimum Window Substring (#76) — sliding window + need/have tracking
 *  2. 3Sum (#15)                     — two-pointer after sort, skip duplicates
 *  3. Top K Frequent Elements (#347) — bucket sort O(n)
 *  4. Valid Parentheses (#20)        — stack
 *
 * These are the most commonly re-visited Week 1 problems in interviews.
 */

// ─────────────────────────────────────────────────────────────────────────────
// #76 — Minimum Window Substring
// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Sliding window. Expand right. When valid (have === need),
//           shrink from left to minimize window.
// Key insight: `have` counts distinct characters that meet their required
//              frequency. Only increments when window[c] === target[c].
//
// Time: O(|s| + |t|)   Space: O(|s| + |t|)

/**
 * @param {string} s
 * @param {string} t
 * @return {string}
 */
function minWindow(s, t) {
  if (!s || !t || s.length < t.length) return '';

  const need   = new Map(); // char → required count
  const window = new Map(); // char → current count in window
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);

  let have = 0;
  const required = need.size; // number of DISTINCT chars to satisfy
  let [resLeft, resRight] = [-1, -1];
  let minLen = Infinity;
  let left = 0;

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) || 0) + 1);

    // Did satisfying c complete a required character?
    if (need.has(c) && window.get(c) === need.get(c)) {
      have++;
    }

    // Shrink window while it's valid
    while (have === required) {
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        [resLeft, resRight] = [left, right];
      }

      const leftChar = s[left];
      window.set(leftChar, window.get(leftChar) - 1);
      if (need.has(leftChar) && window.get(leftChar) < need.get(leftChar)) {
        have--;
      }
      left++;
    }
  }

  return resLeft === -1 ? '' : s.slice(resLeft, resRight + 1);
}

console.log('=== #76 Minimum Window Substring ===');
console.log(minWindow('ADOBECODEBANC', 'ABC')); // 'BANC'
console.log(minWindow('a', 'a'));               // 'a'
console.log(minWindow('a', 'aa'));              // '' (impossible)
console.log(minWindow('ab', 'b'));              // 'b'


// ─────────────────────────────────────────────────────────────────────────────
// #15 — 3Sum
// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Sort. Fix i, then use two-pointer for [i+1, end].
// Key insight: Skip duplicate i values. After finding a triplet,
//              skip duplicate lo and hi values before moving pointers.
//
// Time: O(n²)   Space: O(1) excluding output

/**
 * @param {number[]} nums
 * @return {number[][]}
 */
function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < nums.length - 2; i++) {
    // Early exit: smallest possible sum > 0
    if (nums[i] > 0) break;

    // Skip duplicate i values
    if (i > 0 && nums[i] === nums[i - 1]) continue;

    let lo = i + 1;
    let hi = nums.length - 1;

    while (lo < hi) {
      const sum = nums[i] + nums[lo] + nums[hi];

      if (sum === 0) {
        result.push([nums[i], nums[lo], nums[hi]]);
        // Skip duplicates for lo and hi
        while (lo < hi && nums[lo] === nums[lo + 1]) lo++;
        while (lo < hi && nums[hi] === nums[hi - 1]) hi--;
        lo++;
        hi--;
      } else if (sum < 0) {
        lo++;
      } else {
        hi--;
      }
    }
  }

  return result;
}

console.log('\n=== #15 3Sum ===');
console.log(JSON.stringify(threeSum([-1, 0, 1, 2, -1, -4])));
// [[-1,-1,2],[-1,0,1]]
console.log(JSON.stringify(threeSum([0, 1, 1])));  // []
console.log(JSON.stringify(threeSum([0, 0, 0])));  // [[0,0,0]]
console.log(JSON.stringify(threeSum([-4,-2,-2,-2,0,1,2,2,2,3,3,4,4,6,6])));
// Multiple triplets, no duplicates


// ─────────────────────────────────────────────────────────────────────────────
// #347 — Top K Frequent Elements
// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Count frequencies. Bucket sort into array of size n+1 where
//           index = frequency. Scan buckets from high to low.
//
// Time: O(n)   Space: O(n)

/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number[]}
 */
function topKFrequent(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);

  // Buckets: index = frequency, value = list of numbers with that frequency
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [num, count] of freq) {
    buckets[count].push(num);
  }

  const result = [];
  for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
    result.push(...buckets[i]);
  }

  return result.slice(0, k);
}

console.log('\n=== #347 Top K Frequent Elements ===');
console.log(topKFrequent([1, 1, 1, 2, 2, 3], 2));      // [1, 2]
console.log(topKFrequent([1], 1));                       // [1]
console.log(topKFrequent([4, 1, -1, 2, -1, 2, 3], 2)); // [-1, 2]


// ─────────────────────────────────────────────────────────────────────────────
// #20 — Valid Parentheses
// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Stack. Push open brackets. On close bracket, check top of stack.
// Key insight: Handle edge case of closing bracket on empty stack.
//
// Time: O(n)   Space: O(n)

/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  const stack = [];
  const match = { ')': '(', '}': '{', ']': '[' };

  for (const c of s) {
    if ('([{'.includes(c)) {
      stack.push(c);
    } else {
      if (stack.length === 0 || stack[stack.length - 1] !== match[c]) {
        return false;
      }
      stack.pop();
    }
  }

  return stack.length === 0; // unmatched open brackets = false
}

console.log('\n=== #20 Valid Parentheses ===');
console.log(isValid('()'));       // true
console.log(isValid('()[]{}'));   // true
console.log(isValid('(]'));       // false
console.log(isValid('([)]'));     // false
console.log(isValid('{[]}'));     // true
console.log(isValid(']'));        // false (closing on empty stack)
console.log(isValid('('));        // false (unclosed open)


/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPLEXITY SUMMARY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * #76 Minimum Window Substring:
 *   Time:  O(|s| + |t|) — each character processed at most twice (expand + shrink)
 *   Space: O(|s| + |t|) — window and need maps
 *
 * #15 3Sum:
 *   Time:  O(n²) — sort O(n log n) + nested two-pointer O(n²)
 *   Space: O(1)  — excluding output array
 *
 * #347 Top K Frequent:
 *   Time:  O(n) — frequency map + bucket sort (both O(n))
 *   Space: O(n) — for map + buckets
 *   Note: Alternative using a min-heap gives O(n log k), which is better
 *         when k << n. Bucket sort is O(n) but O(n) space always.
 *
 * #20 Valid Parentheses:
 *   Time:  O(n)  — single pass
 *   Space: O(n)  — stack worst case (all opening brackets)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COMMON INTERVIEW MISTAKES TO AVOID
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * #76: Counting total characters instead of distinct character satisfaction.
 *       Fix: `have` only increments when window[c] reaches exactly need[c].
 *
 * #15: Not skipping duplicates after finding a valid triplet.
 *       Fix: advance lo/hi past duplicates before decrementing.
 *
 * #347: Using sort for top-k (O(n log n)) instead of bucket sort (O(n)).
 *       Interviewers will ask for the O(n) solution.
 *
 * #20: Forgetting to check stack.length === 0 at the end.
 *       Fix: return `stack.length === 0` not just `true`.
 */

/**
 * Day 59 — Final Confidence-Building Hard Problems
 * These three problems appear frequently in senior engineer interviews.
 * Practice talking through the approach BEFORE coding.
 *
 * Problems:
 *  1. LeetCode #76  — Minimum Window Substring    O(n)
 *  2. LeetCode #84  — Largest Rectangle in Histogram  O(n)
 *  3. LeetCode #32  — Longest Valid Parentheses   O(n)
 */

// ─────────────────────────────────────────────────────────────
// #76 — Minimum Window Substring
// ─────────────────────────────────────────────────────────────
/**
 * APPROACH FIRST (say this before writing a line of code):
 *
 * "I'll use a sliding window with two pointers.
 *  Maintain a frequency map of required characters from t.
 *  Expand right pointer to include characters.
 *  Track how many characters have their required count met (formed count).
 *  Once window is valid (formed === required), try to shrink from left.
 *  While shrinking: update min window, reduce counts.
 *  Stop shrinking when window becomes invalid, then expand right again."
 *
 * Time: O(s + t) — each character processed twice at most (once by right, once by left)
 * Space: O(s + t) — frequency maps
 */
function minWindow(s, t) {
  if (s.length === 0 || t.length === 0) return '';

  // Count required characters
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);

  const required = need.size; // unique characters we need
  let formed = 0;             // unique characters currently satisfied
  const window = new Map();   // current window character counts

  let left = 0;
  let minLen = Infinity;
  let minStart = 0;

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) || 0) + 1);

    // Check if this character's count in window meets the requirement
    if (need.has(c) && window.get(c) === need.get(c)) {
      formed++;
    }

    // Try to shrink window while it's valid
    while (left <= right && formed === required) {
      // Update minimum window
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        minStart = left;
      }

      // Remove left character from window
      const leftChar = s[left++];
      window.set(leftChar, window.get(leftChar) - 1);
      if (need.has(leftChar) && window.get(leftChar) < need.get(leftChar)) {
        formed--; // window is no longer valid for this character
      }
    }
  }

  return minLen === Infinity ? '' : s.slice(minStart, minStart + minLen);
}

console.log('=== #76 Minimum Window Substring ===');
console.log(minWindow('ADOBECODEBANC', 'ABC')); // 'BANC'
console.log(minWindow('a', 'a'));               // 'a'
console.log(minWindow('a', 'aa'));              // '' (t has more 'a' than s)
console.log(minWindow('aa', 'aa'));             // 'aa'

// ─────────────────────────────────────────────────────────────
// #84 — Largest Rectangle in Histogram
// ─────────────────────────────────────────────────────────────
/**
 * APPROACH FIRST:
 *
 * "Use a monotonic stack that stores indices in increasing height order.
 *  When we encounter a bar shorter than the stack's top, we've found the right
 *  boundary for rectangles that extend from the popped bar.
 *  For each popped bar:
 *    - Height = heights[popped index]
 *    - Width = current index - (new stack top + 1)
 *    - Area = height × width
 *
 *  Add a sentinel 0 at the end to flush all remaining bars from the stack.
 *
 *  Key insight: The stack maintains bars in increasing height order.
 *  When a shorter bar arrives, it 'closes' all taller bars to its left."
 *
 * Time: O(n) — each bar pushed and popped at most once
 * Space: O(n) — stack
 */
function largestRectangleArea(heights) {
  const stack = []; // stores indices
  let maxArea = 0;

  // Add sentinel 0 at end to flush all remaining bars
  const bars = [...heights, 0];

  for (let i = 0; i < bars.length; i++) {
    // Pop bars that are taller than current bar (current bar is their right boundary)
    while (stack.length > 0 && bars[stack[stack.length - 1]] > bars[i]) {
      const height = bars[stack.pop()];
      // Width: from after the new stack top to i (exclusive)
      const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
      maxArea = Math.max(maxArea, height * width);
    }
    stack.push(i);
  }

  return maxArea;
}

console.log('\n=== #84 Largest Rectangle in Histogram ===');
console.log(largestRectangleArea([2, 1, 5, 6, 2, 3])); // 10 (bars 5,6 with width 2)
console.log(largestRectangleArea([2, 4]));              // 4
console.log(largestRectangleArea([1]));                 // 1
console.log(largestRectangleArea([6, 7, 5, 2, 4, 5, 9, 3])); // 16

// ─────────────────────────────────────────────────────────────
// #32 — Longest Valid Parentheses
// ─────────────────────────────────────────────────────────────
/**
 * Two approaches — show both to demonstrate depth:
 *
 * APPROACH A: Stack
 *   Push indices. When we see ')', pop the stack.
 *   If stack is empty after pop, push current index as a new "base".
 *   Length of current valid sequence = i - stack.top.
 *
 *   "The stack top always represents the last 'unmatched' position."
 *
 * APPROACH B: DP
 *   dp[i] = length of longest valid string ending at index i.
 *   Only consider ')' — '(' can never end a valid string.
 *   Case 1: s[i-1] = '(' → dp[i] = dp[i-2] + 2
 *   Case 2: s[i-1] = ')' and s[i-dp[i-1]-1] = '(' → dp[i] = dp[i-1] + dp[i-dp[i-1]-2] + 2
 *
 * Both are O(n) time, O(n) space.
 * Stack approach is easier to explain and code in an interview.
 */

// Approach A: Stack (recommended in interview)
function longestValidParenthesesStack(s) {
  const stack = [-1]; // base index: characters before any valid sequence
  let maxLen = 0;

  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') {
      stack.push(i);
    } else {
      stack.pop(); // try to match with last '('

      if (stack.length === 0) {
        // No match — this ')' is unmatched, set new base
        stack.push(i);
      } else {
        // Valid sequence from stack.top + 1 to i
        maxLen = Math.max(maxLen, i - stack[stack.length - 1]);
      }
    }
  }

  return maxLen;
}

// Approach B: DP
function longestValidParenthesesDP(s) {
  const n = s.length;
  const dp = new Array(n).fill(0);
  let maxLen = 0;

  for (let i = 1; i < n; i++) {
    if (s[i] === ')') {
      if (s[i - 1] === '(') {
        // Case 1: ...() pattern
        dp[i] = (i >= 2 ? dp[i - 2] : 0) + 2;
      } else if (dp[i - 1] > 0) {
        // Case 2: ...)) pattern — check if there's a matching '('
        const matchIdx = i - dp[i - 1] - 1;
        if (matchIdx >= 0 && s[matchIdx] === '(') {
          dp[i] = dp[i - 1] + (matchIdx >= 1 ? dp[matchIdx - 1] : 0) + 2;
        }
      }
      maxLen = Math.max(maxLen, dp[i]);
    }
  }

  return maxLen;
}

console.log('\n=== #32 Longest Valid Parentheses ===');
const tests = ['(()', ')()())', '', '()(()'];
for (const t of tests) {
  const stackResult = longestValidParenthesesStack(t);
  const dpResult = longestValidParenthesesDP(t);
  console.log(`"${t}": stack=${stackResult}, dp=${dpResult}`);
  // '(()' → 2, ')()())' → 4, '' → 0, '()(()' → 2
}

/**
 * ─────────────────────────────────────────────────────────────
 * INTERVIEW SIMULATION NOTES
 * ─────────────────────────────────────────────────────────────
 *
 * #76 Minimum Window (hard sliding window):
 *   State your invariant: "formed tracks how many unique chars satisfy their count."
 *   Walk through with 'ADOBECODEBANC', 'ABC':
 *     right expands until window has A,B,C → shrink left → ...BANC is optimal.
 *   Edge cases to mention: t has more chars than s, t has duplicates.
 *
 * #84 Largest Rectangle (monotonic stack):
 *   Draw the histogram. Show that when bar i < bar[stack.top], bar[stack.top]
 *   cannot extend any further right. Its right boundary is i.
 *   The sentinel 0 at the end ensures we flush all remaining bars.
 *   Always trace through [2,1,5,6,2,3] manually.
 *
 * #32 Longest Valid Parentheses (two approaches):
 *   For stack: "the stack top always represents the last unmatched position."
 *   Start with -1 in stack as base (so length calculation works from the start).
 *   For DP: case 1 and case 2 cover all configurations of valid endings.
 *   Mention both approaches shows depth — pick stack for clarity.
 */

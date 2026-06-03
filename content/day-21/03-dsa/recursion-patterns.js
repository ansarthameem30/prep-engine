/**
 * Day 21 — DSA: Recursion Patterns
 *
 * Problem 1: Fibonacci with Memoization
 * Problem 2: Fast Power (x^n) — LeetCode #50
 * Problem 3: Flatten Nested Array
 */

// ─────────────────────────────────────────────
// Problem 1: Fibonacci
// ─────────────────────────────────────────────

/**
 * Naive recursive Fibonacci
 * Time: O(2^n) — every call spawns 2 more, tree depth = n
 * Space: O(n) — call stack depth
 *
 * For fib(5), the call tree looks like:
 *           fib(5)
 *          /      \
 *       fib(4)   fib(3)
 *       /    \    /   \
 *    fib(3) fib(2) fib(2) fib(1)
 * fib(3) gets computed twice, fib(2) three times — exponential redundancy
 */
function fibNaive(n) {
  if (n <= 1) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

/**
 * Memoized Fibonacci (top-down DP)
 * Time: O(n) — each subproblem computed exactly once
 * Space: O(n) — memo cache + call stack
 *
 * The memo cache short-circuits repeated subproblems.
 * fib(40) goes from ~10^9 operations to 40 operations.
 */
function fibMemo(n, memo = new Map()) {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n);

  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}

/**
 * Bottom-up DP (tabulation)
 * Time: O(n)
 * Space: O(1) with rolling variables
 */
function fibBottomUp(n) {
  if (n <= 1) return n;
  let prev2 = 0, prev1 = 1;
  for (let i = 2; i <= n; i++) {
    const curr = prev1 + prev2;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}

// Verify
console.log('=== Fibonacci ===');
console.log('fibNaive(10):', fibNaive(10));        // 55
console.log('fibMemo(50):', fibMemo(50));           // 12586269025
console.log('fibBottomUp(50):', fibBottomUp(50));  // 12586269025

// Performance comparison
console.time('naive fib(35)');
fibNaive(35);
console.timeEnd('naive fib(35)');   // ~50ms

console.time('memo fib(35)');
fibMemo(35);
console.timeEnd('memo fib(35)');    // <1ms


// ─────────────────────────────────────────────
// Problem 2: Fast Power — LeetCode #50 (Pow(x, n))
// ─────────────────────────────────────────────

/**
 * Naive approach: multiply x by itself n times
 * Time: O(n) — too slow for large n (n can be 2^31)
 */
function myPowNaive(x, n) {
  if (n === 0) return 1;
  let result = 1;
  let absN = Math.abs(n);
  for (let i = 0; i < absN; i++) result *= x;
  return n < 0 ? 1 / result : result;
}

/**
 * Fast Power via Exponentiation by Squaring
 * Time: O(log n) — halve the problem at each step
 * Space: O(log n) — recursive call stack depth
 *
 * Key insight: x^n = (x^2)^(n/2) if n is even
 *              x^n = x * (x^2)^((n-1)/2) if n is odd
 *
 * x^8 = (x^2)^4 = (x^4)^2 = ((x^4)^2) — only 3 multiplications instead of 7
 * x^10 = x * x^9 = x * (x^2)^4 * x — 4 multiplications instead of 9
 */
function myPow(x, n) {
  if (n === 0) return 1;

  // Handle negative exponent: x^(-n) = 1 / x^n
  if (n < 0) {
    x = 1 / x;
    n = -n;
  }

  // Even: x^n = (x*x)^(n/2)
  if (n % 2 === 0) {
    return myPow(x * x, n / 2);
  }

  // Odd: x^n = x * x^(n-1) = x * (x*x)^((n-1)/2)
  return x * myPow(x * x, (n - 1) / 2);
}

/**
 * Iterative version using bit manipulation
 * Time: O(log n)
 * Space: O(1)
 *
 * Treat n in binary: n = ...b3 b2 b1 b0
 * x^13 = x^8 * x^4 * x^1  (13 = 1101 in binary)
 */
function myPowIterative(x, n) {
  if (n < 0) { x = 1 / x; n = -n; }

  let result = 1;
  while (n > 0) {
    if (n & 1) result *= x; // if current bit is 1, multiply in current x^(2^k)
    x *= x;                 // square x for the next bit
    n >>= 1;                // shift to next bit
  }
  return result;
}

console.log('\n=== Fast Power ===');
console.log('2^10:', myPow(2, 10));        // 1024
console.log('2^-2:', myPow(2, -2));        // 0.25
console.log('1.5^3:', myPow(1.5, 3));      // 3.375
console.log('myPowIterative(2,10):', myPowIterative(2, 10)); // 1024


// ─────────────────────────────────────────────
// Problem 3: Flatten Nested Array Recursively
// ─────────────────────────────────────────────

/**
 * Recursively flatten an arbitrarily nested array.
 *
 * Time: O(n) where n = total number of elements across all nesting levels
 * Space: O(d) where d = maximum nesting depth (call stack)
 *
 * Approach: DFS — if element is an array, recurse into it; else collect it.
 */
function flattenRecursive(arr) {
  const result = [];

  function dfs(current) {
    for (const item of current) {
      if (Array.isArray(item)) {
        dfs(item);       // recurse into nested array
      } else {
        result.push(item); // leaf node — collect
      }
    }
  }

  dfs(arr);
  return result;
}

/**
 * Flatten with depth limit (like Array.flat(depth))
 * Time: O(n)
 * Space: O(d) — recursion depth
 */
function flattenDepth(arr, depth = Infinity) {
  if (depth === 0) return arr.slice();
  return arr.reduce((acc, item) => {
    if (Array.isArray(item)) {
      acc.push(...flattenDepth(item, depth - 1));
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}

/**
 * Iterative flatten using explicit stack (avoids call stack overflow for deep nesting)
 * Time: O(n)
 * Space: O(n) — explicit stack
 */
function flattenIterative(arr) {
  const result = [];
  const stack = [...arr];

  while (stack.length > 0) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      // Push array items back onto stack in reverse order to maintain order
      stack.push(...item);
    } else {
      result.push(item);
    }
  }

  return result.reverse(); // stack pops in reverse, so reverse at end
}

console.log('\n=== Flatten Nested Array ===');
const nested = [1, [2, [3, [4, [5]]]], 6, [7, 8]];
console.log('Input:', JSON.stringify(nested));
console.log('Recursive:', flattenRecursive(nested));     // [1,2,3,4,5,6,7,8]
console.log('Depth 1:', flattenDepth(nested, 1));        // [1,2,[3,[4,[5]]],6,7,8]
console.log('Depth 2:', flattenDepth(nested, 2));        // [1,2,3,[4,[5]],6,7,8]
console.log('Iterative:', flattenIterative(nested));     // [1,2,3,4,5,6,7,8]


// ─────────────────────────────────────────────
// Complexity Summary
// ─────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════════════════╗
║              COMPLEXITY ANALYSIS SUMMARY                 ║
╠══════════════════════════╦═══════════════╦══════════════╣
║ Problem                  ║ Time          ║ Space        ║
╠══════════════════════════╬═══════════════╬══════════════╣
║ Fibonacci (naive)        ║ O(2^n)        ║ O(n)         ║
║ Fibonacci (memoized)     ║ O(n)          ║ O(n)         ║
║ Fibonacci (tabulation)   ║ O(n)          ║ O(1)         ║
║ Fast Power (recursive)   ║ O(log n)      ║ O(log n)     ║
║ Fast Power (iterative)   ║ O(log n)      ║ O(1)         ║
║ Flatten (recursive)      ║ O(n)          ║ O(d)         ║
║ Flatten (iterative)      ║ O(n)          ║ O(n)         ║
╚══════════════════════════╩═══════════════╩══════════════╝
`);

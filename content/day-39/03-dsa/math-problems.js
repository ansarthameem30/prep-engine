/**
 * Day 39 — DSA: Math Problems
 *
 * Problems:
 *   1. LeetCode #7   — Reverse Integer (overflow check)
 *   2. LeetCode #202 — Happy Number (Floyd's cycle detection)
 *   3. LeetCode #371 — Sum of Two Integers (bit manipulation, no + operator)
 *   4. LeetCode #50  — Pow(x, n) — fast exponentiation
 */

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: Reverse Integer (LC #7)
// Reverse digits of a 32-bit signed integer. Return 0 if overflow.
//
// 32-bit signed integer range: [-2^31, 2^31 - 1] = [-2147483648, 2147483647]
//
// Strategy: Build reversed number digit by digit. After each step,
//           check if the result would overflow before multiplying by 10.
//
// Time: O(log |x|) — number of digits
// Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

function reverseInteger(x) {
  const MAX = Math.pow(2, 31) - 1; // 2147483647
  const MIN = -Math.pow(2, 31);    // -2147483648

  let result = 0;
  let num = Math.abs(x);

  while (num !== 0) {
    const digit = num % 10;

    // Overflow check BEFORE updating result:
    // If result > MAX/10, multiplying by 10 will definitely overflow
    // If result === MAX/10 and digit > 7 (MAX ends in 7), it overflows
    if (result > Math.floor(MAX / 10) ||
        (result === Math.floor(MAX / 10) && digit > 7)) {
      return 0;
    }

    result = result * 10 + digit;
    num = Math.floor(num / 10);
  }

  return x < 0 ? -result : result;
}

console.log("=== Reverse Integer (LC #7) ===");
console.log(reverseInteger(123));         // 321
console.log(reverseInteger(-123));        // -321
console.log(reverseInteger(120));         // 21
console.log(reverseInteger(1534236469)); // 0 (overflow: 9646324351 > INT_MAX)
console.log(reverseInteger(0));           // 0

/*
 * Why can't we just reverse and check after?
 * JavaScript numbers are 64-bit floats — they won't overflow the same way.
 * The problem asks us to simulate 32-bit overflow behavior.
 * Checking BEFORE multiplying by 10 prevents the intermediate result from exceeding
 * JavaScript's safe integer range for accurate comparison.
 *
 * Alternative safe approach (JavaScript-specific):
 * Reverse as a string, parse as integer, check range.
 * But overflow check before update is the "proper" language-agnostic solution.
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Happy Number (LC #202)
// A number is "happy" if: repeatedly replace it with the sum of squares of its digits,
// eventually reaching 1.
// If it cycles without reaching 1, it's not happy.
//
// Strategy: Floyd's cycle detection (tortoise and hare)
//   - Slow pointer: advance 1 step
//   - Fast pointer: advance 2 steps
//   - If fast reaches 1: number is happy
//   - If fast == slow (cycle detected before 1): not happy
//
// Time: O(log n) — digits decrease to manageable range, then cycle detection is O(C)
// Space: O(1) — no Set needed
// ─────────────────────────────────────────────────────────────────────────────

function sumOfSquaredDigits(n) {
  let sum = 0;
  while (n > 0) {
    const d = n % 10;
    sum += d * d;
    n = Math.floor(n / 10);
  }
  return sum;
}

function isHappy(n) {
  let slow = n;
  let fast = sumOfSquaredDigits(n);

  while (fast !== 1 && slow !== fast) {
    slow = sumOfSquaredDigits(slow);              // 1 step
    fast = sumOfSquaredDigits(sumOfSquaredDigits(fast)); // 2 steps
  }

  return fast === 1;
}

// Alternative using Set (more intuitive but O(log n) space):
function isHappyWithSet(n) {
  const seen = new Set();
  while (n !== 1 && !seen.has(n)) {
    seen.add(n);
    n = sumOfSquaredDigits(n);
  }
  return n === 1;
}

console.log("\n=== Happy Number (LC #202) ===");
console.log(isHappy(19));  // true  (1→81→65→61→37→58→89→145→42→20→4→16→37... wait:
                            // 19: 1+81=82 → 64+4=68 → 36+64=100 → 1+0+0=1 ✓)
console.log(isHappy(2));   // false — cycles
console.log(isHappy(1));   // true
console.log(isHappy(7));   // true
console.log(isHappyWithSet(19)); // true

/*
 * Floyd's cycle detection (tortoise and hare) is the elegant space-O(1) solution.
 * The insight: any sequence eventually either reaches 1 OR enters a cycle.
 * If fast pointer reaches 1 before meeting slow: number is happy.
 * If fast catches up to slow: they're both stuck in a cycle that doesn't include 1: not happy.
 *
 * Floyd's algorithm is also used for: detecting cycles in linked lists (LC #141, #142),
 * finding duplicate numbers, and detecting infinite loops in functional transformations.
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 3: Sum of Two Integers without + operator (LC #371)
// Add two integers using only bit manipulation.
//
// XOR gives sum WITHOUT carries: a ^ b
// AND gives carry bits: (a & b) << 1
// Repeat until no carry remains.
//
// Time: O(1) — at most 32 iterations (carry propagates left, eventually runs off)
// Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

function getSum(a, b) {
  // Mask to keep results within 32-bit integer (for negative numbers)
  const MASK = 0xFFFFFFFF;     // 32 bits of 1s
  const MAX_INT = 0x7FFFFFFF;  // 0111...1111 (2^31 - 1)

  while (b !== 0) {
    const carry = ((a & b) << 1) & MASK;  // Carry bits (shifted left)
    a = (a ^ b) & MASK;                    // Sum without carry
    b = carry;
  }

  // If MSB is 1, the number is negative in 32-bit representation
  // JavaScript uses 64-bit numbers, so we need to convert back to negative
  return a <= MAX_INT ? a : ~(a ^ MASK);
}

console.log("\n=== Sum of Two Integers without + (LC #371) ===");
console.log(getSum(1, 2));    // 3
console.log(getSum(2, 3));    // 5
console.log(getSum(-1, 1));   // 0
console.log(getSum(-3, 2));   // -1
console.log(getSum(100, -50)); // 50

/*
 * Step-by-step trace for a=1 (001), b=2 (010):
 * Iteration 1:
 *   carry = (001 & 010) << 1 = 000 << 1 = 000
 *   a = 001 ^ 010 = 011
 *   b = 000
 * Loop ends (b=0). Return a = 011 = 3 ✓
 *
 * Step-by-step for a=3 (011), b=5 (101):
 * Iteration 1:
 *   carry = (011 & 101) << 1 = 001 << 1 = 010
 *   a = 011 ^ 101 = 110
 *   b = 010
 * Iteration 2:
 *   carry = (110 & 010) << 1 = 010 << 1 = 100
 *   a = 110 ^ 010 = 100
 *   b = 100
 * Iteration 3:
 *   carry = (100 & 100) << 1 = 100 << 1 = 1000
 *   a = 100 ^ 100 = 000
 *   b = 1000
 * Iteration 4:
 *   carry = (000 & 1000) << 1 = 0
 *   a = 000 ^ 1000 = 1000
 *   b = 0
 * Return 1000 = 8 ✓
 *
 * The key insight: binary addition is XOR (sum without carry) + AND shifted left (the carry).
 * This simulates how a hardware full adder works at the gate level.
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 4: Pow(x, n) — Fast Exponentiation (LC #50)
// Calculate x^n for floating point x and integer n.
//
// Naive: multiply x by itself n times → O(n)
// Fast exponentiation (exponentiation by squaring): O(log n)
//
// Key insight: x^n = (x^2)^(n/2) for even n
//                   = x * (x^2)^((n-1)/2) for odd n
//
// This halves the exponent on each recursion → O(log n) multiplications
//
// Time: O(log |n|)
// Space: O(log |n|) recursive, O(1) iterative
// ─────────────────────────────────────────────────────────────────────────────

// Recursive approach
function myPowRecursive(x, n) {
  if (n === 0) return 1;
  if (n < 0) return 1 / myPowRecursive(x, -n);

  if (n % 2 === 0) {
    const half = myPowRecursive(x, n / 2);
    return half * half;
  } else {
    return x * myPowRecursive(x, n - 1);
  }
}

// Iterative approach (avoids recursion stack overflow for large n)
function myPow(x, n) {
  if (n < 0) {
    x = 1 / x;
    n = -n;
  }

  let result = 1;
  while (n > 0) {
    if (n % 2 === 1) {  // n is odd: multiply current x into result
      result *= x;
      n--;
    }
    x *= x;    // Square x
    n /= 2;    // Halve n
    n = Math.floor(n);
  }

  return result;
}

console.log("\n=== Pow(x, n) — Fast Exponentiation (LC #50) ===");
console.log(myPow(2.0, 10));    // 1024
console.log(myPow(2.1, 3));     // 9.261000000000001
console.log(myPow(2.0, -2));    // 0.25
console.log(myPow(1.0, 2147483647)); // 1.0 (large positive n)

// Trace for x=2, n=10:
// n=10 (even): x→4, n→5
// n=5 (odd): result→1*4=4, n→4; x→16, n→2
// n=2 (even): x→256, n→1
// n=1 (odd): result→4*256=1024, n→0
// Return 1024 ✓

console.log(myPowRecursive(2.0, 10)); // 1024

/*
 * Real-world applications of fast exponentiation:
 *
 * 1. Modular exponentiation: a^b mod m (essential for RSA cryptography)
 *    All that changes: multiply and mod at each step
 *    function modPow(base, exp, mod) {
 *      let result = 1n;
 *      base %= mod;
 *      while (exp > 0n) {
 *        if (exp % 2n === 1n) result = (result * base) % mod;
 *        exp /= 2n;
 *        base = (base * base) % mod;
 *      }
 *      return result;
 *    }
 *
 * 2. Matrix exponentiation: compute Fibonacci in O(log n) using matrix multiplication
 *    [F(n+1)] = [1 1]^n × [1]
 *    [F(n)  ]   [1 0]     [0]
 *    Fast matrix exponentiation → O(log n) Fibonacci
 *
 * 3. Computing large nth terms of linear recurrences efficiently
 *
 * The pattern: when you can express result(n) = combine(result(n/2), result(n/2)),
 * you have O(log n) potential — don't loop O(n) times.
 */

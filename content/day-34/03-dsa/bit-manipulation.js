/**
 * Day 34 — DSA: Bit Manipulation
 *
 * Problems:
 *   1. LeetCode #136 — Single Number (XOR trick)
 *   2. LeetCode #137 — Single Number II (bit counting)
 *   3. LeetCode #268 — Missing Number (XOR + sum approaches)
 *   4. LeetCode #190 — Reverse Bits
 *   5. LeetCode #191 — Number of 1 Bits (Brian Kernighan's algorithm)
 *
 * Bit Manipulation Cheat Sheet
 */

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * BIT MANIPULATION CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Core operations:
 *   n & 1           → check if n is odd (last bit is 1)
 *   n | (1 << k)    → set bit k
 *   n & ~(1 << k)   → clear bit k
 *   n ^ (1 << k)    → toggle bit k
 *   (n >> k) & 1    → check if bit k is set
 *   n & (n - 1)     → remove the lowest set bit (Brian Kernighan)
 *   n & (-n)        → isolate the lowest set bit
 *   n ^ n = 0       → XOR of number with itself = 0
 *   n ^ 0 = n       → XOR with 0 is identity
 *   XOR is commutative and associative
 *
 * Common patterns:
 *   Check power of 2:   n > 0 && (n & (n-1)) === 0
 *   Count set bits:     while (n) { count++; n &= n-1; }  (Brian Kernighan)
 *   Swap without temp:  a ^= b; b ^= a; a ^= b;
 *   Get absolute value: (n ^ (n >> 31)) - (n >> 31)  (arithmetic right shift)
 *   Find rightmost 0:   ~n & (n + 1)
 *   Multiply by 2^k:    n << k
 *   Divide by 2^k:      n >> k  (arithmetic shift preserves sign)
 *
 * JavaScript specifics:
 *   - Bitwise operators work on 32-bit signed integers
 *   - >>> is unsigned right shift (fills with 0, treats MSB as data not sign)
 *   - Use >>> 0 to force unsigned interpretation: (-1) >>> 0 = 4294967295
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: Single Number (LC #136)
// Every element appears TWICE except one. Find that element.
//
// Key insight: XOR properties
//   a ^ a = 0  (any number XOR itself = 0)
//   a ^ 0 = a  (any number XOR 0 = itself)
//   XOR is commutative/associative
//
// XOR all numbers: pairs cancel to 0, leaving the single number
//
// Time: O(n), Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

function singleNumber(nums) {
  return nums.reduce((xor, n) => xor ^ n, 0);
}

console.log("=== Single Number ===");
console.log(singleNumber([2, 2, 1]));          // 1
console.log(singleNumber([4, 1, 2, 1, 2]));    // 4
console.log(singleNumber([1]));                 // 1

// Visual trace for [4, 1, 2, 1, 2]:
// 0 ^ 4 = 4
// 4 ^ 1 = 5
// 5 ^ 2 = 7
// 7 ^ 1 = 6  (1 ^ 1 = 0, so 5 ^ 0 = 5... let me trace properly)
// 0 ^ 4 ^ 1 ^ 2 ^ 1 ^ 2 = 4 ^ (1^1) ^ (2^2) = 4 ^ 0 ^ 0 = 4 ✓


// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Single Number II (LC #137)
// Every element appears THREE times except one. Find that element.
//
// Approach 1: Count bits across all positions
//   For each bit position, count total 1-bits across all numbers.
//   If a number appears 3× and one appears 1×: total for that bit = 3k or 3k+1
//   Bit is part of the single number if and only if total % 3 !== 0
//
// Approach 2: State machine with two variables (ones, twos)
//   Maintain two bitmasks tracking bits seen 1 mod 3 times (ones) and 2 mod 3 times (twos)
//   A bit in 'ones' has been seen 1× more than a multiple of 3
//
// Time: O(32n) = O(n), Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

// Approach 1: Bit counting (clearer to understand)
function singleNumberII_bitCount(nums) {
  let result = 0;
  for (let bit = 0; bit < 32; bit++) {
    let sum = 0;
    for (const n of nums) {
      sum += (n >> bit) & 1;
    }
    if (sum % 3 !== 0) {
      result |= 1 << bit;
    }
  }
  // Handle 32-bit signed integer representation
  return result | 0; // convert to signed 32-bit integer
}

// Approach 2: State machine (optimal, O(n) with constant factor ~2x)
function singleNumberII_stateMachine(nums) {
  let ones = 0, twos = 0;
  for (const n of nums) {
    ones = (ones ^ n) & ~twos;
    twos = (twos ^ n) & ~ones;
  }
  return ones;
  // 'ones' holds bits that have been XORed an odd number of times after removing
  // those that have appeared 3 times (cleared by 'twos' logic)
}

console.log("\n=== Single Number II ===");
console.log(singleNumberII_bitCount([2, 2, 3, 2]));     // 3
console.log(singleNumberII_bitCount([0, 1, 0, 1, 0, 1, 99])); // 99
console.log(singleNumberII_stateMachine([2, 2, 3, 2]));  // 3
console.log(singleNumberII_stateMachine([0, 1, 0, 1, 0, 1, 99])); // 99


// ─────────────────────────────────────────────────────────────────────────────
// Problem 3: Missing Number (LC #268)
// Given [0, n] range with one number missing, find it.
//
// Approach 1: XOR — XOR indices with values; missing number has no pair
// Approach 2: Gauss sum — expected sum minus actual sum
//
// Time: O(n), Space: O(1) for both
// ─────────────────────────────────────────────────────────────────────────────

function missingNumber_XOR(nums) {
  const n = nums.length;
  let result = n; // Start with n (the extra index not in nums)
  for (let i = 0; i < n; i++) {
    result ^= i ^ nums[i];
    // Each present number cancels with its index; missing number has no pair
  }
  return result;
}

function missingNumber_gaussSum(nums) {
  const n = nums.length;
  const expectedSum = (n * (n + 1)) / 2;
  const actualSum = nums.reduce((a, b) => a + b, 0);
  return expectedSum - actualSum;
}

console.log("\n=== Missing Number ===");
console.log(missingNumber_XOR([3, 0, 1]));         // 2
console.log(missingNumber_gaussSum([9, 6, 4, 2, 3, 5, 7, 0, 1])); // 8

// Gauss sum explanation:
// [0..9] expected sum = 9*10/2 = 45
// [9,6,4,2,3,5,7,0,1] actual sum = 37
// Missing = 45 - 37 = 8 ✓


// ─────────────────────────────────────────────────────────────────────────────
// Problem 4: Reverse Bits (LC #190)
// Reverse bits of a 32-bit unsigned integer.
//
// Strategy: Extract bits from right, build result from right
//   For each of 32 bits: shift result left, OR in current rightmost bit of n, shift n right
//
// Time: O(32) = O(1), Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

function reverseBits(n) {
  let result = 0;
  for (let i = 0; i < 32; i++) {
    result = (result << 1) | (n & 1); // shift result left, add rightmost bit of n
    n >>>= 1; // unsigned right shift (fills with 0, treats as unsigned)
  }
  return result >>> 0; // ensure unsigned 32-bit result
}

console.log("\n=== Reverse Bits ===");
// 43261596 = 00000010100101000001111010011100
// reversed = 00111001011110000010100101000000 = 964176192
console.log(reverseBits(43261596));   // 964176192
console.log(reverseBits(0b00000010100101000001111010011100)); // 964176192

// Optimization for LeetCode follow-up (called many times — cache bit reversals by byte):
function reverseBitsCached() {
  const cache = new Array(256);
  for (let i = 0; i < 256; i++) {
    let byte = i, reversed = 0;
    for (let b = 0; b < 8; b++) {
      reversed = (reversed << 1) | (byte & 1);
      byte >>= 1;
    }
    cache[i] = reversed;
  }

  return function(n) {
    return (
      (cache[n & 0xFF] << 24) |
      (cache[(n >> 8) & 0xFF] << 16) |
      (cache[(n >> 16) & 0xFF] << 8) |
      cache[(n >>> 24) & 0xFF]
    ) >>> 0;
  };
}
const reverseBitsFast = reverseBitsCached();
console.log(reverseBitsFast(43261596)); // 964176192


// ─────────────────────────────────────────────────────────────────────────────
// Problem 5: Number of 1 Bits / Hamming Weight (LC #191)
// Count the number of '1' bits in a 32-bit integer.
//
// Approach 1: Loop 32 iterations — O(32) = O(1)
// Approach 2: Brian Kernighan's algorithm — O(number of set bits)
//   n & (n-1) clears the LOWEST set bit of n.
//   Repeat until n = 0; count iterations = number of set bits.
//
// Time: O(k) where k = number of set bits (best case O(1) if k << 32)
// ─────────────────────────────────────────────────────────────────────────────

function hammingWeight_naive(n) {
  let count = 0;
  while (n !== 0) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
}

function hammingWeight_kernighan(n) {
  let count = 0;
  while (n !== 0) {
    n &= n - 1; // Remove lowest set bit
    count++;
  }
  return count;
}

// Why Brian Kernighan is better:
// For n = 0b10000000000000000000000000000000 (only highest bit set):
//   Naive: 32 iterations
//   Kernighan: 1 iteration (n & (n-1) = 0 immediately)
// For sparse bit patterns (few 1s), Kernighan is dramatically faster.

console.log("\n=== Number of 1 Bits (Hamming Weight) ===");
console.log(hammingWeight_naive(0b00000000000000000000000000001011));  // 3
console.log(hammingWeight_kernighan(0b11111111111111111111111111111101)); // 31 (all bits except bit 1)
console.log(hammingWeight_kernighan(0b10000000000000000000000000000000 >>> 0)); // 1 (only highest bit)

// Bonus: JavaScript built-in for modern environments
// Math.clz32(n) — count leading zeros (32-bit), not set bits
// No native popcount in JS, but V8 optimizes the Kernighan pattern

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * PRACTICAL APPLICATIONS OF BIT MANIPULATION
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. Permission bitmasks (Unix file permissions: 0777, 0644):
 *    const READ = 0b100, WRITE = 0b010, EXEC = 0b001;
 *    userPerms = READ | WRITE;  // set read and write
 *    canRead = (userPerms & READ) !== 0;
 *    remove write: userPerms &= ~WRITE;
 *
 * 2. Feature flags (32 features per integer → compact storage):
 *    const DARK_MODE = 1 << 0, BETA = 1 << 1, PREMIUM = 1 << 2;
 *    user.flags |= DARK_MODE;   // enable
 *    user.flags &= ~BETA;       // disable
 *    hasPremium = (user.flags & PREMIUM) !== 0;
 *
 * 3. Bloom filters (hash function output → set bits):
 *    Multiple hash functions map a key to bit positions.
 *    Set those bits to 1. Query: if any bit is 0, definitely not in set.
 *    Compact probabilistic set membership check.
 *
 * 4. Graphics (RGB color manipulation):
 *    const r = (color >> 16) & 0xFF;
 *    const g = (color >> 8) & 0xFF;
 *    const b = color & 0xFF;
 *    const newColor = (r << 16) | (g << 8) | b;
 *
 * 5. Networking (IP subnet masking):
 *    ip & subnetMask  → network address
 *    ip | ~subnetMask → broadcast address
 */

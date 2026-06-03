/**
 * Day 36 — DSA: HashMap / HashSet Design + Insert Delete GetRandom
 *
 * Problems:
 *   1. LeetCode #706 — Design HashMap (array + chaining)
 *   2. LeetCode #705 — Design HashSet
 *   3. LeetCode #380 — Insert Delete GetRandom O(1)
 *   4. LeetCode #381 — Insert Delete GetRandom O(1) with Duplicates
 */

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: Design HashMap (LC #706)
//
// Implement HashMap without using any built-in hash table libraries.
//
// Design: Array of buckets (size = prime number for better distribution)
//         Each bucket is a linked list (chaining for collision resolution)
//
// Hash function: key % bucketCount (for integer keys)
// Why prime bucket count: reduces clustering. hash(k) = k % prime distributes
// keys more evenly because fewer keys share factors with a prime number.
//
// Time: O(1) average, O(n) worst case (all keys in one bucket — poor hash)
// Space: O(n) where n = number of key-value pairs
// ─────────────────────────────────────────────────────────────────────────────

class HashMapNode {
  constructor(key, val) {
    this.key = key;
    this.val = val;
    this.next = null;
  }
}

class MyHashMap {
  constructor() {
    this.SIZE = 1009; // Prime number for better distribution
    this.buckets = new Array(this.SIZE).fill(null);
  }

  _hash(key) {
    return key % this.SIZE;
  }

  put(key, value) {
    const idx = this._hash(key);
    if (!this.buckets[idx]) {
      this.buckets[idx] = new HashMapNode(key, value);
      return;
    }
    let cur = this.buckets[idx];
    while (cur) {
      if (cur.key === key) { cur.val = value; return; } // Update existing
      if (!cur.next) break;
      cur = cur.next;
    }
    cur.next = new HashMapNode(key, value);
  }

  get(key) {
    const idx = this._hash(key);
    let cur = this.buckets[idx];
    while (cur) {
      if (cur.key === key) return cur.val;
      cur = cur.next;
    }
    return -1;
  }

  remove(key) {
    const idx = this._hash(key);
    if (!this.buckets[idx]) return;

    // Handle head removal
    if (this.buckets[idx].key === key) {
      this.buckets[idx] = this.buckets[idx].next;
      return;
    }

    let prev = this.buckets[idx];
    let cur = prev.next;
    while (cur) {
      if (cur.key === key) { prev.next = cur.next; return; }
      prev = cur;
      cur = cur.next;
    }
  }
}

console.log("=== Design HashMap (LC #706) ===");
const map = new MyHashMap();
map.put(1, 1);
map.put(2, 2);
console.log("get 1:", map.get(1));  // 1
console.log("get 3:", map.get(3));  // -1 (not found)
map.put(2, 1);                       // update key 2
console.log("get 2:", map.get(2));  // 1
map.remove(2);
console.log("get 2 after remove:", map.get(2)); // -1

/*
 * Hash function design — why prime numbers matter:
 *
 * For hash = key % N:
 * If N = 100 (not prime): keys 100, 200, 300... all hash to 0. Keys with factors
 * in common with N cluster in fewer buckets.
 *
 * If N = 101 (prime): very few keys share factors with 101. Distribution is more uniform.
 *
 * More sophisticated hash functions (for string keys):
 * djb2:    hash = 5381; for each char: hash = ((hash << 5) + hash) + charCode
 * FNV-1a:  hash = 2166136261; for each byte: hash ^= byte; hash *= 16777619
 *
 * Load factor: when entries/buckets > 0.75, resize buckets array (rehash all keys).
 * Java's HashMap doubles size and rehashes on load factor > 0.75.
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: Design HashSet (LC #705)
//
// Same as HashMap but only stores presence (no associated value).
// Using the same chaining approach.
// ─────────────────────────────────────────────────────────────────────────────

class MyHashSet {
  constructor() {
    this.SIZE = 1009;
    this.buckets = new Array(this.SIZE).fill(null);
  }

  _hash(key) { return key % this.SIZE; }

  add(key) {
    if (this.contains(key)) return;
    const idx = this._hash(key);
    const newNode = new HashMapNode(key, true);
    newNode.next = this.buckets[idx];
    this.buckets[idx] = newNode; // Insert at head (O(1))
  }

  remove(key) {
    const idx = this._hash(key);
    if (!this.buckets[idx]) return;
    if (this.buckets[idx].key === key) {
      this.buckets[idx] = this.buckets[idx].next;
      return;
    }
    let prev = this.buckets[idx];
    let cur = prev.next;
    while (cur) {
      if (cur.key === key) { prev.next = cur.next; return; }
      prev = cur; cur = cur.next;
    }
  }

  contains(key) {
    const idx = this._hash(key);
    let cur = this.buckets[idx];
    while (cur) {
      if (cur.key === key) return true;
      cur = cur.next;
    }
    return false;
  }
}

console.log("\n=== Design HashSet (LC #705) ===");
const set = new MyHashSet();
set.add(1); set.add(2);
console.log("contains 1:", set.contains(1)); // true
console.log("contains 3:", set.contains(3)); // false
set.add(2);
console.log("contains 2:", set.contains(2)); // true
set.remove(2);
console.log("contains 2 after remove:", set.contains(2)); // false


// ─────────────────────────────────────────────────────────────────────────────
// Problem 3: Insert Delete GetRandom O(1) (LC #380)
//
// Design a data structure supporting:
//   insert(val) — O(1) average
//   remove(val) — O(1) average
//   getRandom()  — O(1), each element has equal probability
//
// Key insight:
//   - HashMap alone: O(1) insert/remove but O(N) for getRandom (can't index directly)
//   - Array alone: O(1) append and index (for getRandom), but O(N) for removal (must find element)
//   - HashMap + Array: HashMap stores val → array index. Array stores values.
//     Removal trick: swap target with last element, update HashMap, pop last.
//     This makes removal O(1) while keeping array dense for O(1) getRandom.
//
// Time: O(1) for all operations
// Space: O(N)
// ─────────────────────────────────────────────────────────────────────────────

class RandomizedSet {
  constructor() {
    this.map = new Map();  // val -> index in array
    this.arr = [];         // dense array of values
  }

  insert(val) {
    if (this.map.has(val)) return false;
    this.arr.push(val);
    this.map.set(val, this.arr.length - 1);
    return true;
  }

  remove(val) {
    if (!this.map.has(val)) return false;

    const idx = this.map.get(val);
    const lastVal = this.arr[this.arr.length - 1];

    // Swap target with last element
    this.arr[idx] = lastVal;
    this.map.set(lastVal, idx);

    // Remove last element (O(1) pop)
    this.arr.pop();
    this.map.delete(val);

    return true;
  }

  getRandom() {
    const randomIdx = Math.floor(Math.random() * this.arr.length);
    return this.arr[randomIdx];
  }
}

console.log("\n=== Insert Delete GetRandom O(1) (LC #380) ===");
const rs = new RandomizedSet();
console.log(rs.insert(1));  // true
console.log(rs.remove(2));  // false (not in set)
console.log(rs.insert(2));  // true
const randomResult = rs.getRandom(); // 1 or 2 with equal probability
console.log("getRandom:", randomResult);
console.log(rs.remove(1));  // true
console.log(rs.insert(2));  // false (2 already in set)
console.log(rs.getRandom()); // must be 2

// Distribution test
const distTest = new RandomizedSet();
[1, 2, 3, 4, 5].forEach((n) => distTest.insert(n));
const dist = {};
for (let i = 0; i < 10000; i++) {
  const r = distTest.getRandom();
  dist[r] = (dist[r] ?? 0) + 1;
}
console.log("Distribution (should be ~20% each):");
Object.entries(dist).forEach(([k, v]) => console.log(`  ${k}: ${((v / 10000) * 100).toFixed(1)}%`));


// ─────────────────────────────────────────────────────────────────────────────
// Problem 4: Insert Delete GetRandom O(1) with Duplicates (LC #381)
//
// Same as above but allow duplicate values.
// remove() removes one occurrence, not all.
// getRandom() probability proportional to count.
//
// Change: map stores val → SET of indices (not single index)
//         This allows multiple instances of the same value at different array positions
// ─────────────────────────────────────────────────────────────────────────────

class RandomizedSetDuplicates {
  constructor() {
    this.map = new Map();  // val -> Set of indices
    this.arr = [];
  }

  insert(val) {
    if (!this.map.has(val)) this.map.set(val, new Set());
    this.map.get(val).add(this.arr.length);
    this.arr.push(val);
    return true; // Always returns true (duplicates allowed)
  }

  remove(val) {
    if (!this.map.has(val) || this.map.get(val).size === 0) return false;

    // Get any index for this value (use the first from the Set)
    const idxSet = this.map.get(val);
    const idx = idxSet.values().next().value;
    idxSet.delete(idx);

    const lastVal = this.arr[this.arr.length - 1];

    if (idx !== this.arr.length - 1) {
      // Swap with last element
      this.arr[idx] = lastVal;
      const lastSet = this.map.get(lastVal);
      lastSet.delete(this.arr.length - 1);
      lastSet.add(idx);
    }

    this.arr.pop();
    if (idxSet.size === 0) this.map.delete(val);

    return true;
  }

  getRandom() {
    return this.arr[Math.floor(Math.random() * this.arr.length)];
  }
}

console.log("\n=== Insert Delete GetRandom with Duplicates (LC #381) ===");
const rsd = new RandomizedSetDuplicates();
rsd.insert(1); rsd.insert(1); rsd.insert(2);
console.log("getRandom (1 should appear ~2/3 of time):", rsd.getRandom());

const dist2 = {};
for (let i = 0; i < 9000; i++) {
  const r = rsd.getRandom();
  dist2[r] = (dist2[r] ?? 0) + 1;
}
console.log("Distribution (1: ~67%, 2: ~33%):");
Object.entries(dist2).forEach(([k, v]) => console.log(`  ${k}: ${((v / 9000) * 100).toFixed(1)}%`));

rsd.remove(1); // Remove one copy of 1
const dist3 = {};
for (let i = 0; i < 6000; i++) {
  const r = rsd.getRandom();
  dist3[r] = (dist3[r] ?? 0) + 1;
}
console.log("After removing one 1 (1: ~50%, 2: ~50%):");
Object.entries(dist3).forEach(([k, v]) => console.log(`  ${k}: ${((v / 6000) * 100).toFixed(1)}%`));

/*
 * The swap-with-last trick is fundamental:
 *   Problem: Array has gaps after deletion (holes reduce getRandom uniformity)
 *   Solution: Always keep the array dense by swapping deleted element with last,
 *             then popping the last element. Update the HashMap for the moved element.
 *
 * This technique appears in many "O(1) delete from array" problems.
 * Used in: skip list implementations, particle systems (game engines), memory pool allocators.
 */

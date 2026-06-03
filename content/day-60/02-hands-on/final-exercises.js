/**
 * Day 60 — Final Confidence Warmup Exercises
 * These are medium difficulty problems you should nail cold.
 * Target times are strict — if you miss them, add to your review list.
 */

// ─────────────────────────────────────────────────────────────
// 1. Debounce (target: 5 minutes)
// ─────────────────────────────────────────────────────────────
/**
 * Say this before coding: "debounce delays execution until N ms after the LAST call.
 * Useful for search inputs — fire only after the user stops typing."
 */
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Test
console.log('=== Debounce ===');
const debouncedLog = debounce((msg) => console.log('Executed:', msg), 100);
debouncedLog('call 1');  // reset timer
debouncedLog('call 2');  // reset timer
debouncedLog('call 3');  // reset timer — only this fires after 100ms
setTimeout(() => {}, 200); // Let the test complete
// Expected: only "Executed: call 3" after 100ms

// ─────────────────────────────────────────────────────────────
// 2. Find All Anagram Groups (target: 10 minutes)
// ─────────────────────────────────────────────────────────────
/**
 * Given a list of words, group them by anagram.
 * "eat", "tea", "tan", "ate", "nat", "bat"
 * → [["eat","tea","ate"], ["tan","nat"], ["bat"]]
 *
 * Key insight: sort the characters of each word — all anagrams have the same sorted form.
 */
function groupAnagrams(words) {
  const groups = new Map(); // sorted → [original words]

  for (const word of words) {
    const key = word.split('').sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }

  return Array.from(groups.values());
}

console.log('\n=== Anagram Groups ===');
console.log(groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']));
// [["eat","tea","ate"],["tan","nat"],["bat"]]
console.log(groupAnagrams(['']));         // [[""]]
console.log(groupAnagrams(['a']));        // [["a"]]
console.log(groupAnagrams(['abc', 'bca', 'def', 'fed', 'xyz']));
// [["abc","bca"],["def","fed"],["xyz"]]

// Time: O(n * k log k) where n = words, k = max word length
// Space: O(n * k)

// ─────────────────────────────────────────────────────────────
// 3. Promise.all Equivalent (target: 8 minutes)
// ─────────────────────────────────────────────────────────────
function myPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (promises.length === 0) return resolve([]);

    const results = new Array(promises.length);
    let completed = 0;

    promises.forEach((p, i) => {
      Promise.resolve(p)
        .then(val => {
          results[i] = val;
          if (++completed === promises.length) resolve(results);
        })
        .catch(reject);
    });
  });
}

// Test
async function testPromiseAll() {
  console.log('\n=== Promise.all ===');
  const r = await myPromiseAll([
    Promise.resolve(1),
    Promise.resolve(2),
    new Promise(r => setTimeout(() => r(3), 10)),
  ]);
  console.log(r); // [1, 2, 3] — in original order

  try {
    await myPromiseAll([Promise.resolve(1), Promise.reject('fail'), Promise.resolve(3)]);
  } catch (err) {
    console.log('Rejected with:', err); // 'fail'
  }
}

// ─────────────────────────────────────────────────────────────
// 4. Binary Search Template (target: 5 minutes)
// ─────────────────────────────────────────────────────────────
/**
 * You should be able to write this without thinking.
 * Memorize the template — it's used in dozens of problems.
 */
function binarySearch(arr, target) {
  let lo = 0;
  let hi = arr.length - 1;

  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2); // avoids integer overflow
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }

  return -1; // not found
}

console.log('\n=== Binary Search ===');
console.log(binarySearch([1, 3, 5, 7, 9], 7));  // 3
console.log(binarySearch([1, 3, 5, 7, 9], 4));  // -1
console.log(binarySearch([1], 1));               // 0
console.log(binarySearch([], 1));                // -1

// Variant: find first position where arr[i] >= target
function lowerBound(arr, target) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo; // insertion point
}

console.log(lowerBound([1, 3, 5, 7, 9], 5));  // 2 (index of first element >= 5)
console.log(lowerBound([1, 3, 5, 7, 9], 4));  // 2 (would insert at index 2)

// ─────────────────────────────────────────────────────────────
// 5. LRU Cache (target: 15 minutes — implement from memory)
// ─────────────────────────────────────────────────────────────
/**
 * Say this before coding:
 * "HashMap for O(1) lookup + doubly linked list for O(1) reorder.
 *  Most recently used at HEAD, least recently used at TAIL.
 *  On get: move to head.
 *  On put: add to head, evict tail if over capacity.
 *  Need key in node to delete from map on eviction."
 */
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // key → node

    // Sentinel nodes — avoid null checks
    this.head = { key: null, val: null };
    this.tail = { key: null, val: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const node = this.cache.get(key);
    this._remove(node);
    this._addFront(node);
    return node.val;
  }

  put(key, val) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.val = val;
      this._remove(node);
      this._addFront(node);
    } else {
      const node = { key, val };
      this.cache.set(key, node);
      this._addFront(node);

      if (this.cache.size > this.capacity) {
        const lru = this.tail.prev;
        this._remove(lru);
        this.cache.delete(lru.key);
      }
    }
  }
}

console.log('\n=== LRU Cache ===');
const lru = new LRUCache(2);
lru.put(1, 1);
lru.put(2, 2);
console.log(lru.get(1));   // 1 ✓
lru.put(3, 3);             // evicts key 2
console.log(lru.get(2));   // -1 ✓ (evicted)
lru.put(4, 4);             // evicts key 1 (key 3 was just accessed by put)
console.log(lru.get(1));   // -1 ✓ (evicted)
console.log(lru.get(3));   // 3 ✓
console.log(lru.get(4));   // 4 ✓

// ─────────────────────────────────────────────────────────────
// Run async tests
// ─────────────────────────────────────────────────────────────
async function main() {
  await testPromiseAll();
  debouncedLog('final check');
}

main().catch(console.error);

/**
 * TIMING TARGETS SUMMARY
 * ─────────────────────────────────────────────────────────────
 * 1. Debounce:      5 minutes — if more, practice daily
 * 2. Anagram groups: 10 minutes — sorted key pattern is standard
 * 3. Promise.all:   8 minutes — callbacks + counter pattern
 * 4. Binary search: 5 minutes — template should be automatic
 * 5. LRU Cache:     15 minutes — the flagship interview question
 *
 * If any of these take longer than the target, it's a sign to review.
 * By Day 60, all five should feel routine.
 */

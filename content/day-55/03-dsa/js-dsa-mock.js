/**
 * Day 55 — JavaScript DSA Mock Set
 * Timed challenge set — aim for < 15 min each problem.
 *
 * Problems:
 *  1. LeetCode #146 — LRU Cache       (implement from memory)
 *  2. LeetCode #295 — Find Median from Data Stream
 *  3. LeetCode #460 — LFU Cache
 */

// ─────────────────────────────────────────────────────────────
// #146 — LRU Cache
// Target: 12 minutes
// ─────────────────────────────────────────────────────────────
/**
 * APPROACH FIRST (talk through before coding):
 * Need O(1) get AND O(1) put.
 * - HashMap for O(1) lookup by key
 * - Doubly linked list to maintain order (most recently used at head)
 * - On get: move accessed node to head
 * - On put: add to head, evict tail if over capacity
 *
 * HashMap stores: key → node reference
 * Linked list stores: key, value (need key in node to delete from map on eviction)
 */
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // key → node

    // Dummy head and tail — avoids null checks
    this.head = { key: null, val: null, prev: null, next: null };
    this.tail = { key: null, val: null, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addToHead(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    const node = this.cache.get(key);
    if (!node) return -1;
    // Move to front (most recently used)
    this._removeNode(node);
    this._addToHead(node);
    return node.val;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.val = value;
      this._removeNode(node);
      this._addToHead(node);
    } else {
      const node = { key, val: value, prev: null, next: null };
      this.cache.set(key, node);
      this._addToHead(node);

      if (this.cache.size > this.capacity) {
        // Evict least recently used (before tail)
        const lru = this.tail.prev;
        this._removeNode(lru);
        this.cache.delete(lru.key);
      }
    }
  }
}

console.log('=== #146 LRU Cache ===');
const lru = new LRUCache(2);
lru.put(1, 1);
lru.put(2, 2);
console.log(lru.get(1));   // 1 (accesses 1, now order: [1,2])
lru.put(3, 3);             // evicts 2 (LRU)
console.log(lru.get(2));   // -1 (evicted)
lru.put(4, 4);             // evicts 1 (LRU since 3 was just put)
console.log(lru.get(1));   // -1
console.log(lru.get(3));   // 3
console.log(lru.get(4));   // 4

// ─────────────────────────────────────────────────────────────
// #295 — Find Median from Data Stream (see Day 54 for full impl)
// Target: 15 minutes
// ─────────────────────────────────────────────────────────────
/**
 * APPROACH FIRST:
 * Maintain two heaps:
 *   maxHeap (lower half): largest element at top
 *   minHeap (upper half): smallest element at top
 *
 * Invariant: maxHeap.size >= minHeap.size (at most 1 larger)
 *            maxHeap.top <= minHeap.top
 *
 * Median:
 *   Odd: return maxHeap.top
 *   Even: return (maxHeap.top + minHeap.top) / 2
 *
 * Note: JS has no built-in heap. In interview, implement a simple one
 * or state "I'll implement a MinHeap — it's standard boilerplate".
 */
class MinHeap {
  constructor(compareFn = (a, b) => a - b) {
    this.heap = [];
    this.compare = compareFn;
  }
  push(val) {
    this.heap.push(val);
    let i = this.heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.heap[parent], this.heap[i]) <= 0) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }
  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      let i = 0;
      while (true) {
        let s = i;
        const l = 2*i+1, r = 2*i+2;
        if (l < this.heap.length && this.compare(this.heap[l], this.heap[s]) < 0) s = l;
        if (r < this.heap.length && this.compare(this.heap[r], this.heap[s]) < 0) s = r;
        if (s === i) break;
        [this.heap[s], this.heap[i]] = [this.heap[i], this.heap[s]];
        i = s;
      }
    }
    return top;
  }
  peek() { return this.heap[0]; }
  size() { return this.heap.length; }
}

class MedianFinder {
  constructor() {
    this.lo = new MinHeap((a, b) => b - a); // max-heap (lower half)
    this.hi = new MinHeap();                // min-heap (upper half)
  }
  addNum(num) {
    this.lo.push(num);
    // Balance: ensure lo.top <= hi.top
    if (this.hi.size() > 0 && this.lo.peek() > this.hi.peek()) {
      this.hi.push(this.lo.pop());
    }
    // Balance sizes: lo can be 1 larger than hi
    if (this.lo.size() > this.hi.size() + 1) {
      this.hi.push(this.lo.pop());
    } else if (this.hi.size() > this.lo.size()) {
      this.lo.push(this.hi.pop());
    }
  }
  findMedian() {
    if (this.lo.size() > this.hi.size()) return this.lo.peek();
    return (this.lo.peek() + this.hi.peek()) / 2;
  }
}

console.log('\n=== #295 Find Median from Data Stream ===');
const mf = new MedianFinder();
[1, 2, 3, 4, 5].forEach(n => {
  mf.addNum(n);
  console.log(`After adding ${n}: median = ${mf.findMedian()}`);
});
// 1.0, 1.5, 2.0, 2.5, 3.0

// ─────────────────────────────────────────────────────────────
// #460 — LFU Cache
// Target: 20 minutes (this is genuinely hard)
// ─────────────────────────────────────────────────────────────
/**
 * APPROACH FIRST:
 * LFU: evict the LEAST FREQUENTLY USED item.
 * Tie-break: among items with same frequency, evict LEAST RECENTLY USED.
 *
 * Data structures:
 *   keyMap:  key → { val, freq }            — O(1) lookup
 *   freqMap: freq → LinkedHashSet of keys   — ordered by insertion (LRU within same freq)
 *   minFreq: current minimum frequency      — for O(1) eviction target
 *
 * On get(key):
 *   1. Increment key's frequency
 *   2. Move key from freqMap[freq] to freqMap[freq+1]
 *   3. If freqMap[minFreq] is now empty, increment minFreq
 *
 * On put(key, val):
 *   If key exists: update val + increment freq (same as get logic)
 *   If new key:
 *     - If at capacity: evict first key in freqMap[minFreq]
 *     - Add new key with freq=1
 *     - Reset minFreq = 1
 */
class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.size = 0;
    this.minFreq = 0;
    this.keyMap  = new Map(); // key → { val, freq }
    this.freqMap = new Map(); // freq → LinkedHashSet (Map preserves insertion order)
  }

  _getFreqSet(freq) {
    if (!this.freqMap.has(freq)) this.freqMap.set(freq, new Map()); // Map as ordered set
    return this.freqMap.get(freq);
  }

  _incrementFreq(key) {
    const { val, freq } = this.keyMap.get(key);
    const newFreq = freq + 1;

    // Remove from current freq bucket
    const oldSet = this._getFreqSet(freq);
    oldSet.delete(key);
    if (oldSet.size === 0) {
      this.freqMap.delete(freq);
      if (this.minFreq === freq) this.minFreq = newFreq;
    }

    // Add to new freq bucket
    this._getFreqSet(newFreq).set(key, true);
    this.keyMap.set(key, { val, freq: newFreq });
  }

  get(key) {
    if (!this.keyMap.has(key)) return -1;
    this._incrementFreq(key);
    return this.keyMap.get(key).val;
  }

  put(key, value) {
    if (this.capacity <= 0) return;

    if (this.keyMap.has(key)) {
      this.keyMap.get(key).val = value;
      this._incrementFreq(key);
      return;
    }

    // Evict if at capacity
    if (this.size >= this.capacity) {
      const minFreqSet = this._getFreqSet(this.minFreq);
      const evictKey = minFreqSet.keys().next().value; // first = LRU within freq
      minFreqSet.delete(evictKey);
      if (minFreqSet.size === 0) this.freqMap.delete(this.minFreq);
      this.keyMap.delete(evictKey);
      this.size--;
    }

    // Add new key with freq=1
    this.keyMap.set(key, { val: value, freq: 1 });
    this._getFreqSet(1).set(key, true);
    this.minFreq = 1;
    this.size++;
  }
}

console.log('\n=== #460 LFU Cache ===');
const lfu = new LFUCache(2);
lfu.put(1, 1);   // cache: {1:1, freq:1}
lfu.put(2, 2);   // cache: {1:1, freq:1}, {2:2, freq:1}
console.log(lfu.get(1)); // 1 — key 1 now has freq:2
lfu.put(3, 3);   // evicts key 2 (freq:1, LFU) — cache: {1:1, freq:2}, {3:3, freq:1}
console.log(lfu.get(2)); // -1 (evicted)
console.log(lfu.get(3)); // 3 — key 3 now has freq:2
lfu.put(4, 4);   // evicts key 1 or 3 (both freq:2, evict LRU = key 1)
console.log(lfu.get(1)); // -1
console.log(lfu.get(3)); // 3
console.log(lfu.get(4)); // 4

/**
 * TIMING TARGETS AND APPROACH SUMMARY
 * ─────────────────────────────────────────────────────────────
 *
 * #146 LRU (12 min target):
 *   "HashMap + doubly linked list. HashMap gives O(1) lookup.
 *    DLL gives O(1) move-to-front. Dummy head/tail avoid null checks.
 *    On eviction: remove tail.prev from both list and map."
 *
 * #295 Median Stream (15 min target):
 *   "Two heaps: max-heap for lower half, min-heap for upper half.
 *    Keep sizes balanced (lo ≥ hi). Max of lo ≤ min of hi always.
 *    Median = lo.top if odd total, else avg(lo.top, hi.top)."
 *
 * #460 LFU (20 min target — genuinely hard, explain first):
 *   "Three data structures: keyMap (key→{val,freq}), freqMap (freq→ordered keys),
 *    and minFreq tracker. On access: increment freq, move between freq buckets.
 *    When minFreq bucket empties after increment, minFreq++.
 *    On new put: reset minFreq=1, evict from freqMap[minFreq] (LRU within bucket)."
 *
 * If you can't finish LFU in time: say "I know the approach —
 * three maps, minFreq tracking, O(1) all operations. Let me sketch the put/get logic."
 * Showing you understand the approach is often enough to pass.
 */

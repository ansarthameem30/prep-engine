/**
 * Day 35 — DSA: LRU and LFU Cache
 *
 * Problems:
 *   1. LeetCode #146 — LRU Cache (Doubly-Linked List + HashMap)
 *   2. LeetCode #460 — LFU Cache (Frequency map + DLL per frequency)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: LRU Cache (LC #146)
//
// Implement a cache with get(key) and put(key, value) both in O(1).
//
// Why O(1) is non-trivial:
//   - HashMap alone gives O(1) get/put, but cannot track LRU order for eviction
//   - Array/Queue alone gives O(1) push/pop, but O(N) for arbitrary removal
//   - Doubly-Linked List + HashMap gives O(1) for both!
//
// Design:
//   - HashMap: key → node (O(1) access)
//   - Doubly-Linked List: ordered by recency (head = most recent, tail = least recent)
//   - On get: move accessed node to head (O(1) with DLL)
//   - On put: add new node to head; if over capacity, remove tail node (O(1))
//
// Time: O(1) for get and put
// Space: O(capacity)
// ─────────────────────────────────────────────────────────────────────────────

class DLLNode {
  constructor(key = 0, val = 0) {
    this.key = key;
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // key -> DLLNode

    // Sentinel nodes (dummy head and tail — simplifies edge cases)
    // head ↔ [most recent] ↔ ... ↔ [least recent] ↔ tail
    this.head = new DLLNode();
    this.tail = new DLLNode();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._moveToHead(node);
    return node.val;
  }

  put(key, value) {
    if (this.map.has(key)) {
      // Update existing node
      const node = this.map.get(key);
      node.val = value;
      this._moveToHead(node);
    } else {
      const newNode = new DLLNode(key, value);
      this.map.set(key, newNode);
      this._addToHead(newNode);

      if (this.map.size > this.capacity) {
        // Evict LRU (node before tail)
        const lruNode = this._removeTail();
        this.map.delete(lruNode.key);
      }
    }
  }

  // DLL helper methods
  _addToHead(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _moveToHead(node) {
    this._removeNode(node);
    this._addToHead(node);
  }

  _removeTail() {
    const tailNode = this.tail.prev;
    this._removeNode(tailNode);
    return tailNode;
  }

  // Debug utility
  toArray() {
    const result = [];
    let cur = this.head.next;
    while (cur !== this.tail) {
      result.push(`${cur.key}:${cur.val}`);
      cur = cur.next;
    }
    return result; // ordered: most recent → least recent
  }
}

console.log("=== LRU Cache (LC #146) ===");
const lru = new LRUCache(3);
lru.put(1, 1); console.log(lru.toArray()); // [1:1]
lru.put(2, 2); console.log(lru.toArray()); // [2:2, 1:1]
lru.put(3, 3); console.log(lru.toArray()); // [3:3, 2:2, 1:1]
lru.get(1);    console.log(lru.toArray()); // [1:1, 3:3, 2:2] — 1 moved to front
lru.put(4, 4); console.log(lru.toArray()); // [4:4, 1:1, 3:3] — 2 evicted (LRU)
console.log("get 2:", lru.get(2)); // -1 (evicted)
console.log("get 3:", lru.get(3)); // 3

/*
 * Common implementation bugs:
 *
 * 1. Using a plain Array + splice for LRU ordering: O(N) per operation
 *    → use DLL for O(1) arbitrary node removal
 *
 * 2. Forgetting to update the HashMap when evicting:
 *    → _removeTail returns the node, call map.delete(lruNode.key)
 *
 * 3. Not using sentinel (dummy) head/tail nodes:
 *    → Without sentinels, need many null checks for head/tail edge cases
 *    → Sentinels make _addToHead and _removeTail code identical regardless of list size
 *
 * 4. Updating value without moving to head:
 *    → An updated key is "accessed" and should be considered most recently used
 *
 * 5. Off-by-one on capacity check:
 *    → Check AFTER insertion: if map.size > capacity (not >=)
 */


// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: LFU Cache (LC #460)
//
// Evict the LEAST FREQUENTLY USED key. Ties broken by LEAST RECENTLY USED.
//
// Design:
//   - keyMap: key → { val, frequency }
//   - freqMap: frequency → Doubly-Linked List of keys (ordered by recency)
//   - minFreq: track current minimum frequency for O(1) eviction
//
// On get/put:
//   - Increment key's frequency
//   - Move key from freqMap[oldFreq] DLL to freqMap[oldFreq+1] DLL (at head = most recent)
//   - If freqMap[oldFreq] DLL becomes empty and oldFreq === minFreq: minFreq++
//   - On eviction: remove tail of freqMap[minFreq] (LRU among LFU)
//
// Time: O(1) for get and put
// Space: O(capacity)
// ─────────────────────────────────────────────────────────────────────────────

class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.size = 0;
    this.minFreq = 0;
    this.keyMap = new Map();  // key -> { val, freq }
    this.freqMap = new Map(); // freq -> DoublyLinkedList (key-ordered, most recent at head)
  }

  _getOrCreateList(freq) {
    if (!this.freqMap.has(freq)) {
      // Create a new DLL for this frequency
      const head = new DLLNode();
      const tail = new DLLNode();
      head.next = tail;
      tail.prev = head;
      this.freqMap.set(freq, { head, tail });
    }
    return this.freqMap.get(freq);
  }

  _addToFreqList(freq, node) {
    const list = this._getOrCreateList(freq);
    node.next = list.head.next;
    node.prev = list.head;
    list.head.next.prev = node;
    list.head.next = node;
  }

  _removeFromFreqList(freq, node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
    const list = this.freqMap.get(freq);
    if (list && list.head.next === list.tail) {
      this.freqMap.delete(freq); // Empty list, clean up
    }
  }

  _incrementFreq(key) {
    const entry = this.keyMap.get(key);
    const oldFreq = entry.freq;
    entry.freq = oldFreq + 1;

    this._removeFromFreqList(oldFreq, entry.node);
    this._addToFreqList(entry.freq, entry.node);

    if (this.minFreq === oldFreq && !this.freqMap.has(oldFreq)) {
      this.minFreq = entry.freq;
    }
  }

  get(key) {
    if (!this.keyMap.has(key)) return -1;
    const entry = this.keyMap.get(key);
    this._incrementFreq(key);
    return entry.val;
  }

  put(key, value) {
    if (this.capacity <= 0) return;

    if (this.keyMap.has(key)) {
      this.keyMap.get(key).val = value;
      this._incrementFreq(key);
      return;
    }

    // Evict LFU if at capacity
    if (this.size >= this.capacity) {
      const minFreqList = this.freqMap.get(this.minFreq);
      const evictNode = minFreqList.tail.prev; // LRU among LFU
      this._removeFromFreqList(this.minFreq, evictNode);
      this.keyMap.delete(evictNode.key);
      this.size--;
    }

    // Insert new key with freq = 1
    const newNode = new DLLNode(key, value);
    this.keyMap.set(key, { val: value, freq: 1, node: newNode });
    this._addToFreqList(1, newNode);
    this.minFreq = 1; // New key always has frequency 1
    this.size++;
  }
}

console.log("\n=== LFU Cache (LC #460) ===");
const lfu = new LFUCache(2);
lfu.put(1, 1);
lfu.put(2, 2);
console.log("get 1:", lfu.get(1)); // 1 (freq[1]=2, freq[2]=1)
lfu.put(3, 3);                     // evict key 2 (least frequent, freq=1)
console.log("get 2:", lfu.get(2)); // -1 (evicted)
console.log("get 3:", lfu.get(3)); // 3
lfu.put(4, 4);                     // evict key 1 or 3 (both freq=2, evict LRU = key 1)
console.log("get 1:", lfu.get(1)); // -1 (evicted)
console.log("get 3:", lfu.get(3)); // 3
console.log("get 4:", lfu.get(4)); // 4

/*
 * LRU vs LFU — Design decision matrix:
 *
 * LRU (Least Recently Used):
 *   Pro: Simple implementation, good for temporal locality (recently used data tends to be used again)
 *   Con: A single scan of all items in cache (full table scan pattern) evicts all cached items
 *   Best for: Web caches, session stores, typical API response caches
 *
 * LFU (Least Frequently Used):
 *   Pro: Protects "hot" items (frequently accessed) from being evicted by a burst of new items
 *   Con: "Cache pollution" — a historically popular item that's now stale stays in cache forever
 *        The "frequency death" problem: new items are evicted before they can accumulate frequency
 *   Best for: Content delivery networks, media caches where popular content must stay cached
 *
 * Real Redis behavior: Redis uses approximated LRU (not exact) by sampling 5-10 random keys
 * and evicting the one that looks LRU. This saves O(N) space for the exact LRU list while
 * providing near-identical behavior for most workloads.
 *
 * Redis 4.0+ also supports LFU with a decaying frequency counter (accessed count is
 * decremented by a configurable factor over time to address the "frequency death" problem).
 */

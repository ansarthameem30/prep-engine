/**
 * LeetCode #146 – LRU Cache
 *
 * Design a data structure that follows the Least Recently Used (LRU) cache eviction policy.
 *
 * Requirements:
 * - LRUCache(capacity): Initialize with positive capacity
 * - get(key): Return value if key exists, else -1. Mark as recently used.
 * - put(key, value): Insert or update key. If capacity exceeded, evict LRU item.
 * - Both operations must be O(1) time complexity.
 *
 * Key insight: HashMap (O(1) lookup) + Doubly Linked List (O(1) insert/delete at any position)
 *
 * Data structure visualization:
 *
 *   HEAD ↔ [most recently used] ↔ ... ↔ [least recently used] ↔ TAIL
 *
 *   HashMap: key → DLL node (direct pointer to position in the list)
 */

// ─────────────────────────────────────────────────────────────────────────────
// DOUBLY LINKED LIST NODE
// ─────────────────────────────────────────────────────────────────────────────

class DLLNode {
  constructor(key = 0, value = 0) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LRU CACHE IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

class LRUCache {
  /**
   * @param {number} capacity
   */
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // key → DLLNode

    // Sentinel head and tail — eliminates edge cases for insert/delete
    // head.next = most recently used
    // tail.prev = least recently used
    this.head = new DLLNode(); // sentinel head
    this.tail = new DLLNode(); // sentinel tail
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Insert a node immediately after head (most recently used position).
   * O(1)
   */
  _insertFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  /**
   * Remove a node from its current position in the list.
   * O(1) — this is why we need the doubly linked list
   */
  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
    node.prev = null;
    node.next = null;
  }

  /**
   * Move an existing node to the front (mark as recently used).
   * O(1)
   */
  _moveToFront(node) {
    this._remove(node);
    this._insertFront(node);
  }

  /**
   * Get the value of key if it exists; update its access time.
   * @param {number} key
   * @return {number}
   */
  get(key) {
    if (!this.cache.has(key)) return -1;

    const node = this.cache.get(key);
    this._moveToFront(node); // mark as recently used
    return node.value;
  }

  /**
   * Insert or update a key-value pair. Evict LRU item if at capacity.
   * @param {number} key
   * @param {number} value
   */
  put(key, value) {
    if (this.cache.has(key)) {
      // Update existing node
      const node = this.cache.get(key);
      node.value = value;
      this._moveToFront(node);
    } else {
      // Create new node
      const node = new DLLNode(key, value);
      this.cache.set(key, node);
      this._insertFront(node);

      // Evict LRU if over capacity
      if (this.cache.size > this.capacity) {
        const lruNode = this.tail.prev; // node just before tail = LRU
        this._remove(lruNode);
        this.cache.delete(lruNode.key);
      }
    }
  }

  // Helper for debugging: show cache state from MRU to LRU
  _toArray() {
    const result = [];
    let curr = this.head.next;
    while (curr !== this.tail) {
      result.push(`${curr.key}:${curr.value}`);
      curr = curr.next;
    }
    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ALTERNATIVE: Using JavaScript's Map (which preserves insertion order)
// Much simpler, but requires understanding the Map order trick.
// ─────────────────────────────────────────────────────────────────────────────

class LRUCacheMapBased {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // Map preserves insertion order
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const value = this.cache.get(key);
    // Move to end (most recently used) by deleting and re-inserting
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key); // will re-insert at end
    } else if (this.cache.size >= this.capacity) {
      // Map.keys().next().value = first inserted key = LRU
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey);
    }
    this.cache.set(key, value); // insert at end = MRU
  }

  _toArray() {
    return [...this.cache.entries()].map(([k, v]) => `${k}:${v}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

function runTests(CacheClass, label) {
  console.log(`\n=== ${label} ===`);

  // Test 1: Basic LeetCode example
  const cache1 = new CacheClass(2);
  cache1.put(1, 1);
  cache1.put(2, 2);
  console.log('get(1):', cache1.get(1)); // 1
  cache1.put(3, 3); // evicts key 2 (LRU, since we just used key 1)
  console.log('get(2):', cache1.get(2)); // -1 (evicted)
  cache1.put(4, 4); // evicts key 1 (LRU now)
  console.log('get(1):', cache1.get(1)); // -1 (evicted)
  console.log('get(3):', cache1.get(3)); // 3
  console.log('get(4):', cache1.get(4)); // 4

  // Test 2: Update existing key
  const cache2 = new CacheClass(2);
  cache2.put(1, 10);
  cache2.put(2, 20);
  cache2.put(1, 100); // update key 1 — should not evict anything
  console.log('\nUpdate test - get(1):', cache2.get(1)); // 100
  console.log('Update test - get(2):', cache2.get(2)); // 20
  console.log('Size after update:', cache2.cache.size);  // 2

  // Test 3: Capacity 1
  const cache3 = new CacheClass(1);
  cache3.put(1, 1);
  cache3.put(2, 2); // evicts 1
  console.log('\nCapacity 1 - get(1):', cache3.get(1)); // -1
  console.log('Capacity 1 - get(2):', cache3.get(2)); // 2

  // Test 4: State trace
  const cache4 = new CacheClass(3);
  cache4.put('a', 1); // [a:1]
  cache4.put('b', 2); // [b:2, a:1]
  cache4.put('c', 3); // [c:3, b:2, a:1]
  cache4.get('a');    // [a:1, c:3, b:2] — a moved to front
  cache4.put('d', 4); // [d:4, a:1, c:3] — b evicted (LRU)
  console.log('\nState trace (MRU→LRU):', cache4._toArray());
  // Expected: ['d:4', 'a:1', 'c:3']
}

runTests(LRUCache, 'DLL + HashMap Implementation');
runTests(LRUCacheMapBased, 'Map-Based Implementation');

/*
 * INTERVIEW TALKING POINTS:
 *
 * Q: Why doubly linked list and not singly linked?
 * A: We need to remove nodes in O(1). With a singly linked list, to remove a
 *    node you need its predecessor, which requires O(n) traversal to find.
 *    With a doubly linked list, each node has its prev pointer, so removal is O(1).
 *
 * Q: Why sentinel head and tail nodes?
 * A: They eliminate edge cases: empty list, inserting the first node,
 *    removing the last node. Without them, every operation needs null checks.
 *    With sentinels, the list always has at least 2 nodes.
 *
 * Q: What's the trade-off between DLL+Map vs Map-only?
 * A: DLL+Map: explicit, more code, but shows you understand the underlying data structure.
 *    Map-only: elegant, leverages JS's Map ordering guarantee, fewer bugs.
 *    For an interview: start with the DLL+Map (shows CS knowledge), mention the Map
 *    shortcut as an optimization specific to JavaScript.
 *
 * Q: How would you extend this to support TTL (time-to-live)?
 * A: Add an `expiresAt` timestamp to each node. On get(), check if expired.
 *    Run a background cleanup or use a min-heap ordered by expiration time.
 */

/**
 * Day 57 — Backend-Relevant DSA
 *
 * Problems:
 *  1. LeetCode #155 — Min Stack             O(1) min
 *  2. LeetCode #232 — Queue using Stacks    amortized O(1)
 *  3. LeetCode #208 — Trie                  full implementation
 *  4. LeetCode #146 — LRU Cache with TTL    extends LRU with expiry
 */

// ─────────────────────────────────────────────────────────────
// #155 — Min Stack
// ─────────────────────────────────────────────────────────────
/**
 * Design a stack with O(1) push, pop, top, AND getMin.
 *
 * Approach: Two stacks.
 *   Main stack: stores all values
 *   Min stack: stores current minimum at each level
 *     On push: push min(val, minStack.top) to minStack
 *     On pop: pop from both stacks
 *
 * Time: O(1) all operations
 * Space: O(n)
 */
class MinStack {
  constructor() {
    this.stack = [];
    this.minStack = []; // minStack[i] = minimum of stack[0..i]
  }

  push(val) {
    this.stack.push(val);
    const currentMin = this.minStack.length > 0
      ? Math.min(val, this.minStack[this.minStack.length - 1])
      : val;
    this.minStack.push(currentMin);
  }

  pop() {
    this.stack.pop();
    this.minStack.pop();
  }

  top() {
    return this.stack[this.stack.length - 1];
  }

  getMin() {
    return this.minStack[this.minStack.length - 1];
  }
}

console.log('=== #155 Min Stack ===');
const ms = new MinStack();
ms.push(-2); ms.push(0); ms.push(-3);
console.log(ms.getMin()); // -3
ms.pop();
console.log(ms.top());    // 0
console.log(ms.getMin()); // -2

// ─────────────────────────────────────────────────────────────
// #232 — Implement Queue Using Stacks
// ─────────────────────────────────────────────────────────────
/**
 * Queue (FIFO) using two stacks (LIFO).
 *
 * Approach: Lazy transfer
 *   in-stack: receives all push operations
 *   out-stack: serves all pop/peek operations
 *
 *   When out-stack is empty and we need to pop/peek:
 *     Transfer all elements from in-stack to out-stack (reverses order → FIFO)
 *
 * Time:
 *   push: O(1)
 *   pop/peek: O(1) amortized — each element is moved at most once total
 * Space: O(n)
 */
class MyQueue {
  constructor() {
    this.inStack = [];
    this.outStack = [];
  }

  push(x) {
    this.inStack.push(x);
  }

  _transfer() {
    if (this.outStack.length === 0) {
      while (this.inStack.length > 0) {
        this.outStack.push(this.inStack.pop());
      }
    }
  }

  pop() {
    this._transfer();
    return this.outStack.pop();
  }

  peek() {
    this._transfer();
    return this.outStack[this.outStack.length - 1];
  }

  empty() {
    return this.inStack.length === 0 && this.outStack.length === 0;
  }
}

console.log('\n=== #232 Queue Using Stacks ===');
const q = new MyQueue();
q.push(1); q.push(2); q.push(3);
console.log(q.peek()); // 1
console.log(q.pop());  // 1
console.log(q.pop());  // 2
q.push(4);
console.log(q.pop());  // 3
console.log(q.pop());  // 4
console.log(q.empty()); // true

// ─────────────────────────────────────────────────────────────
// #208 — Implement Trie (Prefix Tree)
// ─────────────────────────────────────────────────────────────
/**
 * Trie is a tree where each node represents a character.
 * Used for: autocomplete, spell check, IP routing, prefix search.
 *
 * Operations:
 *   insert(word): insert word into trie — O(m) where m = word length
 *   search(word): return true if word exists — O(m)
 *   startsWith(prefix): return true if any word starts with prefix — O(m)
 *
 * Node structure: children Map (char → TrieNode), isEnd flag
 *
 * Relevant to backend: URL routing (Express router uses trie internally),
 * autocomplete APIs, search suggestion engines.
 */
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEnd = false;
    this.count = 0; // optional: how many words end at this node
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
    }
    node.isEnd = true;
    node.count++;
  }

  search(word) {
    const node = this._traverse(word);
    return node !== null && node.isEnd;
  }

  startsWith(prefix) {
    return this._traverse(prefix) !== null;
  }

  _traverse(prefix) {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children.has(char)) return null;
      node = node.children.get(char);
    }
    return node;
  }

  // Extension: get all words with a given prefix (for autocomplete)
  getWordsWithPrefix(prefix) {
    const node = this._traverse(prefix);
    if (!node) return [];
    const results = [];
    this._collectWords(node, prefix, results);
    return results;
  }

  _collectWords(node, prefix, results) {
    if (node.isEnd) results.push(prefix);
    for (const [char, child] of node.children) {
      this._collectWords(child, prefix + char, results);
    }
  }

  // Extension: delete a word
  delete(word) {
    this._delete(this.root, word, 0);
  }

  _delete(node, word, idx) {
    if (idx === word.length) {
      if (!node.isEnd) return false; // word doesn't exist
      node.isEnd = false;
      return node.children.size === 0; // can delete if leaf
    }
    const char = word[idx];
    if (!node.children.has(char)) return false;
    const shouldDelete = this._delete(node.children.get(char), word, idx + 1);
    if (shouldDelete) node.children.delete(char);
    return !node.isEnd && node.children.size === 0;
  }
}

console.log('\n=== #208 Trie ===');
const trie = new Trie();
['apple', 'app', 'application', 'apply', 'banana'].forEach(w => trie.insert(w));

console.log(trie.search('apple'));       // true
console.log(trie.search('app'));         // true
console.log(trie.search('ap'));          // false
console.log(trie.startsWith('app'));     // true
console.log(trie.startsWith('ban'));     // true
console.log(trie.startsWith('xyz'));     // false
console.log(trie.getWordsWithPrefix('app')); // ['app', 'apple', 'application', 'apply']

trie.delete('app');
console.log(trie.search('app'));         // false
console.log(trie.search('apple'));       // true (still exists)

// ─────────────────────────────────────────────────────────────
// #146 — LRU Cache with TTL Expiry
// ─────────────────────────────────────────────────────────────
/**
 * Extends the standard LRU cache with per-entry TTL.
 * On get: check if entry is expired — if so, remove and return -1.
 * On put: store entry with expiry timestamp.
 *
 * Lazy expiry: we don't proactively clean up — expired entries are removed on access.
 * Optional: add a background cleanup interval for memory management.
 *
 * Time: O(1) for get and put
 * Space: O(capacity)
 */
class LRUCacheWithTTL {
  constructor(capacity, defaultTTLms = Infinity) {
    this.capacity = capacity;
    this.defaultTTL = defaultTTLms;
    this.cache = new Map();  // key → { val, expiresAt }
    this.order = new Map();  // key → node (doubly linked list)

    // Sentinel nodes
    this.head = { key: null, prev: null, next: null };
    this.tail = { key: null, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addFront(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return -1;

    // Check TTL expiry
    if (Date.now() > entry.expiresAt) {
      this._evict(key);
      return -1; // expired
    }

    // Move to front (recently used)
    const node = this.order.get(key);
    this._remove(node);
    this._addFront(node);
    return entry.val;
  }

  put(key, val, ttlMs = this.defaultTTL) {
    if (this.cache.has(key)) {
      this.cache.get(key).val = val;
      this.cache.get(key).expiresAt = Date.now() + ttlMs;
      const node = this.order.get(key);
      this._remove(node);
      this._addFront(node);
      return;
    }

    if (this.cache.size >= this.capacity) {
      // Evict LRU (before tail)
      const lruNode = this.tail.prev;
      this._evict(lruNode.key);
    }

    const node = { key, prev: null, next: null };
    this.cache.set(key, { val, expiresAt: Date.now() + ttlMs });
    this.order.set(key, node);
    this._addFront(node);
  }

  _evict(key) {
    const node = this.order.get(key);
    if (node) this._remove(node);
    this.cache.delete(key);
    this.order.delete(key);
  }
}

console.log('\n=== LRU Cache with TTL ===');
const ttlCache = new LRUCacheWithTTL(3, 100); // 100ms TTL
ttlCache.put('a', 1);
ttlCache.put('b', 2);
ttlCache.put('c', 3, 50); // c expires in 50ms (shorter TTL)
console.log(ttlCache.get('a')); // 1
console.log(ttlCache.get('b')); // 2

setTimeout(() => {
  console.log('After 60ms:');
  console.log('c:', ttlCache.get('c')); // -1 (expired)
  console.log('a:', ttlCache.get('a')); // 1 (still valid)
}, 60);

setTimeout(() => {
  console.log('After 110ms:');
  console.log('a:', ttlCache.get('a')); // -1 (expired)
  console.log('b:', ttlCache.get('b')); // -1 (expired)
}, 110);

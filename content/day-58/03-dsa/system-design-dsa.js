/**
 * Day 58 — System Design Relevant DSA
 *
 * Problems:
 *  1. Design a Message Queue (efficient circular buffer)
 *  2. LeetCode #295 — Find Median from Data Stream (revisit)
 *  3. LeetCode #352 — Data Stream as Disjoint Intervals
 *  4. Priority Notification System (deduplication + priority)
 */

// ─────────────────────────────────────────────────────────────
// 1. Message Queue — Circular Buffer (O(1) enqueue/dequeue)
// ─────────────────────────────────────────────────────────────
/**
 * A naive array-based queue using shift() has O(n) dequeue.
 * Use a circular buffer (ring buffer) for O(1) amortized enqueue/dequeue.
 *
 * head: index of the next item to dequeue
 * tail: index of the next empty slot to enqueue
 * When tail wraps around to head: queue is full (resize or reject)
 */
class CircularQueue {
  constructor(capacity = 16) {
    this.capacity = capacity;
    this.buffer   = new Array(capacity).fill(null);
    this.head     = 0;
    this.tail     = 0;
    this.size     = 0;
  }

  enqueue(item) {
    if (this.size === this.capacity) {
      this._resize();
    }
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this.size++;
    return true;
  }

  dequeue() {
    if (this.size === 0) return null;
    const item = this.buffer[this.head];
    this.buffer[this.head] = null; // GC-friendly
    this.head = (this.head + 1) % this.capacity;
    this.size--;
    return item;
  }

  peek() {
    return this.size > 0 ? this.buffer[this.head] : null;
  }

  isEmpty() { return this.size === 0; }

  _resize() {
    const newCapacity = this.capacity * 2;
    const newBuffer   = new Array(newCapacity).fill(null);

    // Copy in order from head
    for (let i = 0; i < this.size; i++) {
      newBuffer[i] = this.buffer[(this.head + i) % this.capacity];
    }

    this.buffer   = newBuffer;
    this.head     = 0;
    this.tail     = this.size;
    this.capacity = newCapacity;

    console.log(`[CircularQueue] Resized to ${newCapacity}`);
  }
}

console.log('=== Circular Buffer Queue ===');
const q = new CircularQueue(4);
q.enqueue('msg-1');
q.enqueue('msg-2');
q.enqueue('msg-3');
console.log(q.dequeue()); // msg-1
console.log(q.dequeue()); // msg-2
q.enqueue('msg-4');
q.enqueue('msg-5'); // wraps around
console.log(q.peek());    // msg-3
console.log(q.size);      // 3

// Trigger resize
const bigQ = new CircularQueue(2);
bigQ.enqueue('a'); bigQ.enqueue('b');
bigQ.enqueue('c'); // triggers resize to 4
console.log('Resized queue size:', bigQ.size); // 3

// ─────────────────────────────────────────────────────────────
// #295 — Find Median from Data Stream (with follow-up variant)
// ─────────────────────────────────────────────────────────────
/**
 * Standard two-heap solution (see Day 54 for full explanation).
 *
 * System design context: This pattern is used in:
 *   - Real-time analytics (streaming median of response times)
 *   - Sliding window statistics (add+remove elements)
 *   - Load balancer least-connections routing
 *
 * Follow-up: What if values are in [0, 100]?
 *   Use a counting array of size 101. O(1) insert, O(1) median lookup.
 *
 * Follow-up: Sliding window median (window of size k)?
 *   Use two heaps with a lazy deletion set. When deleting from a heap,
 *   mark the element as deleted. On peek, skip deleted elements.
 */
class StreamMedian {
  constructor() {
    this.lo = []; // max-heap (negate values)
    this.hi = []; // min-heap
  }

  _heapPush(heap, val, isMax = false) {
    heap.push(isMax ? -val : val);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p] <= heap[i]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  }

  _heapPop(heap) {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        let s = i, l = 2*i+1, r = 2*i+2;
        if (l < heap.length && heap[l] < heap[s]) s = l;
        if (r < heap.length && heap[r] < heap[s]) s = r;
        if (s === i) break;
        [heap[s], heap[i]] = [heap[i], heap[s]];
        i = s;
      }
    }
    return top;
  }

  addNum(num) {
    this._heapPush(this.lo, num, true); // push to max-heap
    // Cross-balance
    if (this.hi.length && -this.lo[0] > this.hi[0]) {
      this._heapPush(this.hi, -this._heapPop(this.lo));
    }
    // Size balance
    if (this.lo.length > this.hi.length + 1) {
      this._heapPush(this.hi, -this._heapPop(this.lo));
    } else if (this.hi.length > this.lo.length) {
      this._heapPush(this.lo, -this._heapPop(this.hi), false); // careful: negate back
    }
  }

  findMedian() {
    if (this.lo.length > this.hi.length) return -this.lo[0];
    return (-this.lo[0] + this.hi[0]) / 2;
  }
}

console.log('\n=== #295 Find Median (Stream) ===');
const sm = new StreamMedian();
[1, 2, 3, 4, 5].forEach(n => {
  sm.addNum(n);
  process.stdout.write(`${sm.findMedian()} `);
});
console.log(); // 1.0 1.5 2.0 2.5 3.0

// ─────────────────────────────────────────────────────────────
// #352 — Data Stream as Disjoint Intervals
// ─────────────────────────────────────────────────────────────
/**
 * Maintain a sorted list of non-overlapping intervals.
 * On each addNum(val), merge val into the existing intervals.
 *
 * System design context: This is the core data structure for:
 *   - IP range blocking/allowlisting
 *   - File download progress (track which byte ranges are downloaded)
 *   - Time slot availability (calendar systems)
 *   - Network packet reassembly (track which sequence numbers arrived)
 *
 * Approach: Binary search to find insertion point, then merge neighbors.
 *
 * Time: O(n) per addNum in worst case (shifting on merge)
 * Space: O(n)
 */
class SummaryRanges {
  constructor() {
    this.intervals = [];
  }

  addNum(val) {
    const newInterval = [val, val];
    const result = [];
    let inserted = false;

    for (const interval of this.intervals) {
      if (inserted || interval[1] < val - 1) {
        // No overlap: interval ends before val (with gap)
        result.push(interval);
      } else if (interval[0] > val + 1) {
        // No overlap: interval starts after val (with gap) — insert before
        if (!inserted) {
          result.push(newInterval);
          inserted = true;
        }
        result.push(interval);
      } else {
        // Overlapping or adjacent: merge
        newInterval[0] = Math.min(newInterval[0], interval[0]);
        newInterval[1] = Math.max(newInterval[1], interval[1]);
      }
    }

    if (!inserted) result.push(newInterval);
    this.intervals = result;
  }

  getIntervals() {
    return this.intervals;
  }
}

console.log('\n=== #352 Data Stream as Disjoint Intervals ===');
const sr = new SummaryRanges();
const nums = [1, 3, 7, 2, 6];
for (const n of nums) {
  sr.addNum(n);
  console.log(`Add ${n}: ${JSON.stringify(sr.getIntervals())}`);
}
// Add 1: [[1,1]]
// Add 3: [[1,1],[3,3]]
// Add 7: [[1,1],[3,3],[7,7]]
// Add 2: [[1,3],[7,7]]   -- 1,2,3 merge
// Add 6: [[1,3],[6,7]]   -- 6,7 merge

// ─────────────────────────────────────────────────────────────
// 4. Notification System with Priority + Deduplication
// ─────────────────────────────────────────────────────────────
/**
 * Real-world notification systems need:
 *   - Priority: system alerts > social notifications
 *   - Deduplication: don't send the same notification twice
 *   - Rate limiting: at most K notifications per user per hour
 *   - Delivery tracking: know which notifications were delivered/read
 *
 * Data structure: Priority Queue + Set for deduplication
 */
class NotificationQueue {
  constructor() {
    this.heap = [];       // min-heap by priority (lower = higher priority)
    this.seen = new Set(); // deduplication by notification key
  }

  // key: dedup key (e.g., "order:123:shipped" — one notification per order+event)
  enqueue(notification) {
    const key = notification.key || `${notification.type}:${notification.targetId}`;

    if (this.seen.has(key)) {
      console.log(`[Notifications] Deduplicated: ${key}`);
      return false;
    }

    this.seen.add(key);
    const item = { ...notification, key, enqueuedAt: Date.now() };
    this._heapPush(item);
    return true;
  }

  dequeue() {
    if (this.heap.length === 0) return null;
    const item = this._heapPop();
    // Note: don't remove from seen — that would allow re-delivery
    return item;
  }

  _heapPush(item) {
    this.heap.push(item);
    let i = this.heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p].priority <= this.heap[i].priority) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }

  _heapPop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      let i = 0;
      while (true) {
        let s = i, l = 2*i+1, r = 2*i+2;
        if (l < this.heap.length && this.heap[l].priority < this.heap[s].priority) s = l;
        if (r < this.heap.length && this.heap[r].priority < this.heap[s].priority) s = r;
        if (s === i) break;
        [this.heap[s], this.heap[i]] = [this.heap[i], this.heap[s]];
        i = s;
      }
    }
    return top;
  }

  size() { return this.heap.length; }
}

console.log('\n=== Notification Queue (Priority + Dedup) ===');
const nq = new NotificationQueue();

nq.enqueue({ type: 'order_shipped', targetId: '123', priority: 2, message: 'Your order shipped!' });
nq.enqueue({ type: 'friend_request', targetId: '456', priority: 5, message: 'Bob wants to connect' });
nq.enqueue({ type: 'system_alert', targetId: 'security', priority: 1, message: 'Login from new device' });
nq.enqueue({ type: 'order_shipped', targetId: '123', priority: 2, message: 'Duplicate!' }); // deduped
nq.enqueue({ type: 'promo', targetId: 'sale1', priority: 8, message: 'Sale ends today!' });

console.log('Processing notifications in priority order:');
while (nq.size() > 0) {
  const n = nq.dequeue();
  console.log(`  [p${n.priority}] ${n.type}: ${n.message}`);
}
// Order: system_alert (p1), order_shipped (p2), friend_request (p5), promo (p8)

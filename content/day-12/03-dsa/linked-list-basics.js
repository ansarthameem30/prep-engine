/**
 * Day 12 DSA: Linked List Fundamentals
 *
 * Problems:
 * - LeetCode #206: Reverse Linked List
 * - LeetCode #141: Linked List Cycle Detection
 *
 * Both use the same ListNode class that LeetCode provides.
 */

// ─────────────────────────────────────────────────────────────────────────────
// DATA STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

// Helper: array → linked list
function arrayToList(arr) {
  if (!arr.length) return null;
  const head = new ListNode(arr[0]);
  let curr = head;
  for (let i = 1; i < arr.length; i++) {
    curr.next = new ListNode(arr[i]);
    curr = curr.next;
  }
  return head;
}

// Helper: linked list → array (for testing, non-cyclic only)
function listToArray(head, limit = 1000) {
  const result = [];
  let curr = head;
  while (curr && result.length < limit) {
    result.push(curr.val);
    curr = curr.next;
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM 1: REVERSE LINKED LIST (#206)
//
// Input:  1 → 2 → 3 → 4 → 5 → null
// Output: 5 → 4 → 3 → 2 → 1 → null
// ─────────────────────────────────────────────────────────────────────────────

/**
 * APPROACH 1: Iterative — Three Pointers
 * Time: O(n), Space: O(1)
 *
 * Visualization at each step for [1 → 2 → 3]:
 * Init:    prev=null, curr=1
 * Step 1:  next=2, 1→null, prev=1, curr=2
 * Step 2:  next=3, 2→1,    prev=2, curr=3
 * Step 3:  next=null, 3→2, prev=3, curr=null
 * Return:  prev=3 (new head)
 */
function reverseListIterative(head) {
  let prev = null;
  let curr = head;

  while (curr !== null) {
    const next = curr.next; // save next before we overwrite it
    curr.next = prev;       // reverse the pointer
    prev = curr;            // advance prev
    curr = next;            // advance curr
  }

  return prev; // prev is now the new head
}

/**
 * APPROACH 2: Recursive
 * Time: O(n), Space: O(n) — stack frames
 *
 * Key insight: recurse to the tail, then fix pointers on the way back up.
 *
 * reverseList([1→2→3→4→5]):
 *   → reverseList([2→3→4→5]) = [5→4→3→2] with 2.next = 1
 *   → After: 1 ← 2 ← 3 ← 4 ← 5, 1.next = null
 */
function reverseListRecursive(head) {
  // Base case: empty list or single node
  if (head === null || head.next === null) return head;

  // Recurse: newHead is the reversed tail's head (the last node)
  const newHead = reverseListRecursive(head.next);

  // Fix pointers:
  // head.next still points to the node after head (which is now the tail of reversed sublist)
  // Make that node point back to head
  head.next.next = head;
  head.next = null; // disconnect head from what used to be its next

  return newHead;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM 2: LINKED LIST CYCLE DETECTION (#141)
//
// Floyd's Tortoise and Hare Algorithm
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Floyd's Algorithm
 * Time: O(n), Space: O(1)
 *
 * Two pointers: slow moves 1 step, fast moves 2 steps.
 * If there's a cycle, fast will eventually lap slow (they'll meet).
 * If there's no cycle, fast hits null.
 *
 * Mathematical proof sketch:
 * - Let the cycle start at position μ, cycle length λ
 * - When slow enters the cycle, fast is already λ−μ steps ahead
 * - Each step reduces the gap by 1 (fast gains 1 on slow within the cycle)
 * - They meet after at most λ more steps
 *
 * @param {ListNode} head
 * @return {boolean}
 */
function hasCycle(head) {
  let slow = head;
  let fast = head;

  while (fast !== null && fast.next !== null) {
    slow = slow.next;        // 1 step
    fast = fast.next.next;   // 2 steps

    if (slow === fast) return true; // they met — cycle exists
  }

  return false; // fast reached end — no cycle
}

/**
 * BONUS: Find the cycle START node (#142 – Linked List Cycle II)
 *
 * After slow and fast meet:
 * - Reset one pointer to head
 * - Advance both 1 step at a time
 * - They meet at the cycle start
 *
 * @param {ListNode} head
 * @return {ListNode | null}
 */
function detectCycleStart(head) {
  let slow = head;
  let fast = head;
  let hasCycleFlag = false;

  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {
      hasCycleFlag = true;
      break;
    }
  }

  if (!hasCycleFlag) return null;

  // Reset one pointer to head; both advance 1 step
  let ptr = head;
  while (ptr !== slow) {
    ptr = ptr.next;
    slow = slow.next;
  }

  return ptr; // cycle start node
}

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: MERGE TWO SORTED LINKED LISTS (#21)
// Time: O(m+n), Space: O(1) with dummy node pattern
// ─────────────────────────────────────────────────────────────────────────────

function mergeTwoLists(list1, list2) {
  // Dummy node eliminates edge cases for the head
  const dummy = new ListNode(-1);
  let curr = dummy;

  while (list1 !== null && list2 !== null) {
    if (list1.val <= list2.val) {
      curr.next = list1;
      list1 = list1.next;
    } else {
      curr.next = list2;
      list2 = list2.next;
    }
    curr = curr.next;
  }

  // Attach remaining nodes (at most one list has remaining nodes)
  curr.next = list1 !== null ? list1 : list2;

  return dummy.next;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== Reverse Linked List ===\n');

const list1 = arrayToList([1, 2, 3, 4, 5]);
console.log('Original:', listToArray(list1));
console.log('Reversed (iterative):', listToArray(reverseListIterative(arrayToList([1, 2, 3, 4, 5]))));
console.log('Reversed (recursive):', listToArray(reverseListRecursive(arrayToList([1, 2, 3, 4, 5]))));
console.log('Single node:', listToArray(reverseListIterative(arrayToList([1]))));
console.log('Empty:', listToArray(reverseListIterative(null)));

console.log('\n=== Cycle Detection ===\n');

// No cycle
const noCycle = arrayToList([1, 2, 3, 4]);
console.log('No cycle:', hasCycle(noCycle)); // false

// Create cycle: 1 → 2 → 3 → 4 → 2 (cycle back to node with val 2)
const cycleList = arrayToList([1, 2, 3, 4]);
let node2 = cycleList.next; // node with val=2
// Traverse to end and create cycle
let tail = cycleList;
while (tail.next) tail = tail.next;
tail.next = node2; // 4 → 2 (cycle)

console.log('With cycle:', hasCycle(cycleList)); // true
console.log('Cycle start val:', detectCycleStart(cycleList).val); // 2

console.log('\n=== Merge Two Sorted Lists ===\n');
const a = arrayToList([1, 2, 4]);
const b = arrayToList([1, 3, 4]);
console.log('Merged:', listToArray(mergeTwoLists(a, b))); // [1,1,2,3,4,4]

/*
 * INTERVIEW TALKING POINTS:
 *
 * Q: Why use Floyd's over a HashSet for cycle detection?
 * A: HashSet uses O(n) space and is O(n) time. Floyd's is O(n) time, O(1) space.
 *    For space-constrained systems, Floyd's is strictly better.
 *    HashSet is easier to code quickly under pressure.
 *
 * Q: Why does the dummy node pattern simplify list merging?
 * A: It eliminates the "which list starts the merged head" special case.
 *    Without dummy, you need separate logic to set the initial head pointer.
 *
 * Q: What's the space complexity of recursive reversal?
 * A: O(n) for the call stack. For very long lists, iterative is safer
 *    to avoid stack overflow. In practice, most interview problems have n ≤ 10^4,
 *    and JavaScript's default stack handles ~10k-15k frames.
 */

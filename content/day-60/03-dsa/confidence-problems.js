/**
 * Day 60 — Final Confidence-Building Set
 * You should solve these FAST by now. Timing targets are strict.
 * If you miss a target, that topic needs one more review session.
 *
 * Problems:
 *  1. LeetCode #1   — Two Sum              O(n)    target: 3 min
 *  2. LeetCode #102 — Binary Tree BFS      O(n)    target: 8 min
 *  3. LeetCode #200 — Number of Islands    O(m*n)  target: 10 min
 *  4. LeetCode #322 — Coin Change          O(n*k)  target: 12 min
 *  5. LeetCode #146 — LRU Cache            O(1)    target: 15 min
 */

// ─────────────────────────────────────────────────────────────
// #1 — Two Sum (3 min target)
// ─────────────────────────────────────────────────────────────
/**
 * You should know this cold. No hesitation.
 * "HashMap: for each number, check if complement exists. O(n), O(n)."
 */
function twoSum(nums, target) {
  const seen = new Map(); // value → index

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }

  return [];
}

console.log('=== #1 Two Sum ===');
console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]
console.log(twoSum([3, 2, 4], 6));      // [1, 2]
console.log(twoSum([3, 3], 6));          // [0, 1]

// ─────────────────────────────────────────────────────────────
// #102 — Binary Tree Level Order Traversal (8 min target)
// ─────────────────────────────────────────────────────────────
/**
 * "BFS with a queue. Process level by level.
 *  At start of each level, record queue size (that's how many nodes to process)."
 */
class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}

function levelOrder(root) {
  if (!root) return [];

  const result = [];
  const queue = [root];

  while (queue.length > 0) {
    const levelSize = queue.length; // process exactly this many nodes for current level
    const level = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(level);
  }

  return result;
}

console.log('\n=== #102 Binary Tree Level Order ===');
// [3,9,20,null,null,15,7]
const root = new TreeNode(3,
  new TreeNode(9),
  new TreeNode(20, new TreeNode(15), new TreeNode(7))
);
console.log(levelOrder(root)); // [[3],[9,20],[15,7]]
console.log(levelOrder(null)); // []
console.log(levelOrder(new TreeNode(1))); // [[1]]

// ─────────────────────────────────────────────────────────────
// #200 — Number of Islands (10 min target)
// ─────────────────────────────────────────────────────────────
/**
 * "DFS or BFS from each unvisited '1' cell.
 *  Mark visited cells as '0' (or use a visited set).
 *  Count DFS/BFS invocations = number of islands."
 */
function numIslands(grid) {
  if (!grid || grid.length === 0) return 0;

  const rows = grid.length;
  const cols = grid[0].length;
  let count = 0;

  function dfs(r, c) {
    // Bounds check + must be land
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;

    grid[r][c] = '0'; // mark as visited (sink the island)
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        count++;
        dfs(r, c);
      }
    }
  }

  return count;
}

console.log('\n=== #200 Number of Islands ===');
console.log(numIslands([
  ['1','1','1','1','0'],
  ['1','1','0','1','0'],
  ['1','1','0','0','0'],
  ['0','0','0','0','0'],
])); // 1

console.log(numIslands([
  ['1','1','0','0','0'],
  ['1','1','0','0','0'],
  ['0','0','1','0','0'],
  ['0','0','0','1','1'],
])); // 3

// ─────────────────────────────────────────────────────────────
// #322 — Coin Change (12 min target)
// ─────────────────────────────────────────────────────────────
/**
 * Classic DP. Say this before coding:
 * "dp[i] = minimum coins to make amount i.
 *  Base: dp[0] = 0.
 *  Transition: dp[i] = min(dp[i - coin] + 1) for each coin <= i.
 *  Initialize to Infinity (unreachable).
 *  Answer: dp[amount], or -1 if still Infinity."
 */
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i && dp[i - coin] !== Infinity) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}

console.log('\n=== #322 Coin Change ===');
console.log(coinChange([1, 5, 10, 25], 36)); // 3 (25+10+1)
console.log(coinChange([1, 2, 5], 11));      // 3 (5+5+1)
console.log(coinChange([2], 3));             // -1 (impossible)
console.log(coinChange([1], 0));             // 0

// ─────────────────────────────────────────────────────────────
// #146 — LRU Cache (15 min target — flagship problem)
// ─────────────────────────────────────────────────────────────
/**
 * The standard implementation — you've seen this multiple times.
 * By Day 60, this should be mechanical.
 *
 * "HashMap for O(1) lookup. Doubly linked list for O(1) move-to-front.
 *  HEAD = most recently used. TAIL = least recently used.
 *  Dummy head/tail sentinels avoid null pointer checks."
 */
class LRUCacheD60 {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();

    this.head = { key: null, val: null, prev: null, next: null };
    this.tail = { key: null, val: null, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _unlink(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _insertFront(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const node = this.cache.get(key);
    this._unlink(node);
    this._insertFront(node);
    return node.val;
  }

  put(key, val) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.val = val;
      this._unlink(node);
      this._insertFront(node);
      return;
    }

    const node = { key, val, prev: null, next: null };
    this.cache.set(key, node);
    this._insertFront(node);

    if (this.cache.size > this.capacity) {
      const evict = this.tail.prev;
      this._unlink(evict);
      this.cache.delete(evict.key);
    }
  }
}

console.log('\n=== #146 LRU Cache (Day 60 — you know this cold) ===');
const cache = new LRUCacheD60(3);
cache.put(1, 100);
cache.put(2, 200);
cache.put(3, 300);
console.log(cache.get(1));   // 100 — access 1 (order: 1,3,2)
cache.put(4, 400);            // evicts 2 (LRU)
console.log(cache.get(2));   // -1 (evicted) ✓
console.log(cache.get(3));   // 300 ✓
console.log(cache.get(4));   // 400 ✓
console.log(cache.get(1));   // 100 ✓

/**
 * ─────────────────────────────────────────────────────────────
 * TIMING TARGETS AND "KNOW THIS COLD" COMMENTS
 * ─────────────────────────────────────────────────────────────
 *
 * #1 Two Sum (3 min):
 *   "One pass hash map." You should write this before the interviewer
 *   finishes explaining the problem. It is the canonical example of
 *   the hash map for O(n) lookup pattern.
 *
 * #102 BFS Level Order (8 min):
 *   "Queue + snapshot the level size." The snapshot is the key insight —
 *   you need to process exactly levelSize nodes for each level, not all
 *   nodes currently in the queue (which grows as you enqueue children).
 *
 * #200 Number of Islands (10 min):
 *   "DFS flood fill, mark visited by sinking." The mutation trick
 *   (grid[r][c] = '0') avoids a separate visited set. If you can't
 *   mutate the input, use a visited boolean 2D array.
 *
 * #322 Coin Change (12 min):
 *   "Bottom-up DP, dp[0]=0, build up to amount."
 *   Common mistake: initializing dp to 0 instead of Infinity.
 *   Common mistake: returning dp[amount] without checking for Infinity.
 *
 * #146 LRU Cache (15 min):
 *   "HashMap + DLL. Dummy nodes. Move to front on access. Evict LRU (tail.prev)."
 *   Practice writing the _unlink and _insertFront helpers first — they are the
 *   entire implementation; get and put just call those plus map operations.
 *
 * If you hit all 5 targets today, you are ready for technical interviews.
 * These 5 problems cover: hash maps, BFS/tree traversal, graph DFS,
 * dynamic programming, and advanced data structures — all the fundamentals.
 */

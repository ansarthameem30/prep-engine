/**
 * LeetCode #207 – Course Schedule
 *
 * There are numCourses courses (0 to numCourses-1).
 * prerequisites[i] = [a, b] means: to take course a, you must first take course b.
 * Return true if it's possible to finish all courses, false if there's a cycle.
 *
 * This is: detect a cycle in a directed graph.
 *
 * Time: O(V + E) where V = numCourses, E = prerequisites.length
 * Space: O(V + E) for adjacency list + visited states
 */

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH 1: DFS with Three-Color Marking
// White (0): unvisited
// Gray (1): currently in DFS path (in-progress)
// Black (2): fully processed (no cycle from here)
//
// Cycle detected when we encounter a Gray node during DFS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {number} numCourses
 * @param {number[][]} prerequisites
 * @return {boolean}
 */
function canFinishDFS(numCourses, prerequisites) {
  // Build adjacency list
  const graph = Array.from({ length: numCourses }, () => []);
  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course); // prereq → course (taking prereq leads to course)
  }

  const state = new Array(numCourses).fill(0); // 0=white, 1=gray, 2=black

  function hasCycle(node) {
    if (state[node] === 1) return true;  // gray = cycle detected
    if (state[node] === 2) return false; // black = already safe

    state[node] = 1; // mark as in-progress

    for (const neighbor of graph[node]) {
      if (hasCycle(neighbor)) return true;
    }

    state[node] = 2; // mark as done
    return false;
  }

  // Check all nodes (graph may not be connected)
  for (let i = 0; i < numCourses; i++) {
    if (state[i] === 0 && hasCycle(i)) return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH 2: BFS — Kahn's Algorithm (Topological Sort)
// If we can topologically sort the graph (process all nodes), no cycle exists.
// Algorithm:
// 1. Calculate in-degree (number of incoming edges) for each node
// 2. Add all nodes with in-degree 0 to the queue (no prerequisites)
// 3. Process each node: reduce in-degree of its neighbors
// 4. When a neighbor's in-degree reaches 0, add it to the queue
// 5. If we process all numCourses nodes, no cycle. Otherwise, cycle exists.
// ─────────────────────────────────────────────────────────────────────────────

function canFinishBFS(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  const inDegree = new Array(numCourses).fill(0);

  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course);
    inDegree[course]++;
  }

  // Start with courses that have no prerequisites
  const queue = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  let processedCount = 0;

  while (queue.length) {
    const node = queue.shift();
    processedCount++;

    for (const neighbor of graph[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  return processedCount === numCourses;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTENSION: #210 – Course Schedule II (Return the topological order)
// Same as #207 but return the valid course order, or [] if impossible
// ─────────────────────────────────────────────────────────────────────────────

function findOrderDFS(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course);
  }

  const state = new Array(numCourses).fill(0);
  const order = []; // Post-order DFS = reverse topological order

  function dfs(node) {
    if (state[node] === 1) return false; // cycle
    if (state[node] === 2) return true;  // already processed

    state[node] = 1;
    for (const neighbor of graph[node]) {
      if (!dfs(neighbor)) return false;
    }
    state[node] = 2;
    order.push(node); // add to order AFTER processing all descendants
    return true;
  }

  for (let i = 0; i < numCourses; i++) {
    if (state[i] === 0 && !dfs(i)) return [];
  }

  return order.reverse(); // reverse because we appended in post-order
}

function findOrderBFS(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  const inDegree = new Array(numCourses).fill(0);

  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course);
    inDegree[course]++;
  }

  const queue = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    for (const neighbor of graph[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return order.length === numCourses ? order : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: Clone Graph (#133)
// ─────────────────────────────────────────────────────────────────────────────

class GraphNode {
  constructor(val, neighbors = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
}

function cloneGraph(node) {
  if (!node) return null;

  const visited = new Map(); // original node → cloned node

  function dfs(original) {
    if (visited.has(original)) return visited.get(original);

    const clone = new GraphNode(original.val);
    visited.set(original, clone); // store BEFORE recursing (handles cycles!)

    for (const neighbor of original.neighbors) {
      clone.neighbors.push(dfs(neighbor));
    }

    return clone;
  }

  return dfs(node);
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== Course Schedule ===\n');

// Test cases
const cases = [
  { n: 2, p: [[1, 0]], expected: true },               // 0→1: can finish
  { n: 2, p: [[1, 0], [0, 1]], expected: false },      // cycle: 0↔1
  { n: 3, p: [[1, 0], [2, 1]], expected: true },       // chain: 0→1→2
  { n: 3, p: [[0, 1], [0, 2], [1, 2]], expected: true }, // DAG, no cycle
  { n: 4, p: [[1,0],[2,0],[3,1],[3,2]], expected: true }, // diamond
  { n: 1, p: [], expected: true },                     // single course
];

cases.forEach(({ n, p, expected }, i) => {
  const dfsResult = canFinishDFS(n, p);
  const bfsResult = canFinishBFS(n, p);
  const pass = dfsResult === expected && bfsResult === expected;
  console.log(
    `Test ${i + 1}: n=${n}`,
    `→ DFS:${dfsResult} BFS:${bfsResult}`,
    pass ? '✓' : `✗ (expected ${expected})`
  );
});

console.log('\n=== Course Schedule II ===\n');
console.log('Order [4, [[1,0],[2,0],[3,1],[3,2]]]:', findOrderBFS(4, [[1,0],[2,0],[3,1],[3,2]]));
// e.g. [0, 1, 2, 3] or [0, 2, 1, 3]
console.log('Cycle impossible [2, [[1,0],[0,1]]]:', findOrderBFS(2, [[1,0],[0,1]])); // []

/*
 * INTERVIEW TALKING POINTS:
 *
 * Q: DFS vs BFS (Kahn's) — which would you choose in an interview?
 * A: Both work. I'd reach for Kahn's (BFS) because:
 *    1. It's iterative — no risk of stack overflow
 *    2. The in-degree concept maps naturally to "prerequisites satisfied"
 *    3. The logic is linear: the queue always contains "ready" nodes
 *    DFS with gray/black coloring is elegant but requires careful state management.
 *
 * Q: How do you handle disconnected graphs in topological sort?
 * A: Kahn's handles it naturally — all nodes with in-degree 0 are added initially,
 *    regardless of connectivity. DFS requires iterating over all nodes and calling
 *    DFS for each unvisited node.
 *
 * Q: What's the real-world application of topological sort?
 * A: Build systems (npm install resolves dependency order), database migrations,
 *    task scheduling, webpack module loading order, Docker layer caching.
 *
 * Q: What's the key insight for cloneGraph to handle cycles?
 * A: Store the mapping from original → clone BEFORE recursing into neighbors.
 *    If we encounter the same node again, we return the already-created clone
 *    instead of creating an infinite loop.
 */

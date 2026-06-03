/**
 * LeetCode #200 – Number of Islands
 *
 * Given an m x n grid of '1' (land) and '0' (water), return the number of islands.
 * An island is surrounded by water and formed by connecting adjacent land cells
 * horizontally or vertically.
 *
 * Example:
 * [["1","1","0","0","0"],
 *  ["1","1","0","0","0"],
 *  ["0","0","1","0","0"],
 *  ["0","0","0","1","1"]]
 * → 3 islands
 *
 * Time: O(m * n), Space: O(m * n) — worst case all land, DFS stack / BFS queue fills
 */

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH 1: DFS — Flood Fill (modify grid in-place)
// When we find a '1', increment count and "sink" the entire island (mark as '0')
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string[][]} grid
 * @return {number}
 */
function numIslandsDFS(grid) {
  if (!grid.length) return 0;

  const rows = grid.length;
  const cols = grid[0].length;
  let count = 0;

  function sink(r, c) {
    // Out of bounds or already water — stop
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;

    grid[r][c] = '0'; // mark as visited by "sinking" the cell

    // Explore all 4 neighbors
    sink(r + 1, c);
    sink(r - 1, c);
    sink(r, c + 1);
    sink(r, c - 1);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        count++;
        sink(r, c); // sink entire island
      }
    }
  }

  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH 2: BFS — Queue-based flood fill
// Preferred when DFS stack depth is a concern (very large grids)
// ─────────────────────────────────────────────────────────────────────────────

function numIslandsBFS(grid) {
  if (!grid.length) return 0;

  // Clone to avoid mutating input
  const g = grid.map(row => [...row]);
  const rows = g.length;
  const cols = g[0].length;
  let count = 0;
  const dirs = [[1,0], [-1,0], [0,1], [0,-1]];

  function bfs(startR, startC) {
    const queue = [[startR, startC]];
    g[startR][startC] = '0'; // mark visited immediately (before processing)

    while (queue.length) {
      const [r, c] = queue.shift();

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc] === '1') {
          g[nr][nc] = '0'; // mark before enqueueing to prevent duplicate visits
          queue.push([nr, nc]);
        }
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (g[r][c] === '1') {
        count++;
        bfs(r, c);
      }
    }
  }

  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH 3: Union-Find (Disjoint Set Union)
// Alternative approach for when you need to answer connectivity queries online
// More complex but shows advanced knowledge of graph data structures
// ─────────────────────────────────────────────────────────────────────────────

class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.count = 0;
  }

  find(x) {
    // Path compression: make every node point directly to root
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return; // already connected

    // Union by rank: attach smaller tree under larger tree
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
    this.count--;
  }
}

function numIslandsUnionFind(grid) {
  if (!grid.length) return 0;

  const rows = grid.length;
  const cols = grid[0].length;
  const uf = new UnionFind(rows * cols);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        uf.count++;
        const id = r * cols + c;
        // Connect to right neighbor
        if (c + 1 < cols && grid[r][c + 1] === '1') uf.union(id, id + 1);
        // Connect to bottom neighbor
        if (r + 1 < rows && grid[r + 1][c] === '1') uf.union(id, id + cols);
      }
    }
  }

  return uf.count;
}

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: Max Area of Island (#695) — variant tracking island size
// ─────────────────────────────────────────────────────────────────────────────

function maxAreaOfIsland(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  let maxArea = 0;

  function dfs(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== 1) return 0;
    grid[r][c] = 0; // mark visited
    return 1 + dfs(r+1,c) + dfs(r-1,c) + dfs(r,c+1) + dfs(r,c-1);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) {
        maxArea = Math.max(maxArea, dfs(r, c));
      }
    }
  }

  return maxArea;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

function makeGrid(arr) {
  return arr.map(row => [...row]); // deep copy
}

const grid1 = [
  ['1','1','1','1','0'],
  ['1','1','0','1','0'],
  ['1','1','0','0','0'],
  ['0','0','0','0','0'],
];
const grid2 = [
  ['1','1','0','0','0'],
  ['1','1','0','0','0'],
  ['0','0','1','0','0'],
  ['0','0','0','1','1'],
];
const grid3 = [['1']];
const grid4 = [['0']];

console.log('=== Number of Islands ===\n');
console.log('DFS - grid1:', numIslandsDFS(makeGrid(grid1)));  // 1
console.log('DFS - grid2:', numIslandsDFS(makeGrid(grid2)));  // 3
console.log('BFS - grid1:', numIslandsBFS(makeGrid(grid1)));  // 1
console.log('BFS - grid2:', numIslandsBFS(makeGrid(grid2)));  // 3
console.log('UF  - grid1:', numIslandsUnionFind(makeGrid(grid1))); // 1
console.log('UF  - grid2:', numIslandsUnionFind(makeGrid(grid2))); // 3
console.log('Single 1:', numIslandsDFS(makeGrid(grid3)));     // 1
console.log('Single 0:', numIslandsDFS(makeGrid(grid4)));     // 0

/*
 * INTERVIEW TALKING POINTS:
 *
 * Q: DFS vs BFS — which is better for this problem?
 * A: Both are O(m*n) time and space. DFS is simpler to implement (recursive).
 *    BFS is better for very large grids where DFS recursion depth could overflow the
 *    call stack. In JavaScript, the default call stack is ~10k-15k frames — for a
 *    10,000-cell all-land grid, recursive DFS would stack overflow.
 *    For competitive programming or interviews, DFS is cleaner code.
 *    For production, iterative BFS is safer.
 *
 * Q: Should you mutate the input grid?
 * A: In interviews, ask. Mutating is the most space-efficient approach (O(1) extra
 *    space beyond DFS stack). If mutation is not allowed, use a separate visited
 *    Set: `visited.add(r * cols + c)` — O(m*n) extra space.
 *
 * Q: When would you use Union-Find instead of DFS/BFS?
 * A: Union-Find is better when you need to:
 *    - Answer multiple connectivity queries on the same graph
 *    - Dynamically add cells (online algorithm)
 *    - Know the size of each component
 *    For this problem, it's overkill. But if the interviewer asks "how would you
 *    solve this if cells are added one at a time?", Union-Find is the answer.
 */

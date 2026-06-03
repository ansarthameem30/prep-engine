/**
 * LeetCode #22 – Generate Parentheses
 *
 * Given n pairs of parentheses, generate all combinations of well-formed parentheses.
 * n=3 → ["((()))","(()())","(())()","()(())","()()()"]
 *
 * This is the canonical backtracking problem:
 * - Build solutions incrementally
 * - Prune branches that can never lead to valid solutions
 * - Backtrack (undo the last choice) and try the next option
 *
 * Time: O(4^n / sqrt(n)) — the nth Catalan number
 * Space: O(n) — recursion depth
 */

/**
 * APPROACH 1: Backtracking (Optimal)
 *
 * Decision tree at each position:
 * - Add '(' if open count < n
 * - Add ')' if close count < open count
 *
 * The invariant ensures we never create invalid sequences.
 */
function generateParenthesis(n) {
  const result = [];

  function backtrack(current, openCount, closeCount) {
    // Base case: used all n pairs
    if (current.length === 2 * n) {
      result.push(current);
      return;
    }

    // Choice 1: Add '(' if we haven't used all n
    if (openCount < n) {
      backtrack(current + '(', openCount + 1, closeCount);
    }

    // Choice 2: Add ')' if it won't create an imbalance
    if (closeCount < openCount) {
      backtrack(current + ')', openCount, closeCount + 1);
    }
  }

  backtrack('', 0, 0);
  return result;
}

/**
 * VISUAL DECISION TREE for n=2:
 *
 *                       ""
 *                      (open:0, close:0)
 *                       |
 *                       "("
 *                      (open:1, close:0)
 *                    /         \
 *               "(("           "()"
 *         (open:2,close:0)  (open:1,close:1)
 *              |                  |
 *           "(()"            "()(  "
 *        (o:2,c:1)           (o:2,c:1)
 *              |                  |
 *          "(())"            "()()"  ✓
 *        (o:2,c:2) ✓
 *
 * Result: ["(())", "()()"]
 */

/**
 * APPROACH 2: Using an array buffer (avoids string concatenation overhead)
 * In JS, string concatenation creates a new string each time.
 * Using a char array and backtracking by popping is more efficient.
 */
function generateParenthesisOptimized(n) {
  const result = [];
  const buffer = new Array(2 * n);

  function backtrack(pos, openCount, closeCount) {
    if (pos === 2 * n) {
      result.push(buffer.join(''));
      return;
    }

    if (openCount < n) {
      buffer[pos] = '(';
      backtrack(pos + 1, openCount + 1, closeCount);
      // No explicit "undo" needed — we overwrite buffer[pos] on next call
    }

    if (closeCount < openCount) {
      buffer[pos] = ')';
      backtrack(pos + 1, openCount, closeCount + 1);
    }
  }

  backtrack(0, 0, 0);
  return result;
}

/**
 * APPROACH 3: Dynamic Programming (iterative)
 * Build solutions for n from solutions for n-1, n-2, ...
 * dp[i] = all valid combos using i pairs
 * dp[n] = "(" + dp[k] + ")" + dp[n-1-k] for k = 0..n-1
 */
function generateParenthesisDP(n) {
  const dp = Array.from({ length: n + 1 }, () => []);
  dp[0] = [''];

  for (let i = 1; i <= n; i++) {
    for (let k = 0; k < i; k++) {
      for (const left of dp[k]) {
        for (const right of dp[i - 1 - k]) {
          dp[i].push(`(${left})${right}`);
        }
      }
    }
  }

  return dp[n];
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKTRACKING TEMPLATE — applies to many problems
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic backtracking template:
 *
 * function backtrack(state, choices) {
 *   if (isComplete(state)) {
 *     result.push(clone(state));
 *     return;
 *   }
 *
 *   for (const choice of choices) {
 *     if (isValid(choice, state)) {
 *       makeChoice(choice, state);          // modify state
 *       backtrack(state, remainingChoices); // recurse
 *       undoChoice(choice, state);          // restore state (backtrack)
 *     }
 *   }
 * }
 */

// Example: Subsets (#78) using same pattern
function subsets(nums) {
  const result = [];

  function backtrack(start, current) {
    result.push([...current]); // add current state (every subset is valid)

    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);        // make choice
      backtrack(i + 1, current);   // recurse with remaining elements
      current.pop();                // undo choice (backtrack)
    }
  }

  backtrack(0, []);
  return result;
}

// Example: Combinations (#77)
function combine(n, k) {
  const result = [];

  function backtrack(start, current) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }

    // Pruning: not enough numbers left to fill k slots
    const remaining = k - current.length;
    for (let i = start; i <= n - remaining + 1; i++) {
      current.push(i);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(1, []);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== Generate Parentheses ===\n');

console.log('n=1:', generateParenthesis(1)); // ["()"]
console.log('n=2:', generateParenthesis(2)); // ["(())", "()()"]
console.log('n=3 count:', generateParenthesis(3).length); // 5

// Verify all are valid
function isValidParenthesis(s) {
  let count = 0;
  for (const c of s) {
    if (c === '(') count++;
    else if (--count < 0) return false;
  }
  return count === 0;
}

const results3 = generateParenthesis(3);
console.log('\nn=3 results:');
results3.forEach(s => console.log(s, isValidParenthesis(s) ? '✓' : '✗'));

// Compare approaches
console.log('\nDP approach:', generateParenthesisDP(3));
console.log('Same as backtracking:',
  JSON.stringify(generateParenthesis(3).sort()) ===
  JSON.stringify(generateParenthesisDP(3).sort())
);

console.log('\n=== Subsets ===\n');
console.log(subsets([1, 2, 3]));

console.log('\n=== Combinations ===\n');
console.log('C(4,2):', combine(4, 2)); // [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]

/*
 * INTERVIEW TALKING POINTS:
 *
 * Q: Explain the backtracking approach in one sentence.
 * A: At each position, make a valid choice, recurse, then undo the choice to
 *    try the next option — pruning branches where no valid completion exists.
 *
 * Q: What's the invariant that guarantees validity here?
 * A: Two invariants: (1) never add more '(' than n, and (2) never add ')' when
 *    close ≥ open. These two conditions eliminate all invalid states before
 *    we waste time computing them.
 *
 * Q: What's the time complexity?
 * A: O(4^n / sqrt(n)) — the nth Catalan number, which counts the number of
 *    well-formed parentheses sequences of length 2n. Each valid sequence
 *    takes O(n) to construct, so total is O(n * C(n)).
 *
 * Q: How does this generalize to other backtracking problems?
 * A: The same structure: choose from valid options, recurse with the reduced
 *    problem, undo. For permutations: mark used, recurse, unmark.
 *    For N-Queens: place queen, recurse, remove queen.
 */

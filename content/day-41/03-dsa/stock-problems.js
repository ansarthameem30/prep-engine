/**
 * Day 41 DSA — Stock Buy/Sell Problems
 * Pattern: State Machine DP
 *
 * Key insight: model each scenario as a finite state machine where states
 * represent how many transactions have occurred and whether we currently
 * hold a stock. Transitions are buy/sell/hold actions.
 *
 * All solutions below with time/space complexity analysis.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LC #121: Best Time to Buy and Sell Stock (at most 1 transaction)
// Time: O(n) | Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Single pass: track the minimum price seen so far.
 * For each day, profit = today's price - min_price_so_far.
 * Update max profit if this is better.
 */
function maxProfit121(prices) {
  let minPrice = Infinity;
  let maxProfit = 0;

  for (const price of prices) {
    if (price < minPrice) {
      minPrice = price; // Found a better buy day
    } else if (price - minPrice > maxProfit) {
      maxProfit = price - minPrice; // Found a better sell day
    }
  }

  return maxProfit;
}

// Tests
console.log("=== LC #121 ===");
console.log(maxProfit121([7, 1, 5, 3, 6, 4])); // 5 (buy at 1, sell at 6)
console.log(maxProfit121([7, 6, 4, 3, 1])); // 0 (always decreasing)

// ─────────────────────────────────────────────────────────────────────────────
// LC #122: Best Time to Buy and Sell Stock II (unlimited transactions)
// Time: O(n) | Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Greedy insight: you can make as many transactions as you want.
 * Any time price[i+1] > price[i], take that profit.
 * This is equivalent to: buy every dip, sell every peak.
 *
 * Proof: if prices go 1→2→3, profit(sell at 3) = 2 = (2-1)+(3-2).
 * So taking every positive daily increment = optimal.
 */
function maxProfit122(prices) {
  let profit = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) {
      profit += prices[i] - prices[i - 1]; // "Buy yesterday, sell today"
    }
  }
  return profit;
}

console.log("\n=== LC #122 ===");
console.log(maxProfit122([7, 1, 5, 3, 6, 4])); // 7 (buy@1 sell@5, buy@3 sell@6)
console.log(maxProfit122([1, 2, 3, 4, 5])); // 4 (one big uptrend)
console.log(maxProfit122([7, 6, 4, 3, 1])); // 0

// ─────────────────────────────────────────────────────────────────────────────
// LC #123: Best Time to Buy and Sell Stock III (at most 2 transactions)
// Time: O(n) | Space: O(1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * State machine with 4 states:
 *   buy1:  best outcome after first purchase (negate price = "spent this much")
 *   sell1: best outcome after first sale
 *   buy2:  best outcome after second purchase
 *   sell2: best outcome after second sale (answer)
 *
 * At each price:
 *   buy1  = max(buy1, -price)          → buy at minimum
 *   sell1 = max(sell1, buy1 + price)   → sell for max gain
 *   buy2  = max(buy2, sell1 - price)   → use first profit to fund second buy
 *   sell2 = max(sell2, buy2 + price)   → sell second for max gain
 */
function maxProfit123(prices) {
  let buy1 = -Infinity,
    sell1 = 0;
  let buy2 = -Infinity,
    sell2 = 0;

  for (const price of prices) {
    buy1 = Math.max(buy1, -price);
    sell1 = Math.max(sell1, buy1 + price);
    buy2 = Math.max(buy2, sell1 - price);
    sell2 = Math.max(sell2, buy2 + price);
  }

  return sell2;
}

console.log("\n=== LC #123 ===");
console.log(maxProfit123([3, 3, 5, 0, 0, 3, 1, 4])); // 6 (buy@0 sell@3, buy@1 sell@4)
console.log(maxProfit123([1, 2, 3, 4, 5])); // 4 (single transaction optimal)
console.log(maxProfit123([7, 6, 4, 3, 1])); // 0

// ─────────────────────────────────────────────────────────────────────────────
// LC #188: Best Time to Buy and Sell Stock IV (at most k transactions)
// Time: O(k*n) | Space: O(k)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generalization of #123 to k transactions.
 *
 * Key insight: if k >= n/2, we can make unlimited transactions (same as #122).
 * Otherwise, maintain k pairs of (buy[i], sell[i]) states.
 *
 * buy[i]  = best portfolio value after i-th purchase
 * sell[i] = best portfolio value after i-th sale
 *
 * Transitions (for each price, update in reverse order to avoid using same day):
 *   buy[i]  = max(buy[i], sell[i-1] - price)
 *   sell[i] = max(sell[i], buy[i] + price)
 */
function maxProfit188(k, prices) {
  const n = prices.length;
  if (n === 0 || k === 0) return 0;

  // If k is large enough, unlimited transactions (greedy from #122)
  if (k >= Math.floor(n / 2)) {
    let profit = 0;
    for (let i = 1; i < n; i++) {
      if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];
    }
    return profit;
  }

  // DP arrays: buy[i] = max capital after i-th buy, sell[i] = after i-th sell
  const buy = new Array(k).fill(-Infinity);
  const sell = new Array(k).fill(0);

  for (const price of prices) {
    for (let i = k - 1; i >= 0; i--) {
      // Update in reverse to prevent using current price twice in same pass
      sell[i] = Math.max(sell[i], buy[i] + price);
      buy[i] = Math.max(buy[i], (i > 0 ? sell[i - 1] : 0) - price);
    }
  }

  return sell[k - 1];
}

console.log("\n=== LC #188 ===");
console.log(maxProfit188(2, [3, 2, 6, 5, 0, 3])); // 7 (buy@2 sell@6, buy@0 sell@3)
console.log(maxProfit188(2, [3, 3, 5, 0, 0, 3, 1, 4])); // 6
console.log(maxProfit188(1, [1, 2])); // 1

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Summary: State Machine DP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATTERN: State Machine DP for Constrained Stock Problems
 *
 * Problem        Constraint       Approach                     Complexity
 * ──────────     ──────────────   ──────────────────────────   ──────────────
 * #121           1 transaction    Track min price, max profit  O(n) / O(1)
 * #122           Unlimited        Greedy (take every gain)     O(n) / O(1)
 * #123           2 transactions   4-state machine (k=2 case)   O(n) / O(1)
 * #188           k transactions   k-pair state arrays + DP     O(kn) / O(k)
 *
 * The "generalized state machine" pattern:
 * - For each transaction limit, track buy/sell state
 * - buy[i]  = best capital after i-th purchase = max(buy[i], sell[i-1] - price)
 * - sell[i] = best capital after i-th sale     = max(sell[i], buy[i] + price)
 * - Answer is always sell[k-1] (after last allowed sale)
 *
 * Why O(k*n) → O(k*n) (not O(k*n²)):
 * Original DP would be: dp[k][day] = max over all split days
 * But we can process each day once and update states in O(k) per day
 * by recognizing the recurrence has no look-back dependency (just previous state).
 */

// Verify all results
function runAllTests() {
  console.log("\n=== All Tests ===");
  console.assert(maxProfit121([7, 1, 5, 3, 6, 4]) === 5, "#121 test 1 failed");
  console.assert(maxProfit121([7, 6, 4, 3, 1]) === 0, "#121 test 2 failed");
  console.assert(maxProfit122([7, 1, 5, 3, 6, 4]) === 7, "#122 test 1 failed");
  console.assert(maxProfit122([1, 2, 3, 4, 5]) === 4, "#122 test 2 failed");
  console.assert(
    maxProfit123([3, 3, 5, 0, 0, 3, 1, 4]) === 6,
    "#123 test 1 failed"
  );
  console.assert(maxProfit188(2, [3, 2, 6, 5, 0, 3]) === 7, "#188 test 1 failed");
  console.log("All tests passed!");
}

runAllTests();

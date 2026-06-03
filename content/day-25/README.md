# Day 25 – MySQL Fundamentals: JOINs, CTEs & Window Functions | DSA: Heap

> **Phase 3 – Node.js + MySQL + MongoDB** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | JOINs, subqueries vs JOINs, CTEs, window functions (ROW_NUMBER, RANK, LAG, LEAD) |
| Hands-On | 00:40–01:10 | Write 10 complex SQL queries covering all JOIN types and window functions |
| DSA | 01:10–01:25 | Kth Largest Element in an Array (#215) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Write correct INNER, LEFT, RIGHT, and FULL OUTER JOINs from memory
- [ ] Implement CTEs with `WITH` clause for readable complex queries
- [ ] Use ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD in realistic scenarios
- [ ] Solve: Kth Largest Element (#215) using a min-heap approach
- [ ] Review 5 SQL interview questions

---

## Concept: MySQL Fundamentals & Advanced Queries

### What to Study
- **JOIN types:** INNER JOIN (only matching rows from both tables), LEFT JOIN (all left rows + matching right, NULL for unmatched), RIGHT JOIN (all right rows + matching left), FULL OUTER JOIN (MySQL workaround: LEFT JOIN UNION RIGHT JOIN); self-joins for hierarchical data; CROSS JOIN for cartesian product
- **Subqueries vs JOINs:** Correlated subqueries (reference outer query) run once per row — O(n*m) — avoid for large tables; uncorrelated subqueries run once; JOINs generally outperform subqueries because the optimizer can rewrite them — use EXPLAIN to verify
- **CTEs (WITH clause):** `WITH cte_name AS (SELECT ...)` makes complex queries readable and reusable within the same query; recursive CTEs (`WITH RECURSIVE`) handle tree/graph traversal; CTEs are NOT materialized by default in MySQL 8 (optimizer can inline them)
- **Window functions:** `ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)` assigns unique row numbers; `RANK()` leaves gaps for ties; `DENSE_RANK()` no gaps; `LAG(col, 1)` accesses previous row's value; `LEAD(col, 1)` next row; `SUM(amount) OVER (PARTITION BY user_id ORDER BY date)` computes running totals

### Key Mental Models
- JOIN is a set operation — visualize Venn diagrams, but know that INNER JOIN is the intersection, LEFT JOIN includes the full left set
- Window functions let you perform aggregate-like calculations without collapsing rows — the `OVER()` clause defines the "window" of rows each calculation looks at
- CTEs are named subqueries at the top of the SQL statement — they improve readability but don't always improve performance

### Why This Matters in Interviews
SQL is tested in almost every backend interview. Window functions separate junior from senior — if you can write ROW_NUMBER with PARTITION BY to find the top-N per group without a subquery, you stand out. Interviewers give you a schema and ask you to write queries; knowing when to use a CTE vs a subquery vs a join demonstrates real-world SQL maturity.

---

## DSA Focus: Heap – Kth Largest Element

- **Problem:** Kth Largest Element in an Array (LeetCode #215)
- **Difficulty:** Medium
- **Pattern:** Min-Heap of size K
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Maintain a min-heap of size K — when heap size exceeds K, pop the minimum; after processing all elements, the heap top is the Kth largest. O(n log k) time, much better than sorting O(n log n) when k is small

---

## Today's 5 Interview Questions (Flash Review)
1. What is the difference between RANK() and DENSE_RANK() — give an example where they differ?
2. How would you find the top 3 highest-paid employees per department using window functions?
3. When would a correlated subquery cause performance problems, and how do you rewrite it?
4. What does a LEFT JOIN return for rows in the left table that have no match in the right table?
5. How do CTEs differ from temporary tables in terms of performance and scope?

---

## Files in This Folder
- `01-concept/` → Read: MySQL 8 window functions docs, CTEs reference, JOIN visualization resources
- `02-hands-on/` → Code: queries.sql (10 complex queries: multi-table JOINs, CTEs, window functions with real schema)
- `03-dsa/` → DSA: kth-largest.js (min-heap implementation, quickselect alternative)
- `04-interview-prep/` → Full Q&A: 5 SQL questions with query solutions and explanations

---

## Success Criteria
- [ ] Can write a TOP-N per group query using ROW_NUMBER without looking it up
- [ ] Solved Kth Largest in < 20 minutes using heap approach
- [ ] Confident answering all 5 SQL interview questions
- [ ] Bonus: Implement a running total and moving average using window functions in a single query

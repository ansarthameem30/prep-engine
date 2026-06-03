# Day 25 — MySQL Advanced Queries: Interview Q&A

---

**Q1. What is the difference between WHERE and HAVING?**

`WHERE` filters rows **before** grouping — it operates on individual rows and cannot reference aggregate functions. `HAVING` filters **after** grouping — it operates on groups and can reference aggregate values. Classic mistake: `SELECT dept, COUNT(*) FROM emp WHERE COUNT(*) > 5 GROUP BY dept` — this throws an error because WHERE runs before GROUP BY and COUNT doesn't exist yet. Correct: use HAVING. Performance implication: WHERE reduces the row set before grouping (using indexes), so it's more efficient than filtering aggregates with HAVING. Best practice: filter as much as possible in WHERE, then use HAVING only for conditions that require the aggregated value.

---

**Q2. Explain window functions and how PARTITION BY differs from GROUP BY.**

Window functions compute values across a set of rows "related to the current row" without collapsing them. `GROUP BY` collapses rows into one row per group — you lose the individual rows. `PARTITION BY` in a window function divides rows into groups for the window calculation, but keeps **every row** in the result set, adding the computed value as a new column. Example: `AVG(salary) OVER (PARTITION BY dept_id)` adds each employee's department average to their row without removing any rows. With GROUP BY, you'd get one row per department, losing individual employee data. Window functions are evaluated after WHERE, GROUP BY, and HAVING — they see the already-grouped/filtered rows.

---

**Q3. How do ROW_NUMBER, RANK, and DENSE_RANK differ when there are ties?**

Given three employees in a department all earning 95,000, and then one earning 80,000: `ROW_NUMBER()` assigns 1, 2, 3, 4 — arbitrary tie-breaking, always unique. `RANK()` assigns 1, 1, 1, 4 — tied rows get the same rank, and the next rank jumps by the number of ties (gap). `DENSE_RANK()` assigns 1, 1, 1, 2 — tied rows get the same rank, but there's no gap in subsequent ranks. Use `ROW_NUMBER` when you need a unique identifier and don't care about ties (e.g., deduplication). Use `RANK` when ties should be noted and gaps are acceptable. Use `DENSE_RANK` when you want a ranking without gaps — "top N salary levels" rather than "top N employees."

---

**Q4. What is a correlated subquery and what is the performance concern?**

A correlated subquery references a column from the outer query, causing it to execute once per row of the outer query. `SELECT * FROM emp e WHERE salary > (SELECT AVG(salary) FROM emp WHERE dept_id = e.dept_id)` — the subquery runs for every employee row. For 10,000 employees across 50 departments, that's 10,000 subquery executions instead of 50 (one per department). The fix: use a window function (`AVG(salary) OVER (PARTITION BY dept_id)`) or a JOIN to a pre-aggregated CTE/subquery. MySQL's optimizer can sometimes detect correlated subqueries and automatically convert them to joins (semi-join optimization), but you shouldn't rely on this for complex queries.

---

**Q5. Write SQL to find employees earning more than their manager.**

```sql
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary;
```

This is a self-join — the employees table is joined to itself with different aliases. The key insight is representing the hierarchical relationship as a regular equi-join. If an employee has no manager (`manager_id IS NULL`), they're excluded by the INNER JOIN — use LEFT JOIN if you want to include them with NULL manager fields. This is one of the most common SQL interview questions because it tests understanding of self-joins and hierarchical data modeling.

---

**Q6. How would you write a query to find the Nth highest salary?**

```sql
-- Method 1: DENSE_RANK (handles ties correctly)
SELECT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) ranked WHERE rnk = 2 LIMIT 1;

-- Method 2: OFFSET (simple but doesn't handle ties)
SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;

-- Method 3: Subquery (works in older MySQL without window functions)
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
```

The DENSE_RANK approach is most robust for interviews because it correctly handles ties (three employees at the same salary all get the same rank). The OFFSET approach is simpler but with duplicates, OFFSET 1 might skip two employees with the same salary. Always clarify with the interviewer: "does Nth highest mean Nth distinct value or Nth row?"

---

**Q7. Explain recursive CTEs and give a use case.**

A recursive CTE has two parts connected by `UNION ALL`: an **anchor** (non-recursive base case) and a **recursive member** that references the CTE by name. MySQL executes it iteratively: run the anchor, get a result set; feed that result set into the recursive member to get more rows; repeat until the recursive member returns no rows. Use cases: org chart traversal (find all reports under a manager), category trees (product category hierarchy), bill of materials (component sub-components), shortest path algorithms on graph-structured data stored in a table. Beware of infinite loops — MySQL has a default recursion depth of 1000 (`@@cte_max_recursion_depth`). Always include a termination condition in the WHERE clause or depth counter.

---

**Q8. What is the performance difference between EXISTS and IN with subqueries?**

`IN (SELECT col FROM table)` executes the subquery once and materializes the entire result set into memory, then checks membership. If the subquery returns 100,000 rows, those 100,000 values are held in memory during the outer query scan. `EXISTS` executes the subquery once per outer row but short-circuits as soon as a match is found — it doesn't need to materialize the full result. For large subqueries, `EXISTS` is generally faster because of early termination. Critical NULLs gotcha: `col IN (1, 2, NULL)` never returns true for non-matching rows (NULL comparison returns NULL, not false). `NOT IN` with a subquery that can return NULLs always returns false — use `NOT EXISTS` instead. MySQL's optimizer often converts `IN` subqueries to semi-joins internally, but `NOT IN` with NULLs is a silent correctness trap that stays.

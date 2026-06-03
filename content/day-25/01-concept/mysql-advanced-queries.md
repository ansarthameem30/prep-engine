# MySQL: Advanced Queries + Window Functions

## JOIN Types

**INNER JOIN**: Returns only rows where the condition matches in BOTH tables. The intersection.
```sql
SELECT u.name, o.total FROM users u INNER JOIN orders o ON u.id = o.user_id;
-- Only users who have at least one order appear
```

**LEFT JOIN**: Returns ALL rows from the left table, matched rows from the right. Unmatched right rows are NULL.
```sql
SELECT u.name, COUNT(o.id) as order_count
FROM users u LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
-- ALL users appear, even those with 0 orders (order_count = 0)
```

**RIGHT JOIN**: Mirror of LEFT JOIN — all rows from right, NULLs for unmatched left. Rarely needed; just swap table order and use LEFT JOIN.

**FULL OUTER JOIN**: All rows from both tables; NULLs where no match. MySQL doesn't have FULL OUTER JOIN natively — use `LEFT JOIN UNION RIGHT JOIN`.

**CROSS JOIN**: Cartesian product — every row from left combined with every row from right. No ON clause. Returns N×M rows.
```sql
SELECT sizes.name, colors.name FROM sizes CROSS JOIN colors;
-- All size-color combinations for a clothing store
```

**SELF JOIN**: A table joined to itself, using table aliases. Used for hierarchical data.
```sql
SELECT e.name as employee, m.name as manager
FROM employees e LEFT JOIN employees m ON e.manager_id = m.id;
```

---

## Subqueries: Correlated vs Non-Correlated

**Non-correlated subquery**: Executed once, independent of the outer query.
```sql
SELECT name FROM employees
WHERE department_id IN (SELECT id FROM departments WHERE budget > 100000);
-- The subquery runs once, returns a set of IDs
```

**Correlated subquery**: References the outer query — executes once per row.
```sql
SELECT name, salary FROM employees e1
WHERE salary > (
  SELECT AVG(salary) FROM employees e2 WHERE e2.department_id = e1.department_id
);
-- The subquery runs for EACH employee row — expensive!
```

**EXISTS vs IN performance**: `EXISTS` short-circuits as soon as it finds a match; `IN` must return the entire result set. For large subquery results:
- `IN (SELECT id FROM large_table)` loads all IDs into memory
- `EXISTS (SELECT 1 FROM large_table WHERE ...)` stops at first match

For small subqueries, the difference is negligible. For large subqueries with NULLs, `IN` can return unexpected results (`IN` returns false when the set contains NULL).

---

## CTEs (Common Table Expressions)

CTEs improve readability by naming intermediate result sets. They're defined once and referenced by name.

```sql
WITH monthly_revenue AS (
  SELECT
    DATE_FORMAT(created_at, '%Y-%m') as month,
    SUM(total) as revenue
  FROM orders
  WHERE status = 'completed'
  GROUP BY month
),
ranked_months AS (
  SELECT *, RANK() OVER (ORDER BY revenue DESC) as rank_by_revenue
  FROM monthly_revenue
)
SELECT * FROM ranked_months WHERE rank_by_revenue <= 3;
```

**Recursive CTEs** — for hierarchical data (org charts, bill of materials, category trees):

```sql
WITH RECURSIVE org_chart AS (
  -- Anchor: start with the top-level employees (no manager)
  SELECT id, name, manager_id, 0 as level, CAST(name AS CHAR(500)) as path
  FROM employees WHERE manager_id IS NULL

  UNION ALL

  -- Recursive: find employees whose manager is in the previous result
  SELECT e.id, e.name, e.manager_id, oc.level + 1, CONCAT(oc.path, ' > ', e.name)
  FROM employees e
  INNER JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT level, REPEAT('  ', level) || name as hierarchy, path
FROM org_chart
ORDER BY path;
```

---

## Window Functions

Window functions perform calculations across a set of rows related to the current row **without collapsing them** into groups. They keep all rows in the result while adding computed values.

```sql
SELECT
  name,
  salary,
  department_id,
  AVG(salary) OVER (PARTITION BY department_id) as dept_avg,
  salary - AVG(salary) OVER (PARTITION BY department_id) as diff_from_avg,
  RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as dept_rank
FROM employees;
```

**PARTITION BY** vs **GROUP BY**: GROUP BY collapses rows into groups (like `SELECT dept, COUNT(*) GROUP BY dept` — you lose individual rows). PARTITION BY in a window function keeps all rows and computes the window value for each row's partition independently.

### Ranking Functions

```sql
-- Three rows with salary 90000: what rank do they get?
ROW_NUMBER()  -- 1, 2, 3         (unique, arbitrary tie-break)
RANK()        -- 1, 1, 1, 4      (ties get same rank, gap afterward)
DENSE_RANK()  -- 1, 1, 1, 2      (ties get same rank, NO gap)
NTILE(4)      -- distributes rows into 4 roughly equal buckets (1,2,3,4)
```

### LAG/LEAD — Compare with Adjacent Rows

```sql
SELECT
  month,
  revenue,
  LAG(revenue, 1) OVER (ORDER BY month) as prev_month_revenue,
  ROUND((revenue - LAG(revenue, 1) OVER (ORDER BY month)) /
        LAG(revenue, 1) OVER (ORDER BY month) * 100, 2) as mom_growth_pct
FROM monthly_sales;
```

### Aggregate Window Functions — Running Totals

```sql
SELECT
  order_date,
  amount,
  SUM(amount) OVER (ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_total,
  AVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_7day_avg
FROM orders;
```

**Frame specification**: `ROWS BETWEEN X AND Y` defines the window frame:
- `UNBOUNDED PRECEDING` — from the start of the partition
- `CURRENT ROW` — the current row
- `N PRECEDING/FOLLOWING` — N rows before/after current

---

## Classic SQL Interview Problems

### Second Highest Salary
```sql
-- Using OFFSET (clean, handles ties correctly with DISTINCT)
SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;

-- Using subquery
SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);

-- Nth highest (generalized)
SELECT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) as rnk FROM employees
) ranked WHERE rnk = 2 LIMIT 1;
```

### Employees Earning More Than Their Manager
```sql
SELECT e.name as employee, e.salary, m.name as manager, m.salary as manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary;
```

### Find Duplicate Records
```sql
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Get the full duplicate rows (keep first occurrence by id)
SELECT * FROM users
WHERE id NOT IN (
  SELECT MIN(id) FROM users GROUP BY email
);
```

### Top N Per Category (using ROW_NUMBER)
```sql
SELECT * FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) as rn
  FROM products
) ranked
WHERE rn <= 3; -- top 3 products per category
```

### Running Total of Sales
```sql
SELECT
  DATE(created_at) as sale_date,
  SUM(amount) as daily_total,
  SUM(SUM(amount)) OVER (ORDER BY DATE(created_at)) as cumulative_total
FROM sales
GROUP BY sale_date
ORDER BY sale_date;
-- Note: SUM(SUM(...)) — outer SUM is window function, inner SUM is GROUP BY aggregate
```

### Month-Over-Month Growth Rate
```sql
WITH monthly AS (
  SELECT
    DATE_FORMAT(created_at, '%Y-%m') as month,
    SUM(amount) as revenue
  FROM orders GROUP BY month
)
SELECT
  month,
  revenue,
  LAG(revenue) OVER (ORDER BY month) as prev_revenue,
  ROUND(
    (revenue - LAG(revenue) OVER (ORDER BY month)) /
    LAG(revenue) OVER (ORDER BY month) * 100,
  2) as growth_pct
FROM monthly;
```

-- Day 25 — MySQL Advanced Queries + Window Functions
-- Hands-on Exercises
-- Run these against a MySQL 8.0+ instance

-- Setup: Create tables first
CREATE TABLE IF NOT EXISTS departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    budget DECIMAL(12,2)
);

CREATE TABLE IF NOT EXISTS employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    salary DECIMAL(10,2) NOT NULL,
    department_id INT,
    manager_id INT,
    hire_date DATE,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (manager_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL,
    status VARCHAR(50) DEFAULT 'pending'
);

-- Sample data
INSERT INTO departments (name, budget) VALUES
('Engineering', 2000000), ('Marketing', 500000), ('Sales', 800000), ('HR', 300000);

INSERT INTO employees (name, salary, department_id, manager_id, hire_date) VALUES
('Alice CEO',    250000, 1, NULL,  '2018-01-01'),
('Bob VP Eng',   180000, 1, 1,     '2018-06-01'),
('Carol Eng',     95000, 1, 2,     '2019-03-15'),
('Dave Eng',      92000, 1, 2,     '2020-01-10'),
('Eve Sr Eng',   115000, 1, 2,     '2019-07-01'),
('Frank VP Mkt', 165000, 2, 1,     '2018-08-01'),
('Grace Mkt',     78000, 2, 6,     '2020-05-01'),
('Henry Sales',   88000, 3, 1,     '2019-11-01'),
('Iris Sales',    91000, 3, 8,     '2020-02-15'),
('Jack Sales',    75000, 3, 8,     '2021-01-01');

INSERT INTO orders (user_id, total, created_at, status) VALUES
(1, 150.00, '2024-01-05', 'completed'),
(2, 280.00, '2024-01-12', 'completed'),
(1, 95.00,  '2024-01-20', 'completed'),
(3, 420.00, '2024-01-25', 'completed'),
(2, 175.00, '2024-02-03', 'completed'),
(4, 310.00, '2024-02-08', 'completed'),
(1, 205.00, '2024-02-14', 'completed'),
(3, 88.00,  '2024-02-19', 'completed'),
(5, 455.00, '2024-03-01', 'completed'),
(2, 320.00, '2024-03-08', 'completed'),
(1, 145.00, '2024-03-15', 'completed'),
(4, 265.00, '2024-03-22', 'completed');


-- ─────────────────────────────────────────────
-- Exercise 1: Top 3 earners per department using window functions
-- ─────────────────────────────────────────────
/*
 * Goal: Find the top 3 highest-paid employees in each department.
 * Approach: ROW_NUMBER() with PARTITION BY department_id ORDER BY salary DESC
 * Then filter WHERE row_num <= 3 in a subquery.
 *
 * Why ROW_NUMBER over RANK?
 * If two people tie for 3rd place, RANK would include both (ranks 3 and 3, skipping 4).
 * ROW_NUMBER arbitrarily picks one — use DENSE_RANK if ties should both appear.
 */
SELECT
    d.name AS department,
    e.name AS employee,
    e.salary,
    e.row_num AS rank_in_dept
FROM (
    SELECT
        e.*,
        ROW_NUMBER() OVER (
            PARTITION BY e.department_id
            ORDER BY e.salary DESC
        ) AS row_num
    FROM employees e
) e
JOIN departments d ON e.department_id = d.id
WHERE e.row_num <= 3
ORDER BY d.name, e.row_num;

/*
Expected output (sample):
 department  | employee    | salary    | rank_in_dept
 Engineering | Alice CEO   | 250000.00 | 1
 Engineering | Bob VP Eng  | 180000.00 | 2
 Engineering | Eve Sr Eng  | 115000.00 | 3
 Marketing   | Frank VP Mkt| 165000.00 | 1
 Marketing   | Grace Mkt   |  78000.00 | 2
 ...
*/


-- ─────────────────────────────────────────────
-- Exercise 2: 7-day rolling average of revenue
-- ─────────────────────────────────────────────
/*
 * Goal: For each day with orders, compute the average daily revenue
 * over the 7-day window ending on that day (including the day itself).
 *
 * Window frame: ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
 * (7 rows total: current + 6 before it)
 *
 * Note: SUM(SUM(total)) pattern — inner SUM is the GROUP BY aggregate,
 * outer SUM is the window function applied to the grouped result.
 */
WITH daily_revenue AS (
    SELECT
        DATE(created_at) AS sale_date,
        SUM(total)       AS daily_total,
        COUNT(*)         AS order_count
    FROM orders
    WHERE status = 'completed'
    GROUP BY DATE(created_at)
)
SELECT
    sale_date,
    daily_total,
    order_count,
    ROUND(
        AVG(daily_total) OVER (
            ORDER BY sale_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ),
    2) AS rolling_7day_avg,
    SUM(daily_total) OVER (
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_revenue
FROM daily_revenue
ORDER BY sale_date;

/*
Expected: rolling_7day_avg increases as more data becomes available.
On days 1-6 of the dataset, the window is smaller than 7 (uses all available preceding rows).
cumulative_revenue grows monotonically.
*/


-- ─────────────────────────────────────────────
-- Exercise 3: Employees earning above their department average
-- ─────────────────────────────────────────────
/*
 * Goal: Find employees whose salary exceeds the average salary of their department.
 *
 * Approach 1: Window function in subquery (more readable)
 * Approach 2: Correlated subquery (executes once per row — potentially slower)
 */

-- Approach 1: Window function (preferred)
SELECT
    d.name AS department,
    e.name AS employee,
    e.salary,
    ROUND(dept_avg, 2) AS dept_average,
    ROUND(e.salary - dept_avg, 2) AS above_avg_by
FROM (
    SELECT
        e.*,
        AVG(e.salary) OVER (PARTITION BY e.department_id) AS dept_avg
    FROM employees e
) e
JOIN departments d ON e.department_id = d.id
WHERE e.salary > e.dept_avg
ORDER BY d.name, e.salary DESC;

-- Approach 2: Correlated subquery (equivalent, executes sub-SELECT for each row)
SELECT
    d.name AS department,
    e.name,
    e.salary,
    (SELECT ROUND(AVG(salary), 2) FROM employees WHERE department_id = e.department_id) AS dept_avg
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.salary > (
    SELECT AVG(salary) FROM employees e2 WHERE e2.department_id = e.department_id
)
ORDER BY department, e.salary DESC;


-- ─────────────────────────────────────────────
-- Exercise 4: Recursive CTE — org chart hierarchy
-- ─────────────────────────────────────────────
/*
 * Goal: Display the full organizational hierarchy starting from the CEO.
 * Each row shows the level in the hierarchy and the path from CEO.
 *
 * Recursive CTE structure:
 * 1. Anchor member: SELECT the root node(s) — employees with no manager
 * 2. Recursive member: JOIN the CTE to find children of each node
 * 3. UNION ALL connects anchor and recursive members
 *
 * MySQL requires RECURSIVE keyword in WITH clause.
 */
WITH RECURSIVE org_hierarchy AS (
    -- Anchor: top-level (no manager)
    SELECT
        id,
        name,
        manager_id,
        salary,
        0 AS depth,
        CAST(name AS CHAR(500)) AS hierarchy_path,
        CAST(id AS CHAR(200)) AS id_path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive: find each person's reports
    SELECT
        e.id,
        e.name,
        e.manager_id,
        e.salary,
        oh.depth + 1,
        CONCAT(oh.hierarchy_path, ' → ', e.name),
        CONCAT(oh.id_path, ',', e.id)
    FROM employees e
    INNER JOIN org_hierarchy oh ON e.manager_id = oh.id
)
SELECT
    CONCAT(REPEAT('  ', depth), '└─ ', name) AS org_chart,
    salary,
    depth AS level,
    hierarchy_path
FROM org_hierarchy
ORDER BY id_path;

/*
Expected output:
 └─ Alice CEO          | 250000 | 0
   └─ Bob VP Eng       | 180000 | 1
     └─ Carol Eng      |  95000 | 2
     └─ Dave Eng       |  92000 | 2
     └─ Eve Sr Eng     | 115000 | 2
   └─ Frank VP Mkt     | 165000 | 1
     └─ Grace Mkt      |  78000 | 2
   └─ Henry Sales      |  88000 | 1
     └─ Iris Sales     |  91000 | 2
     └─ Jack Sales     |  75000 | 2
*/


-- ─────────────────────────────────────────────
-- Exercise 5: Customers who ordered in January but NOT in February
-- ─────────────────────────────────────────────
/*
 * Classic "set difference" query: users present in set A but absent in set B.
 *
 * Multiple approaches:
 * 1. NOT IN subquery
 * 2. LEFT JOIN + WHERE NULL
 * 3. EXCEPT (not available in MySQL — use approach 1 or 2)
 *
 * Approach 2 (LEFT JOIN) is typically faster than NOT IN with large datasets
 * because NOT IN with a subquery containing NULLs returns no rows (NULL comparison issue).
 */

-- Approach 1: NOT EXISTS (safe with NULLs, often optimized to semi-join)
SELECT DISTINCT
    user_id,
    'Has January order, NO February order' AS note
FROM orders
WHERE MONTH(created_at) = 1
  AND YEAR(created_at) = 2024
  AND NOT EXISTS (
      SELECT 1 FROM orders o2
      WHERE o2.user_id = orders.user_id
        AND MONTH(o2.created_at) = 2
        AND YEAR(o2.created_at) = 2024
  )
ORDER BY user_id;

-- Approach 2: LEFT JOIN (often more readable, same performance)
SELECT DISTINCT
    jan.user_id
FROM orders jan
LEFT JOIN orders feb
    ON jan.user_id = feb.user_id
    AND MONTH(feb.created_at) = 2
    AND YEAR(feb.created_at) = 2024
WHERE MONTH(jan.created_at) = 1
  AND YEAR(jan.created_at) = 2024
  AND feb.id IS NULL  -- no matching February order
ORDER BY jan.user_id;

/*
Expected: users 3 (ordered Jan: 420, no Feb orders),
user 1 (ordered Jan 5 and Jan 20, but also ordered Feb 14 — so NOT included)
Actually user 1 is in both months — should be excluded.
Result should only include user 3 based on sample data.
*/

-- Bonus: Month-over-month growth using LAG
WITH monthly_totals AS (
    SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(total) AS revenue,
        COUNT(*) AS order_count
    FROM orders
    WHERE status = 'completed'
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
)
SELECT
    month,
    revenue,
    order_count,
    LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
    ROUND(
        (revenue - LAG(revenue) OVER (ORDER BY month)) /
        NULLIF(LAG(revenue) OVER (ORDER BY month), 0) * 100,
    2) AS growth_pct
FROM monthly_totals
ORDER BY month;
-- NULLIF prevents division by zero if prev_revenue is 0

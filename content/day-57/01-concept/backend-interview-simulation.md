# Day 57 — Node.js + Database Mock Interview Guide

## Top 10 Node.js + Database Gotchas

### 1. Blocking the event loop
The single biggest Node.js mistake. Any synchronous CPU-heavy operation (large JSON.parse, crypto without async API, massive array operations) blocks all other requests. Symptoms: event loop lag > 50ms, all requests slow down simultaneously. Fix: use worker_threads for CPU work, async versions of all I/O APIs.

### 2. Unhandled promise rejections in production
`async` functions that throw without `.catch()` or `try/catch` cause `UnhandledPromiseRejectionWarning`. In Node 15+, this crashes the process. Always wrap async route handlers with an error-catching wrapper or use an Express error handler. Never use `Promise.reject()` without a handler.

### 3. Database connection per request
Opening a new DB connection for every HTTP request adds 10-100ms latency and quickly exhausts the DB's max_connections. Always use a connection pool (pg-pool, Sequelize pool, Mongoose internal pool). Typical pool size: 5-20 connections per Node.js instance.

### 4. N+1 queries (see Day 52)
Fetching related data in a loop. Fix with JOINs, DataLoader for GraphQL, or batch queries.

### 5. Not using EXPLAIN ANALYZE
Assuming a query is fast without checking. `EXPLAIN ANALYZE SELECT...` shows if a sequential scan is happening (bad), which indexes are used, and estimated vs actual row counts. Most production slow queries are missing an index on a WHERE or JOIN column.

### 6. Storing too much in sessions
Express sessions stored in memory (MemoryStore) don't work in multi-instance deployments. Sessions should use a shared store (Redis). Don't store large objects in sessions — just a user ID. On each request, load the user from a cache (Redis) or DB.

### 7. Not handling SIGTERM in containerized deployments
Kubernetes sends SIGTERM before stopping a container. If your app doesn't listen for it, active requests are dropped. Fix: `process.on('SIGTERM', gracefulShutdown)` — stop accepting new connections, finish in-flight requests, close DB connections.

### 8. Mongoose lean() queries
Mongoose returns full Model instances by default — they include schema validation, getters, virtuals, and other overhead. For read-only queries where you just need plain objects: `.lean()` returns plain JS objects, 2-5x faster and uses less memory.

### 9. MongoDB without transactions for multi-document writes
MongoDB supported single-document atomicity always, but multi-document transactions only since 4.0. Without transactions, a two-step write (update Order, update Inventory) can leave data inconsistent if the second write fails. Use `session.withTransaction()` for multi-document atomic operations.

### 10. Forgetting indexes on foreign keys
`users.find({ organizationId: orgId })` — if `organizationId` doesn't have an index, MongoDB/SQL does a full collection scan. Foreign key columns and frequently-filtered fields must be indexed. Check `db.collection.getIndexes()` in MongoDB, `SHOW INDEXES FROM table` in MySQL.

---

## SQL Query Challenges (5 classic interview queries)

### Query 1: Top N per Category
Find the top 3 highest-paid employees in each department.
```sql
-- Window function approach (preferred)
SELECT * FROM (
  SELECT 
    employee_id, name, department, salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
  FROM employees
) ranked
WHERE dept_rank <= 3;

-- Alternative: correlated subquery (less efficient)
SELECT e.* FROM employees e
WHERE (
  SELECT COUNT(*) FROM employees e2
  WHERE e2.department = e.department AND e2.salary > e.salary
) < 3;
```

### Query 2: Running Total (Cumulative Sum)
```sql
SELECT 
  order_date,
  amount,
  SUM(amount) OVER (ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM orders
ORDER BY order_date;
```

### Query 3: Month-over-Month Growth
```sql
SELECT 
  DATE_TRUNC('month', order_date) AS month,
  SUM(amount) AS revenue,
  LAG(SUM(amount)) OVER (ORDER BY DATE_TRUNC('month', order_date)) AS prev_month_revenue,
  ROUND(
    (SUM(amount) - LAG(SUM(amount)) OVER (ORDER BY DATE_TRUNC('month', order_date))) 
    / LAG(SUM(amount)) OVER (ORDER BY DATE_TRUNC('month', order_date)) * 100, 2
  ) AS growth_pct
FROM orders
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;
```

### Query 4: Users Who Have Not Made a Purchase
```sql
-- LEFT JOIN + NULL check
SELECT u.id, u.email
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;

-- NOT EXISTS (often more efficient)
SELECT id, email FROM users u
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

### Query 5: Second Highest Salary
```sql
-- OFFSET approach
SELECT DISTINCT salary FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;

-- Window function (handles ties correctly)
SELECT DISTINCT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees
) t WHERE rnk = 2;
```

---

## MongoDB Aggregation Challenges

### Aggregation 1: Group + Sort + Limit (Top 5 products by revenue)
```js
db.orders.aggregate([
  { $unwind: '$items' },
  { $group: { _id: '$items.productId', totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } } } },
  { $sort: { totalRevenue: -1 } },
  { $limit: 5 },
  { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
  { $unwind: '$product' },
  { $project: { productName: '$product.name', totalRevenue: 1 } }
]);
```

### Aggregation 2: Bucket users by age group
```js
db.users.aggregate([
  { $bucket: {
    groupBy: '$age',
    boundaries: [0, 18, 25, 35, 50, 100],
    default: 'Other',
    output: { count: { $sum: 1 }, avgRevenue: { $avg: '$lifetimeRevenue' } }
  }}
]);
```

### Aggregation 3: Time-series daily active users (last 30 days)
```js
db.sessions.aggregate([
  { $match: { createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } } },
  { $group: {
    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    dau: { $addToSet: '$userId' }
  }},
  { $project: { date: '$_id', dau: { $size: '$dau' } } },
  { $sort: { date: 1 } }
]);
```

---

## API Design Critique Exercise

**Given this API, what's wrong with it?**
```
POST /api/getUsers
POST /api/deleteUser?id=123&token=abc123
GET  /api/create-order?userId=456&items=[{"id":1,"qty":2}]
```

**Issues**:
1. `POST /api/getUsers` — should be `GET /api/users` (read operation = GET, plural resource noun)
2. `?token=abc123` in query param — tokens in URLs appear in server logs, browser history, referrer headers. Auth tokens go in `Authorization` header.
3. Sensitive data in URL — user IDs, tokens should never be in query strings for non-GET requests
4. `GET /api/create-order` — creating is `POST /api/orders`. GET must be idempotent and safe (no side effects).
5. Data in query string for POST — JSON body should be in request body, not URL
6. Verb in URL (`create-order`, `getUsers`, `deleteUser`) — REST uses HTTP verbs; nouns in URLs
7. No versioning — `GET /api/v1/orders`
8. No consistency — some plural, some singular

**Fixed:**
```
GET    /api/v1/users              — list users
GET    /api/v1/users/:id          — get one user
DELETE /api/v1/users/:id          — delete user (id in path, auth in header)
POST   /api/v1/orders             — create order (body has items, auth in header)
```

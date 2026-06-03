# Day 26 — MySQL Indexing + Transactions: Interview Q&A

---

**Q1. Explain the difference between a clustered and secondary index in InnoDB.**

In InnoDB, the **clustered index** IS the table — data rows are physically stored in primary key order within the B+ tree leaf nodes. There's exactly one clustered index per table (the PRIMARY KEY, or a hidden row ID if no PK is defined). **Secondary indexes** are separate B+ tree structures. Their leaf nodes store the indexed column value(s) plus the primary key value — NOT the row data. To retrieve a row via a secondary index, MySQL traverses the secondary B+ tree to find the primary key, then traverses the clustered index to get the actual row data — this "double lookup" has real cost. This is why the PRIMARY KEY choice matters: a UUID PK causes random clustered index insertions (page splits, fragmentation), while an auto-increment INT PK always appends to the end.

---

**Q2. What is the leftmost prefix rule for composite indexes?**

A composite index `INDEX(a, b, c)` is physically sorted first by `a`, then by `b` within each `a` group, then by `c`. A query can use this index starting from the leftmost column: `WHERE a=1` uses the index (seeking to `a=1`). `WHERE a=1 AND b=2` uses both columns. `WHERE b=2` cannot use the index because `b` values are not contiguous across different `a` values — you'd need a full scan. A range condition on column N stops further columns from being used for filtering: `WHERE a LIKE 'x%' AND b=2` uses only the `a` portion for the index seek. Design composite indexes with **high-selectivity equality conditions first**, then range conditions. For multi-column ORDER BY, order the index to match the sort direction.

---

**Q3. What does EXPLAIN type=ALL vs type=range vs type=ref mean?**

`type=ALL` is a full table scan — every row is examined. This is catastrophic on large tables (1M+ rows). `type=range` is an index range scan — MySQL uses an index to find the start of the range, then scans forward. This is efficient for `BETWEEN`, `>`, `<`, and `IN` with multiple values. `type=ref` is a non-unique index lookup — MySQL finds all rows matching a constant value using an index. `type=eq_ref` is a unique index lookup (exactly one row guaranteed), typically seen in JOIN operations using primary/unique keys. `type=const` is the best — a direct primary key or unique key lookup that returns exactly one row. In query tuning, the goal is to eliminate `ALL` on large tables by adding appropriate indexes and pushing filters to use `range` or `ref` access.

---

**Q4. What are transaction isolation levels and which does MySQL use by default?**

SQL defines four isolation levels. **READ UNCOMMITTED**: can read uncommitted ("dirty") data from other transactions — practically never used. **READ COMMITTED**: reads only committed data, but re-reading the same row within a transaction may return different values if another transaction committed between the reads (non-repeatable read). **REPEATABLE READ**: MySQL InnoDB's default — within a transaction, the same query always returns the same rows (consistent snapshot). InnoDB uses MVCC (Multi-Version Concurrency Control) to serve consistent reads without blocking. **SERIALIZABLE**: all reads are locking reads — maximum isolation but severe concurrency impact. REPEATABLE READ prevents phantom reads in InnoDB (not guaranteed by the SQL standard for this level) via gap locks and next-key locks, making it stronger than the standard specifies.

---

**Q5. What causes a deadlock in MySQL and how does InnoDB handle it?**

A deadlock occurs when two or more transactions are each holding locks that the others need, creating a circular wait. Classic example: T1 holds lock on row A and wants lock on row B; T2 holds lock on B and wants lock on A. Neither can proceed. InnoDB uses a **waits-for graph** to detect deadlock cycles. When detected, InnoDB rolls back the transaction with the smallest "weight" (fewest rows modified). The rolled-back transaction gets error 1213. Your application code **must catch this error and retry**. Prevention strategies: always acquire locks in a consistent global order (e.g., always lock the lower account ID first in transfers), keep transactions short to minimize lock hold time, and use `SELECT FOR UPDATE` explicitly at the start rather than acquiring locks incrementally.

---

**Q6. What is a covering index and when would you use one?**

A covering index is an index that contains all columns required by a query — both for filtering (WHERE) and projection (SELECT). When MySQL uses a covering index, it never needs to visit the actual table rows; all data is read directly from the index pages. EXPLAIN shows `Using index` in the Extra column. Example: for a query `SELECT email, name FROM users WHERE department = 5 ORDER BY name`, an index `(department, name, email)` is covering. Benefits: index pages are smaller than data pages (more fit in the buffer pool), sequential reads (index is sorted), and elimination of the secondary index's double lookup overhead. Tradeoff: wider indexes take more storage and slow down writes (every INSERT/UPDATE must maintain the index). Use covering indexes for high-frequency read queries on large tables where the accessed columns are predictable.

---

**Q7. Explain optimistic vs pessimistic locking — when do you choose each?**

**Pessimistic locking** (`SELECT ... FOR UPDATE`) acquires an exclusive lock immediately on read. Other transactions must wait. Use when: conflicts are frequent, the cost of retry is high, or multiple related rows must be modified atomically (and you can't afford a conflict). Bank transfers are a classic use case — you don't want to compute a balance, find out it changed, and retry. **Optimistic locking** reads without locking but includes a `version` column (or `updated_at` timestamp). The UPDATE includes `WHERE id=? AND version=?`. If 0 rows updated, another transaction changed the row — retry. Use when: conflicts are rare, read-to-write ratio is high, and retry cost is acceptable. An e-commerce inventory system might optimistically decrement stock; a failed decrement means another user bought the last item — just retry or show "sold out." Optimistic locking scales much better under read-heavy load.

---

**Q8. How do you use the slow query log and what is pt-query-digest?**

Enable the slow query log with `SET GLOBAL slow_query_log = 1` and `SET GLOBAL long_query_time = 0.5` (log queries taking >500ms). Set `log_queries_not_using_indexes = 1` to also log full scans regardless of time. The slow query log accumulates individual query instances with their execution time, rows examined, and the actual SQL. `pt-query-digest` (from Percona Toolkit) analyzes the slow query log and aggregates similar queries: it fingerprints queries (normalizes values), groups by fingerprint, and shows count, total time, avg time, rows examined, and the worst offending examples. This turns thousands of log lines into a prioritized list of the queries with the highest cumulative impact. In production, focus on queries with high `sum_time` (total time across all executions) — a query taking 10ms but running 10,000 times per minute is more important to fix than a 5-second query running once a day.

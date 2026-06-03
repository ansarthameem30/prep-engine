# MySQL Performance: Indexing + Transactions

## B-Tree Index Internals

InnoDB's default index structure is a B+ tree (a variant of B-tree). Understanding it explains why some queries are fast and others aren't.

**Structure**: The tree has multiple levels. Internal nodes hold key values and pointers to child nodes. **Leaf nodes** hold the actual data (for clustered indexes) or key + primary key pointer (for secondary indexes). All leaf nodes are linked in a doubly-linked list, enabling efficient range scans.

**Why range queries work**: To find all rows where `salary BETWEEN 50000 AND 90000`, MySQL traverses the tree to find the leaf node containing 50000 (O(log n)), then linearly scans leaf nodes until 90000. The linked leaf structure makes sequential reads cheap.

**Why full-text search needs a different index**: B-trees are ordered. `LIKE '%pattern%'` (leading wildcard) can't use a B-tree because there's no starting key to navigate to — every leaf must be examined.

---

## Hash Indexes

Hash indexes compute a hash of the indexed value and store `{hash → row pointer}`. Lookups are O(1) for exact matches. Limitations:
- **Exact match only** — no range queries (`salary BETWEEN 50000 AND 90000` can't use hash)
- **No sorting** — `ORDER BY indexed_col` can't use the hash index
- **No partial key** — composite hash indexes only work when ALL components are specified
- InnoDB supports "adaptive hash index" — automatically builds hash indexes on frequently accessed B-tree pages in memory. You don't control this; it's automatic.
- Memory engine tables can use explicit HASH indexes.

---

## Clustered Index (InnoDB PRIMARY KEY)

In InnoDB, the primary key IS the data — the table is physically sorted and stored in primary key order. This is the clustered index. There's exactly one clustered index per table.

**Why this matters**: 
- Range scans on the primary key are extremely fast (sequential disk reads)
- Inserting rows with non-sequential primary keys causes page splits (why `uuid` PKs are slower than `INT AUTO_INCREMENT`)
- The clustered index structure means "the table" and "the primary key" are the same physical structure

If you don't define a primary key, InnoDB creates a hidden 6-byte row ID as the clustered index.

---

## Secondary Indexes: The Double Lookup

Secondary indexes (every index that isn't the PRIMARY KEY) store: `{indexed_value → primary_key_value}` at the leaf nodes.

To find a row via a secondary index:
1. Traverse the secondary index B-tree to find the row's primary key (O(log n))
2. Traverse the primary key (clustered) index to find the actual row data (another O(log n))

This "double lookup" is why secondary index reads are roughly 2x slower than primary key reads, and why **covering indexes** are valuable.

---

## Composite Index: The Leftmost Prefix Rule

An index on `(a, b, c)` is a sorted structure ordered first by `a`, then by `b` within each `a` group, then by `c`.

**Which queries can use `INDEX(a, b, c)`?**
```sql
WHERE a = 1                      -- YES: leftmost prefix (a)
WHERE a = 1 AND b = 2            -- YES: leftmost prefix (a, b)
WHERE a = 1 AND b = 2 AND c = 3  -- YES: full index (a, b, c)
WHERE a = 1 AND c = 3            -- PARTIAL: only a column is used (c is skipped over b)
WHERE b = 2                      -- NO: a is not specified, can't start in middle
WHERE b = 2 AND c = 3            -- NO: same reason
WHERE a > 1 AND b = 2            -- PARTIAL: range on a stops b from being used for filtering
```

**Designing composite indexes**: columns with high equality selectivity first (most filtering power), columns used in range conditions later, columns used only in ORDER BY last.

---

## Covering Index

A covering index contains all columns the query needs — no need to visit the actual table row (no double lookup for secondary indexes).

```sql
-- Table: users(id, email, name, created_at, large_bio_field)
-- Index: INDEX(email, name)
-- This query is covered:
SELECT email, name FROM users WHERE email = 'alice@example.com';
-- EXPLAIN shows: Using index (no table row lookup needed)

-- This query is NOT covered:
SELECT email, name, created_at FROM users WHERE email = 'alice@example.com';
-- created_at is not in the index — must fetch the actual row
```

Covering indexes are especially powerful for large tables where the row is on a different disk page than the index entry.

---

## EXPLAIN Output Interpretation

```sql
EXPLAIN SELECT u.name, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id;
```

Key columns in EXPLAIN output:

| Column | What to look for |
|--------|-----------------|
| `type` | Access type — see below |
| `key` | Which index was chosen (NULL = full scan) |
| `key_len` | How many bytes of the index are used (longer = more columns used) |
| `rows` | Estimated rows examined (optimizer estimate) |
| `Extra` | `Using filesort` (bad), `Using index` (good), `Using temporary` (bad) |

**`type` access types (best to worst)**:
- `const` — primary key or unique index exact match (one row, O(1))
- `eq_ref` — join using all columns of a unique index
- `ref` — non-unique index scan for a constant value
- `range` — index range scan (`BETWEEN`, `>`, `IN` with values)
- `index` — full index scan (better than ALL, but still scans everything)
- `ALL` — full table scan (very bad for large tables)

`Using filesort` means MySQL needs a separate sort pass — the ORDER BY can't be satisfied by an index. `Using temporary` means a temporary table was created (often from GROUP BY or DISTINCT on non-indexed columns).

---

## ACID Properties

**Atomicity**: A transaction is all-or-nothing. If any statement in a transaction fails, the entire transaction is rolled back. Implemented via the undo log — InnoDB records the before-image of every row modified.

**Consistency**: The database moves from one valid state to another. All constraints (foreign keys, unique indexes, CHECK constraints) are enforced. The application is also responsible for ensuring logical consistency.

**Isolation**: Concurrent transactions don't interfere with each other. Implemented via locks and MVCC (Multi-Version Concurrency Control).

**Durability**: Committed transactions survive crashes. Implemented via the redo log (WAL — Write-Ahead Log) — changes are written to the redo log before being applied to data pages.

---

## Transaction Isolation Levels

**READ UNCOMMITTED**: Can read uncommitted data from other transactions (dirty reads). Almost never used.

**READ COMMITTED**: Can only read committed data. No dirty reads. But if you re-read the same row in the same transaction, you may get different values if another transaction committed between reads (**non-repeatable read**). Default in PostgreSQL and many databases.

**REPEATABLE READ**: The default in InnoDB/MySQL. Within a transaction, reading the same row twice always returns the same value (snapshot of data at transaction start). Phantom reads (new rows appearing in range queries) are prevented by InnoDB's gap locks. This is stronger than the SQL standard's REPEATABLE READ.

**SERIALIZABLE**: Strictest — all transactions appear to execute serially. All reads become locking reads. Prevents all anomalies but kills concurrency. Use only when absolutely required.

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
  -- ... operations
COMMIT;
```

---

## Deadlock Detection and Prevention

A deadlock occurs when transaction A holds a lock that B needs, and B holds a lock that A needs. InnoDB detects deadlock cycles automatically and rolls back the **smaller** transaction (fewer rows modified).

**Prevention strategies**:
1. **Consistent lock ordering**: Always acquire locks on tables/rows in the same order across all transactions. If T1 always locks users then orders, and T2 does the same, no deadlock.
2. **Keep transactions short**: The longer a transaction holds locks, the more chances for deadlock.
3. **Use `SELECT FOR UPDATE` explicitly** at the start rather than getting surprised by implicit lock escalation.
4. **Application-level retry**: Deadlocks are expected — always retry the rolled-back transaction.

---

## Optimistic vs Pessimistic Locking

**Pessimistic locking** (`SELECT ... FOR UPDATE`): Locks the row immediately when you read it. No other transaction can modify it until you commit. Prevents conflicts but reduces concurrency.

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;  -- lock acquired
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;  -- lock released
```

**Optimistic locking**: Don't lock on read. Include a `version` column. On update, check the version hasn't changed. If it has, retry.

```sql
-- Read: version = 5
SELECT balance, version FROM accounts WHERE id = 1;

-- Update: include version in WHERE clause
UPDATE accounts
SET balance = balance - 100, version = version + 1
WHERE id = 1 AND version = 5;  -- fails if another tx incremented version

-- Check affected rows
-- If 0 rows updated → conflict → retry
```

Optimistic locking is better for **read-heavy, low-contention** workloads. Pessimistic locking is better for **write-heavy, high-contention** situations where conflicts are common.

---

## Connection Pooling

Database connections are expensive — each connection uses ~5MB of server RAM and involves TCP handshakes and authentication. Connection pools maintain a set of open connections for reuse.

**Pool sizing formula**: `connections = (core_count * 2) + effective_spindle_count`

For a 4-core server with SSDs (1 effective spindle): 4×2+1 = 9 connections per Node.js instance. Running 4 Node.js processes: 36 total connections.

Too many connections: MySQL's default max_connections is 151. Exceed it and you get "Too many connections" errors. Too few: requests queue waiting for a free connection.

In Node.js with `mysql2`: use `createPool({ connectionLimit: 10 })` and always call `connection.release()` (or use the promise API which handles this automatically).

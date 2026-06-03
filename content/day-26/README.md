# Day 26 – MySQL Performance: Indexes, EXPLAIN & Isolation Levels | DSA: Heap

> **Phase 3 – Node.js + MySQL + MongoDB** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | B-tree vs hash indexes, composite index rules, EXPLAIN output, ACID, isolation levels, deadlocks |
| Hands-On | 00:40–01:10 | Analyze slow queries with EXPLAIN, add indexes, measure improvement |
| DSA | 01:10–01:25 | Merge K Sorted Lists (#23) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Explain B-tree index structure and why column order in composite indexes matters
- [ ] Read EXPLAIN output: identify full table scans, index usage, and type column values
- [ ] Explain all 4 isolation levels and which anomalies each prevents
- [ ] Solve: Merge K Sorted Lists (#23) using a min-heap
- [ ] Review 5 MySQL performance questions

---

## Concept: MySQL Performance

### What to Study
- **B-tree vs Hash indexes:** B-tree (default InnoDB) supports range queries, ORDER BY, LIKE 'prefix%', and equality; Hash indexes support only exact equality lookups, O(1) but useless for ranges — InnoDB doesn't expose hash indexes directly (uses adaptive hash index internally)
- **Composite index leftmost prefix rule:** Index on `(a, b, c)` can satisfy queries on `(a)`, `(a, b)`, `(a, b, c)` — but NOT `(b)` or `(c)` alone; column order should match your most selective filter first, then range column last; covering index = index contains all columns needed for the query (no table lookup)
- **EXPLAIN columns:** `type` (system > const > eq_ref > ref > range > index > ALL — ALL is full scan, bad); `key` (which index used); `rows` (estimated rows scanned); `Extra` (Using index = covering, Using filesort = no index for ORDER BY, Using temporary = implicit temp table — both are red flags)
- **ACID + Isolation levels:** READ UNCOMMITTED (dirty reads), READ COMMITTED (no dirty reads, but non-repeatable reads), REPEATABLE READ (MySQL default — no dirty or non-repeatable reads, but phantom reads possible; InnoDB uses gap locks to prevent most), SERIALIZABLE (full locking — slowest)
- **Deadlock detection:** InnoDB detects cycles in lock wait graph and kills the transaction with fewer locks; prevent with consistent lock ordering, keep transactions short, use `SELECT ... FOR UPDATE` explicitly

### Key Mental Models
- An index is a sorted copy of your data — querying without an index is like searching a phone book by first name: you must read every entry
- The leftmost prefix rule: imagine a phone book sorted by (last_name, first_name, city) — you can search by last name, or last + first, but not by first name alone
- Isolation levels are a trade-off between consistency guarantees and concurrency — higher isolation = more locking = less throughput

### Why This Matters in Interviews
Database performance is a critical senior skill. Interviewers give you slow query scenarios and expect you to diagnose with EXPLAIN, prescribe indexes, and explain isolation level choices. ACID + isolation level questions appear in almost every senior backend/full-stack interview. Deadlock knowledge separates engineers who've run production databases from those who haven't.

---

## DSA Focus: Heap – Merge K Sorted Lists

- **Problem:** Merge K Sorted Lists (LeetCode #23)
- **Difficulty:** Hard
- **Pattern:** Min-Heap / Priority Queue
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Push the head of each list into a min-heap keyed by node value; repeatedly extract min and push that node's next — this avoids comparing all K heads on each step, giving O(N log K) where N is total nodes

---

## Today's 5 Interview Questions (Flash Review)
1. Why does the order of columns in a composite index matter? Give an example where reversing the order breaks index usage?
2. What does `type: ALL` in MySQL EXPLAIN mean and why is it a problem?
3. What is the difference between a dirty read, non-repeatable read, and phantom read?
4. Which isolation level does MySQL InnoDB use by default and what anomalies does it prevent?
5. You have a query `WHERE status = 'active' AND created_at > '2024-01-01'` — how do you decide which column to put first in the composite index?

---

## Files in This Folder
- `01-concept/` → Read: MySQL EXPLAIN reference, InnoDB locking docs, isolation levels guide
- `02-hands-on/` → Code: slow-query-analysis.sql (baseline queries, EXPLAIN analysis, index additions, before/after comparison)
- `03-dsa/` → DSA: merge-k-sorted-lists.js (min-heap approach with custom comparator)
- `04-interview-prep/` → Full Q&A: 5 MySQL performance questions with detailed technical answers

---

## Success Criteria
- [ ] Can read an EXPLAIN output and identify the performance problem without hints
- [ ] Solved Merge K Sorted Lists in < 20 minutes
- [ ] Confident answering all 5 performance interview questions
- [ ] Bonus: Write a query that causes a deadlock in two transactions, then fix it with consistent lock ordering

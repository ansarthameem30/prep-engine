# Day 28 – Database Design: Normalization, Schema Patterns & Migration Strategies | DSA: Greedy

> **Phase 3 – Node.js + MySQL + MongoDB** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | ER modeling, 1NF-3NF-BCNF, denormalization, soft deletes, audit logs, migrations |
| Hands-On | 00:40–01:10 | Design a schema for an e-commerce system: products, orders, inventory |
| DSA | 01:10–01:25 | Gas Station (#134) + Assign Cookies |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Apply 1NF, 2NF, 3NF normalization to a given messy schema
- [ ] Know when to denormalize and explain the trade-offs clearly
- [ ] Implement soft delete and audit log patterns correctly
- [ ] Solve: Gas Station (#134) using greedy one-pass approach
- [ ] Review 5 schema design interview questions

---

## Concept: Database Design

### What to Study
- **Normalization:** 1NF (atomic values — no repeating groups or arrays in a cell); 2NF (no partial dependency — non-key columns must depend on the entire primary key, not just part of it — relevant for composite PKs); 3NF (no transitive dependency — non-key columns must depend only on the PK, not on other non-key columns); BCNF (every determinant is a candidate key — stricter than 3NF)
- **Denormalization trade-offs:** Duplicate data to eliminate JOIN overhead — acceptable when reads heavily outweigh writes, data rarely changes (e.g., product name on order line items), or when latency requirements demand sub-millisecond reads; always document why a table is denormalized
- **Relational vs document model:** Relational for structured, frequently joined, transactional data (financial records, inventory); document model for flexible schemas, nested data read together (user profiles with embedded addresses), content management
- **Schema migration strategies:** Use migration tools (Knex, Flyway, Liquibase) with versioned up/down scripts; never ALTER TABLE on large tables without `pt-online-schema-change` or `gh-ost` (ghost); additive-first migrations (add column nullable → backfill → add constraint → remove old column)
- **Soft deletes:** `deleted_at TIMESTAMP NULL DEFAULT NULL` — filter with `WHERE deleted_at IS NULL`; add partial index if supported; trade-off: queries always need the filter, storage grows, cascades become complex; consider event log / archive table for truly deleted data
- **Audit logs:** Separate `audit_logs` table with `(table_name, record_id, action, old_values JSON, new_values JSON, changed_by, changed_at)` — use database triggers or application-layer hooks (TypeORM subscribers, Mongoose middleware)

### Key Mental Models
- Normalization reduces anomalies (insert/update/delete) at the cost of JOIN complexity; denormalization reduces JOINs at the cost of data consistency risk — choose based on your read/write ratio and business requirements
- Schema migrations are like database version control — every change must be reversible, reproducible, and applied in order; treat your schema as code
- Soft delete is a business decision, not a technical one — ask "do we ever need to recover deleted records?" before adding it

### Why This Matters in Interviews
Schema design is a system design sub-skill tested in almost every full-stack senior interview. Interviewers give you a business domain and ask you to design tables. Normalization theory questions appear directly ("explain 3NF") and indirectly ("why is this schema problematic?"). Migration strategy knowledge signals production experience.

---

## DSA Focus: Greedy – Gas Station & Assign Cookies

- **Problem:** Gas Station (LeetCode #134)
- **Difficulty:** Medium
- **Pattern:** Greedy — single pass with total and current tank tracking
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** If total gas >= total cost, a solution exists; start tracking current tank — when it goes negative, the current start can't be the answer, so reset start to i+1 and reset current tank to 0

---

## Today's 5 Interview Questions (Flash Review)
1. What is the difference between 2NF and 3NF — give a concrete example of a 3NF violation?
2. When would you intentionally denormalize a database schema, and what risks does it introduce?
3. How do you safely add a NOT NULL column to a table with millions of rows without downtime?
4. What are the downsides of implementing soft delete, and how do you mitigate the query performance impact?
5. How would you design an audit log system for a financial application that must track all changes to a balance field?

---

## Files in This Folder
- `01-concept/` → Read: Database normalization guide, migration best practices, soft delete patterns
- `02-hands-on/` → Code: ecommerce-schema.sql (full e-commerce schema with products, orders, inventory, soft delete, audit trigger)
- `03-dsa/` → DSA: gas-station.js (greedy one-pass), assign-cookies.js (sort + two pointer greedy)
- `04-interview-prep/` → Full Q&A: 5 schema design questions with complete answers and example schemas

---

## Success Criteria
- [ ] Can normalize a given denormalized table to 3NF on a whiteboard
- [ ] Solved Gas Station in < 20 minutes using the greedy approach
- [ ] Confident answering all 5 schema design interview questions
- [ ] Bonus: Design a schema for a multi-tenant SaaS application with proper tenant isolation

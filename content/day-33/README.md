# Day 33 – Database Scaling: Sharding, Replication & CQRS | DSA: Trie

> **Phase 4 – System Design + AWS + CI/CD + GitHub** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Sharding strategies, consistent hashing, read replicas, CQRS, event sourcing, multi-master |
| Hands-On | 00:40–01:10 | Design shard key strategy for a social media app + CQRS architecture diagram |
| DSA | 01:10–01:25 | Design Search Autocomplete System (#642) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Compare range, hash, and directory-based sharding with their hotspot risks
- [ ] Explain consistent hashing and why it minimizes remapping when nodes change
- [ ] Design a CQRS-based system that separates read and write models
- [ ] Solve: Autocomplete system design using Trie
- [ ] Review 5 database scaling interview questions

---

## Concept: Database Scaling

### What to Study
- **Sharding strategies:** Range sharding (shard by value range — easy range queries, but hotspot risk if range isn't uniform, e.g., all new users on the latest shard); Hash sharding (shard by `hash(key) % N` — uniform distribution, kills range queries across shards); Directory-based sharding (lookup service maps key to shard — most flexible, lookup service is a single point of failure)
- **Consistent hashing:** Hash both nodes and keys onto a ring 0-2^32; key goes to the next clockwise node; adding a node only remaps keys between the new node and its predecessor (1/N of total keys, not all keys as with `hash % N`); virtual nodes (vnodes) distribute each physical node's load across multiple ring positions for better balance
- **Vertical partitioning:** Split a wide table into multiple narrower tables (e.g., keep user.id/name/email in one table, user.bio/avatar/settings in another) — reduces row size, improves cache efficiency for common queries
- **Read replicas and replication lag:** MySQL/PostgreSQL async replication — primary writes, replicas apply binary log with some delay (milliseconds to seconds); use for read scaling; replication lag causes stale reads — mitigate with read-your-writes routing, bounded staleness, or synchronous replication (higher latency)
- **CQRS pattern:** Command Query Responsibility Segregation — write model (commands: create/update/delete) uses a normalized write DB; read model (queries) uses a denormalized read DB or search index (Elasticsearch) optimized for query patterns; eventual consistency between models via events or CDC (Change Data Capture)
- **Event sourcing:** Store state as a sequence of events rather than current state — event log is append-only; current state = replay of all events; enables temporal queries (what was state at time T?), audit log, CQRS read model rebuilding; trade-off: query complexity, event migration challenges
- **Multi-master replication:** Multiple primaries accept writes — enables geographic distribution and higher write availability; conflict resolution strategies: last-write-wins (LWW), CRDTs (conflict-free replicated data types), application-level merge

### Key Mental Models
- Sharding is partitioning your data horizontally — choose the shard key carefully because it determines data distribution, query routing, and join capability (cross-shard joins are expensive)
- CQRS is about using the right data model for the job — normalized for writes (integrity), denormalized for reads (performance) — accepts eventual consistency in exchange for independent scaling
- Consistent hashing solves the "resharding problem" — adding servers in a traditional modular hash system remaps nearly every key; consistent hashing limits remapping to 1/N of keys

### Why This Matters in Interviews
Database scaling is a core system design topic. Senior candidates must know the difference between replication (for reads) and sharding (for writes/storage). CQRS appears in almost every event-driven architecture discussion. Consistent hashing is tested directly as a concept question and appears in cache, load balancer, and database shard designs.

---

## DSA Focus: Trie – Autocomplete Search System

- **Problem:** Design Search Autocomplete System (LeetCode #642)
- **Difficulty:** Hard
- **Pattern:** Trie + Priority Queue
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Build a Trie where each node stores the top 3 (or K) completions sorted by frequency; on input, traverse the Trie character by character — when you reach the current prefix node, return its stored top-K list; update the top-K list and propagate up on input completion

---

## Today's 5 Interview Questions (Flash Review)
1. What is the difference between horizontal sharding and vertical partitioning?
2. Why does consistent hashing require only 1/N key remapping when adding a node, compared to modular hashing?
3. What is replication lag and how does it affect your API design if users can't read their own writes?
4. Explain CQRS — what problem does it solve and what consistency trade-off does it introduce?
5. How would you choose a shard key for a multi-tenant SaaS application where tenants have very different user counts?

---

## Files in This Folder
- `01-concept/` → Read: DDIA Chapter 6 (Partitioning), CQRS pattern documentation, consistent hashing visual explainer
- `02-hands-on/` → Code: shard-key-analysis.md (shard key evaluation for e-commerce), cqrs-diagram.md (write vs read model architecture)
- `03-dsa/` → DSA: autocomplete-trie.js (Trie with top-K stored at each node, input stream processing)
- `04-interview-prep/` → Full Q&A: 5 DB scaling questions with system design diagrams and trade-off analysis

---

## Success Criteria
- [ ] Can explain consistent hashing with a ring diagram from memory
- [ ] Solved autocomplete system Trie problem in < 20 minutes
- [ ] Confident answering all 5 DB scaling interview questions
- [ ] Bonus: Implement a basic CDC (Change Data Capture) event publisher using MySQL binlog concepts

# Day 28 — Database Design: Interview Q&A

---

**Q1. Explain the difference between 2NF and 3NF with an example.**

**2NF** eliminates partial dependencies — in a table with a composite primary key, every non-key attribute must depend on the WHOLE key, not just part of it. Example: `ORDER_ITEMS(order_id, product_id, quantity, product_name)` violates 2NF because `product_name` depends only on `product_id`, not on the full `(order_id, product_id)` key. Fix: move `product_name` to a Products table. **3NF** eliminates transitive dependencies — non-key attributes must not depend on other non-key attributes. Example: `EMPLOYEES(id, dept_id, dept_name, dept_location)` violates 3NF because `dept_name` and `dept_location` depend on `dept_id` (a non-key attribute), not on `id`. Fix: create a Departments table. The mnemonic: "2NF = depends on the whole key, 3NF = depends on NOTHING BUT the key."

---

**Q2. How do you decide whether to embed or reference data in MongoDB?**

The primary driver is the **access pattern** — how you read the data. Embed when: the data is almost always accessed together (order + its items, user + their profile), it's a true part-of relationship (comments are part of the post), and the array is bounded (under ~100 elements). Reference when: the related data is queried independently (comments searched without their posts), it's shared between multiple parents (products referenced in many orders), or the array is potentially unbounded (a viral post could have millions of comments, hitting the 16MB limit). The secondary driver is write patterns: embedded data means one atomic write; referenced data means multiple writes that require transactions for consistency. A practical heuristic: if you always display the parent and child together, embed; if you ever need the child without the parent, reference.

---

**Q3. What is the bucket pattern in MongoDB and when is it used?**

The bucket pattern addresses time-series data where you'd otherwise have millions of tiny single-document records (one per sensor reading, one per log event). Instead, you bucket multiple readings into a single document — e.g., all sensor readings for one hour in one document with a `readings` array. Benefits: dramatically fewer documents (lower index overhead), pre-computed bucket statistics (min, max, avg stored on the bucket), better memory utilization, and faster range queries. The tradeoff: documents must be appended to (using `$push` with `$inc` for the count), and you need a strategy for bucket rollover (a new document when the bucket reaches its maximum size). MongoDB's native Time Series collection type (MongoDB 5+) implements this pattern automatically with better compression and query optimization.

---

**Q4. What is the expand-contract pattern for zero-downtime schema migrations?**

Renaming or removing a column in a live database crashes in-flight requests from the old code version. The expand-contract pattern makes breaking changes safely in 4 steps: (1) **Expand** — add the new column alongside the old (backward compatible, no code change needed). (2) **Migrate** — backfill data from old to new column in batches; deploy code that writes to BOTH columns. (3) **Switch** — deploy code that reads and writes ONLY the new column; verify in production. (4) **Contract** — drop the old column (now safe because no code references it). Each step is independently deployable and rollback-safe. The pattern takes longer but allows zero-downtime deployments. For MySQL, even step 4 (DROP COLUMN) can be done online with `ALGORITHM=INPLACE` on InnoDB tables.

---

**Q5. What are the tradeoffs between multi-tenancy strategies?**

**Row-level isolation** (shared schema with `tenant_id` column): cheapest operationally — one database, one schema, one set of migrations. Risk: a missing `WHERE tenant_id = ?` filter exposes all tenants' data (very real security risk). Requires application-level or ORM-level enforcement of tenant isolation. Best for small-to-medium SaaS with many tenants. **Separate schemas** (one schema per tenant in the same database): stronger isolation, impossible to accidentally expose wrong tenant data via SQL (different table namespace). Per-tenant customizations are easier. Migration complexity grows with tenant count. **Separate databases**: maximum isolation, GDPR data residency compliance, per-tenant backup/restore. Most expensive — N×connection pools, N×migrations, N×infrastructure. Best for large enterprise customers who contractually require isolation. Most mature SaaS products use all three tiers, routing customers based on their plan level.

---

**Q6. When would you intentionally denormalize a relational database?**

Denormalization is appropriate when: (1) **Read performance justifies it** — a report requiring 8 JOINs runs in 5 seconds; a pre-computed denormalized table runs in 50ms. The read/write ratio is so skewed (95:5) that the cost of maintaining the denormalized data is worth it. (2) **Historical accuracy requires it** — order history must store the product name and price at purchase time, not reference the live product (which may have changed). (3) **Aggregates are expensive** — adding an `order_count` column to the users table avoids a `COUNT(*)` JOIN on every user profile page. (4) **OLAP workloads** — data warehouses and reporting databases deliberately use star schemas (denormalized) because analytical queries read far more data than they write. The rule: normalize for write-heavy transactional data, denormalize for read-heavy analytical queries.

---

**Q7. What is soft delete and what are the operational challenges?**

Soft delete marks records as deleted (via `deleted_at` timestamp or `is_deleted` flag) instead of physically removing them. Benefits: data recovery, audit trail, referential integrity preservation. Challenges: (1) **Query performance** — every query must include `WHERE deleted_at IS NULL`; forget this filter and you show deleted data. Partial indexes help (index only active records). (2) **Unique constraints** — a soft-deleted email can't be reused without special handling; you need compound unique constraints like `UNIQUE(email, deleted_at)` or tombstone tracking. (3) **Foreign keys** — other records still reference soft-deleted entities; application must prevent creating new references to deleted items. (4) **Storage growth** — deleted records accumulate forever. Add a hard-delete job that permanently removes soft-deleted records after 90 days. The `deleted_at` timestamp is strictly better than `is_deleted` boolean because it records when deletion occurred.

---

**Q8. How do you handle the 16MB document limit in MongoDB when you expect large arrays?**

Multiple strategies: (1) **Reference instead of embed** — move the array into a separate collection with a foreign key reference. Best when array elements need independent querying. (2) **Bucket pattern** — group array elements into bucket documents (e.g., 200 elements per bucket document). Each bucket has a pre-computed summary (count, min, max). Good for append-only time-series data. (3) **Outlier pattern** — for the "celebrity problem": most documents have small arrays (100 followers), but a few have enormous ones (10M followers). Add a `has_extras` flag; normal documents embed data, outlier documents reference overflow documents. (4) **Pagination** — don't load the whole array into the document; query the referenced collection with pagination. Which strategy to choose depends on how the array is accessed (append-only vs random access), whether elements need independent existence, and how the data grows over time.

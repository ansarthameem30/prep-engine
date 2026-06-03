# Database Design + Schema Patterns

## Entity-Relationship Modeling

ER modeling identifies:
- **Entities**: real-world things with independent existence (User, Product, Order)
- **Attributes**: properties of an entity (User.email, Product.price)
- **Relationships**: associations between entities

**Cardinality**:
- **1:1** — One user has one profile (rare in practice; usually merge into one table)
- **1:N** — One user has many orders; one order belongs to one user
- **N:M** — One order has many products; one product appears in many orders (requires junction table)

---

## Normalization

Normalization reduces data redundancy and prevents update anomalies (updating one copy but not another, orphan records, etc.).

**First Normal Form (1NF)**: 
- Atomic values — no repeating groups, no multi-valued attributes
- Each cell contains a single value

Bad: `orders.products = "laptop, mouse, keyboard"` → cannot query individual products

**Second Normal Form (2NF)**:
- Must be in 1NF
- No partial dependencies — every non-key attribute depends on the WHOLE primary key

Bad: `ORDER_ITEM(order_id, product_id, quantity, product_name)` — `product_name` depends only on `product_id`, not the composite key `(order_id, product_id)`

Fix: Move `product_name` to a separate Products table.

**Third Normal Form (3NF)**:
- Must be in 2NF
- No transitive dependencies — non-key attributes cannot depend on other non-key attributes

Bad: `employees(id, dept_id, dept_name, dept_location)` — `dept_name` and `dept_location` depend on `dept_id`, not on `id`

Fix: Create a separate Departments table.

**Boyce-Codd Normal Form (BCNF)**:
- Every determinant is a candidate key
- Handles anomalies 3NF misses when there are multiple overlapping candidate keys

**When to stop normalizing**:
For read-heavy systems (reporting, analytics, ML feature stores), denormalization is often intentional. A 3NF database may require 8 JOINs for a common report — that report could be pre-computed as a denormalized view or materialized table. OLAP systems (data warehouses) deliberately denormalize into star/snowflake schemas.

---

## Denormalization Patterns

**Duplicate data for read performance**:
```sql
-- Normalized: need JOIN every time
SELECT o.*, u.name, u.email FROM orders o JOIN users u ON u.id = o.user_id;

-- Denormalized: store user_name directly in orders
ALTER TABLE orders ADD COLUMN user_name VARCHAR(100);
-- Risk: if user changes their name, all historical orders show wrong name
-- This is actually INTENTIONAL for order history — capture the name at time of purchase
```

**Pre-computed aggregates**:
```sql
-- Add an orders_count column to users, updated by a trigger or application logic
-- Avoids COUNT(*) query on every user profile load
ALTER TABLE users ADD COLUMN orders_count INT DEFAULT 0;
```

---

## Relational vs Document Model Decision

| Factor | Relational (MySQL) | Document (MongoDB) |
|--------|-------------------|--------------------|
| Schema flexibility | Fixed schema, migrations for changes | Flexible, documents vary |
| Query complexity | Complex JOINs, SQL | Aggregation pipeline |
| Data access pattern | Data accessed across multiple entities | Data accessed together (embedded) |
| ACID transactions | Yes, mature | Yes (multi-doc, MongoDB 4+) |
| Horizontal scaling | Harder (sharding is complex) | Designed for it |
| Joins | Efficient, indexed | $lookup, expensive at scale |
| Many-to-many relationships | Natural (junction tables) | Requires references, awkward |

**Decision heuristic**: 
- Multiple entities, complex queries, strong consistency → Relational
- Single primary entity with embedded data, flexible schema, document-oriented access → Document

---

## MongoDB Schema Design Patterns

**The fundamental rule**: model for your access patterns, not for normalization.

### Embed vs Reference

**Embed when**:
- Data is accessed together (user + their address)
- Child data has no independent existence (blog post + comments)
- One-to-few relationship (max ~100 embedded items)

**Reference when**:
- Data is shared between multiple parents (products shared between orders)
- Child data has independent existence and is queried separately
- One-to-many where "many" is large (thousands of items)
- Many-to-many relationships

```javascript
// Embedded (good for blog post with <100 comments)
{
  _id: 'post1',
  title: 'Intro to MongoDB',
  content: '...',
  comments: [
    { userId: 'u1', text: 'Great post!', createdAt: ISODate() },
    { userId: 'u2', text: 'Very helpful', createdAt: ISODate() }
  ]
}

// Referenced (good for thousands of comments)
// posts collection: { _id, title, content }
// comments collection: { _id, postId, userId, text, createdAt }
```

**The 16MB document limit**: A MongoDB document cannot exceed 16MB. If embedded arrays can grow unboundedly (a popular post with 100,000 comments), you'll hit this limit. Use references and the bucket pattern for large arrays.

### Bucket Pattern (time-series data)
```javascript
// Instead of one document per sensor reading (millions of tiny docs):
{
  sensorId: 'sensor_001',
  bucket: ISODate('2024-01-01T00:00:00Z'),  // bucket by hour
  readings: [
    { ts: ISODate('...'), temp: 22.5 },
    { ts: ISODate('...'), temp: 22.6 },
    // ... up to ~200 readings per bucket
  ],
  count: 200,
  minTemp: 22.1,
  maxTemp: 23.4   // pre-computed for fast range queries
}
```

### Attribute Pattern (variable attributes)
```javascript
// Products with different attributes per category
// Instead of: 200 nullable columns for all possible specs
{
  _id: 'prod1',
  name: 'ThinkPad X1',
  category: 'laptop',
  specs: [
    { k: 'ram_gb', v: 16 },
    { k: 'cpu', v: 'Intel i7' },
    { k: 'screen_inches', v: 14 }
  ]
}
// Create index on specs.k + specs.v for filtered queries
```

### Outlier Pattern (celebrity problem)
```javascript
// Normal user document: { _id, name, followers: [...100 ids] }
// Celebrity with 10M followers — array grows past 16MB
// Solution: flag + overflow collection
{
  _id: 'celebrity1',
  name: 'Taylor Swift',
  followerCount: 10000000,
  has_extras: true  // flag: look in overflow collection
}
// overflow_followers collection: { userId: 'celebrity1', followers: [...] } — multiple docs
```

---

## Soft Deletes

**`deleted_at` timestamp vs `is_deleted` boolean**:

`deleted_at DATETIME NULL` is strictly better:
- Tells you WHEN it was deleted (audit trail)
- Same semantic as "not deleted" (NULL means active) vs boolean check
- Works naturally with `WHERE deleted_at IS NULL` filter

Performance: add a **partial index** (MySQL: filtered index on WHERE deleted_at IS NULL) so the index only covers active records.

```sql
-- In MySQL, use a functional index or filter most queries
-- Most queries use: WHERE deleted_at IS NULL
-- This is a common pattern where index on deleted_at IS NULL is helpful
```

**Risks**: foreign key references to soft-deleted records remain valid — application must prevent creating references to deleted entities.

---

## Audit Logging

**Separate audit table**: Create `users_audit(id, user_id, action, before_data, after_data, changed_by, changed_at)`. Triggered by application code or DB triggers. Simple, queryable.

**Event sourcing**: Store all changes as immutable events (`UserCreated`, `UserEmailChanged`, `UserDeleted`). Current state is derived by replaying events. Benefits: full history, can replay to any point in time, natural audit trail. Complexity: requires event replay for reads (or CQRS with a materialized read model).

---

## Schema Migrations

**Backward-compatible (non-breaking)**:
- Add a nullable column: `ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL` — deploy DB change first, then code
- Add an index: `CREATE INDEX CONCURRENTLY idx_name ON users(email)` (PostgreSQL) or `ALTER TABLE ... ALGORITHM=INPLACE` (MySQL 8)
- Add a new table

**Breaking changes** (require careful coordination):
- Rename/remove a column: deploy new code that handles both old and new schema, then migrate, then remove old code
- Change column type: create new column, backfill, switch reads/writes, drop old column

**The expand-contract pattern** (for zero-downtime migrations):
1. Expand: add new column/table alongside old (both exist)
2. Migrate: backfill data, dual-write to both
3. Contract: remove old column/table after all reads use new

---

## Multi-tenancy Strategies

**Shared schema, row isolation** (`tenant_id` column):
- Cheapest, simplest to manage
- All tenants share tables; every query must include `WHERE tenant_id = ?`
- Risk: a missing `tenant_id` filter exposes all tenants' data (data breach)
- Hard to provide per-tenant customization

**Separate schemas, shared database**:
- Each tenant gets their own schema (database namespace)
- Table name collisions impossible, easier per-tenant migrations
- PostgreSQL supports this natively; MySQL uses separate databases

**Separate databases**:
- Maximum isolation, easiest compliance (GDPR data residency)
- Most expensive: N × connection pools, N × migration runs
- Best for enterprise SaaS with strong isolation requirements

**Decision**: Most SaaS products start with shared schema (row isolation) and migrate to separate schemas/databases for enterprise customers who require it contractually.

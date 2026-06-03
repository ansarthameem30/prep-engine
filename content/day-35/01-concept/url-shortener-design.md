# Day 35 — System Design Practice: URL Shortener

## Step 1: Requirements Clarification

Before drawing a single box, ask clarifying questions to constrain the design space.

**Functional requirements:**
- User submits a long URL → system returns a short URL (e.g., `short.ly/xk92pQm`)
- User visits short URL → system redirects to original URL
- Optional: custom alias (`short.ly/my-promo`)
- Optional: URL expiration date
- Optional: analytics (click count, geographic breakdown)

**Non-functional requirements:**
- Scale: 100 million URLs shortened per day
- Read:Write ratio: 10:1 (redirects are much more frequent than creations)
- Availability: 99.9% uptime = 8.7 hours downtime/year
- Redirect latency: < 10ms P99 (users notice redirects)
- URL lifetime: default 5 years, configurable

**Out of scope for this design:** user authentication, payment, advanced analytics (real-time geographic heatmaps).

---

## Step 2: Back-of-Envelope Estimation

**QPS calculation:**
- Write QPS: 100M URLs/day ÷ 86,400 sec = **1,160 writes/sec**
- Read QPS: 10:1 ratio → **11,600 reads/sec** (peak ~2x = 23,200 reads/sec)

**Storage calculation:**
- URL record: ~500 bytes (short_code 7B + long_url 200B + metadata 300B)
- Per day: 100M × 500B = 50GB/day
- 10 years: 50GB × 365 × 10 = **182.5TB total**
- Object storage (S3) for analytics clickstream: separate calculation

**Character space calculation:**
- Base62 (a-z, A-Z, 0-9) with 7 characters: 62^7 = **3.5 trillion unique short codes**
- At 100M/day, 3.5T / 100M = 35,000 days ≈ 96 years before exhaustion

**Memory (cache):**
- Cache 80% of reads (hot URLs): 20% of URLs receive 80% of traffic (Pareto)
- Cached entry: 500 bytes × 100M × 20% = 10GB — fits in Redis

---

## Step 3: API Design

```
POST /api/v1/urls
Request: { "longUrl": "https://...", "customAlias": "optional", "expiresAt": "2025-01-01" }
Response: { "shortUrl": "https://short.ly/xk92pQm", "shortCode": "xk92pQm" }

GET /{shortCode}
Response: HTTP 301/302 redirect to longUrl
         (or HTTP 404 if not found / expired)

DELETE /api/v1/urls/{shortCode}
Response: HTTP 204

GET /api/v1/urls/{shortCode}/stats
Response: { "clicks": 42031, "created": "...", "lastAccessed": "..." }
```

---

## Step 4: Database Schema

**Key insight:** The primary access pattern is: `shortCode → originalUrl`. This is a key-value lookup. A relational database works, but a key-value store (DynamoDB, Redis) is optimal for this pattern.

**URLs table (primary store — DynamoDB or PostgreSQL):**
```sql
CREATE TABLE urls (
  id           BIGINT PRIMARY KEY,        -- internal ID (for ordering)
  short_code   VARCHAR(10) UNIQUE NOT NULL, -- indexed
  original_url TEXT NOT NULL,
  user_id      BIGINT,                    -- NULL for anonymous
  created_at   TIMESTAMPTZ NOT NULL,
  expires_at   TIMESTAMPTZ,               -- NULL = no expiration
  click_count  BIGINT DEFAULT 0,          -- updated asynchronously
  is_active    BOOLEAN DEFAULT true
);
CREATE INDEX idx_short_code ON urls(short_code);
```

**Access patterns:**
- Redirect lookup: `SELECT original_url FROM urls WHERE short_code = ? AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())`
- This is a point lookup on an indexed column — O(log N) at most, typically O(1) with hash index

**Cache layer:** Redis hash or string — `short_code → original_url` with TTL matching remaining URL lifetime.

---

## Step 5: Short Code Generation — Four Approaches

### Approach 1: MD5 Hash of URL
```
shortCode = md5(originalUrl).substring(0, 7)
```
Issues: MD5 collisions for different URLs mapping to the same hash. Cannot shorten the same URL to different codes. Hash of URL means identical URLs always get the same short code (debatable if this is a feature or bug). **Don't use in production.**

### Approach 2: Auto-Increment ID → Base62 Encode
```
id = db.INSERT INTO urls ... RETURNING id
shortCode = toBase62(id)  // converts integer to base-62 string
```
Pros: Guaranteed unique (database sequences), no collision detection needed, deterministic, simple.
Cons: Sequential IDs are guessable — ID 1000 → "G8", ID 1001 → "G9". Competitor can enumerate all URLs. For public URL shorteners, this is a privacy concern.

### Approach 3: Distributed Counter (Snowflake-like) — RECOMMENDED
Centralized counter service (or ZooKeeper/Redis) assigns pre-allocated ID ranges to app servers:
- App Server 1 gets IDs 1,000,000 – 1,999,999
- App Server 2 gets IDs 2,000,000 – 2,999,999
Each server generates IDs locally from its range. Redis `INCR` provides atomic counter allocation.

```javascript
// Get next 1000 IDs atomically
const start = await redis.incrby("url_counter", 1000);
// Use start, start+1, ..., start+999 locally
const shortCode = toBase62(start);
```

Pros: No database call per URL creation, no coordination per request, scalable.
Cons: Requires counter service HA (Redis Sentinel or clustered), IDs still sequential.

### Approach 4: UUID
Too long (36 characters). Even truncated UUIDs have collision probability. Not suitable.

**Base62 encoding implementation:**
```
CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
toBase62(num): repeatedly mod 62, use remainder as index
fromBase62(str): positional value like base-10
```

---

## Step 6: Caching Strategy

**Cache-aside for redirect path (critical latency path):**
```
1. GET redis: "url:{shortCode}"
2. HIT → return URL immediately (< 1ms)
3. MISS → query database → cache result with TTL → return URL
```

**Cache eviction:** LRU policy. Cache size: ~10GB (20% of total URLs).

**Expected cache hit rate:** 80%+ (Pareto distribution — 20% of URLs receive 80% of traffic). This means only 20% of redirect requests hit the database.

**CDN caching for 301 redirects:**
If you use HTTP 301 (Permanent Redirect), browsers and intermediate caches store the mapping. Subsequent visits go directly to the original URL without hitting your servers at all. Great for throughput. Problem: you lose analytics (clicks go direct, not through your server).

If you use HTTP 302 (Temporary Redirect), every redirect hits your server. You get full analytics. Worse for throughput.

**Decision:** Use 301 for public links where analytics are not critical. Use 302 for tracked marketing links. Or: use 302 by default, offer "high performance" 301 as a feature for non-tracked links.

---

## Step 7: Full Architecture

```
Client Request
     ↓
CloudFront CDN
  └─ GET /{shortCode} → check edge cache (for 301 responses)
     ↓ (on miss)
AWS ALB (multi-AZ)
     ↓
App Servers (ASG: 2-10 instances)
  ├─ Check Redis Cache (ElastiCache, < 1ms)
  │    └─ HIT: HTTP 302 redirect
  │    └─ MISS: Query PostgreSQL → cache → redirect
  │
  └─ POST /api/v1/urls:
       ├─ Get next ID from Redis INCR counter
       ├─ Encode to Base62
       ├─ Check uniqueness if custom alias
       ├─ Write to PostgreSQL (primary)
       └─ Return shortUrl

PostgreSQL
  ├─ Primary: accepts all writes
  └─ Read Replica: offloads read-heavy analytics queries

Analytics Pipeline (async, separate concern):
  ├─ App publishes ClickEvent to Kafka
  ├─ Kafka consumer → ClickHouse (analytics DB)
  └─ Dashboard reads from ClickHouse (not from PostgreSQL)
```

---

## Step 8: Trade-offs and Scale Decisions

**Custom aliases:**
- Query DB before generating: `SELECT COUNT(*) WHERE short_code = ?`
- Race condition possible with concurrent creation of same alias: use `INSERT ... WHERE NOT EXISTS` or unique constraint + retry

**Rate limiting:**
- IP-based: `INCR rate:ip:{ip_hash}` in Redis with 1-minute window
- User-based: 10K URLs/day for free tier, 1M for paid

**URL expiration:**
- Don't delete expired entries (storage is cheap, analytics value is high)
- Mark `is_active = false` via batch job nightly
- Cache TTL = `min(expires_at - now, 24h)` so cache naturally invalidates with expiry

**Scaling the redirect path:**
- At 11,600 reads/sec: 5 app servers at 2,500 RPS each easily handles this
- With 80% cache hit rate: only 2,320 DB queries/sec — well within PostgreSQL limits
- At 10× scale: add read replicas, increase Redis cluster size

**Link preview metadata:**
When sharing a short URL on social media, Twitter/Slack "unfurls" the link to show a preview card. This requires the original URL's OpenGraph metadata. Options: fetch at creation time (store og:title, og:image in our DB), or proxy the metadata request through your service.

**Analytics deep dive:**
Click events are high-volume writes (11,600/sec). Writing each click to PostgreSQL would overwhelm the primary. Solution:
1. Buffer clicks in Redis counters (`INCR click:{shortCode}`, flush to DB every 5 minutes)
2. Publish click events to Kafka (decoupled, no DB overhead on hot path)
3. Kafka consumers aggregate and write to ClickHouse (OLAP database optimized for aggregations)
4. Real-time dashboard reads from ClickHouse

This keeps the redirect path at < 1ms latency while providing full analytics.

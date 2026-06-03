# Day 32 — Interview Prep: Caching Deep Dive

## Q1: Walk me through Redis data structures. When would you use a Sorted Set vs a List?

**Answer:**
Redis provides five core data structures, each optimized for specific access patterns:

**String:** Key-value with optional expiry. Use for simple caches, atomic counters (`INCR`), distributed locks (`SET NX EX`).

**Hash:** Map of field-value within one key. Use for object storage where you need field-level access (user profile). `HGET user:1001 email` is faster than deserializing full JSON from a String.

**List:** Ordered, allows duplicates, O(1) push/pop from both ends. Use for job queues (LPUSH + BRPOP blocking wait), activity feeds (LPUSH + LTRIM to maintain fixed length).

**Set:** Unordered, unique members, O(1) add/check/remove. Use for unique visitors, tags, social graph operations (`SINTER` for mutual follows, `SUNION` for merged feeds).

**Sorted Set:** Unique members each with a float score, ordered by score. Use for leaderboards (`ZADD`, `ZREVRANGE`), sliding window rate limiting (timestamp as score, `ZRANGEBYSCORE` + `ZREMRANGEBYSCORE`), scheduled task queues (scheduled_at as score).

**Sorted Set vs List:**
- List: insertion order, allows duplicates, O(1) push/pop at ends but O(N) for index access
- Sorted Set: score-ordered, unique members, O(log N) insertion, O(log N + K) range queries

Choose List for simple FIFO queues where insertion order suffices. Choose Sorted Set when you need range-by-score queries, ranked access, or score-based ordering (leaderboard, priority queue, sliding window).

---

## Q2: What is the cache stampede problem and what are three ways to prevent it?

**Answer:**
**Cache stampede (thundering herd):** When a hot cache key expires, many concurrent requests simultaneously miss the cache and all hit the database, potentially overwhelming it.

Example: Your homepage config is cached with a 1-hour TTL. At expiry time, 5,000 concurrent requests all miss the cache and hit the database simultaneously — a sudden spike from ~1 DB req/hr to 5,000 simultaneous queries.

**Three prevention strategies:**

1. **Mutex lock (distributed lock):**
   The first thread to detect a miss acquires a Redis lock (`SET lock:key uuid NX EX 5`). All subsequent threads see the lock and wait (with backoff). The lock holder fetches from DB, populates cache, releases lock. Others then read the fresh cache.
   
   Pro: Guarantees exactly one DB call per key per expiry.
   Con: Waiting threads experience elevated latency.

2. **Probabilistic early expiration (XFetch):**
   Before TTL expires, with increasing probability proportional to staleness, proactively refresh. The formula used is: refresh if `current_time - beta × compute_time × ln(random())` exceeds the expiry time. Different threads independently decide whether to refresh, spreading the load.
   
   Pro: No locking, no coordination overhead.
   Con: May result in slightly more DB calls than strictly needed.

3. **TTL jitter:**
   Instead of `TTL = 3600` for all keys, use `TTL = 3600 + randint(0, 600)`. Keys expire at different times, preventing synchronized stampede events.
   
   Pro: Trivially simple to implement.
   Con: Doesn't eliminate individual key stampede — just prevents fleet-wide synchronized expiry.

In production I combine approaches: jitter on TTL (prevents synchronized expiry) + mutex lock (prevents per-key stampede).

---

## Q3: Explain the difference between cache-aside, write-through, and write-behind patterns. When would you use each?

**Answer:**

**Cache-aside (lazy loading):**
- Read: check cache → miss → fetch DB → write cache → return
- Write: write DB → invalidate cache (or do nothing and let TTL expire stale value)
- Application manages cache explicitly
- Cache only contains actually-requested data (no waste)
- Cold start: all misses initially, warms up over time
- **Use when:** Mixed read/write workloads, acceptable stale data window, want fine-grained cache control

**Write-through:**
- Write to cache AND database synchronously before returning to client
- Cache always contains fresh data
- Higher write latency (two synchronous operations)
- Cache may be warm for data never read (written but not read = wasted memory)
- **Use when:** Read-heavy with strict consistency requirements (product catalog, config data)

**Write-behind (write-back):**
- Write to cache immediately, return to client
- Background worker flushes cache → DB asynchronously in batches
- Excellent write throughput, low write latency
- Risk: data loss if cache crashes before flush (use Redis persistence + AOF)
- **Use when:** High-frequency writes where batching is acceptable (view counters, analytics events, game state updates). Not suitable for financial transactions.

---

## Q4: How does Redis handle persistence? Compare RDB and AOF.

**Answer:**

**RDB (Redis Database Snapshot):**
- Periodic point-in-time snapshots (configured as `save 900 1` — save after 900s if ≥1 key changed)
- Fast recovery: loading a snapshot is faster than replaying a log
- Compact file: good for backups
- Data loss: up to the interval between snapshots (minutes)
- Slight performance impact during fork + serialize
- **Good for:** Cache layers where losing a few minutes of data is acceptable

**AOF (Append-Only File):**
- Logs every write command (`SET`, `HSET`, `ZADD`, etc.)
- Three fsync policies: `always` (disk sync per command, zero data loss, slow), `everysec` (sync every second, lose at most 1 second, good balance), `no` (OS decides, fast but risky)
- Larger files, slower recovery (replay all operations)
- AOF rewrite: Redis can compact the log by replacing sequences of operations with their final state
- **Good for:** Session stores, rate limiters, anything where data must not be lost

**Best practice:** Enable both. RDB for fast recovery after restart; AOF for durability. `appendonly yes` + `appendfsync everysec`.

---

## Q5: What are the Cache-Control headers and how does CDN caching interact with browser caching?

**Answer:**
`Cache-Control` is an HTTP header controlling caching behavior at both browser and CDN (shared cache) level:

- `max-age=3600` — browser caches the response for 3600 seconds
- `s-maxage=86400` — CDN/shared proxy caches for 86400 seconds; overrides `max-age` for shared caches only (browser still respects `max-age`)
- `no-store` — no caching at any level. Use for sensitive responses (banking, health records)
- `no-cache` — can be stored, but must revalidate with origin before every use. Browser sends `If-None-Match` → server returns 304 (no body) if unchanged → bandwidth saved, roundtrip still required
- `private` — only browser can cache; CDN must not cache (user-specific responses)
- `public` — both browser and CDN can cache
- `stale-while-revalidate=60` — serve stale content immediately, refresh in background (< 60s staleness). Great for pages that can tolerate slight staleness while providing instant response

**ETag + conditional requests:**
Server sends `ETag: "abc123"` (hash of content). Browser stores with response. On next request, sends `If-None-Match: "abc123"`. If content unchanged, server returns `304 Not Modified` (zero body bytes). Saves bandwidth, still requires network roundtrip.

**CDN-specific behavior:**
CloudFront respects `s-maxage` first, then `max-age`. Invalidations (`aws cloudfront create-invalidation`) clear CDN cache but cost money — use versioned filenames for static assets (`app.v2.js`) instead of invalidations for high-churn files.

---

## Q6: How would you design a distributed rate limiter at scale?

**Answer:**
Rate limiting patterns from simplest to most accurate:

**Fixed window counter:**
`INCR rate:user:1001:${minute}` + `EXPIRE 60`. Count per minute window.
Problem: A user can make 2× the limit by sending max requests at the end of one window and max at the start of the next.

**Sliding window log:**
Store each request timestamp in a Redis Sorted Set. Count entries in (now - windowMs, now]. Remove expired entries.
Most accurate but O(requests in window) memory per user.

**Sliding window counter (space-efficient):**
Keep counts for the current and previous window. Estimate current window count as:
`count = prev_count × (1 - elapsed_ratio) + current_count`
O(1) memory per user, approximation error < 0.1% in practice. Used by Redis Labs, Cloudflare.

**Token bucket (burst-friendly):**
Tokens refill at a constant rate. Requests consume tokens. Allows short bursts (up to bucket capacity) while enforcing long-term rate.

**Distributed considerations:**
- With a single Redis node: O(1) atomic operations, no race conditions
- With Redis Cluster: rate limit keys must map to same slot (use `{user_id}:ratelimit` as key with hash tags)
- For multi-region: use a central rate limit service, or accept slight over-counting with eventual consistency (most rate limiters in practice accept ~1% over-counting for scale)

---

## Q7: Redis Sentinel vs Redis Cluster — when would you choose each?

**Answer:**

**Redis Sentinel:**
- Architecture: 1 primary + N replicas + 3 Sentinel processes (odd number for majority quorum)
- Sentinels monitor primary health, elect new primary on failure (automatic failover)
- All data on a single primary node (replicas are read-only copies)
- Clients connect to any Sentinel to discover current primary
- Data limit: size of single node (~256GB practical limit)
- **Choose when:** Dataset fits on one machine, you want high availability with simple architecture, read scaling via replicas is sufficient

**Redis Cluster:**
- Architecture: ≥3 primary nodes, each with optional replicas, data sharded across all primaries
- 16,384 hash slots distributed across nodes; client gets `MOVED` error and redirects when hitting wrong shard
- Horizontal scaling: add more nodes to increase capacity
- Multi-key commands (MGET, transactions across keys) only work if all keys map to same slot — requires hash tags `{user:1001}:profile`
- **Choose when:** Dataset exceeds single node capacity, write throughput exceeds single node capability, horizontal scaling required

**AWS ElastiCache:** Managed service providing both. Cluster mode disabled = Sentinel-like. Cluster mode enabled = Redis Cluster with managed resharding.

---

## Q8: What is cache invalidation and what strategies exist for keeping cache consistent with the database?

**Answer:**
Cache invalidation — removing or updating stale cached data when the underlying data changes — is one of the hardest problems in distributed systems because you must coordinate two separate stores (cache + DB) without a distributed transaction.

**Strategies:**

1. **TTL expiry (passive invalidation):** Set TTL on every cache entry. After expiry, the next request fetches fresh data. Simplest. Accepts staleness up to TTL duration. Works when eventual consistency is acceptable (product descriptions, blog posts, static config).

2. **Write-through invalidation (active delete on write):** When data is written to DB, immediately delete (or update) the corresponding cache key. The next read will miss and repopulate.
   - Delete vs update: deleting is safer (avoids race conditions where an old read overwrites a new write). Update is faster (saves one DB read) but requires careful ordering.
   - Cache-aside with delete: write to DB → `DEL cache_key`. Next read misses → repopulates. Standard pattern.

3. **Event-driven invalidation:** When a DB row changes, publish an event to Kafka/Redis Pub/Sub. A cache invalidation consumer reads the event and deletes/updates the affected cache keys. Decoupled, works across services. Latency: propagation delay (milliseconds to seconds).

4. **Version-based keys:** Include a version or hash in the cache key: `user:1001:v5`. When data changes, increment version. Old key is never deleted explicitly — it just expires via TTL and never gets warm again. Avoids delete race conditions. Wasteful if versions change frequently.

5. **Write-around caching:** Write to DB only, bypass cache entirely. Cache is updated only on subsequent reads (cache-aside). Simple, ensures no dirty cache writes. Cache entries are always the result of a read — never stale from a failed write.

**The fundamental challenge:** With cache-aside, there is always a race between a write invalidating the cache and a concurrent read repopulating it with stale data. This is the "double-write" / "stale set" problem. It requires either: accepting brief inconsistency (usually acceptable), write-through for critical data, or distributed transactions (expensive). In practice, TTL + cache-aside delete handles 95% of use cases.

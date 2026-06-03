# Day 32 — System Design: Caching Deep Dive

## Why Cache?

Every read from a database involves disk I/O or network calls — typically 1-10ms per query. A Redis GET from a local network takes ~0.5ms. From memory on the same machine it's microseconds. Caching creates a fast-access copy of frequently requested data between your application and the slower authoritative store.

Three core benefits:
1. **Reduce latency:** P99 latency drops from 50ms (DB read) to 1ms (Redis hit)
2. **Reduce database load:** 80% cache hit rate means 80% fewer DB queries
3. **Increase throughput:** Handle 10x more requests per second with the same DB hardware

---

## Redis Data Structures and Use Cases

Redis is not just a key-value store — it is a data structure server. Choosing the right structure dramatically simplifies your code and improves performance.

### String
The simplest type: `SET key value [EX seconds] [NX]`

Use cases:
- **Simple cache:** `SET user:1001:profile "{...}" EX 3600` — cache serialized JSON
- **Counters:** `INCR page:views:homepage` — atomic increment, race-condition free
- **Rate limiting (fixed window):** `INCR rate:user:1001` + `EXPIRE rate:user:1001 60`
- **Distributed lock:** `SET lock:resource uuid NX EX 30` — only succeeds if key absent

### Hash
A map of field-value pairs within a single key: `HSET user:1001 name "Alice" email "alice@example.com"`

Use cases:
- **User profiles:** Store each field separately. `HGET user:1001 name` without deserializing full JSON.
- **Shopping carts:** `HSET cart:user:1001 productId:42 3` (productId → quantity)
- **Counters per entity:** `HINCRBY stats:post:9 views 1`

Why Hash over String+JSON: update a single field without deserializing the whole object.

### List
An ordered list, push/pop from both ends: `LPUSH queue job1` / `RPOP queue`

Use cases:
- **Job queues:** `LPUSH queue payload` / `BRPOP queue 0` (blocking pop — consumer waits)
- **Activity feeds (recent items):** `LPUSH feed:user:1001 eventId` + `LTRIM feed:user:1001 0 99` (keep last 100)
- **Recent search history:** `LPUSH history:user:1001 "query"` + `LTRIM` to 20

`BLPOP` / `BRPOP` block the connection until an item is available — efficient for worker pool implementations.

### Set
Unordered collection of unique strings: `SADD followers:user:1001 user:2002 user:3003`

Use cases:
- **Unique visitors:** `SADD visitors:page:home userId` — no duplicates
- **Tagging / categorization:** `SADD tags:article:5 "javascript" "react"` + `SMEMBERS`
- **Mutual follows / intersection:** `SINTER followers:user:1001 followers:user:2002`
- **Union for combined sets:** `SUNION tags:article:5 tags:article:6`

`SISMEMBER key member` is O(1) regardless of set size.

### Sorted Set
Set where every member has a float score: `ZADD leaderboard 5000 "player:1001"`

Use cases:
- **Leaderboards:** `ZREVRANGE leaderboard 0 9 WITHSCORES` — top 10 players
- **Rate limiting (sliding window):** Use timestamps as scores, `ZRANGEBYSCORE` to count recent events
- **Priority queue:** Score = priority or scheduled timestamp
- **Trending topics:** Score = occurrence count, periodically decayed

`ZRANGEBYSCORE leaderboard -inf +inf` for range queries by score.

### Stream
An append-only log with consumer groups: `XADD events * type "click" userId "1001"`

Use cases:
- **Event log:** Persistent ordered event history
- **Message queue with consumer groups:** Multiple consumers in a group, each message delivered once
- **Real-time analytics:** Producers write events, consumers aggregate

`XREAD GROUP consumer-group consumer-1 COUNT 10 STREAMS events >` — reads new messages for this consumer.

---

## Caching Patterns

### Cache-Aside (Lazy Loading)
```
Read: check cache → if miss, read DB → write to cache → return
Write: write to DB → (optionally invalidate cache)
```
Most common pattern. Application code manages the cache explicitly. Cache only contains data actually requested — no waste. Cold start has high miss rate. Stale data risk if cache is not invalidated on writes.

### Read-Through
Cache sits between app and DB. On miss, the **cache itself** fetches from DB and stores. Application always talks to cache. Simpler application code. Cache vendor must support this (e.g., AWS DAX for DynamoDB, some ORM-level caches).

### Write-Through
Every write goes to cache AND database synchronously. Cache always up-to-date. Higher write latency (two synchronous writes). Good for read-heavy data that must never be stale.

### Write-Behind (Write-Back)
Write to cache immediately, flush to DB asynchronously in batches. Excellent write throughput. Risk: data loss if cache crashes before flush. Suitable for metrics, analytics counters, non-critical updates.

### Refresh-Ahead
Proactively refresh cache entries before they expire. The cache detects that a key's TTL is approaching (e.g., 80% of TTL elapsed) and prefetches from DB. Reduces cache misses at TTL expiry. Requires prediction logic.

---

## Cache Eviction Policies

- **LRU (Least Recently Used):** Evict the item not accessed for the longest time. Default for most caches. Works well for temporal locality patterns.
- **LFU (Least Frequently Used):** Evict the item accessed least often. Better for frequency-based access patterns (popular content stays forever). More complex to implement.
- **TTL (Time To Live):** Items expire after a fixed duration regardless of access pattern. Simplest invalidation strategy.
- **FIFO:** Evict the oldest inserted item. Rarely optimal but predictable.
- **Random:** Evict a random item. Surprisingly competitive in some benchmarks.

Redis supports: `allkeys-lru`, `allkeys-lfu`, `volatile-lru`, `volatile-lfu`, `allkeys-random`, `volatile-ttl`, `noeviction`.

---

## Cache Stampede (Thundering Herd)

**Problem:** A hot cache key (e.g., the homepage configuration) expires. Simultaneously, 10,000 concurrent requests miss the cache. All 10,000 go to the database simultaneously, overwhelming it.

**Solutions:**

1. **Mutex lock:** First thread to detect a miss acquires a Redis lock (`SET lock:key uuid NX EX 5`). All other threads wait. Lock holder fetches from DB, populates cache, releases lock. Others then hit the warm cache. Downside: waiting threads have higher latency.

2. **Probabilistic early expiration (XFetch):** Before TTL expires, with increasing probability, proactively refresh. Formula: refresh if `current_time - (beta * delta * ln(random()))` > expiry_time. Spreads refreshes over time, no lock needed.

3. **Jitter on TTL:** Instead of `TTL = 3600s` for all keys, use `TTL = 3600 + random(0, 600)`. Different keys expire at different times, preventing synchronized stampedes across a fleet.

4. **Background refresh:** Keep serving the stale value while a background job refreshes the cache.

---

## Cache Invalidation: The Hardest Problem in CS

"There are only two hard problems in computer science: cache invalidation and naming things." — Phil Karlton

**Strategies:**
- **TTL-based:** Simplest. Accept stale data up to TTL. Works for data that can tolerate some staleness (product descriptions, blog posts).
- **Event-driven invalidation:** When data changes in DB, publish an event (Kafka, Redis Pub/Sub) that triggers cache deletion. More complex but keeps cache fresh.
- **Version tags:** Cache key includes a version (`user:1001:v5`). On update, increment version. Old versions naturally expire via TTL.
- **Write-through:** Never stale by design, but high write cost.

---

## CDN Caching and Cache-Control Headers

`Cache-Control` directives:
- `max-age=3600` — browser caches for 3600 seconds
- `s-maxage=86400` — CDN caches for 86400 seconds (overrides max-age for shared caches)
- `no-store` — never cache (sensitive data: banking, medical)
- `no-cache` — cache but revalidate with server before every use (304 response if unchanged)
- `stale-while-revalidate=60` — serve stale content for up to 60s while fetching fresh content in background
- `private` — browser can cache, CDN cannot (user-specific responses)

**ETag + 304:** Server sends `ETag: "v3abc"` with response. Browser sends `If-None-Match: "v3abc"` on next request. If content unchanged, server returns `304 Not Modified` (no body = bandwidth saved).

---

## Redis Persistence: RDB vs AOF

**RDB (Redis Database snapshots):** Periodic point-in-time snapshots. Fast recovery, compact file. Data loss between snapshots (up to minutes). Good for: cache (losing some data is acceptable).

**AOF (Append-Only File):** Log every write operation. On restart, replay log to reconstruct state. Near-zero data loss (`fsync every second` loses at most 1 second). Larger file, slower recovery. Good for: session store, rate limiters (must not lose data).

**Both:** Redis can use both simultaneously. RDB for fast recovery, AOF for durability. This is the recommended production configuration.

---

## Redis High Availability

**Redis Sentinel (3-node minimum):**
- 1 primary + 1 replica + 1 Sentinel (or 3 Sentinels)
- Sentinels monitor primary, elect new primary if it fails
- No data sharding — all data on one node (replicated)
- Good for: vertical scale, simplicity

**Redis Cluster:**
- Data sharded across 3+ primary nodes (each with replicas)
- Consistent hashing with 16,384 hash slots
- `MOVED` error when client goes to wrong shard — client must redirect
- Supports horizontal scaling
- Good for: large datasets, high write throughput

---

## When NOT to Cache

- **Write-heavy data:** If data is written more than it is read, the cache will be invalidated immediately after each write — net overhead with no benefit.
- **Financial transactions:** Stale balances can cause overdrafts or incorrect decisions. Strong consistency required.
- **Very small datasets:** If the entire dataset fits in the database's buffer pool, caching adds complexity without benefit.
- **Data that changes with every request:** Personalized real-time recommendations — caching key would be too specific, hit rate near 0%.
- **Highly sensitive PII:** Caching increases attack surface. Weigh benefit against compliance risk.

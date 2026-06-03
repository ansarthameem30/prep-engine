# Day 35 — Interview Prep: URL Shortener Deep Dive

## Q1: Walk me through the full design of a URL shortener at 100M URLs/day scale.

**Answer:**
I'll follow the 7-step framework:

**1. Requirements:** Shorten URL, redirect, optional custom alias, optional expiration. 100M writes/day, 10:1 read:write = 1M reads/day. Actually: 100M writes/day = 1,160 writes/sec, 11,600 reads/sec. 99.9% availability. Sub-10ms redirect latency.

**2. Estimation:** Base62 with 7 chars = 3.5 trillion unique codes. Storage: 500 bytes/URL × 100M/day × 10 years = 182.5TB (object/columnar storage, not in-memory DB). Cache: 10GB Redis covers the top 20% of URLs receiving 80% of traffic.

**3. High-level design:** Client → CDN → ALB → App servers → [Redis cache + PostgreSQL]. Async analytics via Kafka → ClickHouse.

**4. Key component deep dive:** Short code generation using Redis atomic INCR with pre-allocated ranges (Snowflake-like), no collision detection needed. Cache-aside with 80%+ expected hit rate. 302 redirect for analytics, 301 option for performance.

**5. Bottlenecks:** Redirect path (11,600 reads/sec) is the hot path. Solution: Redis cache offloads 80% of reads. Write path (1,160 writes/sec) is manageable for PostgreSQL primary.

**6. Scale:** Horizontal app servers behind ALB, Redis Cluster for cache, PostgreSQL with read replicas, Kafka for async click events.

**7. Trade-offs:** 301 vs 302 (browser caching vs analytics accuracy), custom alias uniqueness checking, link expiration via lazy evaluation vs background jobs.

---

## Q2: Why use 302 (temporary redirect) vs 301 (permanent redirect) for URL shortening?

**Answer:**
This is one of the most interesting tradeoffs in URL shortener design:

**HTTP 301 (Permanent Redirect):**
- Browser caches the mapping permanently
- Subsequent visits by the same browser go directly to the target URL (bypass your server)
- Pros: Dramatically reduces server load — once a browser has seen a short URL, it never calls your server again
- Cons: You lose click analytics for all cached redirects. If the target URL ever changes, the cached browser mapping will never update (users see stale target). You can't enforce click limits or deactivate links for cached users.

**HTTP 302 (Temporary/Found Redirect):**
- Browser does NOT cache the mapping
- Every click calls your server for resolution
- Pros: Full analytics (every click is trackable), ability to change target URL, ability to deactivate links, ability to enforce rate limits
- Cons: Every redirect is a server roundtrip. At 11,600 redirects/sec, this means every single redirect must be served by your infrastructure.

**Real-world practice:**
- bit.ly, TinyURL: Use 302 by default for analytics
- Some URL shorteners offer 301 as a "speed mode" feature (no analytics, pure performance)
- With Redis caching (0.5ms per lookup), 302 is perfectly fast enough at scale — the performance difference is imperceptible to users
- The business requirement (analytics and link management) almost always favors 302

**My recommendation:** 302 by default. Offer 301 as an explicit option for users who want maximum performance and don't need analytics. Never use 301 for links that might expire or change.

---

## Q3: What are the different approaches to generating short codes and what are their tradeoffs?

**Answer:**

**Approach 1: Hash of URL (MD5/SHA256 → take first 7 chars)**
- Pro: Same URL always gets same code (deduplication automatic)
- Con: Hash collisions exist — different URLs mapping to same 7-char prefix. With 100M URLs and birthday paradox, collision probability is non-trivial. Two different long URLs would map to same short code — catastrophic.
- Con: You need collision detection, which requires a DB read per creation
- Verdict: Don't use in production

**Approach 2: Auto-increment ID → Base62**
- Pro: No collisions (DB auto-increment guarantees uniqueness)
- Pro: Simple implementation
- Con: Sequential — an attacker can enumerate all URLs (privacy issue)
- Con: Creates a write bottleneck if you need the DB to generate the ID before creating the short code
- Verdict: Acceptable for internal/private systems

**Approach 3: Pre-allocated counter ranges (recommended)**
- App server atomically fetches a range of IDs from Redis (`INCRBY counter 1000`)
- Server uses IDs locally without DB coordination for each URL
- ID encoded to Base62 = short code
- Pro: No DB call per URL creation, no collisions, scalable to many app servers
- Pro: IDs are numerically dense (no holes, maximum namespace utilization)
- Con: Still sequential within a batch window (range 1000-1999 all created by same server)
- Verdict: Best for production at scale

**Approach 4: Random/UUID-based**
- Generate random 7-char Base62 string
- Must check DB for collision before using
- Pro: Not enumerable
- Con: Collision detection required, random IDs spread across the entire namespace (worse DB clustering)
- Verdict: Use if privacy/non-enumerability is a requirement, at the cost of collision detection overhead

---

## Q4: How would you handle the analytics requirement without impacting redirect latency?

**Answer:**
Writing each click to the database synchronously would be catastrophic for redirect latency — 11,600 writes/sec to a relational DB for click tracking would saturate the write path.

**Solution: Completely decouple analytics from the redirect path.**

**Redirect path (latency-critical, < 10ms):**
1. Check Redis cache → hit → 302 redirect (done, ~1ms total)
2. On miss → DB lookup → cache → 302 redirect (~10ms total)
3. After returning the redirect (async, non-blocking): `redis.incr("click:{shortCode}")`

**Analytics pipeline (eventually consistent, not on critical path):**
1. App server publishes lightweight ClickEvent to Kafka: `{ shortCode, timestamp, userAgent, ip }`
2. Kafka consumer batch-writes to ClickHouse (column-store OLAP database optimized for aggregations)
3. Dashboard queries ClickHouse: `SELECT shortCode, count(*) GROUP BY shortCode`

**Redis click counter pattern:**
- `INCR click:{shortCode}` on every redirect (< 0.5ms, async fire-and-forget)
- Batch flush job runs every 5 minutes: reads all click counters, writes increments to PostgreSQL, resets counters
- This gives: fast increments + periodic DB persistence + no synchronous DB write per click

**Geographic and referrer analytics:**
- Parse IP → country via MaxMind GeoIP database (in-memory lookup, < 1ms)
- Include in Kafka event payload
- ClickHouse aggregates by country, hour, referrer

**Result:** Redirect latency is completely unaffected by analytics processing. Analytics are eventually consistent (~seconds lag) which is perfectly acceptable for dashboards.

---

## Q5: How would you design the custom alias feature? What race conditions exist?

**Answer:**
Custom aliases allow users to request `short.ly/my-promo` instead of `short.ly/xk92pQm`.

**Basic flow:**
1. User requests alias "my-promo"
2. Check if "my-promo" already exists in DB
3. If available: create record with short_code = "my-promo"
4. If taken: return 409 Conflict

**Race condition:** Two concurrent requests both check for "my-promo" — both get "not found" — both try to insert — one fails with unique constraint violation.

**Solutions:**

1. **Database unique constraint + retry logic:**
   ```sql
   INSERT INTO urls (short_code, ...) VALUES ('my-promo', ...)
   ON CONFLICT (short_code) DO NOTHING RETURNING *;
   ```
   If the insert returns nothing (conflict), the alias was already taken. Simple, correct, uses DB for coordination.

2. **Redis distributed lock:**
   ```
   SET lock:alias:my-promo uuid NX EX 5
   ```
   Only the lock holder proceeds to DB check + insert. Others get an immediate "being reserved" response. Overly complex for this use case.

3. **Optimistic concurrency:** Check + insert in one atomic operation (preferred — option 1 above).

**Additional validation:**
- Reserved aliases: "api", "admin", "static", "login" — should be blocked
- Alias length/character validation: allow `[a-zA-Z0-9-_]`, 3-50 characters
- Rate limiting: prevent automated alias squatting (max X custom aliases per user per day)

---

## Q6: How would you handle URL expiration at scale? What are the options?

**Answer:**
At 100M URLs/day × 365 days × 10 years, you have billions of URL records. Deleting expired records proactively is expensive. Several strategies:

**Strategy 1: Lazy expiration (recommended)**
- Don't proactively delete expired URLs
- On each redirect request: check `expires_at` against current time
- If expired: mark `is_active = false`, invalidate cache key, return 410 Gone
- Pros: Zero background job overhead, simple
- Cons: Expired records accumulate in the DB (storage cost)

**Strategy 2: Background cleanup job**
- Nightly batch job: `UPDATE urls SET is_active = false WHERE expires_at < NOW() AND is_active = true`
- Optionally: after 90 days of expiration, soft-delete (`is_deleted = true`)
- Pros: Keeps DB clean, enables freeing expired short codes for reuse
- Cons: Job can be slow on large tables without proper indexing; adds operational complexity

**Strategy 3: TTL-aware cache invalidation**
- Set Redis TTL = `expires_at - now()` when caching
- Cache entry naturally expires at the same time as the URL
- After cache miss, lazy expiration check on DB hit
- This prevents serving cached redirects for expired URLs

**Strategy 4: Short-code recycling (advanced)**
- After N days past expiration, make the short code available for reuse
- Requires: checking that the old code is fully expired and inactive
- Risk: a user may have bookmarked or linked to the short URL — recycling breaks their link
- Most commercial URL shorteners never recycle codes for this reason

**Recommendation:** Lazy expiration + background soft-delete job + TTL-aware Redis caching. This handles correctness with minimal overhead.

---

## Q7: Your URL shortener is getting hammered with 100K requests/sec. Walk me through your scaling plan.

**Answer:**
At 100K reads/sec (10× our baseline), I'd scale each layer:

**Immediate (can do in hours):**
1. **Increase Redis cache cluster:** Add more Redis nodes. At 100K reads/sec with 80% hit rate, 80K requests/sec serve from cache. Redis can handle 100K+ ops/sec per node. Scale to 3-5 node Redis Cluster.
2. **Auto Scaling Group:** Increase minimum/maximum instance count. App tier is stateless — each instance handles ~2-5K req/sec easily. At 100K: need 20-50 instances behind ALB.
3. **Read replica:** Remaining 20K DB reads/sec (cache misses) go to PostgreSQL. Add 2-3 read replicas, configure connection pooling (PgBouncer) to 100 connections per replica.

**Medium term (days to weeks):**
4. **CDN for 301 responses:** Configure CloudFront to cache redirect responses. For URLs with 301, each unique URL is cached at the edge. This can eliminate 30-50% of origin requests.
5. **Database connection pooling:** PgBouncer in front of PostgreSQL. 20K cache-miss reads/sec through 5 connections each = 100 connections total (vs 20K bare connections to PostgreSQL which would crash it).
6. **Shard writes:** 100K reads with some write traffic → primary is write-only. Partition the urls table by `short_code` hash if write QPS becomes the bottleneck.

**Monitoring to add immediately:**
- Redis hit rate (target: > 80%)
- DB connection pool utilization (alert at 80%)
- P99 redirect latency (alert at > 50ms)
- App server CPU/memory

---

## Q8: Why use Base62 for encoding and not Base64 or just a UUID?

**Answer:**
**Base64** uses 64 characters: a-z, A-Z, 0-9, `+`, `/` (with `=` padding). The `+` and `/` characters are not URL-safe — they require percent-encoding in URLs (`+` → `%2B`, `/` → `%2F`). Even Base64url (replaces `+` with `-` and `/` with `_`) adds non-alphanumeric characters that look unfamiliar in URLs and don't lend themselves to typed entry.

**Base62** uses only a-z, A-Z, 0-9 — 62 characters, all URL-safe, all typeable, all visually unambiguous when read. Short codes like `xk92pQm` are what users expect in a URL shortener. Base62 sacrifices 2 characters (vs Base64) but gains URL-safety and readability.

**UUID** generates a 128-bit random value formatted as `550e8400-e29b-41d4-a716-446655440000` (36 characters). This is far too long for a "short" URL. A truncated UUID (first 8 chars = `550e8400`) has collision probability concerns and provides no ordering properties.

**Why not Base10 (decimal)?** Integer 1 billion encoded as Base10 = `1000000000` (10 digits). The same value in Base62 = `15FTGg` (6 chars). Base62 is ~70% more compact than Base10 for the same namespace.

**Length vs namespace tradeoff:**
- 6 chars: 62^6 = 56 billion unique codes (runs out in ~1.5 years at 100M/day)
- 7 chars: 62^7 = 3.5 trillion unique codes (96 years at 100M/day)
- 8 chars: 62^8 = 218 trillion (effectively unlimited for foreseeable future)

Choose 7 characters as the sweet spot: short enough to type, large enough to never exhaust.

---

## Q9: How would you prevent abuse (malicious URLs, spam)?

**Answer:**
A URL shortener without abuse prevention becomes a phishing infrastructure tool. Several layers of defense:

**At creation time:**
1. **URL validation:** Parse URL, validate schema (https:// only), check format
2. **Safe Browsing API check:** Google Safe Browsing API detects known phishing/malware URLs. Check every submitted URL before creating the short code. ~50ms additional latency is acceptable for writes.
3. **Domain blocklist:** Maintain a list of known spam/phishing domains. Block creation for known-bad domains.
4. **Rate limiting per user/IP:** Free tier: 100 URLs/hour. Prevents automated bulk creation.
5. **User verification:** Require email verification before creating URLs (eliminates bots)

**At redirect time:**
1. **Interstitial warning page:** For suspicious URLs (newly created, high click rate from single IP), show a warning: "You're about to be redirected to [domain]. Continue?" Adds friction for phishing.
2. **Real-time Safe Browsing check (optional):** Check on redirect for recently-reported URLs. Adds latency; use cached blocklist instead.

**Ongoing monitoring:**
3. **Click pattern analysis:** 10,000 clicks from same IP in 1 minute = suspicious. Flag for review.
4. **Abuse reporting:** Let users report malicious links. Manual review + takedown within 1 hour.
5. **DMCA/legal compliance:** Maintain takedown process, respond within 24-48 hours.

---

## Q10: What would you change in the design if links needed to be private (only accessible to logged-in users)?

**Answer:**
Private links require authentication at the redirect layer — the most latency-sensitive path.

**Changes required:**

**Authentication at redirect:**
- Every `GET /{shortCode}` must verify the user is authenticated before redirecting
- Option A: Check session cookie / JWT token on every redirect request. Adds ~5-10ms for token validation. Acceptable.
- Option B: Encode a per-user access token in the short URL itself (`short.ly/xk92pQm?token=abc123`). Stateless validation. Risk: sharing the URL shares access.

**Access control model:**
- `url_access` table: `(short_code, user_id, granted_by, granted_at)` — explicitly list who can access
- On redirect: verify `(shortCode, userId)` exists in this table
- Cache permission grants in Redis: `perm:{shortCode}:{userId}` = "1" with TTL
- On access revocation: delete the cache key immediately

**CDN and caching:**
- Private URLs MUST have `Cache-Control: no-store, private` in the redirect response
- CDN cannot cache private redirects (user-specific)
- This means all private redirects must be served by your origin servers
- Performance implications: no CDN offload for private links

**Short code generation:**
- Private links should use random (non-sequential) short codes to prevent enumeration
- Even authenticated users shouldn't be able to enumerate other users' private links

**Token expiry:**
- Private links can have very short TTLs (24 hours for shared secure links)
- Magic link pattern: single-use private URL that expires on first use

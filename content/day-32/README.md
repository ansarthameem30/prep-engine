# Day 32 – Caching Deep Dive: Redis, Cache Strategies & CDN | DSA: Trie

> **Phase 4 – System Design + AWS + CI/CD + GitHub** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Redis data structures, cache strategies, eviction policies, cache stampede, CDN headers |
| Hands-On | 00:40–01:10 | Implement cache-aside pattern in Node.js + Redis, cache stampede solution |
| DSA | 01:10–01:25 | Implement Trie (#208) + Word Search II (#212) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Know all 6 Redis data structures and their O() complexities and use cases
- [ ] Implement cache-aside, read-through, write-through, and write-behind patterns
- [ ] Explain cache stampede and implement a probabilistic early expiry or lock-based solution
- [ ] Solve: Implement Trie (#208) with insert, search, startsWith
- [ ] Review 5 caching interview questions

---

## Concept: Caching Deep Dive

### What to Study
- **Redis data structures:** String (SET/GET/INCR/TTL — counters, rate limiting, simple caching); Hash (HSET/HGET/HGETALL — object storage, user sessions); List (LPUSH/RPUSH/LRANGE/LPOP — queues, activity feeds); Set (SADD/SMEMBERS/SISMEMBER — unique tags, social connections, deduplication); Sorted Set (ZADD/ZRANGE/ZRANGEBYSCORE — leaderboards, rate limiting with timestamps, priority queues); Stream (XADD/XREAD — event log, message queue with consumer groups)
- **Cache strategies:** Cache-aside (app checks cache → miss → load from DB → write to cache — app controls everything, most flexible, stale on DB write); Read-through (cache fetches from DB automatically on miss — simpler app code, but cache must know data source); Write-through (write to cache AND DB synchronously — consistent, but higher write latency); Write-behind/write-back (write to cache → async write to DB — fast writes, risk of data loss on crash)
- **Eviction policies:** LRU (Least Recently Used — evict oldest accessed); LFU (Least Frequently Used — evict least accessed overall — better for workloads with hot keys); TTL-based (explicit expiry); `volatile-lru` (LRU only among keys with TTL set, keep permanent keys); `allkeys-lru` (LRU across all keys — recommended for pure cache usage)
- **Cache stampede (thundering herd):** Many requests hit an expired key simultaneously → all miss → all hammer the DB simultaneously → DB overload; solutions: probabilistic early expiry (expire key slightly before actual expiry with jitter), mutex/lock (first miss gets lock, others wait), cache warming (pre-populate before expiry using background job)
- **CDN caching headers:** `Cache-Control: max-age=3600, s-maxage=86400` (s-maxage for CDN/shared caches, max-age for browser); `ETag` (fingerprint of content for conditional GET); `Last-Modified`; `Vary` (cache key includes named headers — `Vary: Accept-Encoding` for gzip vs br)

### Key Mental Models
- Cache is a speed/consistency trade-off — every cached item is potentially stale; the question is how stale is acceptable for this data
- Redis Sorted Set is the Swiss Army knife of caching — use it for rate limiting (score = timestamp), leaderboards (score = metric), and any time you need ordered access by value
- Cache stampede is a distributed thundering herd — it's an emergent property of TTL-based expiry under high load; the fix requires coordination (lock) or randomization (jitter)

### Why This Matters in Interviews
Caching is in every system design question. Interviewers expect you to know cache strategies by name, explain eviction policies, and describe the cache stampede problem and its solutions. Redis data structure knowledge signals hands-on experience — generic "use Redis" answers don't impress senior interviewers.

---

## DSA Focus: Trie – Implement Trie & Word Search II

- **Problem:** Implement Trie (LeetCode #208)
- **Difficulty:** Medium
- **Pattern:** Trie (Prefix Tree)
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Each node has a children map (26 letters or a Map) and an `isEnd` flag; insert walks/creates nodes character by character; search and startsWith differ only in whether they require `isEnd` at the final node

---

## Today's 5 Interview Questions (Flash Review)
1. What is the difference between cache-aside and read-through caching — when would you prefer each?
2. How would you implement a leaderboard that supports top-10 queries efficiently using Redis?
3. What is the cache stampede problem and what are two ways to prevent it?
4. What Redis eviction policy would you choose for a pure cache (all keys are cacheable) and why?
5. How do `Cache-Control: max-age` and `s-maxage` differ, and which one controls CDN behavior?

---

## Files in This Folder
- `01-concept/` → Read: Redis data structures docs, cache strategy comparison, CDN Cache-Control header guide
- `02-hands-on/` → Code: cache-aside.js (Node.js + ioredis implementation), cache-stampede-fix.js (probabilistic expiry + mutex approaches)
- `03-dsa/` → DSA: implement-trie.js (TrieNode class with Map children), word-search-ii.js (Trie + DFS backtracking on board)
- `04-interview-prep/` → Full Q&A: 5 caching questions with detailed answers and Redis command examples

---

## Success Criteria
- [ ] Can implement a Redis-backed cache-aside layer from memory in under 15 minutes
- [ ] Solved Implement Trie in < 20 minutes with correct insert/search/startsWith
- [ ] Confident answering all 5 caching interview questions
- [ ] Bonus: Implement a sliding window rate limiter using Redis Sorted Set (ZADD + ZREMRANGEBYSCORE)

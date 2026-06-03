# Day 35 – System Design: URL Shortener (TinyURL) End-to-End | DSA: LRU Cache

> **Phase 4 – System Design + AWS + CI/CD + GitHub** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | URL shortener walkthrough: requirements, estimation, API, DB schema, short code gen, caching, scaling |
| Hands-On | 00:40–01:10 | Implement a working URL shortener in Node.js with base62 encoding and Redis cache |
| DSA | 01:10–01:25 | LRU Cache (#146) — full implementation |
| Interview Q | 01:25–01:30 | Flash review 5 key questions about the URL shortener design |

---

## Today's Objectives
- [ ] Walk through a complete URL shortener system design in under 40 minutes
- [ ] Implement base62 encoding for short code generation
- [ ] Explain 301 vs 302 redirect trade-offs in the context of caching and analytics
- [ ] Solve: LRU Cache (#146) using a HashMap + doubly linked list
- [ ] Review 5 system design questions for URL shortener

---

## Concept: System Design – URL Shortener

### What to Study
- **Functional requirements:** Shorten a long URL to a ~7-character code; redirect short URL to original; optional: custom aliases, expiry, analytics
- **Non-functional requirements:** 100M URLs total (storage); 100:1 read:write ratio; reads < 10ms (with cache); 99.99% availability; eventual consistency acceptable for analytics
- **Capacity estimation:** 100 writes/sec → 100M records in ~11.5 days; each record ~500 bytes → 50GB total; reads 10,000/sec at peak; cache 20% of daily active URLs (~20K records) in Redis
- **Short code generation:** Base62 encoding (a-z, A-Z, 0-9) — 7 characters = 62^7 = 3.5 trillion combinations; approaches: (1) hash the long URL (MD5/SHA256) → take first 7 characters — collision possible, need retry; (2) auto-increment ID from DB → convert to base62 — no collision, sequential IDs expose count; (3) pre-generate random codes and store in "available pool" table — complex but safe
- **Database schema:** `urls` table: `(id BIGINT PK, short_code VARCHAR(8) UNIQUE, long_url TEXT, user_id, created_at, expires_at, click_count)` — index on `short_code` for fast redirect lookup
- **301 vs 302 redirect:** 301 Permanent → browser caches the redirect, subsequent requests go directly to destination (no analytics, lower server load); 302 Temporary → browser always hits your server (captures analytics hits, can update destination), higher server load — choose 302 if analytics matter
- **Cache layer:** Redis with short_code as key, long_url as value, TTL matching URL expiry; cache-aside pattern; invalidate on deletion or update
- **Analytics:** Write-behind — don't increment click_count synchronously on each redirect (creates DB write bottleneck at 10K writes/sec); instead, stream clicks to Kafka → aggregation service → batch update counts every minute

### Key Mental Models
- URL shortener is deceptively simple — the system design exercise is really about demonstrating capacity estimation, cache strategy reasoning, and explaining trade-offs (301 vs 302, hash vs increment)
- Always separate the hot path (redirect) from the cold path (analytics writes) — the redirect must be sub-10ms; analytics can be eventually consistent
- Base62 encoding is just a number base conversion — treat the auto-increment ID as a number and convert it like decimal to hexadecimal, but in base 62

### Why This Matters in Interviews
URL shortener is one of the 5 most commonly asked system design questions. Interviewers use it as an entry-level system design problem to test estimation, database schema design, caching, and redirect behavior. A strong answer walks through each component systematically and explains why each decision was made.

---

## DSA Focus: LRU Cache Full Implementation

- **Problem:** LRU Cache (LeetCode #146)
- **Difficulty:** Hard
- **Pattern:** HashMap + Doubly Linked List
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** HashMap gives O(1) key lookup; doubly linked list gives O(1) node removal and insertion at head/tail; combine them: map stores key → node pointer; on get: move node to head; on put: add at head, evict tail if over capacity

---

## Today's 5 Interview Questions (Flash Review)
1. Walk me through your URL shortener design — what are the first three components you'd draw?
2. Why would you choose a 302 redirect over a 301 for a URL shortener with analytics?
3. How would you handle hash collisions in your short code generation approach?
4. What happens to your system when the Redis cache goes down — how do you make it fault tolerant?
5. How would you scale the redirect service to handle 100,000 requests per second?

---

## Files in This Folder
- `01-concept/` → Study: URL shortener design walkthrough — draw the architecture diagram with all components labeled
- `02-hands-on/` → Code: url-shortener.js (Express API: POST /shorten, GET /:code with Redis cache-aside, base62 encoding utility)
- `03-dsa/` → DSA: lru-cache.js (LRUCache class with get/put, HashMap + DoublyLinkedList full implementation)
- `04-interview-prep/` → Full Q&A: 5 URL shortener design questions with component-by-component model answers

---

## Success Criteria
- [ ] Can whiteboard the full URL shortener architecture in 10 minutes without prompting
- [ ] Solved LRU Cache in < 20 minutes with correct O(1) get/put
- [ ] Confident answering all 5 URL shortener design questions
- [ ] Bonus: Add a URL analytics endpoint that returns daily click counts using a Redis Sorted Set for time-series data

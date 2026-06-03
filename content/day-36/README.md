# Day 36 – System Design: Twitter/News Feed – Fan-Out, Timeline Generation & Ranking | DSA: Design HashMap

> **Phase 4 – System Design + AWS + CI/CD + GitHub** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Fan-out on write vs read, celebrity problem, notification system, media storage, Elasticsearch |
| Hands-On | 00:40–01:10 | Design the timeline generation service with hybrid fan-out architecture diagram |
| DSA | 01:10–01:25 | Design HashMap (#706) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions about the news feed design |

---

## Today's Objectives
- [ ] Compare fan-out on write vs fan-out on read with performance characteristics
- [ ] Solve the celebrity problem in feed generation (high-follower accounts)
- [ ] Design a notification system with push + pull delivery
- [ ] Solve: Design HashMap (#706) with chaining collision resolution
- [ ] Review 5 system design questions for Twitter/news feed

---

## Concept: System Design – Twitter/News Feed

### What to Study
- **Fan-out on write (push model):** When user A posts, immediately write the tweet to each follower's timeline cache (Redis Sorted Set keyed by user_id, scored by timestamp); reads are O(1) from cache; write amplification = 1 write → N follower writes; unacceptable for celebrities (1 tweet → 50M cache writes); suitable for regular users with <1000 followers
- **Fan-out on read (pull model):** When user opens feed, query all followed users' recent tweets and merge-sort; no write amplification; read is expensive O(F * Q) where F = following count and Q = query cost per user; cold cache every read; suitable for celebrities (no write fan-out)
- **Hybrid approach (Twitter's real solution):** Fan-out on write for regular users (<50K followers); fan-out on read for celebrities (detected dynamically); when user opens feed: fetch precomputed feed from Redis + fetch latest tweets from followed celebrities and merge at read time
- **Ranking algorithm:** Chronological (simplest, no ML); EdgeRank-style (affinity × weight × decay): affinity = how often you interact with poster, weight = type of post (video > photo > text), time decay = exponential decay from post time; requires score computation at write time or read time
- **Notification system:** Push delivery via WebSocket (for active users) + FCM/APNs (mobile push) + email; fanout service writes notification events to Kafka; notification workers consume and deliver via appropriate channel; user preferences stored in Redis (mute/block/notification settings)
- **Media storage:** S3 for raw uploads; Lambda or dedicated transcoder for video processing; CloudFront CDN for delivery; presigned S3 URLs for direct browser-to-S3 upload (bypass your server for large files); different image sizes generated on upload (thumbnail, medium, full) using ImageMagick or imgproxy
- **Search (Elasticsearch):** Index tweets with full-text, user mentions, hashtags; denormalized documents (tweet + user + hashtag data embedded); near real-time index update via Kafka → Logstash/Beats → Elasticsearch; sharded by tweet_id hash

### Key Mental Models
- The feed generation problem is fundamentally a "top K from multiple sorted lists" problem — fan-out pre-sorts it for you at write time; fan-out on read does it at read time
- The celebrity problem is the "hot partition" problem applied to social graphs — a tweet from a celebrity is a write amplification bomb; the hybrid model is the pragmatic solution
- Notification systems are fire-and-forget pipelines — prioritize delivery over strict ordering; use Kafka for durable delivery and fan out to multiple notification channels

### Why This Matters in Interviews
Twitter/News Feed design is the second most commonly asked system design question (after URL shortener). Interviewers specifically probe the fan-out trade-off because it requires you to reason about write amplification, cache design, and the celebrity problem — all of which test senior-level thinking. Every company with a social or content feed has this exact problem.

---

## DSA Focus: Design HashMap

- **Problem:** Design HashMap (LeetCode #706)
- **Difficulty:** Easy
- **Pattern:** Hash Table with Chaining
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Use an array of buckets where each bucket is a linked list (chaining) to handle collisions; hash function: `key % bucketSize`; on put: find bucket, check if key exists (update) or append new entry; on get: find bucket, linear scan for key; choose bucket size as a prime number to reduce clustering

---

## Today's 5 Interview Questions (Flash Review)
1. Explain fan-out on write vs fan-out on read — what are the performance trade-offs of each?
2. How does Twitter handle tweets from celebrities with 50 million followers without writing to 50 million caches?
3. How would you design the notification system to ensure a user receives a notification even if they're offline?
4. Why do you use a presigned URL for media uploads instead of routing the upload through your API server?
5. How would you add a "trending hashtags" feature — what data store and query pattern would you use?

---

## Files in This Folder
- `01-concept/` → Study: Twitter feed architecture blog posts, fan-out pattern comparison, Elasticsearch for social search
- `02-hands-on/` → Code: feed-architecture.md (hybrid fan-out design diagram, Redis timeline cache schema, notification pipeline)
- `03-dsa/` → DSA: design-hashmap.js (HashMap class with chaining, prime bucket count, put/get/remove)
- `04-interview-prep/` → Full Q&A: 5 Twitter/feed design questions with architecture diagrams and trade-off reasoning

---

## Success Criteria
- [ ] Can explain the hybrid fan-out approach and justify when each model kicks in
- [ ] Solved Design HashMap in < 20 minutes with correct chaining implementation
- [ ] Confident answering all 5 feed design interview questions
- [ ] Bonus: Design a "moments" feature (trending real-time events) — what components change compared to the regular feed?

# Day 36 — Interview Prep: News Feed / Twitter Timeline

## Q1: Design a Twitter-like news feed. What are the core challenges?

**Answer:**
The core challenges are: (1) the fan-out problem — delivering a tweet to millions of followers efficiently, (2) timeline generation speed — must be < 200ms, (3) the celebrity problem — famous accounts break normal assumptions, and (4) scale — 300M DAU, 600M tweets/day.

**My high-level approach:**

1. **Fan-out on write for regular users:** When a user tweets, push the tweet_id to every follower's pre-computed feed cache (Redis Sorted Set keyed by user_id). Timeline reads are O(1) — just read from the Sorted Set.

2. **Fan-out on read for celebrities:** For accounts with > 100K followers, don't fan-out. At read time, query the celebrity's tweets and merge with the pre-computed feed.

3. **Timeline generation:** Read Redis feed (regular tweets) + inject celebrity tweets from followed celebrities. Merge by timestamp. Return top 20.

4. **Data model:** tweets table sharded by tweet_id (Snowflake — sortable), users table sharded by user_id, follows table in Cassandra (optimized for "get followers of user X" query).

5. **Media:** S3 + CloudFront CDN. Async video transcoding via Kafka + dedicated workers.

---

## Q2: Explain the fan-out problem. Why doesn't fan-out on write work for celebrities?

**Answer:**
**Fan-out on write:** When user A posts a tweet, you immediately push that tweet_id to the feed cache of all A's followers. Reading the timeline is then O(1) — just read from your pre-computed feed.

**Why it fails for celebrities:** 
Kylie Jenner has 360 million followers. When she tweets, fan-out on write means 360 million Redis writes must happen. Problems:

1. **Sheer volume:** 360M Redis writes per tweet, multiplied by the number of celebrity tweets per day. This represents a massive write spike with every celebrity post.

2. **Latency:** The 360M writes take minutes to complete. The tweet "appears" in followers' timelines gradually, not instantly.

3. **Wasted writes:** Many of Kylie's 360M followers are inactive accounts. Pre-computing their feeds wastes memory and write throughput.

**Why fan-out on read doesn't work for regular users:**
If you follow 500 regular users, reading the timeline requires: `SELECT tweets FROM each of 500 users ORDER BY timestamp` — 500+ queries or one massive `IN (500 IDs)` query. At 300M DAU × 5 timeline loads/day = 1.5B reads/day, this is catastrophic for the database.

**The hybrid solution:**
- Regular users (< 100K followers): fan-out on write to Redis Sorted Sets
- Celebrities (> 100K followers): no fan-out; inject at read time
- Read: personal Redis feed + merge celebrity tweets from followed celebrities

---

## Q3: What is a Snowflake ID and why is it better than a UUID or auto-increment for tweet IDs?

**Answer:**
**Snowflake ID** is a 64-bit integer generated in a distributed way:
- 41 bits: milliseconds since a custom epoch (~69 years of IDs)
- 5 bits: datacenter ID
- 5 bits: machine ID
- 12 bits: sequence number (4,096 IDs per millisecond per machine)

**Why not UUID?**
- UUID is 128 bits = 16 bytes vs Snowflake 64 bits = 8 bytes. Halves the storage and index size.
- UUIDs are random → random index insertions → B-tree page splits → poor write performance for the tweets table
- UUIDs are not time-sortable → cannot sort tweets by ID to get chronological order

**Why not auto-increment?**
- Auto-increment requires a centralized ID generator (the DB's sequence) — a single bottleneck and SPOF
- At 7,000 tweets/sec, each tweet must coordinate with the central counter → latency + throughput bottleneck
- Auto-increment leaks information: competitors can estimate your volume from sequential IDs

**Why Snowflake wins:**
- Time-sortable: IDs naturally increase with time, so `ORDER BY tweet_id` is chronological
- Distributed generation: each machine generates IDs independently, no coordination
- Compact: 64-bit integer, fits in standard BIGINT column
- Embeds metadata: can decode creation timestamp, datacenter, machine from any Snowflake ID
- At the scale of one datacenter with 32 machines: 4,096 × 32 = 131,072 IDs/millisecond — far exceeds any realistic tweet rate

---

## Q4: How does search work in a news feed system? Why not just query the tweets database?

**Answer:**
Full-text search in a relational database requires either:
- `LIKE '%election%'` — full table scan, O(N) with no index
- Full-text index (MySQL FULLTEXT, PostgreSQL tsvector) — works but doesn't scale to billions of tweets with complex ranking

**Elasticsearch** is the standard solution:

**Indexing pipeline:**
1. Tweet created → Kafka `tweet-created` topic
2. Elasticsearch indexer consumer reads from Kafka
3. Indexes tweet content, author, timestamp, hashtags, engagement metrics
4. Lag: tweets appear in search ~2-10 seconds after creation (acceptable)

**Search query advantages:**
- BM25 relevance ranking (better than simple keyword match)
- Faceted filtering: `filter: { created_at: { gte: "2024-01-01" } }`
- Fuzzy matching for typos
- Hashtag-specific fields for trending queries
- Geo queries for local tweets

**Pagination with Elasticsearch:**
- `from/size` is O(offset) — `from: 10000, size: 10` requires computing 10,010 results
- At page 1000, this is unacceptable
- Solution: `search_after` cursor — uses the sort values of the last result as a cursor
  - First page: `sort: [{ timestamp: "desc" }, { tweet_id: "desc" }]`
  - Next page: `search_after: [lastTimestamp, lastTweetId]`
  - This is O(1) per page regardless of pagination depth

**Why keep Elasticsearch separate from tweets DB:**
- Read patterns are completely different (search vs key lookup)
- Elasticsearch can be eventually consistent (2-10s lag is acceptable for search)
- Allows independent scaling (tweet DB scales for throughput, ES scales for search)
- Schema changes in ES don't require migrating the tweets table

---

## Q5: How would you implement trending topics? Walk through the algorithm and data structure.

**Answer:**

**Data structure:** Redis Sorted Set with hashtag → occurrence count as score.

**Real-time counting:**
- As tweets are created, extract hashtags from content
- `ZINCRBY trending:1h "#python" 1` — atomic increment
- Multiple time windows: 1-hour, 24-hour, 7-day (separate Sorted Sets)
- Top 10: `ZREVRANGE trending:1h 0 9 WITHSCORES`

**Handling the time window:**
Challenge: you want "trending in the last hour," not "trending all-time." The Sorted Set naturally accumulates without decay.

**Solution 1: Fixed window replacement**
Every hour, create a new Sorted Set `trending:1h:{current_hour}`. At read time, query the current and previous window, sum scores. Clean up windows older than 2 hours.

**Solution 2: Sliding window log**
For each hashtag, store timestamps as Sorted Set members: `ZADD hashtag:#python {timestamp} {unique_id}`. Count: `ZCOUNT hashtag:#python {now-3600} {now}`. Expensive for high-volume hashtags.

**Solution 3: Decay factor**
Periodically multiply all scores by a decay factor (e.g., 0.9 every 10 minutes). Old mentions diminish, new ones dominate. Simple, but imprecise.

**Production approach (combination):**
Use Kafka Streams or Apache Flink for real-time windowed aggregation. Every minute, produce a "current top hashtags" snapshot to Redis. Dashboard reads the snapshot (pre-computed, O(1)). This handles billions of tweets without Redis becoming a bottleneck.

**Personalization:**
- Filter by user's language preference (only show English trending for English user)
- Filter by location (Twitter's "trending in New York")
- Remove muted words and accounts

---

## Q6: The feed cache is 240GB for 300M users. How do you manage memory effectively?

**Answer:**
The 240GB estimate assumes all 300M users have active feeds in Redis at all times. In practice:

**Inactive user eviction:**
- If a user hasn't opened Twitter in 7 days, their feed cache expires (Redis TTL on the sorted set key)
- On next login, rebuild their feed by querying recent tweets from followed users (expensive once, then cached)
- With 10% weekly active rate: only ~30M users have active feeds = 24GB → fits in a modest Redis cluster

**Feed size limits:**
- Cap each feed at 800 tweet IDs (as Twitter does)
- Old tweets beyond 800 are fetched on demand from the tweet database when user scrolls far back
- 800 × 8 bytes = 6,400 bytes per user = 6.4KB

**Compression:**
- Tweet IDs as integers can be delta-encoded (store differences between consecutive sorted IDs instead of absolute values). Delta values are small (milliseconds between tweets), compress well.
- Reduces memory by 30-50% for dense feeds

**Redis Cluster:**
- Shard feed keys across multiple Redis nodes
- `feed:{user_id}` naturally shards by user_id hash
- Each node stores feeds for a subset of users
- 30M active users × 6.4KB ≈ 192GB → 3-node cluster × 128GB = 384GB available

**Pre-warming on login:**
- When user logs in after a long absence: queue a background job to rebuild their feed from the tweet database
- Show cached content immediately (even if stale), update the feed asynchronously
- This is Twitter's "while you were away" feature pattern

---

## Q7: How would you handle the read-after-write consistency for tweets? (When I post, I see my own tweet instantly)

**Answer:**
Read-after-write inconsistency is when: you post a tweet → the fan-out takes 2 seconds → you immediately refresh your timeline → your tweet doesn't appear yet.

**Solutions:**

1. **Write directly to your own feed synchronously:**
   On tweet creation, in addition to queuing the fan-out:
   - Immediately ZADD the tweet to the author's own Redis feed
   - This is done synchronously before returning HTTP 201
   - The author sees their tweet instantly; followers may see it after fan-out completes (eventual consistency)
   
2. **Client-side optimistic update:**
   The mobile/web client immediately shows the tweet in the UI before server confirmation. Even if the API call fails, the tweet appears temporarily (with a "failed to post" state). This is how Twitter's app actually works — the tweet appears in your timeline immediately in the UI.

3. **Read your own tweets from the tweet database:**
   For the tweet author only: check if `tweets WHERE user_id = me AND created_at > last_feed_load` and inject these at the top of the timeline. This ensures you always see your own recent tweets regardless of fan-out status.

**In production:** Combine approaches 1 and 2. Synchronous write to author's own feed + client optimistic update = zero perceived latency for the author. Followers see the tweet after fan-out (seconds, usually milliseconds).

---

## Q8: Walk me through the retweet mechanism. How is it different from a regular tweet?

**Answer:**
A retweet is not a copy of the original tweet — it's a reference. This is crucial for:

**Storage:**
- A retweet stores: `{ tweet_id, user_id, original_tweet_id, created_at }`
- The content is NOT duplicated. `SELECT t.content FROM retweets r JOIN tweets t ON t.id = r.original_tweet_id`
- For a tweet retweeted 1 million times: only 1 copy of content, 1M retweet records

**Fan-out behavior:**
- When you retweet, the fan-out service pushes your retweet's tweet_id (not the original's) to your followers' feeds
- Your followers see the retweet in their timeline with attribution ("User X retweeted User Y's tweet")

**Engagement counters:**
- The original tweet's `retweet_count` is incremented (denormalized counter on the tweets table)
- Not updated synchronously on the write path — updated via async Kafka consumer to avoid write latency
- Small staleness (seconds) in displayed count is acceptable

**Display merging:**
When loading a timeline, if the feed contains a retweet_id, fetch: the retweet record + the original tweet it references. This requires a join or two sequential fetches. In practice: cache the full enriched retweet view in Redis to avoid the join on every timeline load.

**Quote retweet:** A separate entity — it has its own content + a reference to the original tweet. Treated as a regular tweet with an embedded "card" linking to the original.

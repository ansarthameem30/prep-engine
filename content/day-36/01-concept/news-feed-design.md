# Day 36 — System Design Practice: News Feed / Twitter Timeline

## Requirements

**Functional:**
- Post a tweet (text, images, videos)
- Follow and unfollow users
- View home timeline: 20 most recent tweets from followed users
- Like and retweet

**Non-functional:**
- 300M DAU
- 600M tweets created per day (2,000 writes/sec average, ~15,000/sec peak)
- Timeline load < 200ms P99
- Availability > 99.99% (< 52 minutes downtime/year)
- Eventual consistency for timeline (showing a tweet a few seconds late is acceptable)

---

## Back-of-Envelope Estimates

- Write QPS: 600M / 86,400 = 7,000 tweets/sec (peak ~3×: 21,000/sec)
- Read QPS: Each DAU loads timeline ~5 times/day = 1.5B reads/day = 17,400 reads/sec (peak ~3×: 52,000/sec)
- Read:Write ratio: ~52,000 / 21,000 ≈ **2.5:1** — surprisingly write-heavy vs other systems
- Storage: 1 tweet ≈ 280 chars + metadata ≈ 500 bytes. 600M × 500B = 300GB/day. 300GB × 365 = ~110TB/year
- Media: 10% of tweets have images. 60M × 3MB = 180TB/day — must use S3 + CDN

---

## The Core Design Challenge: Fan-out

When user A tweets to 1 million followers, how do we deliver that tweet to all followers' timelines efficiently? This is the **fan-out problem**.

### Fan-out on Write (Push Model)

When a tweet is created, immediately push it to the home timeline cache of every follower.

```
User tweets → Find all followers (N) → Write tweet_id to each follower's Redis sorted set
```

**Pros:**
- Read path is O(1): just read from your pre-computed Redis feed
- Timeline loads are ultra-fast (all data is pre-computed)

**Cons:**
- For a celebrity with 360M followers (Kylie Jenner), one tweet = 360M Redis writes = **write amplification**
- Each of those Redis writes must happen before the tweet is "delivered" — takes minutes for a celebrity
- Wasted work for inactive users: pushing to feeds of users who haven't opened Twitter in months

### Fan-out on Read (Pull Model)

When a user loads their timeline, query tweets from all followed users at read time.

```
User loads timeline → Get list of followed_user_ids → 
  SELECT tweets WHERE user_id IN (followed_ids) ORDER BY created_at DESC LIMIT 20
```

**Pros:**
- No fan-out cost on write — a tweet is created once
- Works equally well for celebrities and regular users

**Cons:**
- N+1 query problem: if you follow 500 users, that's 500+ queries or one massive `IN (500 IDs)` query
- Slow for users who follow many active accounts
- Database load proportional to follower count × activity

### Hybrid Model (Twitter's actual approach)

Use fan-out on write for regular users (< ~10,000 followers), fan-out on read for celebrities. Merge results at read time.

**How it works:**
1. When a regular user tweets: push to all followers' Redis sorted sets (fast, manageable fan-out)
2. When a celebrity tweets: do NOT push to followers. Store the tweet in a separate celebrity tweets store.
3. When loading timeline: fetch from personal Redis feed + inject any celebrity tweets from followed celebrities

This is sometimes called a **hybrid timeline** or **timeline merging** approach.

---

## Snowflake ID Generation

Tweet IDs must be: globally unique, sortable by time (timeline ordering), and generated without coordination between servers.

**Twitter's Snowflake ID (64-bit):**
```
| 41 bits: milliseconds since epoch | 5 bits: datacenter | 5 bits: machine | 12 bits: sequence |
```

- 41 bits of timestamp: supports ~69 years from epoch
- 5 bits datacenter: 32 datacenters
- 5 bits machine: 32 machines per datacenter
- 12 bits sequence: 4,096 IDs per millisecond per machine

**Properties:**
- Globally unique (no coordination required at generation time)
- Sortable by creation time (higher ID = newer tweet)
- 4,096 × 32 × 32 = 4M IDs/millisecond globally — far exceeds Twitter's requirements
- Decode the timestamp from any tweet ID: `(id >> 22) + epoch`

---

## Data Model

**tweets table** (sharded by tweet_id range):
```sql
tweet_id      BIGINT PRIMARY KEY  -- Snowflake ID
user_id       BIGINT NOT NULL
content       TEXT
media_ids     BIGINT[]
like_count    INT DEFAULT 0
retweet_count INT DEFAULT 0
created_at    TIMESTAMPTZ         -- derivable from Snowflake ID, stored for convenience
```

**users table** (sharded by user_id hash):
```sql
user_id          BIGINT PRIMARY KEY
username         VARCHAR(50) UNIQUE
display_name     VARCHAR(100)
follower_count   INT
following_count  INT
is_celebrity     BOOLEAN DEFAULT FALSE  -- > 10K followers
```

**follows table** (social graph — separate service):
```sql
follower_id   BIGINT
followed_id   BIGINT
created_at    TIMESTAMPTZ
PRIMARY KEY (follower_id, followed_id)
```

**feed_cache (Redis Sorted Set per user):**
```
Key: feed:{user_id}
Members: tweet_ids
Scores: tweet creation timestamps (for ordering)
Max 800 tweet_ids per feed (in-memory, no need for unlimited history)
```

---

## Media Storage

- **S3** for all images and videos (original + transcoded)
- **CloudFront CDN** for delivery (images served from edge nodes globally)
- **Video transcoding:** When a video tweet is created, publish to Kafka topic. Dedicated transcoding workers (ffmpeg) consume from Kafka, produce 360p/720p/1080p variants, upload to S3, notify tweet service that media is ready.
- **Image resizing:** Lambda function triggered by S3 upload, produces thumbnail variants

---

## Search: Elasticsearch

Full-text tweet search cannot be done efficiently in a relational database at this scale.

- On tweet creation: publish to Kafka topic `tweet-created`
- Search indexer Kafka consumer writes to Elasticsearch
- Lag: tweets appear in search results 2-10 seconds after creation (acceptable)
- Search query: `GET /tweets/_search {"query": {"match": {"content": "election results"}}}`
- Pagination: use `search_after` cursor (not `from/size` which is O(offset) expensive for deep pagination)

---

## Trending Topics

**Algorithm:**
1. Parse every tweet's hashtags as it's written (Kafka stream)
2. Increment `ZINCRBY trending:{window} 1 "#hashtag"` in Redis Sorted Set
3. Multiple time windows: 1-hour, 24-hour (different Sorted Sets with different TTLs)
4. Top 10 trends: `ZREVRANGE trending:1h 0 9 WITHSCORES`
5. Refresh UI every 60 seconds

**Decay mechanism:** Each time window's Sorted Set is cleared on a schedule (replace with new one), or use a sliding window by storing `hashtag:timestamp` as members and removing old ones.

**Personalization:** Filter trending topics against user's geographic location and muted words.

---

## Full System Architecture

```
Mobile/Web Client
      ↓
CloudFront (static assets, media delivery)
      ↓
AWS ALB
      ↓
API Servers (100+ instances, stateless, auto-scaled)
  │
  ├── Tweet Write Path:
  │     ├── Generate Snowflake ID
  │     ├── Write to tweets DB (sharded)
  │     ├── Publish to Kafka: "TweetCreated"
  │     └── Fan-out Service (Kafka consumer):
  │           ├── Regular users: ZADD feed:{follower_id} timestamp tweet_id
  │           └── Celebrities: skip fan-out, store in celebrity_tweets table
  │
  └── Timeline Read Path:
        ├── Read feed:{user_id} from Redis (sorted set, top 20 tweet_ids)
        ├── Fetch tweet content from tweets cache (Redis hash by tweet_id)
        ├── For followed celebrities: query celebrity_tweets table + merge
        └── Return merged, sorted, deduplicated timeline

Data Stores:
  - tweets DB: PostgreSQL sharded by tweet_id, read replicas
  - social graph: Cassandra (optimized for follow/follower lookups)
  - feed cache: Redis Cluster (100 tweet_ids × 300M users = huge dataset)
  - media: S3 + CloudFront
  - search: Elasticsearch cluster
  - analytics: Kafka → ClickHouse
```

---

## Scaling Numbers

**Feed cache storage:**
- 100 tweet IDs per user × 8 bytes (Snowflake ID) = 800 bytes per user
- 300M users × 800 bytes = **240GB** for all user feeds
- Redis Cluster with 10 nodes × 32GB = 320GB capacity — fits!

**Fan-out throughput:**
- Regular user tweets: average 300 followers × 7,000 tweets/sec = 2.1M Redis writes/sec
- Redis Cluster handles millions of ops/sec — manageable

**Celebrity fan-out problem:**
- Kylie Jenner: 360M followers × 7 tweets/day = 2.5 billion Redis writes per day from one user
- This is why celebrities use the pull model
- The threshold for "celebrity" treatment: ~100K-500K followers (Twitter uses a dynamic threshold)

---

## Trade-offs Discussed

1. **Fan-out on write vs read:** Write amplification vs read complexity. Hybrid is the production answer.
2. **Push model inactive users:** Pre-computing feeds for users who haven't logged in for 30 days wastes Redis memory. Consider evicting feeds for inactive users (rebuild on next login).
3. **Timeline consistency:** A tweet may appear in your timeline 1-2 seconds after creation (fan-out lag). This is intentional — Twitter's timeline is eventually consistent.
4. **Self-tweet immediacy:** When you post a tweet, you expect to see it instantly. Solution: write directly to your own Redis feed on the write path (before fan-out completes).
5. **Retweets:** A retweet stores reference to original tweet, not a copy. Fan-out the retweet_id, not duplicated content.

/**
 * Day 36 — News Feed / Twitter Timeline: Hands-on Exercises
 */

const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Snowflake ID Generator
// ─────────────────────────────────────────────────────────────────────────────

class SnowflakeGenerator {
  constructor(datacenterId = 1, machineId = 1) {
    // Bit allocations
    this.EPOCH = 1288834974657n; // Twitter's epoch (Nov 04, 2010 UTC) in milliseconds
    this.DATACENTER_BITS = 5n;
    this.MACHINE_BITS = 5n;
    this.SEQUENCE_BITS = 12n;

    this.MAX_SEQUENCE = -1n ^ (-1n << this.SEQUENCE_BITS); // 4095
    this.DATACENTER_SHIFT = this.MACHINE_BITS + this.SEQUENCE_BITS;
    this.TIMESTAMP_SHIFT = this.DATACENTER_BITS + this.MACHINE_BITS + this.SEQUENCE_BITS;

    this.datacenterId = BigInt(datacenterId);
    this.machineId = BigInt(machineId);
    this.sequence = 0n;
    this.lastTimestamp = -1n;
  }

  nextId() {
    let timestamp = BigInt(Date.now());

    if (timestamp < this.lastTimestamp) {
      throw new Error(`Clock moved backwards! Refuse to generate IDs for ${this.lastTimestamp - timestamp}ms`);
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & this.MAX_SEQUENCE;
      if (this.sequence === 0n) {
        // Sequence overflow — wait for next millisecond
        while (timestamp <= this.lastTimestamp) {
          timestamp = BigInt(Date.now());
        }
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    return (
      ((timestamp - this.EPOCH) << this.TIMESTAMP_SHIFT) |
      (this.datacenterId << this.DATACENTER_SHIFT) |
      (this.machineId << this.SEQUENCE_BITS) |
      this.sequence
    );
  }

  extractTimestamp(snowflakeId) {
    return Number((BigInt(snowflakeId) >> this.TIMESTAMP_SHIFT) + this.EPOCH);
  }
}

console.log("=== Snowflake ID Generator ===");
const gen = new SnowflakeGenerator(1, 1);
const ids = [];
for (let i = 0; i < 5; i++) {
  const id = gen.nextId();
  ids.push(id);
  const ts = gen.extractTimestamp(id);
  console.log(`ID: ${id} | Created: ${new Date(ts).toISOString()} | Sortable: ${i > 0 && id > ids[i - 1] ? "✓" : "first"}`);
}
console.log("All IDs time-sortable:", ids.every((id, i) => i === 0 || id > ids[i - 1]));


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Fan-out on Write — Publish Tweet → Push to Follower Feeds
// ─────────────────────────────────────────────────────────────────────────────

// Simulated Redis Sorted Sets
class FeedStore {
  constructor() {
    this.feeds = new Map(); // userId -> Map(tweetId -> timestamp)
    this.MAX_FEED_SIZE = 800;
  }

  pushToFeed(userId, tweetId, timestamp) {
    if (!this.feeds.has(userId)) this.feeds.set(userId, new Map());
    const feed = this.feeds.get(userId);
    feed.set(String(tweetId), timestamp);

    // Trim to MAX_FEED_SIZE (keep most recent)
    if (feed.size > this.MAX_FEED_SIZE) {
      const sorted = [...feed.entries()].sort((a, b) => b[1] - a[1]);
      this.feeds.set(userId, new Map(sorted.slice(0, this.MAX_FEED_SIZE)));
    }
  }

  getFeed(userId, limit = 20) {
    const feed = this.feeds.get(userId) ?? new Map();
    return [...feed.entries()]
      .sort((a, b) => b[1] - a[1]) // Most recent first
      .slice(0, limit)
      .map(([tweetId]) => tweetId);
  }
}

// Social graph
const followGraph = new Map(); // userId -> Set(followedUserId)
const userProfiles = new Map([
  [1, { username: "alice", isCelebrity: false }],
  [2, { username: "bob", isCelebrity: false }],
  [3, { username: "carol", isCelebrity: false }],
  [100, { username: "elon", isCelebrity: true }], // Celebrity: no fan-out
]);

function follow(followerId, followedId) {
  if (!followGraph.has(followerId)) followGraph.set(followerId, new Set());
  followGraph.get(followerId).add(followedId);
}

function getFollowers(userId) {
  // Reverse lookup: who follows userId?
  const followers = [];
  for (const [follower, followed] of followGraph) {
    if (followed.has(userId)) followers.push(follower);
  }
  return followers;
}

const feedStore = new FeedStore();
const tweetStore = new Map(); // tweetId -> tweet object
const celebrityTweets = new Map(); // userId -> [tweetIds]

class TweetService {
  constructor() {
    this.generator = new SnowflakeGenerator(1, 1);
  }

  async createTweet(userId, content) {
    const tweetId = String(this.generator.nextId());
    const timestamp = Date.now();

    const tweet = { tweetId, userId, content, timestamp, likes: 0, retweets: 0 };
    tweetStore.set(tweetId, tweet);

    const author = userProfiles.get(userId);
    const isCelebrity = author?.isCelebrity ?? false;

    if (isCelebrity) {
      // No fan-out — store separately, inject at read time
      if (!celebrityTweets.has(userId)) celebrityTweets.set(userId, []);
      celebrityTweets.get(userId).unshift(tweetId);
      console.log(`[TweetService] @${author.username} (CELEBRITY) tweeted: "${content}" — no fan-out`);
    } else {
      // Fan-out on write
      const followers = getFollowers(userId);
      // Also push to author's own feed
      feedStore.pushToFeed(userId, tweetId, timestamp);

      for (const followerId of followers) {
        feedStore.pushToFeed(followerId, tweetId, timestamp);
      }
      console.log(`[TweetService] @${author?.username} tweeted: "${content}" → fanned out to ${followers.length} followers`);
    }

    return tweet;
  }
}

class TimelineService {
  getTimeline(userId, limit = 20) {
    // 1. Get pre-computed feed from Redis
    const feedTweetIds = feedStore.getFeed(userId, limit);

    // 2. Inject celebrity tweets from followed celebrities
    const followed = followGraph.get(userId) ?? new Set();
    const celebrityTweetIds = [];
    for (const followedId of followed) {
      const profile = userProfiles.get(followedId);
      if (profile?.isCelebrity) {
        const celebTweets = (celebrityTweets.get(followedId) ?? []).slice(0, 10);
        celebrityTweetIds.push(...celebTweets);
      }
    }

    // 3. Merge and sort by timestamp
    const allIds = [...new Set([...feedTweetIds, ...celebrityTweetIds])];
    return allIds
      .map((id) => tweetStore.get(id))
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

async function runFeedDemo() {
  console.log("\n=== Fan-out on Write / Hybrid Timeline ===");

  // Set up follows
  follow(1, 2);   // alice follows bob
  follow(1, 3);   // alice follows carol
  follow(1, 100); // alice follows elon (celebrity)
  follow(2, 1);   // bob follows alice

  const tweetService = new TweetService();
  const timelineService = new TimelineService();

  await tweetService.createTweet(2, "Hello, world! I'm Bob.");
  await tweetService.createTweet(3, "Carol here, sharing thoughts.");
  await tweetService.createTweet(100, "Going to Mars next Tuesday."); // Celebrity
  await tweetService.createTweet(1, "Alice's reply to everyone!");

  console.log("\nAlice's timeline (includes celebrity tweet via pull):");
  const aliceTimeline = timelineService.getTimeline(1);
  aliceTimeline.forEach((t) => {
    const author = userProfiles.get(t.userId);
    console.log(`  @${author?.username}: "${t.content}"`);
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Timeline Generation — Merge Celebrity + Regular Feed
// ─────────────────────────────────────────────────────────────────────────────

function mergeTimelines(regularFeedTweets, celebrityTweets, limit = 20) {
  // Merge two sorted (by timestamp desc) arrays — O(n + m)
  const result = [];
  let i = 0, j = 0;
  const seenIds = new Set();

  while (result.length < limit && (i < regularFeedTweets.length || j < celebrityTweets.length)) {
    const a = regularFeedTweets[i];
    const b = celebrityTweets[j];

    let chooseA;
    if (!a) chooseA = false;
    else if (!b) chooseA = true;
    else chooseA = a.timestamp >= b.timestamp;

    const chosen = chooseA ? a : b;
    if (chooseA) i++; else j++;

    if (!seenIds.has(chosen.tweetId)) {
      seenIds.add(chosen.tweetId);
      result.push(chosen);
    }
  }

  return result;
}

console.log("\n=== Timeline Merge ===");
const regularTweets = [
  { tweetId: "T3", timestamp: 1000030, content: "Tweet 3 (regular)" },
  { tweetId: "T1", timestamp: 1000010, content: "Tweet 1 (regular)" },
];
const celebTweets = [
  { tweetId: "C2", timestamp: 1000025, content: "Celeb tweet 2" },
  { tweetId: "C1", timestamp: 1000005, content: "Celeb tweet 1" },
];
const merged = mergeTimelines(regularTweets, celebTweets);
console.log("Merged timeline (newest first):");
merged.forEach((t) => console.log(`  [${t.timestamp}] ${t.content}`));


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Trending Hashtag Counter with Sliding Window
// ─────────────────────────────────────────────────────────────────────────────

class TrendingHashtagService {
  constructor(windowMs = 3600000) { // 1-hour window
    this.windowMs = windowMs;
    // Map: hashtag -> array of timestamps (within current window)
    this.counts = new Map();
  }

  recordHashtag(hashtag) {
    const now = Date.now();
    if (!this.counts.has(hashtag)) this.counts.set(hashtag, []);
    const timestamps = this.counts.get(hashtag);
    timestamps.push(now);
    // Prune expired timestamps
    const cutoff = now - this.windowMs;
    while (timestamps.length && timestamps[0] < cutoff) timestamps.shift();
  }

  getTopTrending(n = 10) {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const scores = [];
    for (const [hashtag, timestamps] of this.counts) {
      const validCount = timestamps.filter((t) => t >= cutoff).length;
      if (validCount > 0) scores.push({ hashtag, count: validCount });
    }
    return scores.sort((a, b) => b.count - a.count).slice(0, n);
  }
}

console.log("\n=== Trending Hashtags ===");
const trending = new TrendingHashtagService(60000); // 1-minute window for demo

const hashtags = ["#AI", "#NodeJS", "#SystemDesign", "#AI", "#AI", "#NodeJS",
  "#SystemDesign", "#SystemDesign", "#SystemDesign", "#Kafka", "#AI", "#NodeJS"];
hashtags.forEach((h) => trending.recordHashtag(h));

const top = trending.getTopTrending(5);
console.log("Top trending hashtags:");
top.forEach(({ hashtag, count }, i) => {
  console.log(`  ${i + 1}. ${hashtag} — ${count} mentions`);
});


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Follow Graph — BFS for Mutual Friends
// ─────────────────────────────────────────────────────────────────────────────

class SocialGraph {
  constructor() {
    this.follows = new Map(); // userId -> Set(followedUserId)
  }

  follow(a, b) {
    if (!this.follows.has(a)) this.follows.set(a, new Set());
    this.follows.get(a).add(b);
  }

  getFollowing(userId) {
    return this.follows.get(userId) ?? new Set();
  }

  getMutualFollows(userA, userB) {
    // Set intersection: people both A and B follow
    const aFollowing = this.getFollowing(userA);
    const bFollowing = this.getFollowing(userB);
    return [...aFollowing].filter((uid) => bFollowing.has(uid));
  }

  // BFS: Find all users reachable within `maxDegrees` hops from start user
  bfsFollowNetwork(startUserId, maxDegrees = 2) {
    const visited = new Map(); // userId -> degree
    const queue = [{ userId: startUserId, degree: 0 }];
    visited.set(startUserId, 0);

    while (queue.length > 0) {
      const { userId, degree } = queue.shift();
      if (degree >= maxDegrees) continue;

      for (const followedId of this.getFollowing(userId)) {
        if (!visited.has(followedId)) {
          visited.set(followedId, degree + 1);
          queue.push({ userId: followedId, degree: degree + 1 });
        }
      }
    }

    return visited;
  }

  // "People you may know": users followed by your friends but not by you
  recommendFollows(userId, limit = 5) {
    const iFollow = this.getFollowing(userId);
    const scores = new Map(); // candidateId -> score (# of mutual follows)

    for (const friendId of iFollow) {
      for (const friendFollows of this.getFollowing(friendId)) {
        if (friendFollows === userId || iFollow.has(friendFollows)) continue;
        scores.set(friendFollows, (scores.get(friendFollows) ?? 0) + 1);
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([uid, score]) => ({ userId: uid, mutualFriendCount: score }));
  }
}

console.log("\n=== Social Graph — BFS + Recommendations ===");
const graph = new SocialGraph();
// Setup a small social network
graph.follow(1, 2); graph.follow(1, 3); graph.follow(1, 4);
graph.follow(2, 4); graph.follow(2, 5); graph.follow(2, 6);
graph.follow(3, 5); graph.follow(3, 7);
graph.follow(4, 8);

console.log("Mutual follows (user 1 & 2):", graph.getMutualFollows(1, 2)); // [4]
console.log("BFS 2-hop network from user 1:", [...graph.bfsFollowNetwork(1, 2).entries()]);
console.log("Recommendations for user 1:", graph.recommendFollows(1));
// Should recommend user 5 (followed by 2 and 3) with score 2, user 6 (by 2) score 1

// Run all
runFeedDemo();

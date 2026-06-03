/**
 * Day 31 — System Design: Foundations + Scalability
 * Hands-on Exercises
 */

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Back-of-Envelope Estimation — Photo Sharing App (500M users)
// ─────────────────────────────────────────────────────────────────────────────

function estimatePhotoApp() {
  const SECONDS_PER_DAY = 86_400;
  const TOTAL_USERS = 500_000_000;
  const DAU_RATIO = 0.1;
  const PHOTOS_VIEWED_PER_DAU = 20;
  const UPLOADS_PER_USER_PER_DAY = 1 / 10; // one photo every 10 days
  const PHOTO_SIZE_MB = 3;
  const THUMBNAIL_SIZE_KB = 100;

  const dau = TOTAL_USERS * DAU_RATIO;
  const readReqPerDay = dau * PHOTOS_VIEWED_PER_DAU;
  const readQPS = readReqPerDay / SECONDS_PER_DAY;
  const writeReqPerDay = TOTAL_USERS * UPLOADS_PER_USER_PER_DAY;
  const writeQPS = writeReqPerDay / SECONDS_PER_DAY;

  const storagePerDayGB = (writeReqPerDay * PHOTO_SIZE_MB) / 1024;
  const storagePerYearTB = (storagePerDayGB * 365) / 1024;
  const storageFor10YearsPB = (storagePerYearTB * 10) / 1024;

  const bandwidthGbps = (readQPS * PHOTO_SIZE_MB * 8) / 1024; // Gbps

  console.log("=== Photo Sharing App Estimation ===");
  console.log(`DAU: ${(dau / 1e6).toFixed(0)}M`);
  console.log(`Read QPS: ${readQPS.toFixed(0)} req/sec`);
  console.log(`Write QPS: ${writeQPS.toFixed(0)} req/sec`);
  console.log(`Storage per day: ${storagePerDayGB.toFixed(1)} GB`);
  console.log(`Storage per year: ${storagePerYearTB.toFixed(1)} TB`);
  console.log(`Storage for 10 years: ${storageFor10YearsPB.toFixed(2)} PB`);
  console.log(`Peak outbound bandwidth: ~${bandwidthGbps.toFixed(1)} Gbps → requires CDN`);

  /*
   * Conclusions:
   * - 11,600 read req/sec → needs caching layer (Redis/CDN for hot photos)
   * - ~58 write req/sec  → manageable with a write queue + async processing
   * - ~5.4 PB/year storage → must use object storage (S3) + tiered archiving (Glacier)
   * - 34 GB/sec bandwidth → absolutely requires CDN (CloudFront/Akamai)
   */
}

estimatePhotoApp();


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Consistent Hashing with Virtual Nodes
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");

class ConsistentHashRing {
  constructor(virtualNodes = 150) {
    this.virtualNodes = virtualNodes;
    this.ring = new Map(); // hash -> nodeId
    this.sortedKeys = [];  // sorted array of hashes
  }

  _hash(key) {
    return parseInt(
      crypto.createHash("md5").update(key).digest("hex").slice(0, 8),
      16
    );
  }

  addNode(nodeId) {
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualKey = `${nodeId}#VN${i}`;
      const hash = this._hash(virtualKey);
      this.ring.set(hash, nodeId);
      this.sortedKeys.push(hash);
    }
    this.sortedKeys.sort((a, b) => a - b);
    console.log(`Added node: ${nodeId} (${this.virtualNodes} virtual nodes)`);
  }

  removeNode(nodeId) {
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualKey = `${nodeId}#VN${i}`;
      const hash = this._hash(virtualKey);
      this.ring.delete(hash);
      const idx = this.sortedKeys.indexOf(hash);
      if (idx !== -1) this.sortedKeys.splice(idx, 1);
    }
    console.log(`Removed node: ${nodeId}`);
  }

  getNode(key) {
    if (this.sortedKeys.length === 0) return null;
    const hash = this._hash(key);
    // Binary search for the first key >= hash
    let lo = 0, hi = this.sortedKeys.length - 1;
    let pos = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedKeys[mid] >= hash) { pos = mid; hi = mid - 1; }
      else lo = mid + 1;
    }
    // Wrap around: if no key >= hash, use the first key (ring wraps)
    const ringPos = this.sortedKeys[pos] >= hash ? pos : 0;
    return this.ring.get(this.sortedKeys[ringPos]);
  }

  getDistribution(numKeys = 10000) {
    const counts = {};
    for (let i = 0; i < numKeys; i++) {
      const node = this.getNode(`key-${i}`);
      counts[node] = (counts[node] || 0) + 1;
    }
    return counts;
  }
}

console.log("\n=== Consistent Hashing Ring ===");
const ring = new ConsistentHashRing(150);
ring.addNode("server-1");
ring.addNode("server-2");
ring.addNode("server-3");

console.log("Distribution (10,000 keys):", ring.getDistribution(10000));
// Each server should get ~33% of keys

console.log("Key 'user:1001' -> ", ring.getNode("user:1001"));
console.log("Key 'session:abc' -> ", ring.getNode("session:abc"));

ring.removeNode("server-2");
console.log("After removing server-2:");
console.log("Distribution:", ring.getDistribution(10000));
// Only ~33% of keys remapped (moved from server-2 to neighbors)


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Load Balancer Simulation — Round Robin + Least Connections
// ─────────────────────────────────────────────────────────────────────────────

class RoundRobinBalancer {
  constructor(servers) {
    this.servers = servers;
    this.index = 0;
  }

  getServer() {
    const server = this.servers[this.index % this.servers.length];
    this.index++;
    return server;
  }
}

class LeastConnectionsBalancer {
  constructor(servers) {
    this.connections = new Map(servers.map((s) => [s, 0]));
  }

  getServer() {
    let minConn = Infinity, chosen = null;
    for (const [server, count] of this.connections) {
      if (count < minConn) { minConn = count; chosen = server; }
    }
    this.connections.set(chosen, this.connections.get(chosen) + 1);
    return chosen;
  }

  releaseConnection(server) {
    const current = this.connections.get(server);
    if (current > 0) this.connections.set(server, current - 1);
  }
}

console.log("\n=== Load Balancer Simulation ===");
const servers = ["192.168.1.1", "192.168.1.2", "192.168.1.3"];

const rrBalancer = new RoundRobinBalancer(servers);
console.log("Round Robin:");
for (let i = 0; i < 6; i++) console.log(` Request ${i + 1} → ${rrBalancer.getServer()}`);

const lcBalancer = new LeastConnectionsBalancer(servers);
// Simulate server-1 under heavy load
lcBalancer.connections.set("192.168.1.1", 10);
lcBalancer.connections.set("192.168.1.2", 2);
lcBalancer.connections.set("192.168.1.3", 0);
console.log("Least Connections (server-1 busy):");
for (let i = 0; i < 4; i++) {
  const s = lcBalancer.getServer();
  console.log(` Request ${i + 1} → ${s}`);
}
// Should consistently pick server-3 (0 connections), then server-2


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Stateless vs Stateful Sessions for Horizontal Scaling
// ─────────────────────────────────────────────────────────────────────────────

/*
 * STATEFUL (server-side session) — PROBLEM with horizontal scaling:
 *
 * Server A stores: { sessionId: "abc123", userId: 42, cart: [...] }
 * If load balancer routes next request to Server B → session not found → user logged out
 *
 * Solutions (bad ones):
 *   1. Sticky sessions (IP hash) — breaks when server goes down
 *   2. Session replication — expensive, high network traffic
 *
 * STATELESS (JWT) — SCALES HORIZONTALLY:
 * The token carries all state, server validates signature only.
 * Any server can handle any request.
 */

// Simulated stateful session (in-process, does NOT scale horizontally)
const inMemorySessions = new Map();

function createStatefulSession(userId) {
  const sessionId = crypto.randomBytes(16).toString("hex");
  inMemorySessions.set(sessionId, { userId, createdAt: Date.now() });
  return sessionId;
  // Problem: inMemorySessions is local to this server instance.
  // Server B has no knowledge of this session → sticky sessions or shared Redis needed.
}

// Stateless JWT approach (scales across any number of servers)
function base64url(str) {
  return Buffer.from(str).toString("base64url");
}

function createJWT(payload, secret) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }));
  // In production: use jsonwebtoken library for proper HMAC-SHA256
  const signature = base64url(
    crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("hex")
  );
  return `${header}.${body}.${signature}`;
}

function verifyJWT(token, secret) {
  const [header, body, sig] = token.split(".");
  const expectedSig = base64url(
    crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("hex")
  );
  if (sig !== expectedSig) throw new Error("Invalid signature");
  return JSON.parse(Buffer.from(body, "base64url").toString());
}

const SECRET = "super-secret-key";
const token = createJWT({ userId: 42, role: "admin" }, SECRET);
console.log("\n=== Stateless JWT ===");
console.log("Token:", token.slice(0, 50) + "...");
console.log("Verified payload:", verifyJWT(token, SECRET));
// Any server with the secret can verify → truly stateless, horizontally scalable


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: SPOF Identification and Proposed Fixes
// ─────────────────────────────────────────────────────────────────────────────

/*
 * ARCHITECTURE DESCRIPTION (before fixes):
 *
 *   Internet → Single Nginx (EC2 t3.medium) → Single App Server (EC2 m5.large)
 *                                           → Single MySQL (EC2 r5.large)
 *                                           → Single Redis (EC2 t3.small)
 *
 * IDENTIFIED SPOFs AND FIXES:
 *
 * SPOF #1: Single Nginx load balancer
 *   Risk: Nginx goes down → entire application unreachable
 *   Fix: Use AWS ALB (managed, multi-AZ, automatically replicated)
 *        OR deploy Nginx pair with Keepalived/VRRP for VIP failover
 *
 * SPOF #2: Single App Server
 *   Risk: EC2 instance crashes or AZ goes down → no app tier
 *   Fix: Auto Scaling Group with minimum 2 instances across 2 AZs
 *        Use ALB to distribute across instances
 *
 * SPOF #3: Single MySQL
 *   Risk: DB instance fails → complete data loss / downtime
 *   Fix: Amazon RDS Multi-AZ with automatic failover (standby replica in different AZ)
 *        For reads: add read replicas to offload SELECT queries
 *
 * SPOF #4: Single Redis
 *   Risk: Redis instance crashes → cache cold, session data lost
 *   Fix: Amazon ElastiCache Redis with cluster mode enabled (replication + sharding)
 *        OR Redis Sentinel (3 nodes: 1 primary + 1 replica + 1 sentinel for majority)
 *
 * SPOF #5: Single Availability Zone (not stated but implied by single EC2 instances)
 *   Risk: AZ-level failure (power, network) → total outage
 *   Fix: All tiers deployed across minimum 2 AZs; RDS Multi-AZ; ASG multi-AZ
 *
 * SPOF #6: No CDN for static assets
 *   Risk: App server overloaded serving HTML/CSS/JS/images
 *   Fix: CloudFront distribution in front of S3 for static assets
 *        ALB as origin for dynamic API responses
 *
 * FIXED ARCHITECTURE:
 *
 *   Route53 (health check failover)
 *     → CloudFront (static assets from S3)
 *     → AWS ALB (multi-AZ, managed)
 *        → ASG: 2+ App Servers (us-east-1a, us-east-1b)
 *           → RDS MySQL Multi-AZ (primary: 1a, standby: 1b)
 *           → RDS Read Replica (for SELECT-heavy queries)
 *           → ElastiCache Redis Cluster (2+ shards, replicas)
 *           → S3 for object storage (11 nines durability, no SPOF)
 */

const architecture = {
  before: {
    loadBalancer: { type: "single Nginx", spof: true },
    appServer: { type: "single EC2", spof: true },
    database: { type: "single MySQL", spof: true },
    cache: { type: "single Redis", spof: true },
  },
  after: {
    loadBalancer: { type: "AWS ALB (multi-AZ)", spof: false },
    appServer: { type: "ASG min 2, across 2 AZs", spof: false },
    database: { type: "RDS MySQL Multi-AZ + Read Replica", spof: false },
    cache: { type: "ElastiCache Redis Cluster", spof: false },
    staticAssets: { type: "S3 + CloudFront CDN", spof: false },
  },
};

const spofsFound = Object.values(architecture.before).filter((c) => c.spof).length;
console.log(`\n=== SPOF Analysis ===`);
console.log(`SPOFs identified: ${spofsFound}`);
console.log(`All eliminated in redesign: ${Object.values(architecture.after).every((c) => !c.spof)}`);

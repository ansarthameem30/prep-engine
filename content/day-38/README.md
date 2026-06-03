# Day 38 – AWS Serverless: Lambda, API Gateway, SQS vs SNS vs EventBridge & DynamoDB | DSA: Intervals

> **Phase 4 – System Design + AWS + CI/CD + GitHub** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Lambda internals, cold starts, API Gateway, SQS vs SNS vs EventBridge, DynamoDB design |
| Hands-On | 00:40–01:10 | Build a serverless image processing pipeline: S3 → Lambda → SQS → DynamoDB |
| DSA | 01:10–01:25 | Non-overlapping Intervals (#435) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Explain Lambda cold start anatomy and mitigation strategies
- [ ] Choose between SQS, SNS, and EventBridge for different integration patterns
- [ ] Design a DynamoDB table with the correct partition key for a given access pattern
- [ ] Solve: Non-overlapping Intervals (#435) using greedy interval scheduling
- [ ] Review 5 AWS serverless interview questions

---

## Concept: AWS Serverless & Modern Architecture

### What to Study
- **Lambda internals:** Handler function signature `(event, context, callback)` or async; execution environment lifecycle: init (download code + start runtime — cold start), invoke, freeze/thaw (warm start), evict; cold start duration: Node.js 200–400ms, Java 1–3s (JVM); provisioned concurrency keeps execution environments initialized; concurrency limit: 1000 per region (soft limit, raisable); each concurrent invocation gets its own execution environment
- **Cold start mitigation:** Provisioned concurrency (pre-initialized environments — cost ~60% of always-on); Lambda SnapStart (Java — takes snapshot of initialized execution env); keep package size small (tree-shake, avoid heavy dependencies); use Lambda layers for shared dependencies (cached separately); avoid VPC unless needed (ENI attachment adds ~1s cold start — mitigated by VPC reuse in newer Lambda)
- **API Gateway:** REST API (full features, per-request pricing, response caching) vs HTTP API (simpler, 60% cheaper, lower latency, no usage plans) — use HTTP API for most use cases; authorizers: Lambda authorizer (custom JWT/API key validation), Cognito authorizer; throttling: default 10K req/sec burst, 5K steady-state — configurable per stage/route; request/response mapping templates in REST API
- **SQS vs SNS vs EventBridge:** SQS (queue — point-to-point, pull-based, holds messages until consumed, DLQ for failed messages, visibility timeout prevents duplicate processing, FIFO queue for ordering); SNS (pub/sub — one message fan-out to multiple subscribers: SQS, Lambda, HTTP, email — no persistence); EventBridge (event bus — rule-based routing by event pattern, schema registry, cross-account/region, replays, scheduled rules — think "smart SNS with routing")
- **DynamoDB design:** Partition key (hash key) determines physical partition — must be high-cardinality and evenly distributed; sort key (range key) enables range queries within a partition; access pattern-first design (unlike SQL — design table for queries, not normalization); GSI (Global Secondary Index — different partition key, async replication, eventually consistent); LSI (Local Secondary Index — same partition key, different sort key, consistent reads, created at table creation only); DynamoDB Streams trigger Lambda on item changes

### Key Mental Models
- Lambda functions are ephemeral compute — each invocation may get a fresh environment; store state externally (DynamoDB, S3, ElastiCache); but execution environment reuse (warm starts) means module-level variables persist between warm invocations — use this for DB connection caching, but never for request-specific state
- SQS = "I need to make sure this job gets processed exactly once, even if the processor fails" — DLQ catches repeatedly failed messages; SNS = "I need to notify multiple systems about an event"; EventBridge = "I need to route events based on content to different targets with filtering rules"
- DynamoDB's "single table design" is controversial but powerful — multiple entity types in one table with compound keys (PK = "USER#id", SK = "ORDER#timestamp") enables complex hierarchical queries without JOINs

### Why This Matters in Interviews
Serverless is increasingly common in AWS-heavy companies. Lambda cold starts, DynamoDB partition key design, and the SQS vs SNS vs EventBridge decision appear frequently in AWS architecture discussions. A candidate who knows DynamoDB's partition key design (and its consequences for hot partitions) has clearly worked with it in production.

---

## DSA Focus: Intervals – Non-overlapping Intervals

- **Problem:** Non-overlapping Intervals (LeetCode #435)
- **Difficulty:** Medium
- **Pattern:** Greedy – Interval Scheduling (Activity Selection)
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Sort by end time; greedily keep the interval that ends earliest (finishes first = least conflict); count how many intervals you must remove (total - count of non-overlapping kept). This is the classic activity selection problem — always pick the job that finishes soonest

---

## Today's 5 Interview Questions (Flash Review)
1. What is a Lambda cold start and what are the two main approaches to mitigate it in production?
2. You need to process image uploads asynchronously — a user uploads to S3, a Lambda processes it. Should you use SNS or SQS to trigger the Lambda — what are the trade-offs?
3. How does DynamoDB's partition key affect performance — what is a "hot partition" and how do you avoid it?
4. What is the difference between a DynamoDB GSI and LSI — when would you use each?
5. Your Lambda function needs to query a MySQL RDS database — should you use VPC Lambda? What is the trade-off?

---

## Files in This Folder
- `01-concept/` → Read: AWS Lambda developer guide, DynamoDB best practices, SQS vs SNS vs EventBridge decision guide
- `02-hands-on/` → Code: image-pipeline.js (S3 trigger → Lambda handler → SQS message → DynamoDB write), dynamodb-design.md (access pattern → key design)
- `03-dsa/` → DSA: non-overlapping-intervals.js (sort by end time + greedy keep count)
- `04-interview-prep/` → Full Q&A: 5 serverless architecture questions with decision trees and DynamoDB schema examples

---

## Success Criteria
- [ ] Can explain Lambda cold start causes and provisioned concurrency without notes
- [ ] Solved Non-overlapping Intervals in < 20 minutes using greedy sort-by-end approach
- [ ] Confident answering all 5 serverless interview questions
- [ ] Bonus: Design a DynamoDB single-table schema for a multi-tenant application with users, orders, and products

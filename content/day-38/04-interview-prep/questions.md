# Day 38 — Interview Prep: AWS Serverless Architecture

## Q1: What causes Lambda cold starts and how do you mitigate them in production?

**Answer:**
A cold start occurs when Lambda must provision a new execution environment for an invocation, rather than reusing an existing warm one.

**Root causes:**
1. **New execution environment initialization:** AWS must allocate a micro-VM, download and extract the deployment package, initialize the runtime (Node.js startup, Python interpreter, JVM for Java), and run your module-level initialization code (outside the handler).
2. **Scaling out:** When concurrent invocations exceed the number of warm environments, new environments are created.
3. **After inactivity:** Lambda may freeze or terminate execution environments after ~15-60 minutes of inactivity.

**Typical cold start durations:**
- Node.js (minimal): 100-300ms
- Python: 100-500ms
- Java (no optimization): 2-10 seconds
- Java with SnapStart: ~200ms (restored from pre-initialized memory snapshot)

**Mitigation strategies in order of effectiveness:**

1. **Provisioned Concurrency (most effective for latency-critical functions):** Pre-allocates execution environments, zero cold starts for the specified concurrency level. Charged for reserved time + invocations. Use for: API endpoints where P99 latency is critical (checkout, authentication).

2. **Reduce package size:** Smaller zip = faster environment initialization. Use esbuild/webpack to bundle only what you need. Target < 5MB. Avoid including `node_modules` — bundle them or use Lambda layers.

3. **Choose faster runtimes:** Node.js and Python are significantly faster than Java/C#. For Java, enable SnapStart (checkpoint the initialized JVM state, restore on cold start).

4. **Move initialization code outside the handler:** DB connections, SDK clients, config loading — initialize once per execution environment, not per invocation. These costs are paid once, then reused across warm invocations.

5. **Lambda Layers for shared dependencies:** Shared libraries can be pre-cached in execution environments.

6. **ARM64/Graviton:** Slightly faster initialization and cheaper, but not primarily for cold start reduction.

**When to accept cold starts:** For background jobs, async processing, and non-user-facing functions, cold starts are irrelevant (users don't feel them). Optimize only for user-facing APIs.

---

## Q2: Explain DynamoDB single-table design. Why would you put all your entities in one table?

**Answer:**
In relational databases, you design one table per entity type and join them at query time. In DynamoDB, joins are not supported — cross-table access requires multiple sequential API calls. Single-table design co-locates related data in one table using carefully structured keys to enable complex access patterns in a single query.

**The core mechanism:** Primary key design determines what queries are possible:
- `PK = USER#u1, SK = PROFILE` → user profile
- `PK = USER#u1, SK = ORDER#2024-001-TS` → user's order reference
- `PK = ORDER#2024-001, SK = HEADER` → order details
- `PK = ORDER#2024-001, SK = ITEM#laptop` → order line item

All order data (header + items) in one `PK = ORDER#{id}` partition = single Query operation.
All user data (profile + orders) in one `PK = USER#{id}` partition = single Query with SK prefix.

**Why this design?**

1. **Performance:** DynamoDB is optimized for single-partition access. One Query on a partition is O(1) and extremely fast. Multiple round-trips to multiple tables add latency.

2. **Cost efficiency:** DynamoDB charges per read unit. One Query reading 10 items in one partition uses fewer RCUs than 10 GetItem calls to different tables.

3. **Transactional operations:** `TransactWriteItems` can write to multiple items in the same table atomically (up to 100 items). If entities are in separate tables, transactions become complex.

**Tradeoffs:**
- Harder to reason about than relational tables — requires documenting access patterns upfront
- DynamoDB's table viewer shows all mixed entity types together
- Schema migration is harder (no ALTER TABLE — must plan partition key structure carefully upfront)
- Not every access pattern can be served without scatter-gather (use GSI for secondary access patterns)

---

## Q3: How would you choose between SQS Standard, SQS FIFO, SNS, and EventBridge for an event-driven system?

**Answer:**

**SQS Standard:**
- At-least-once delivery (messages may be delivered more than once)
- Best-effort ordering (mostly in order, not guaranteed)
- High throughput: virtually unlimited TPS
- **Use for:** Background job queues, buffer between services, async processing where duplicates are handled by idempotency, email queues, notification queues

**SQS FIFO:**
- Exactly-once processing (deduplication via `MessageDeduplicationId`)
- Strict ordering within a message group (`MessageGroupId`)
- Limited: 300 TPS without batching, 3,000 with batching
- Higher price than Standard
- **Use for:** Financial transactions (payment processing must be ordered), inventory updates (can't process "cancel order" before "place order"), any workflow where message ordering and no duplicates are business requirements

**SNS:**
- Pub/sub: one message → N subscribers simultaneously
- Push-based (immediate delivery), no persistence (if subscriber is offline, message is lost unless subscribed SQS queue buffers it)
- **Use for:** Fan-out to multiple services from one event, system alerts/notifications, triggering multiple independent processing pipelines from one action

**EventBridge:**
- Content-based routing with filter rules (`source == "orders" AND detail.status == "FAILED"`)
- Schema registry, SaaS integrations (Shopify, GitHub, Zendesk events → your event bus)
- Archive and replay capability
- **Use for:** Complex event routing between microservices, event-driven architectures needing content-based routing, SaaS integrations, replacing point-to-point service integrations with a centralized event bus

**Common patterns:**
- "Order placed" → SNS → multiple SQS queues (billing, inventory, notification) — each consumer at own pace
- "User action" → EventBridge → conditional routing (premium user → analytics; error event → PagerDuty)
- "Background jobs" → SQS Standard + Lambda (scale to zero when queue is empty)

---

## Q4: Walk me through the DynamoDB capacity model. What is the difference between provisioned and on-demand?

**Answer:**
DynamoDB charges based on read and write operations in capacity units:

**Read Capacity Unit (RCU):** One strongly consistent read per second for items up to 4KB. Eventually consistent reads cost 0.5 RCU per read. Transactional reads cost 2 RCU per read.

**Write Capacity Unit (WCU):** One write per second for items up to 1KB. Transactional writes cost 2 WCU.

**Provisioned Capacity:**
- You specify exact RCU and WCU. DynamoDB guarantees that throughput.
- Exceeding the provisioned capacity results in `ProvisionedThroughputExceededException`
- Auto Scaling can adjust capacity based on utilization metrics
- Cost: pay for provisioned capacity regardless of actual usage (wasteful for variable workloads)
- **Use for:** Predictable, steady workloads where you can accurately estimate throughput

**On-Demand Capacity:**
- Pay-per-request: no capacity to provision, DynamoDB scales automatically
- Never throttled (within reasonable limits)
- Costs ~2.5× more per request than optimally provisioned throughput
- **Use for:** Variable workloads, new applications with unknown traffic patterns, applications with large traffic spikes, dev/test environments

**Hot partition problem:** DynamoDB distributes data across partitions. If your key design causes many requests to hit the same partition (a "hot partition"), you'll see throttling even if your overall capacity is sufficient. The fix is a better partition key (higher cardinality, no monotonic keys like timestamps).

**DAX (DynamoDB Accelerator):** In-memory cache in front of DynamoDB. Reduces read latency from milliseconds to microseconds. Fully managed. Compatible with DynamoDB API. Use for: extremely read-heavy workloads, caching "hot" items.

---

## Q5: What are Lambda Layers and when should you use them?

**Answer:**
Lambda Layers are archives containing additional code (libraries, custom runtimes, data files) that can be shared across multiple Lambda functions.

**How they work:**
- A layer is uploaded as a zip to AWS and gets its own ARN and version number
- Functions include up to 5 layer ARNs in their configuration
- Lambda extracts layers to `/opt/` in the execution environment before running your function
- Node.js: layer code goes to `/opt/nodejs/node_modules/`, automatically available to `require()`

**Use cases:**

1. **Shared dependencies:** A 50MB `node_modules` included in every function means each deployment is 50MB. Package common dependencies (AWS SDK, lodash, pg client) in a layer, functions reference the layer. Function package drops to kilobytes. Faster deployments, less storage used.

2. **Custom runtimes:** Languages not natively supported by Lambda (Ruby, Rust, Swift) implemented as layers with a custom bootstrap script.

3. **Binary dependencies:** C/C++ compiled binaries (ffmpeg, ImageMagick, Chrome headless) needed by functions but not available in the Lambda environment. Package as a layer.

4. **Shared utilities:** Logging wrappers, metrics clients, custom middleware shared across all your Lambda functions.

**Tradeoffs:**
- Layers increase coupling: if the layer changes, all dependent functions need testing
- Layer limit: 5 layers per function, total unzipped size (function + all layers) ≤ 250MB
- Cold start: layers are downloaded and extracted during cold starts — more layers = longer cold start. Use minimal, well-sized layers.
- Versioning: layers are immutable. Update a layer → new version number. Must update all functions to use new version.

---

## Q6: How does API Gateway authorization work? Compare Lambda authorizers to Cognito Authorizers.

**Answer:**

**Lambda Authorizer:**
- A Lambda function that receives the request's authorization context (token or request) and returns an IAM policy (Allow or Deny)
- Two types: Token authorizer (receives `Authorization` header value) or Request authorizer (receives full request context — headers, query params, etc.)
- Cached: API Gateway caches the result by the identity source (token value) for a configurable TTL (default 300 seconds)
- **Use for:** Custom authentication schemes (internal API keys, custom JWT formats, OAuth introspection), complex authorization logic (permission checks beyond simple token validation), non-standard token sources

**Cognito Authorizer:**
- API Gateway validates JWT tokens issued by a Cognito User Pool natively (no Lambda invocation needed for validation)
- Simpler setup: configure the Cognito User Pool ARN in API Gateway
- Lower latency (validation happens within API Gateway, no Lambda cold start)
- Claims from the JWT are available in the request context: `$context.authorizer.claims.email`
- **Use for:** Standard Cognito-based authentication, consumer-facing APIs using Cognito for user management

**When to use each:**
- Building on top of Cognito for user auth: use Cognito Authorizer (simpler, cheaper)
- Custom auth logic (check if user has specific permission in your database, validate proprietary token format): use Lambda Authorizer
- Machine-to-machine API access with custom API keys: Lambda Authorizer
- Migrating from another auth provider (Auth0, Okta) while keeping API Gateway: Lambda Authorizer (validate their JWTs)

**JWT Authorizer (HTTP API):** HTTP API supports JWT authorizers natively (similar to Cognito Authorizer but supports any JWT issuer conforming to the OpenID Connect discovery spec). Cheapest option for JWT-based auth on HTTP APIs.

---

## Q7: What is provisioned concurrency and when would you pay the extra cost for it?

**Answer:**
Provisioned Concurrency pre-initializes a specified number of Lambda execution environments. These environments are always warm, ready to handle requests without any cold start delay.

**Cost structure:**
- You pay for provisioned concurrency in addition to invocation costs
- Approximately: 2-3× the cost of on-demand Lambda for the reserved capacity
- Example: 10 provisioned concurrency × 24 hours = 240 compute-hour charge, even if no requests come in overnight

**When to use it:**

1. **Latency-sensitive user-facing APIs:** P99 latency SLA of < 50ms. Even a 200ms cold start on 1% of requests fails this SLA. Provisioned concurrency eliminates cold starts for the reserved level.

2. **Predictable traffic spikes:** Use Auto Scaling for provisioned concurrency + scheduled scaling. Provision more environments before known peaks (Black Friday sale at 9 AM), scale down after.

3. **Java functions:** Java cold starts are 2-10 seconds — completely unacceptable for any user-facing API. Provisioned Concurrency (or SnapStart) is mandatory for Java in production.

4. **Authentication/authorization functions:** These are called on every request. Cold starts on auth functions add latency to every API call. High ROI for provisioning.

**When NOT to use it:**
- Background processing functions (cold starts don't matter)
- Occasional triggered functions (S3 events, daily batch jobs)
- Functions with already acceptable cold start times and soft latency requirements
- Dev/test environments (cost optimization)

**Alternative cost-saving strategy:** Combine on-demand with provisioned. Keep provisioned concurrency equal to your baseline traffic, let on-demand handle spikes. The spike invocations may have cold starts, but baseline traffic is always warm.

---

## Q8: Explain Step Functions' approach to error handling and why it's better than try-catch in Lambda.

**Answer:**
When orchestrating multiple Lambda functions, coordinating errors in application code leads to:
- Each Lambda must know about retry logic, downstream service availability
- Implementing saga compensation (rollback) requires complex coordination code
- Partial failure states are hard to observe and debug
- Retry logic mixed with business logic = hard to maintain

**Step Functions error handling advantages:**

**Built-in retry with backoff:**
```json
"Retry": [{
  "ErrorEquals": ["Lambda.TooManyRequestsException"],
  "IntervalSeconds": 2,
  "MaxAttempts": 6,
  "BackoffRate": 2.0
}]
```
This declares retry behavior externally from the Lambda code. The Lambda itself has no retry logic — it just does its job and throws on failure. Step Functions handles the retry orchestra.

**Structured catch with fallback states:**
```json
"Catch": [{
  "ErrorEquals": ["InsufficientStockError"],
  "Next": "RefundPaymentState",
  "ResultPath": "$.error"
}]
```
If `ReserveInventory` fails with `InsufficientStockError`, automatically transition to the compensating `RefundPayment` state. In Lambda code, you'd need to catch exceptions, check their type, call the refund service — all mixed with business logic.

**Observable execution history:** Every state transition, input, output, retry, and error is stored in the execution history. Debug a failed order by examining the exact state where it failed, what the input was, and what error occurred — without grep-ing through CloudWatch logs.

**Wait states:** Step Functions can pause workflow for hours/days waiting for human approval (approve/reject a large order) or an external callback. In Lambda, this would require polling or complex asynchronous patterns.

**When Lambda try-catch is still appropriate:** Within a single Lambda function for expected errors in that function's own logic (invalid input, business rule violation). Step Functions error handling is for orchestration-level failures across services.

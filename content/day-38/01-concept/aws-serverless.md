# Day 38 — AWS Serverless Architecture

## Lambda: Execution Model and Internals

### Invocation Types

**Synchronous (RequestResponse):** Caller waits for function to complete and return a result. Used by API Gateway, ALB, Cognito triggers. Error handling is the caller's responsibility.

**Asynchronous (Event):** Lambda queues the event and returns immediately. Lambda retries failed invocations twice. Use for: S3 triggers, SNS, EventBridge. Configure a DLQ for unprocessable events after retries.

**Event Source Mapping:** Lambda polls a source (SQS, Kinesis, DynamoDB Streams) and invokes the function with batches. Lambda manages polling, offset tracking, and retry behavior. Use for stream processing and queue consumption.

### Cold Starts: The Most Asked Lambda Question

**What causes a cold start:**
Lambda runs your code in an "execution environment" — a micro-VM with a frozen runtime (Node.js, Python, Java). When a new execution environment is needed (first invocation, scaling out, after a period of inactivity), AWS must:
1. Provision and initialize the micro-VM
2. Download and extract your deployment package
3. Initialize the runtime (Node.js startup, JVM startup for Java)
4. Run your initialization code (outside the handler: DB connections, config loading)
5. Finally: invoke your handler function

Total cold start time: 100ms (Node.js, minimal package) to 10+ seconds (Java + Spring Boot + large JAR).

**Mitigation strategies:**

1. **Provisioned Concurrency:** Pre-warms a specific number of execution environments. Guarantees zero cold starts for up to N concurrent invocations. Costs extra (charged for reserved + actual invocations). Use for latency-sensitive endpoints.

2. **Reduce package size:** Smaller deployment packages = faster environment initialization. Use bundling (esbuild, webpack) for Node.js to tree-shake unused dependencies. Target < 5MB for fast cold starts.

3. **Minimize dependencies:** Each imported module increases startup time. Lazy-load dependencies inside the handler if they're not needed for every invocation.

4. **Choose the right runtime:** Node.js and Python have the fastest cold starts (< 200ms). Go is fast. Java and .NET have the slowest (1-10 seconds). Java can use SnapStart (Lambda saves a memory snapshot of the initialized function and restores it on cold start — up to 10x faster).

5. **Function warmers (keep-warm pings):** A CloudWatch Events rule triggers the function every 5 minutes to keep execution environments alive. Rudimentary and deprecated in favor of Provisioned Concurrency.

### Concurrency

**Reserved Concurrency:** Allocates a specific number of concurrent executions for this function. Two uses:
- **Throttle protection:** Limit this function to N concurrent executions so it can't consume all account-level concurrency (1,000 default per region)
- **Guaranteed availability:** Reserve concurrency so other noisy-neighbor functions can't starve this critical function

**Provisioned Concurrency:** Pre-initialized execution environments. Eliminates cold starts for the specified number of concurrent requests.

**Burst limits:** AWS allows initial burst of 500-3,000 concurrent executions (region-dependent) then increases by 500/minute. Design for this: don't assume instant scaling from 0 to 10,000 concurrent.

### Best Practices for Lambda Code

**Initialize outside the handler (re-used across warm invocations):**
```javascript
// This runs once on cold start, then reused
const dbConnection = await createDbConnection();
const redisClient = createRedisClient();

// Handler called on every invocation
exports.handler = async (event) => {
  // Use dbConnection and redisClient here
};
```

**Avoid:** Long-running operations (> 15 minutes), large in-memory state, opening connections inside the handler on every invocation.

**Lambda power tuning:** CPU is allocated proportional to memory. 1,792MB = 1 full vCPU. Increasing memory can make CPU-bound functions faster and even cheaper (less execution time × higher memory price = lower total cost). Use the AWS Lambda Power Tuning open-source tool to find the optimal memory size.

---

## API Gateway

### REST API vs HTTP API vs WebSocket API

| Feature | REST API | HTTP API | WebSocket API |
|---|---|---|---|
| Release | Original | 2020 (v2) | 2018 |
| Price | $3.50/million | $1.00/million (71% cheaper) | $1.00/million + connection hours |
| Lambda proxy | Yes | Yes | Yes |
| Custom authorizers | Yes | JWT + Lambda | Lambda |
| Usage plans (throttling) | Yes | No | No |
| Request/response transforms | VTL templates | No | No |
| Private integrations | Yes | Yes (via VPC Link) | No |
| **Use for** | Complex APIs needing all features | Simple REST APIs, low latency | Real-time bidirectional |

**HTTP API** is the modern choice for most use cases: simpler, cheaper, lower latency (~60% less overhead than REST API). Use REST API only when you need WAF integration, usage plans, request transformation, or REST-specific features.

### API Gateway Throttling

**Account-level default:** 10,000 requests/second per region, 5,000 burst limit.

**Stage-level throttling:** Override defaults for a specific stage (e.g., limit prod to 1,000 RPS to protect backend).

**Per-client throttling (Usage Plans):** Create usage plans with API keys. Set rate limit (requests/second) and quota (requests/day) per plan tier: Free tier (10 req/sec, 1000/day), Pro tier (100 req/sec, 100000/day). Customers include API key in `x-api-key` header.

### Lambda Authorizers (Custom Authorizers)

A Lambda function that validates the incoming request's authorization before passing to the backend. Used for: JWT validation, OAuth introspection, custom API key validation.

```javascript
exports.handler = async (event) => {
  const token = event.authorizationToken; // e.g., "Bearer eyJ..."
  try {
    const payload = verifyJwt(token);
    return generatePolicy(payload.userId, "Allow", event.methodArn);
  } catch {
    return generatePolicy("user", "Deny", event.methodArn);
  }
};

function generatePolicy(principalId, effect, resource) {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [{ Action: "execute-api:Invoke", Effect: effect, Resource: resource }],
    },
    context: { userId: principalId }, // Passed to the backend Lambda
  };
}
```

**Authorizer caching:** API Gateway caches authorizer results by token (or header specified as the identity source). Default TTL: 300s. This means one Lambda invocation per unique token per 5 minutes — dramatic cost reduction for high-traffic APIs.

---

## SQS vs SNS vs EventBridge (Deep Dive)

### SQS Message Lifecycle

1. Producer sends message → SQS stores durably
2. Consumer polls (short-poll or long-poll): `ReceiveMessage` with `WaitTimeSeconds: 20`
3. Message is "invisible" (visibility timeout: 30s default) — hidden from other consumers
4. Consumer processes, then `DeleteMessage` → message removed permanently
5. If consumer doesn't delete within visibility timeout: message reappears → another consumer picks it up (at-least-once delivery)
6. After `maxReceiveCount` failures: moves to DLQ

**Long polling** (`WaitTimeSeconds: 20`): API Gateway holds the connection for up to 20s waiting for a message. Reduces empty receive responses, reduces cost compared to tight polling loops.

**FIFO Queues:** Messages delivered in order within a Message Group ID. Exactly-once processing (deduplication via `MessageDeduplicationId`). Limited to 300 TPS (or 3,000 with batching). Use for: financial transactions, order processing where order matters.

### SNS Fan-out to Multiple SQS Queues

Classic pattern for delivering one event to multiple independent consumers:

```
OrderCreated event
    → SNS Topic "order-events"
        → SQS Queue "billing-service" (subscribed)
        → SQS Queue "inventory-service" (subscribed)
        → SQS Queue "notification-service" (subscribed)
```

Each service has its own SQS queue. They process at their own pace. Failure in billing doesn't affect inventory. Each queue can have its own DLQ and retry policy.

---

## DynamoDB: Production-Level Patterns

### Single-Table Design

Traditional relational thinking: one table per entity type. DynamoDB single-table design: ALL entities in ONE table.

Why: DynamoDB is optimized for single-table access patterns. Cross-table joins require multiple round-trips (no JOIN operator). If you can put related data in one table with the right partition/sort key structure, you get all data in one query.

**Example — e-commerce single table:**

| PK | SK | Type | Attributes |
|---|---|---|---|
| `USER#user1` | `PROFILE` | User | name, email |
| `USER#user1` | `ORDER#2024-001` | Order | status, total |
| `USER#user1` | `ORDER#2024-002` | Order | status, total |
| `ORDER#2024-001` | `ITEM#laptop` | OrderItem | qty, price |

Queries:
- Get user profile: `PK = USER#user1, SK = PROFILE`
- Get user's orders: `PK = USER#user1, SK begins_with ORDER#`
- Get specific order: `PK = USER#user1, SK = ORDER#2024-001`
- Get order items: `PK = ORDER#2024-001, SK begins_with ITEM#`

### GSI (Global Secondary Index) and LSI

**LSI (Local):** Same partition key, different sort key. Created at table creation time only. Shares read/write capacity with the table. Strongly consistent reads available.

**GSI (Global):** Different partition key (and optional sort key). Can be created anytime. Has its own capacity. Eventually consistent reads only. No uniqueness constraint.

Use GSI for: `getOrdersByStatus`, `getProductsByCategory`, `getActiveSessionsByUserId` — queries on non-primary-key attributes.

### DynamoDB Streams

Captures every item change (insert, update, delete) as a stream record. A Lambda function can be attached to the stream for real-time processing.

Use cases: populate a search index (stream → Lambda → Elasticsearch), invalidate cache entries on changes, audit log, cross-region replication (Global Tables use streams internally).

### Conditional Writes (Optimistic Locking)

```javascript
await dynamoDB.put({
  TableName: "Orders",
  Item: { orderId: "123", status: "processing", version: 2 },
  ConditionExpression: "version = :expected",
  ExpressionAttributeValues: { ":expected": 1 },
}).promise();
// Fails with ConditionalCheckFailedException if version is not 1
// This prevents lost updates in concurrent scenarios
```

---

## Step Functions: Orchestrating Workflows

State machines for coordinating Lambda functions, SQS, and other AWS services.

**Express Workflows:** High-throughput (100K executions/second), short-lived (< 5 min), at-least-once, no history stored (use CloudWatch). Good for: real-time data processing, IoT telemetry, ML inference pipelines.

**Standard Workflows:** Lower throughput, long-lived (up to 1 year), exactly-once, full execution history. Good for: order processing, human approval workflows, batch processing.

**Error handling in Step Functions:**
```json
{
  "Catch": [{
    "ErrorEquals": ["Lambda.ServiceException", "Lambda.TooManyRequestsException"],
    "Next": "RetryState",
    "ResultPath": "$.errorInfo"
  }],
  "Retry": [{
    "ErrorEquals": ["States.TaskFailed"],
    "IntervalSeconds": 2,
    "MaxAttempts": 3,
    "BackoffRate": 2.0
  }]
}
```

Built-in retry with exponential backoff and catch for fallback states. This replaces complex try-catch orchestration logic in application code.

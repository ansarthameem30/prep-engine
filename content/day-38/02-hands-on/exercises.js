/**
 * Day 38 — AWS Serverless: Hands-on Exercises
 */

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Lambda Handler for Processing SQS Events with Error Handling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SQS → Lambda Event Source Mapping handler.
 *
 * Key behaviors:
 * - SQS sends batches of messages (batchSize configured in event source mapping)
 * - If handler throws: entire batch is retried (or sent to DLQ after max retries)
 * - Partial batch failure: return { batchItemFailures: [...] } to retry only failed items
 *
 * IMPORTANT: Always return batchItemFailures for granular retry control.
 * Without it, a single bad message causes the ENTIRE batch to retry (wasted processing).
 */
exports.sqsHandler = async (event) => {
  const batchItemFailures = [];

  await Promise.allSettled(
    event.Records.map(async (record) => {
      const { messageId, body, messageAttributes, receiptHandle } = record;

      try {
        const message = JSON.parse(body);
        console.log(`[SQS] Processing message ${messageId}: ${JSON.stringify(message)}`);

        await processMessage(message);

        console.log(`[SQS] Successfully processed message ${messageId}`);
      } catch (err) {
        console.error(`[SQS] Failed to process message ${messageId}: ${err.message}`, {
          messageId,
          error: err.message,
          stack: err.stack,
          body: body.slice(0, 500), // Log truncated body for debugging
        });

        // Mark this specific message as failed (will be retried or sent to DLQ)
        batchItemFailures.push({ itemIdentifier: messageId });
      }
    })
  );

  console.log(`[SQS] Batch complete. Success: ${event.Records.length - batchItemFailures.length}, Failed: ${batchItemFailures.length}`);

  // Return partial batch failures - only failed messages will be retried
  return { batchItemFailures };
};

async function processMessage(message) {
  if (message.type === "ORDER_CREATED") {
    await sendOrderConfirmationEmail(message.orderId, message.customerEmail);
  } else if (message.type === "PAYMENT_PROCESSED") {
    await updateOrderStatus(message.orderId, "confirmed");
  } else {
    // Unknown message type — don't throw (would cause infinite retry loop)
    // Instead log and continue (or send to DLQ explicitly)
    console.warn(`[SQS] Unknown message type: ${message.type}. Skipping.`);
  }
}

async function sendOrderConfirmationEmail(orderId, email) {
  // Simulate email sending
  console.log(`[Email] Sending order confirmation for ${orderId} to ${email}`);
}

async function updateOrderStatus(orderId, status) {
  console.log(`[Order] Updating ${orderId} status to ${status}`);
}

// Demonstrate with simulated event
const simulatedSQSEvent = {
  Records: [
    { messageId: "msg-1", body: JSON.stringify({ type: "ORDER_CREATED", orderId: "ORD-001", customerEmail: "alice@example.com" }), receiptHandle: "rh1" },
    { messageId: "msg-2", body: "invalid json{{{", receiptHandle: "rh2" }, // This will fail
    { messageId: "msg-3", body: JSON.stringify({ type: "PAYMENT_PROCESSED", orderId: "ORD-001" }), receiptHandle: "rh3" },
  ],
};

exports.sqsHandler(simulatedSQSEvent).then((result) => {
  console.log("SQS batch result:", JSON.stringify(result));
});


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: DynamoDB Single-Table Design
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Single-table design for an e-commerce application.
 * One table to hold: Users, Orders, OrderItems
 *
 * Access patterns supported:
 *   1. Get user by userId
 *   2. Get all orders for a user
 *   3. Get a specific order with all items
 *   4. Create a new order with items (transactional)
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.DYNAMO_TABLE ?? "ecommerce";

class EcommerceRepository {
  // ─── User Operations ───────────────────────────────────────────────────────

  async getUser(userId) {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: "PROFILE" },
    }));
    return result.Item ?? null;
  }

  async createUser(user) {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${user.userId}`,
        SK: "PROFILE",
        GSI1PK: `USER#${user.email}`, // For lookup by email
        GSI1SK: "PROFILE",
        type: "USER",
        ...user,
        createdAt: new Date().toISOString(),
      },
      ConditionExpression: "attribute_not_exists(PK)", // Fail if user already exists
    }));
  }

  // ─── Order Operations ──────────────────────────────────────────────────────

  async getUserOrders(userId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":prefix": "ORDER#",
      },
      ScanIndexForward: false, // Most recent orders first
    }));
    return result.Items ?? [];
  }

  async getOrderWithItems(userId, orderId) {
    // Query all items with PK = ORDER#{orderId} (both order header and line items)
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `ORDER#${orderId}`,
      },
    }));

    const items = result.Items ?? [];
    const orderHeader = items.find((i) => i.SK === "HEADER");
    const lineItems = items.filter((i) => i.SK.startsWith("ITEM#"));

    return { ...orderHeader, items: lineItems };
  }

  async createOrder(userId, order, items) {
    const orderId = `ORD-${Date.now()}`;
    const now = new Date().toISOString();

    // Atomic: create order header + line items + update user order index
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        // 1. Order header in ORDER# partition for order-based queries
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `ORDER#${orderId}`,
              SK: "HEADER",
              type: "ORDER",
              userId,
              orderId,
              status: "pending",
              totalAmount: order.totalAmount,
              createdAt: now,
            },
          },
        },
        // 2. Order reference in USER# partition for user-based queries
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `USER#${userId}`,
              SK: `ORDER#${now}#${orderId}`, // Timestamp in SK for sorted retrieval
              type: "ORDER_REF",
              orderId,
              status: "pending",
              totalAmount: order.totalAmount,
            },
          },
        },
        // 3. Each order line item
        ...items.map((item) => ({
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `ORDER#${orderId}`,
              SK: `ITEM#${item.sku}`,
              type: "ORDER_ITEM",
              ...item,
            },
          },
        })),
      ],
    }));

    return orderId;
  }
}

console.log("\n=== DynamoDB Single-Table Design ===");
console.log("Key structure:");
console.log("  User profile:     PK=USER#u1, SK=PROFILE");
console.log("  User's orders:    PK=USER#u1, SK=ORDER#{timestamp}#{orderId}");
console.log("  Order header:     PK=ORDER#{orderId}, SK=HEADER");
console.log("  Order line items: PK=ORDER#{orderId}, SK=ITEM#{sku}");
console.log("\nAccess patterns enabled:");
console.log("  - Get user: single GetItem (O(1))");
console.log("  - User's orders: Query by PK=USER#u1 SK begins_with ORDER#");
console.log("  - Order with items: Query by PK=ORDER#{orderId}");
console.log("  - Create order: TransactWrite (atomic)");


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: API Gateway Lambda Authorizer — JWT Validation
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");

function base64urlDecode(str) {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const [headerB64, payloadB64, signatureB64] = parts;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  if (signatureB64 !== expectedSig) throw new Error("Invalid signature");

  const payload = JSON.parse(base64urlDecode(payloadB64));

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
}

function generateIAMPolicy(principalId, effect, resource, context = {}) {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [{
        Action: "execute-api:Invoke",
        Effect: effect,
        Resource: resource,
      }],
    },
    context, // Passed to the Lambda function as $context.authorizer.{key}
  };
}

exports.jwtAuthorizer = async (event) => {
  const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-not-for-production";

  try {
    const authHeader = event.authorizationToken;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing or invalid Authorization header");
    }

    const token = authHeader.slice(7); // Remove "Bearer "
    const payload = verifyJWT(token, JWT_SECRET);

    console.log(`[Authorizer] Valid token for user: ${payload.sub}, roles: ${payload.roles}`);

    return generateIAMPolicy(payload.sub, "Allow", event.methodArn, {
      userId: payload.sub,
      email: payload.email ?? "",
      roles: JSON.stringify(payload.roles ?? []),
    });
  } catch (err) {
    console.log(`[Authorizer] Unauthorized: ${err.message}`);
    // Return "Deny" policy (don't throw — throwing causes 500, not 401)
    return generateIAMPolicy("unauthorized", "Deny", event.methodArn);
  }
};

// Test the authorizer
const testEvent = {
  authorizationToken: "Bearer invalid.jwt.token",
  methodArn: "arn:aws:execute-api:us-east-1:123456789012:abc123/prod/GET/orders",
};

exports.jwtAuthorizer(testEvent).then((result) => {
  console.log("\n=== JWT Authorizer Test ===");
  console.log("Result:", JSON.stringify(result, null, 2));
});


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: SQS → Lambda Event Source Mapping with DLQ Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infrastructure-as-code equivalent (CDK TypeScript pattern):
 *
 * const queue = new sqs.Queue(this, 'OrderQueue', {
 *   visibilityTimeout: cdk.Duration.seconds(30),
 *   deadLetterQueue: {
 *     queue: new sqs.Queue(this, 'OrderDLQ', {
 *       retentionPeriod: cdk.Duration.days(14),
 *     }),
 *     maxReceiveCount: 3,  // Retry 3 times before DLQ
 *   },
 * });
 *
 * const fn = new lambda.Function(this, 'OrderProcessor', {
 *   runtime: lambda.Runtime.NODEJS_20_X,
 *   handler: 'index.sqsHandler',
 *   code: lambda.Code.fromAsset('dist'),
 *   timeout: cdk.Duration.seconds(30),
 *   environment: { DYNAMO_TABLE: table.tableName },
 * });
 *
 * fn.addEventSource(new lambdaEventSources.SqsEventSource(queue, {
 *   batchSize: 10,
 *   maxBatchingWindow: cdk.Duration.seconds(5), // Wait up to 5s to fill batch
 *   reportBatchItemFailures: true,  // Enables partial batch failure
 * }));
 *
 * table.grantReadWriteData(fn);
 */

// Simulate SQS processing with DLQ logic
class SQSWithDLQ {
  constructor(maxReceiveCount = 3) {
    this.queue = [];
    this.dlq = [];
    this.maxReceiveCount = maxReceiveCount;
    this.inFlight = new Map(); // messageId -> { message, receiveCount, visibilityExpiry }
  }

  send(body) {
    const msg = { messageId: crypto.randomUUID(), body, receiveCount: 0, firstSentAt: Date.now() };
    this.queue.push(msg);
    return msg.messageId;
  }

  receive(visibilityTimeoutMs = 5000) {
    const msg = this.queue.shift();
    if (!msg) return null;
    msg.receiveCount++;
    msg.visibilityExpiry = Date.now() + visibilityTimeoutMs;
    this.inFlight.set(msg.messageId, msg);
    return msg;
  }

  delete(messageId) {
    this.inFlight.delete(messageId);
    console.log(`[SQS] Message ${messageId.slice(0, 8)} deleted (processed successfully)`);
  }

  async process(handler) {
    const msg = this.receive();
    if (!msg) { console.log("[SQS] No messages in queue"); return; }

    try {
      await handler(msg);
      this.delete(msg.messageId);
    } catch (err) {
      this.inFlight.delete(msg.messageId);
      if (msg.receiveCount >= this.maxReceiveCount) {
        this.dlq.push({ ...msg, deadLetteredAt: Date.now(), lastError: err.message });
        console.log(`[SQS] Message ${msg.messageId.slice(0, 8)} dead-lettered after ${msg.receiveCount} attempts: ${err.message}`);
      } else {
        this.queue.push(msg); // Re-queue for retry
        console.log(`[SQS] Message ${msg.messageId.slice(0, 8)} re-queued (attempt ${msg.receiveCount}/${this.maxReceiveCount})`);
      }
    }
  }
}

async function runSQSDemoExercise4() {
  console.log("\n=== SQS with DLQ Demo ===");
  const queue = new SQSWithDLQ(3);

  queue.send(JSON.stringify({ orderId: "ORD-001", type: "process" }));
  queue.send("INVALID_JSON{{{"); // Will always fail

  // Process messages - "INVALID_JSON" will retry 3 times then DLQ
  for (let i = 0; i < 8; i++) {
    await queue.process(async (msg) => {
      JSON.parse(msg.body); // This throws for INVALID_JSON
      console.log(`[SQS] Processed: ${msg.body}`);
    });
  }

  console.log(`\nDLQ depth: ${queue.dlq.length}`);
  queue.dlq.forEach((m) => console.log(`  DLQ: ${m.messageId.slice(0, 8)} - ${m.lastError}`));
}

runSQSDemoExercise4();


// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Step Functions State Machine Definition for Order Processing
// ─────────────────────────────────────────────────────────────────────────────

const orderProcessingStateMachine = {
  Comment: "Order Processing Pipeline",
  StartAt: "ValidateOrder",
  States: {
    ValidateOrder: {
      Type: "Task",
      Resource: "arn:aws:lambda:us-east-1:123:function:ValidateOrder",
      ResultPath: "$.validation",
      Retry: [{
        ErrorEquals: ["Lambda.ServiceException"],
        IntervalSeconds: 2,
        MaxAttempts: 3,
        BackoffRate: 2,
      }],
      Catch: [{
        ErrorEquals: ["ValidationError"],
        Next: "OrderRejected",
        ResultPath: "$.error",
      }],
      Next: "ChargePayment",
    },
    ChargePayment: {
      Type: "Task",
      Resource: "arn:aws:lambda:us-east-1:123:function:ChargePayment",
      ResultPath: "$.payment",
      Retry: [{
        ErrorEquals: ["Lambda.TooManyRequestsException"],
        IntervalSeconds: 5,
        MaxAttempts: 5,
        BackoffRate: 1.5,
      }],
      Catch: [{
        ErrorEquals: ["PaymentDeclinedError"],
        Next: "OrderRejected",
        ResultPath: "$.error",
      }],
      Next: "ReserveInventory",
    },
    ReserveInventory: {
      Type: "Task",
      Resource: "arn:aws:lambda:us-east-1:123:function:ReserveInventory",
      Catch: [{
        ErrorEquals: ["InsufficientStockError"],
        Next: "RefundPayment",
        ResultPath: "$.error",
      }],
      Next: "CreateShipment",
    },
    RefundPayment: {
      Type: "Task",
      Comment: "Compensating transaction for failed inventory reservation",
      Resource: "arn:aws:lambda:us-east-1:123:function:RefundPayment",
      Next: "OrderRejected",
    },
    CreateShipment: {
      Type: "Task",
      Resource: "arn:aws:lambda:us-east-1:123:function:CreateShipment",
      Next: "SendConfirmationEmail",
    },
    SendConfirmationEmail: {
      Type: "Task",
      Resource: "arn:aws:states:::sqs:sendMessage",
      Parameters: {
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/123/email-queue",
        MessageBody: {
          "type": "ORDER_CONFIRMED",
          "orderId.$": "$.orderId",
          "email.$": "$.customerEmail",
        },
      },
      Next: "OrderComplete",
    },
    OrderComplete: {
      Type: "Succeed",
    },
    OrderRejected: {
      Type: "Fail",
      Error: "OrderRejected",
      Cause: "Order could not be processed",
    },
  },
};

console.log("\n=== Step Functions State Machine ===");
console.log(`States: ${Object.keys(orderProcessingStateMachine.States).join(", ")}`);
console.log(`Start: ${orderProcessingStateMachine.StartAt}`);
console.log("\nState machine JSON saved (use with AWS Console or CDK to deploy)");
// In production: deploy with CDK or Terraform
// const stateMachine = new stepfunctions.StateMachine(this, 'OrderProcessing', {
//   definition: stepfunctions.DefinitionBody.fromString(JSON.stringify(orderProcessingStateMachine)),
// });

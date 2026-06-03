# Day 48 — Building AI-Powered Node.js APIs

## Architecture Overview

```
Client (Browser/App)
    ↓ POST /api/chat (or GET /api/stream)
Express API Server
    ↓ OpenAI API call (streaming)
    ← SSE chunks back to client
    ↓ Log tokens + cost to DB
    ↓ Save conversation to DB
```

The key architectural decisions: streaming vs batch, token budget per user, conversation persistence, and model routing.

---

## Streaming SSE from Node.js

Server-Sent Events is the standard protocol for pushing data from server to client over HTTP. Unlike WebSockets, SSE is unidirectional (server → client), uses regular HTTP, and handles reconnection automatically.

```js
app.get("/api/stream", async (req, res) => {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*"); // CORS if needed
  res.flushHeaders(); // Send headers immediately

  // Abort controller: cancel OpenAI if client disconnects
  const controller = new AbortController();
  req.on("close", () => {
    controller.abort();
    console.log("Client disconnected, OpenAI request aborted");
  });

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: req.body.messages,
      stream: true,
      signal: controller.signal, // Link abort to OpenAI request
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        // SSE format: "data: {json}\n\n"
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
      if (chunk.choices[0]?.finish_reason === "stop") {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        break;
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    }
  } finally {
    res.end();
  }
});
```

**Why abort on disconnect matters:** OpenAI charges for tokens generated even if the client never receives them. Without abort, a user navigating away triggers a 3-second response that costs $0.001 and serves no one. At scale (10K users), this adds up.

**Client-side consumption:**
```js
const eventSource = new EventSource("/api/stream?query=...");
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.done) eventSource.close();
  else appendToUI(data.content);
};
```

---

## Token Management

### Counting Before Sending

```js
const { encoding_for_model } = require("@dqbd/tiktoken");

function countTokens(messages, model = "gpt-4o") {
  const enc = encoding_for_model(model);
  let count = 3; // Every request has 3 overhead tokens for format
  for (const msg of messages) {
    count += 4; // Per message overhead
    count += enc.encode(msg.content).length;
    count += enc.encode(msg.role).length;
  }
  enc.free(); // Free WebAssembly memory!
  return count;
}
```

### Token Budget Enforcement

```js
async function enforceTokenBudget(req, res, next) {
  const userId = req.user.id;
  const today = new Date().toISOString().split("T")[0];
  
  const usage = await redis.get(`token_budget:${userId}:${today}`);
  const used = parseInt(usage || "0");
  const dailyLimit = getUserDailyLimit(req.user.plan); // e.g., 100K tokens/day
  
  if (used > dailyLimit) {
    return res.status(429).json({
      error: "Daily token limit exceeded",
      used,
      limit: dailyLimit,
      resetAt: `${today}T24:00:00Z`
    });
  }
  
  next();
}
```

---

## Conversation Management

### Database Schema

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  session_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  token_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON messages (conversation_id, created_at);
```

### Truncation Strategy

```js
async function buildContext(conversationId, systemPrompt, newUserMessage) {
  const MAX_TOKENS = 6000; // Leave 2K for response
  const systemTokens = countTokens([{ role: "system", content: systemPrompt }]);
  const newMessageTokens = countTokens([{ role: "user", content: newUserMessage }]);
  let budget = MAX_TOKENS - systemTokens - newMessageTokens;

  // Load history newest first, fill budget
  const history = await db.query(
    `SELECT role, content, token_count FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at DESC`, [conversationId]
  );

  const selectedMessages = [];
  for (const msg of history.rows) {
    if (budget - msg.token_count < 0) break;
    budget -= msg.token_count;
    selectedMessages.unshift({ role: msg.role, content: msg.content });
  }

  return [
    { role: "system", content: systemPrompt },
    ...selectedMessages,
    { role: "user", content: newUserMessage }
  ];
}
```

---

## Cost Tracking Middleware

```js
class CostTracker {
  async trackUsage(userId, model, inputTokens, outputTokens) {
    const pricing = {
      "gpt-4o": { input: 5, output: 15 }, // Per 1M tokens in cents
      "gpt-4o-mini": { input: 0.15, output: 0.6 },
    };
    
    const p = pricing[model] || pricing["gpt-4o"];
    const costCents = (inputTokens / 1_000_000) * p.input
                    + (outputTokens / 1_000_000) * p.output;
    
    // Atomic increment in Redis + batch write to DB
    await redis.incrbyfloat(`cost:${userId}:${today()}`, costCents);
    await redis.incr(`tokens:${userId}:${today()}`);
    
    // Async DB write (don't block the response)
    setImmediate(() => db.query(
      `INSERT INTO usage_logs (user_id, model, input_tokens, output_tokens, cost_cents)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, model, inputTokens, outputTokens, costCents]
    ));
  }
}
```

---

## Model Routing

Route requests to cheaper models when possible — can reduce costs 15-28x:

```js
function classifyQueryComplexity(message, conversationHistory) {
  const score = {
    length: 0,
    isSystemDesign: 0,
    hasCode: 0,
    isSimple: 0,
  };

  score.length = message.length > 500 ? 1 : 0;
  score.isSystemDesign = /design|architect|scale|system/i.test(message) ? 2 : 0;
  score.hasCode = /```|function|class|import|SELECT/i.test(message) ? 1 : 0;
  score.isSimple = /what is|who is|how many|yes or no/i.test(message) ? -2 : 0;
  score.conversationDepth = conversationHistory.length > 10 ? 1 : 0;

  const total = Object.values(score).reduce((s, v) => s + v, 0);
  return total >= 2 ? "gpt-4o" : "gpt-4o-mini";
}
```

---

## Semantic Caching

```js
class SemanticCache {
  constructor(redisClient, embedder, threshold = 0.95) {
    this.redis = redisClient;
    this.embedder = embedder;
    this.threshold = threshold;
  }

  async get(query) {
    const queryEmb = await this.embedder(query);
    const keys = await this.redis.keys("semantic_cache:*");
    
    for (const key of keys) {
      const cached = JSON.parse(await this.redis.get(key));
      const sim = cosineSimilarity(queryEmb, cached.embedding);
      if (sim >= this.threshold) {
        await this.redis.incr(`cache_hits:${new Date().toISOString().split("T")[0]}`);
        return cached.response;
      }
    }
    return null;
  }

  async set(query, response, ttlSeconds = 3600) {
    const embedding = await this.embedder(query);
    const key = `semantic_cache:${Date.now()}`;
    await this.redis.setex(key, ttlSeconds, JSON.stringify({ query, embedding, response }));
  }
}
```

---

## Error Handling & Fallback Chain

```js
async function callWithFallback(messages, primaryModel = "gpt-4o") {
  const fallbackChain = [primaryModel, "gpt-4o-mini"];

  for (const model of fallbackChain) {
    try {
      return await callWithRetry(() =>
        openai.chat.completions.create({ model, messages, max_tokens: 1000 })
      );
    } catch (err) {
      if (err.status === 400 || err.status === 401) throw err; // Don't retry auth/bad request
      console.error(`Model ${model} failed: ${err.message}. Trying fallback.`);
    }
  }

  // All models failed: return static fallback
  return { choices: [{ message: { content: "I'm having trouble responding right now. Please try again in a moment." } }] };
}
```

---

## Rate Limiting for AI Endpoints

AI endpoints are different from regular endpoints — token consumption varies wildly:

```js
const tokenRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Different limits by plan
    const limits = { free: 10, pro: 100, enterprise: 1000 };
    return limits[req.user.plan] || 10;
  },
  message: { error: "Rate limit exceeded. Please wait before sending more messages." },
  keyGenerator: (req) => req.user.id, // Per-user, not per-IP
});

// Apply only to AI endpoints
app.use("/api/chat", tokenRateLimiter);
app.use("/api/analyze", tokenRateLimiter);
```

For token-based limiting (not request-based), use a Redis sliding window counter that increments by actual token count used.

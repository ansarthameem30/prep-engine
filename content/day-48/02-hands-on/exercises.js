/**
 * Day 48 — AI-Powered Node.js APIs: Hands-On Exercises
 * Prerequisites: npm install openai express
 * Set OPENAI_API_KEY in your environment
 */

const OpenAI = require("openai");
const http = require("http");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Token estimation (no tiktoken dependency needed for exercises)
// ─────────────────────────────────────────────────────────────────────────────
function estimateTokens(text) {
  return Math.ceil(text.length / 4) + 4; // +4 for role overhead
}

function estimateMessagesTokens(messages) {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0) + 3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Streaming API Endpoint
// Express + OpenAI stream → SSE to client, abort on disconnect
// ─────────────────────────────────────────────────────────────────────────────

function createStreamingServer() {
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/stream") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    // Parse request body
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    await new Promise((resolve) => req.on("end", resolve));
    const { message } = JSON.parse(body);

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Abort controller: cancel OpenAI if client disconnects
    const controller = new AbortController();
    let aborted = false;
    req.on("close", () => {
      if (!aborted) {
        aborted = true;
        controller.abort();
        console.log("  [Server] Client disconnected, OpenAI request aborted");
      }
    });

    try {
      const stream = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
        stream: true,
        max_tokens: 200,
        signal: controller.signal,
      });

      let totalTokens = 0;
      for await (const chunk of stream) {
        if (aborted) break;
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          totalTokens++;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
        if (chunk.choices[0]?.finish_reason === "stop") {
          res.write(`data: ${JSON.stringify({ done: true, totalTokens })}\n\n`);
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

  return server;
}

// Simulate a client consuming the SSE stream
async function consumeSSEStream(port, message) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "localhost",
      port,
      path: "/stream",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, (res) => {
      let fullText = "";
      let firstChunkTime = null;
      const startTime = Date.now();

      res.on("data", (chunk) => {
        if (!firstChunkTime) firstChunkTime = Date.now() - startTime;
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) process.stdout.write(data.content);
              if (data.done) {
                console.log(`\n\n[First chunk: ${firstChunkTime}ms | Total: ${Date.now() - startTime}ms | ~${data.totalTokens} chunks]`);
                resolve(fullText);
              }
            } catch {}
          }
        }
      });

      res.on("end", resolve);
    });

    req.on("error", reject);
    req.write(JSON.stringify({ message }));
    req.end();
  });
}

async function exercise1_streamingEndpoint() {
  console.log("=== Exercise 1: Streaming SSE Endpoint ===\n");
  const PORT = 3091;
  const server = createStreamingServer();
  server.listen(PORT, async () => {
    console.log(`Server started on port ${PORT}`);
    console.log('Sending: "Explain closures in JavaScript in 2 sentences"\n');
    await consumeSSEStream(PORT, "Explain closures in JavaScript in 2 sentences.");
    server.close();
    console.log("\n[Server closed]");
  });

  await new Promise((resolve) => server.on("close", resolve));
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Token Budget Middleware
// Count tokens, reject if over limit, log usage
// ─────────────────────────────────────────────────────────────────────────────

class TokenBudgetMiddleware {
  constructor(dailyLimitTokens = 10000) {
    this.dailyLimit = dailyLimitTokens;
    this.usage = new Map(); // userId → {tokens, requests, date}
  }

  getUsage(userId) {
    const today = new Date().toISOString().split("T")[0];
    const key = `${userId}:${today}`;
    if (!this.usage.has(key)) {
      this.usage.set(key, { tokens: 0, requests: 0, date: today });
    }
    return this.usage.get(key);
  }

  check(userId, messages) {
    const estimatedTokens = estimateMessagesTokens(messages);
    const usage = this.getUsage(userId);

    if (usage.tokens + estimatedTokens > this.dailyLimit) {
      return {
        allowed: false,
        error: "Daily token limit exceeded",
        used: usage.tokens,
        limit: this.dailyLimit,
        estimatedNeeded: estimatedTokens,
      };
    }

    return { allowed: true, estimatedTokens };
  }

  record(userId, actualInputTokens, actualOutputTokens) {
    const usage = this.getUsage(userId);
    usage.tokens += actualInputTokens + actualOutputTokens;
    usage.requests++;
    return usage;
  }

  getStats(userId) {
    return this.getUsage(userId);
  }
}

async function exercise2_tokenBudget() {
  console.log("\n=== Exercise 2: Token Budget Middleware ===\n");

  const budget = new TokenBudgetMiddleware(500); // Low limit for demo
  const userId = "user-123";

  const testRequests = [
    "What is a closure in JavaScript?",
    "Explain React hooks in detail with examples and best practices.",
    "What is 2 + 2?",
  ];

  for (const message of testRequests) {
    const messages = [{ role: "user", content: message }];
    const check = budget.check(userId, messages);

    console.log(`Request: "${message.substring(0, 50)}"`);
    console.log(`  Estimated tokens: ${check.estimatedTokens}`);

    if (!check.allowed) {
      console.log(`  BLOCKED: ${check.error} (used: ${check.used}/${check.limit})`);
      continue;
    }

    // Make actual API call
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 100,
    });

    const usage = response.usage;
    const stats = budget.record(userId, usage.prompt_tokens, usage.completion_tokens);

    console.log(`  Actual tokens: ${usage.prompt_tokens} in + ${usage.completion_tokens} out`);
    console.log(`  Running total: ${stats.tokens} tokens (${((stats.tokens / budget.dailyLimit) * 100).toFixed(1)}% of daily limit)`);
    console.log();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Conversation History Manager
// Load, truncate to fit context, save after response
// ─────────────────────────────────────────────────────────────────────────────

class ConversationManager {
  constructor() {
    this.conversations = new Map(); // sessionId → [{role, content, tokenCount}]
    this.systemPrompt = "You are a helpful software engineering assistant.";
    this.maxContextTokens = 2000;
    this.maxResponseTokens = 500;
  }

  loadHistory(sessionId) {
    return this.conversations.get(sessionId) || [];
  }

  buildContextMessages(sessionId, newUserMessage) {
    const history = this.loadHistory(sessionId);
    const systemTokens = estimateTokens(this.systemPrompt);
    const newMsgTokens = estimateTokens(newUserMessage);
    let budget = this.maxContextTokens - systemTokens - newMsgTokens - this.maxResponseTokens;

    const selected = [];
    // Load from newest to oldest, stop when budget exceeded
    for (let i = history.length - 1; i >= 0; i--) {
      const msgTokens = history[i].tokenCount || estimateTokens(history[i].content);
      if (budget - msgTokens < 0) {
        console.log(`  [ConvManager] Truncated at message ${i} (budget: ${budget} tokens remaining)`);
        break;
      }
      budget -= msgTokens;
      selected.unshift(history[i]);
    }

    return [
      { role: "system", content: this.systemPrompt },
      ...selected.map(({ role, content }) => ({ role, content })),
      { role: "user", content: newUserMessage },
    ];
  }

  saveMessage(sessionId, role, content) {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, []);
    }
    this.conversations.get(sessionId).push({
      role,
      content,
      tokenCount: estimateTokens(content),
      timestamp: new Date().toISOString(),
    });
  }

  async chat(sessionId, userMessage) {
    const messages = this.buildContextMessages(sessionId, userMessage);
    console.log(`  [ConvManager] Sending ${messages.length} messages, ~${estimateMessagesTokens(messages)} tokens`);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: this.maxResponseTokens,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0].message.content;
    this.saveMessage(sessionId, "user", userMessage);
    this.saveMessage(sessionId, "assistant", assistantMessage);

    return assistantMessage;
  }
}

async function exercise3_conversationManager() {
  console.log("\n=== Exercise 3: Conversation History Manager ===\n");

  const manager = new ConversationManager();
  const sessionId = "session-abc-123";

  const turns = [
    "What are React hooks?",
    "Can you give an example of useState?",
    "How is useEffect different?",
    "What about useCallback?",
  ];

  for (const message of turns) {
    console.log(`User: ${message}`);
    const response = await manager.chat(sessionId, message);
    console.log(`Assistant: ${response.substring(0, 100)}...\n`);
  }

  console.log(`Total messages in history: ${manager.loadHistory(sessionId).length}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Model Router
// Classify query complexity, route to cheap vs expensive model
// ─────────────────────────────────────────────────────────────────────────────

function classifyQueryComplexity(message, conversationLength = 0) {
  const factors = {
    // +2 for system design questions
    isSystemDesign: /design|architect|scale|distributed|microservice/i.test(message) ? 2 : 0,
    // +1 for debugging questions
    isDebugging: /debug|fix|error|bug|issue/i.test(message) ? 1 : 0,
    // +1 for long messages
    isLong: message.length > 300 ? 1 : 0,
    // +1 for code-heavy messages
    hasCode: /```|function|class|interface|async|await/i.test(message) ? 1 : 0,
    // -2 for clearly simple questions
    isSimple: /what is|who is|how many|yes or no|define/i.test(message) ? -2 : 0,
    // +1 for long conversations (more context needed)
    deepConversation: conversationLength > 6 ? 1 : 0,
  };

  const total = Object.values(factors).reduce((s, v) => s + v, 0);
  const model = total >= 2 ? "gpt-4o" : "gpt-4o-mini";

  return { model, score: total, factors };
}

async function routedCompletion(message, conversationLength = 0) {
  const { model, score, factors } = classifyQueryComplexity(message, conversationLength);

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: message }],
    max_tokens: 150,
  });

  const usage = response.usage;
  const pricing = { "gpt-4o": { input: 5, output: 15 }, "gpt-4o-mini": { input: 0.15, output: 0.6 } };
  const p = pricing[model];
  const cost = (usage.prompt_tokens / 1_000_000) * p.input + (usage.completion_tokens / 1_000_000) * p.output;

  return { model, score, cost, response: response.choices[0].message.content };
}

async function exercise4_modelRouter() {
  console.log("\n=== Exercise 4: Model Router ===\n");

  const testQueries = [
    "What is a closure?",
    "Design a distributed rate limiter for 1M requests/second",
    "Fix this bug: TypeError: Cannot read property 'map' of undefined",
    "How many days in a week?",
    "How would you architect a real-time collaborative editing system like Google Docs?",
  ];

  let totalCost = 0;
  let miniCost = 0;
  let allMiniCost = 0;

  for (const query of testQueries) {
    const result = await routedCompletion(query);
    totalCost += result.cost;

    // What would it cost if we always used mini?
    const miniPricing = { input: 0.15, output: 0.6 };
    const miniResponse = result.model === "gpt-4o-mini"
      ? result
      : await routedCompletion(query.replace(/design|architect/gi, "explain")); // Approx

    console.log(`Query: "${query.substring(0, 60)}"`);
    console.log(`  Routed to: ${result.model} (score: ${result.score})`);
    console.log(`  Cost: $${result.cost.toFixed(6)}`);
    console.log();
  }

  console.log(`Total routed cost: $${totalCost.toFixed(6)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Semantic Cache Middleware
// Check cache before calling OpenAI, store on miss
// ─────────────────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

class SemanticCacheMiddleware {
  constructor(threshold = 0.93) {
    this.threshold = threshold;
    this.cache = []; // [{query, embedding, response, timestamp, hits}]
    this.stats = { hits: 0, misses: 0, savedCalls: 0 };
  }

  async embed(text) {
    const res = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: [text],
    });
    return res.data[0].embedding;
  }

  async lookup(query) {
    if (this.cache.length === 0) return null;
    const queryEmb = await this.embed(query);

    let best = null, bestSim = 0;
    for (const entry of this.cache) {
      const sim = cosineSimilarity(queryEmb, entry.embedding);
      if (sim > bestSim) { bestSim = sim; best = entry; }
    }

    if (bestSim >= this.threshold) {
      best.hits++;
      this.stats.hits++;
      this.stats.savedCalls++;
      return { response: best.response, similarity: bestSim, originalQuery: best.query };
    }

    this.stats.misses++;
    return null;
  }

  async store(query, response) {
    const embedding = await this.embed(query);
    this.cache.push({ query, embedding, response, timestamp: Date.now(), hits: 0 });
  }

  async completionWithCache(message) {
    // Check cache first
    const cached = await this.lookup(message);
    if (cached) {
      console.log(`  CACHE HIT [sim=${cached.similarity.toFixed(4)}]: "${cached.originalQuery.substring(0, 50)}"`);
      return { source: "cache", response: cached.response };
    }

    // Cache miss: call OpenAI
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
      max_tokens: 100,
      temperature: 0,
    });

    const content = response.choices[0].message.content;
    await this.store(message, content);
    return { source: "api", response: content };
  }
}

async function exercise5_semanticCache() {
  console.log("\n=== Exercise 5: Semantic Cache Middleware ===\n");

  const cache = new SemanticCacheMiddleware(0.92);

  const queries = [
    "What is a JavaScript closure?",               // Miss → stored
    "Explain closures in JavaScript",              // Hit (similar to above)
    "What are closures in JS?",                    // Hit (similar)
    "How does Docker networking work?",            // Miss → stored
    "Explain Docker container networking",         // Hit
    "What is machine learning?",                   // Miss → stored
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    const result = await cache.completionWithCache(query);
    console.log(`  Source: ${result.source}`);
    console.log(`  Response: "${result.response.substring(0, 70)}..."\n`);
  }

  const { hits, misses, savedCalls } = cache.stats;
  console.log(`\nCache stats: ${hits} hits, ${misses} misses, ${savedCalls} API calls saved`);
  console.log(`Cache hit rate: ${((hits / (hits + misses)) * 100).toFixed(1)}%`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.log("Set OPENAI_API_KEY to run these exercises.");
    return;
  }

  await exercise1_streamingEndpoint();
  await exercise2_tokenBudget();
  await exercise3_conversationManager();
  await exercise4_modelRouter();
  await exercise5_semanticCache();
}

main().catch(console.error);

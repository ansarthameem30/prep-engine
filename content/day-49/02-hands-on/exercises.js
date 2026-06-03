/**
 * Day 49 — GenAI Production Patterns: Hands-On Exercises
 * Prerequisites: npm install openai better-sqlite3
 * Set OPENAI_API_KEY in your environment
 */

const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: LLM-as-Judge Evaluator
// Score RAG answer for faithfulness on 1-5 scale
// ─────────────────────────────────────────────────────────────────────────────

async function evaluateFaithfulness(question, answer, context) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini", // Use gpt-4o for production, mini for cost-effective CI
    messages: [
      {
        role: "system",
        content: `You are an evaluation system for RAG (Retrieval-Augmented Generation) responses.
Your task: evaluate if an AI answer is FAITHFUL to the provided context.

Faithfulness means:
- All facts in the answer are supported by the context
- No contradictions with the context
- No hallucinated information not present in context

Return JSON with this exact structure:
{
  "score": <integer 1-5>,
  "verdict": "faithful" | "partially_faithful" | "unfaithful",
  "claims": [{"claim": "statement", "supported": true/false, "evidence": "quote from context or null"}],
  "reasoning": "brief explanation"
}

Score guide: 5=all claims supported, 4=mostly supported, 3=mixed, 2=few claims supported, 1=contradicts context`,
      },
      {
        role: "user",
        content: `QUESTION: ${question}

ANSWER: ${answer}

CONTEXT:
${context}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 400,
  });

  return JSON.parse(response.choices[0].message.content);
}

async function exercise1_llmJudge() {
  console.log("=== Exercise 1: LLM-as-Judge Faithfulness Evaluator ===\n");

  const context = `
The company offers three service tiers:
- Basic: $9/month, includes email support, up to 5 users, 10GB storage
- Pro: $29/month, includes priority support, up to 25 users, 100GB storage
- Enterprise: Custom pricing, dedicated support, unlimited users and storage

All plans include a 14-day free trial. Annual billing saves 20%.
`.trim();

  const testCases = [
    {
      question: "What does the Pro plan include?",
      answer: "The Pro plan costs $29/month and includes priority support, up to 25 users, and 100GB of storage.",
      label: "Faithful",
    },
    {
      question: "What does the Pro plan include?",
      answer: "The Pro plan costs $29/month and includes 24/7 phone support and unlimited users.",
      label: "Unfaithful (wrong features)",
    },
    {
      question: "What's the free trial length?",
      answer: "There's a 14-day free trial. You can also get a 20% discount with annual billing.",
      label: "Faithful (includes extra supported fact)",
    },
    {
      question: "What is the Enterprise pricing?",
      answer: "Enterprise pricing is $99/month and includes unlimited users and storage.",
      label: "Unfaithful (made up price)",
    },
  ];

  for (const { question, answer, label } of testCases) {
    const result = await evaluateFaithfulness(question, answer, context);
    const icon = result.score >= 4 ? "✓" : result.score >= 3 ? "~" : "✗";
    console.log(`${icon} [${label}] Score: ${result.score}/5 (${result.verdict})`);
    console.log(`  Q: "${question}"`);
    console.log(`  A: "${answer.substring(0, 80)}"`);
    console.log(`  Reasoning: ${result.reasoning}`);
    if (result.claims.some((c) => !c.supported)) {
      console.log(`  Unsupported claims: ${result.claims.filter((c) => !c.supported).map((c) => c.claim).join("; ")}`);
    }
    console.log();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Prompt Regression Test Suite
// Run all test cases, report pass/fail rate
// ─────────────────────────────────────────────────────────────────────────────

async function runPromptWithTestCase(prompt, testCase) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: testCase.input },
    ],
    response_format: testCase.expectJSON ? { type: "json_object" } : undefined,
    temperature: 0,
    max_tokens: 150,
  });
  return response.choices[0].message.content;
}

const EXTRACTION_PROMPT_V1 = `Extract the sentiment from the customer message.
Return JSON: {"sentiment": "positive", "negative", or "neutral", "confidence": 0-1}`;

const EXTRACTION_PROMPT_V2 = `You are a sentiment analysis system for customer feedback.
Classify the customer message sentiment with high accuracy.

Rules:
- "positive": clear praise, satisfaction, or recommendation
- "negative": complaints, frustration, or dissatisfaction
- "neutral": factual statements, questions, or mixed feelings

Return ONLY valid JSON: {"sentiment": "positive" | "negative" | "neutral", "confidence": 0.0-1.0}`;

const TEST_SUITE = [
  {
    id: "T001",
    input: "This product is absolutely amazing, best purchase I've made!",
    expectedSentiment: "positive",
    expectJSON: true,
  },
  {
    id: "T002",
    input: "Terrible quality, broke after one week. Never buying again.",
    expectedSentiment: "negative",
    expectJSON: true,
  },
  {
    id: "T003",
    input: "The package arrived.",
    expectedSentiment: "neutral",
    expectJSON: true,
  },
  {
    id: "T004",
    input: "Great features but the price is too high for what you get.",
    expectedSentiment: "neutral",
    expectJSON: true,
  },
  {
    id: "T005",
    input: "Fast shipping! Item works as described.",
    expectedSentiment: "positive",
    expectJSON: true,
  },
];

async function runRegressionSuite(prompt, promptVersion) {
  const results = [];

  for (const tc of TEST_SUITE) {
    try {
      const output = await runPromptWithTestCase(prompt, tc);
      let parsed;
      try {
        parsed = JSON.parse(output);
      } catch {
        results.push({ id: tc.id, passed: false, error: "Invalid JSON", output });
        continue;
      }

      const passed = parsed.sentiment?.toLowerCase() === tc.expectedSentiment;
      results.push({
        id: tc.id,
        passed,
        expected: tc.expectedSentiment,
        got: parsed.sentiment,
        confidence: parsed.confidence,
      });
    } catch (err) {
      results.push({ id: tc.id, passed: false, error: err.message });
    }
  }

  const passRate = (results.filter((r) => r.passed).length / results.length) * 100;
  return { promptVersion, passRate, results };
}

async function exercise2_regressionTests() {
  console.log("\n=== Exercise 2: Prompt Regression Test Suite ===\n");

  console.log("Testing PROMPT V1...");
  const v1Results = await runRegressionSuite(EXTRACTION_PROMPT_V1, "v1");
  console.log(`V1 Pass Rate: ${v1Results.passRate.toFixed(1)}%`);
  v1Results.results.forEach((r) => {
    const icon = r.passed ? "✓" : "✗";
    console.log(`  ${icon} ${r.id}: expected=${r.expected} got=${r.got} (conf=${r.confidence?.toFixed(2)})`);
  });

  console.log("\nTesting PROMPT V2...");
  const v2Results = await runRegressionSuite(EXTRACTION_PROMPT_V2, "v2");
  console.log(`V2 Pass Rate: ${v2Results.passRate.toFixed(1)}%`);
  v2Results.results.forEach((r) => {
    const icon = r.passed ? "✓" : "✗";
    console.log(`  ${icon} ${r.id}: expected=${r.expected} got=${r.got} (conf=${r.confidence?.toFixed(2)})`);
  });

  const improvement = v2Results.passRate - v1Results.passRate;
  console.log(`\nV2 improvement over V1: ${improvement > 0 ? "+" : ""}${improvement.toFixed(1)}%`);
  console.log(`Deploy V2? ${v2Results.passRate >= 80 ? "YES (passes 80% threshold)" : "NO (below threshold)"}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Cost Tracking Logger with In-Memory SQLite
// Middleware that records every OpenAI call
// ─────────────────────────────────────────────────────────────────────────────

// In-memory usage log (simulating SQLite)
class UsageLogger {
  constructor() {
    this.logs = [];
    this.totals = { calls: 0, inputTokens: 0, outputTokens: 0, costCents: 0 };
  }

  getPricing(model) {
    const pricing = {
      "gpt-4o": { input: 5, output: 15 },
      "gpt-4o-mini": { input: 0.15, output: 0.6 },
      "text-embedding-3-small": { input: 0.02, output: 0 },
    };
    return pricing[model] || { input: 5, output: 15 };
  }

  async trackedCall(fn, meta = {}) {
    const startTime = Date.now();
    let response, error;

    try {
      response = await fn();
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const latencyMs = Date.now() - startTime;

      if (response?.usage) {
        const pricing = this.getPricing(response.model || meta.model);
        const costCents =
          (response.usage.prompt_tokens / 1_000_000) * pricing.input +
          (response.usage.completion_tokens / 1_000_000) * pricing.output;

        const log = {
          id: this.logs.length + 1,
          timestamp: new Date().toISOString(),
          userId: meta.userId || "anonymous",
          model: response.model || meta.model,
          promptVersion: meta.promptVersion || "default",
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens || 0,
          costCents: Math.round(costCents * 1000) / 1000,
          latencyMs,
          error: error?.message || null,
        };

        this.logs.push(log);
        this.totals.calls++;
        this.totals.inputTokens += log.inputTokens;
        this.totals.outputTokens += log.outputTokens;
        this.totals.costCents += log.costCents;
      }
    }

    return response;
  }

  getReport() {
    const byModel = {};
    for (const log of this.logs) {
      if (!byModel[log.model]) byModel[log.model] = { calls: 0, costCents: 0 };
      byModel[log.model].calls++;
      byModel[log.model].costCents += log.costCents;
    }
    return { totals: this.totals, byModel, recentLogs: this.logs.slice(-5) };
  }
}

async function exercise3_costTracker() {
  console.log("\n=== Exercise 3: Cost Tracking Logger ===\n");

  const logger = new UsageLogger();

  // Simulate several API calls with tracking
  const queries = [
    { q: "What is TypeScript?", userId: "user-1", model: "gpt-4o-mini" },
    { q: "Design a distributed cache system", userId: "user-2", model: "gpt-4o" },
    { q: "What is 2+2?", userId: "user-1", model: "gpt-4o-mini" },
    { q: "Explain async/await", userId: "user-3", model: "gpt-4o-mini" },
  ];

  for (const { q, userId, model } of queries) {
    await logger.trackedCall(
      () => client.chat.completions.create({
        model,
        messages: [{ role: "user", content: q }],
        max_tokens: 100,
      }),
      { userId, model }
    );
    process.stdout.write(".");
  }

  console.log("\n\nUsage Report:");
  const report = logger.getReport();
  console.log("Totals:", report.totals);
  console.log("\nBy model:");
  Object.entries(report.byModel).forEach(([model, stats]) => {
    console.log(`  ${model}: ${stats.calls} calls, $${(stats.costCents / 100).toFixed(4)}`);
  });
  console.log("\nRecent logs (last 3):");
  report.recentLogs.slice(-3).forEach((log) => {
    console.log(`  [${log.userId}] ${log.model}: ${log.inputTokens}in/${log.outputTokens}out, $${(log.costCents / 100).toFixed(6)}, ${log.latencyMs}ms`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Semantic Cache with Redis-like Interface
// Embed query, check similarity, cache hits/misses reporting
// ─────────────────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; magA += a[i]*a[i]; magB += b[i]*b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

class ProductionSemanticCache {
  constructor(threshold = 0.93, ttlMs = 3600000) {
    this.cache = new Map(); // key → {query, embedding, response, expires, hits}
    this.threshold = threshold;
    this.ttlMs = ttlMs;
    this.stats = { hits: 0, misses: 0, evictions: 0, storedQueries: 0 };
  }

  async getEmbedding(text) {
    const res = await client.embeddings.create({
      model: "text-embedding-3-small", input: [text]
    });
    return res.data[0].embedding;
  }

  evictExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expires < now) { this.cache.delete(key); this.stats.evictions++; }
    }
  }

  async get(query) {
    this.evictExpired();
    const queryEmb = await this.getEmbedding(query);
    let bestKey = null, bestSim = 0;

    for (const [key, entry] of this.cache) {
      const sim = cosineSimilarity(queryEmb, entry.embedding);
      if (sim > bestSim) { bestSim = sim; bestKey = key; }
    }

    if (bestSim >= this.threshold) {
      const entry = this.cache.get(bestKey);
      entry.hits++;
      this.stats.hits++;
      return { hit: true, response: entry.response, similarity: bestSim, originalQuery: entry.query };
    }

    this.stats.misses++;
    return { hit: false };
  }

  async set(query, response) {
    const embedding = await this.getEmbedding(query);
    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.cache.set(key, { query, embedding, response, expires: Date.now() + this.ttlMs, hits: 0 });
    this.stats.storedQueries++;
  }

  getReport() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) + "%" : "0%",
      cacheSize: this.cache.size,
    };
  }
}

async function exercise4_productionCache() {
  console.log("\n=== Exercise 4: Production Semantic Cache ===\n");

  const cache = new ProductionSemanticCache(0.92);

  const queries = [
    "What is a React hook?",
    "Explain React hooks",          // Should hit
    "How do React hooks work?",     // Should hit
    "What is PostgreSQL?",          // Miss
    "Describe PostgreSQL database", // Should hit
    "What is TypeScript?",          // Miss
    "Can you explain TypeScript?",  // Should hit
    "What is machine learning?",    // Miss
  ];

  for (const query of queries) {
    const lookup = await cache.get(query);
    if (lookup.hit) {
      console.log(`HIT  [${lookup.similarity.toFixed(4)}] "${query}"`);
      console.log(`     Matched: "${lookup.originalQuery}"\n`);
    } else {
      // Call OpenAI and store
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: query }],
        max_tokens: 60, temperature: 0,
      });
      const answer = response.choices[0].message.content;
      await cache.set(query, answer);
      console.log(`MISS "${query}" → stored in cache\n`);
    }
  }

  console.log("Cache Report:", cache.getReport());
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Model Router
// GPT-4o-mini for short/simple queries, GPT-4o for complex ones
// ─────────────────────────────────────────────────────────────────────────────

function getModelForQuery(message) {
  const messageLen = message.length;
  const complexitySignals = [
    /design|architect|system|scalab/i.test(message),
    /tradeoff|compare|analyze|evaluate/i.test(message),
    messageLen > 400,
    /explain.*detail|comprehensive|thorough/i.test(message),
  ];

  const complexityScore = complexitySignals.filter(Boolean).length;

  if (complexityScore >= 2) {
    return { model: "gpt-4o", reason: `complexity score ${complexityScore}: ${complexitySignals.map((s, i) => s ? i : "").filter(Boolean).join(",")}` };
  }
  return { model: "gpt-4o-mini", reason: `complexity score ${complexityScore}` };
}

async function exercise5_modelRouter() {
  console.log("\n=== Exercise 5: Model Router ===\n");

  const testQueries = [
    "What is a closure?",
    "Design a distributed rate limiter for 1 million requests per second with Redis. Consider failover, consistency, and cost tradeoffs.",
    "What is 5 * 7?",
    "Compare and analyze the tradeoffs between microservices and monolithic architecture for a high-traffic fintech application.",
    "Explain closures in detail with comprehensive examples showing advanced use cases.",
  ];

  let totalCost = 0;
  let miniCost = 0;
  const gpt4oPricing = { input: 5, output: 15 };
  const miniPricing = { input: 0.15, output: 0.6 };

  for (const query of testQueries) {
    const { model, reason } = getModelForQuery(query);

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: query }],
      max_tokens: 100,
    });

    const usage = response.usage;
    const p = model === "gpt-4o" ? gpt4oPricing : miniPricing;
    const cost = (usage.prompt_tokens / 1_000_000) * p.input + (usage.completion_tokens / 1_000_000) * p.output;
    const hypotheticalGPT4oCost = (usage.prompt_tokens / 1_000_000) * gpt4oPricing.input + (usage.completion_tokens / 1_000_000) * gpt4oPricing.output;

    totalCost += cost;
    miniCost += (usage.prompt_tokens / 1_000_000) * miniPricing.input + (usage.completion_tokens / 1_000_000) * miniPricing.output;

    console.log(`Query: "${query.substring(0, 55)}"`);
    console.log(`  → ${model} (${reason})`);
    console.log(`  Cost: $${cost.toFixed(6)} (vs $${hypotheticalGPT4oCost.toFixed(6)} if always GPT-4o)`);
    console.log();
  }

  const alwaysGPT4oCost = testQueries.length * 0.001; // Approximation
  console.log(`Total cost with routing: $${totalCost.toFixed(6)}`);
  console.log(`Total cost if always mini: $${miniCost.toFixed(6)}`);
  console.log(`Routing saves ${((1 - totalCost / alwaysGPT4oCost) * 100).toFixed(0)}% vs always GPT-4o (estimated)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.log("Set OPENAI_API_KEY to run these exercises.");
    return;
  }

  await exercise1_llmJudge();
  await exercise2_regressionTests();
  await exercise3_costTracker();
  await exercise4_productionCache();
  await exercise5_modelRouter();
}

main().catch(console.error);

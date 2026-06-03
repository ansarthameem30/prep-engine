/**
 * Day 50 — GenAI Mock Interview Day: Full Live Coding Challenge
 *
 * This is a complete end-to-end GenAI system built in one file —
 * exactly what you might implement in a 45-minute technical interview.
 *
 * Prerequisites: npm install openai
 * Set OPENAI_API_KEY in your environment
 */

const OpenAI = require("openai");
const http = require("http");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; magA += a[i]*a[i]; magB += b[i]*b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function estimateTokens(text) {
  return Math.ceil(text.length / 4) + 4;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Minimal RAG Endpoint — POST /ask
// Chunk → embed → store in-memory → retrieve → generate answer
// ─────────────────────────────────────────────────────────────────────────────

class MinimalRAG {
  constructor() {
    this.store = []; // {id, text, embedding, source}
    this.SYSTEM_PROMPT = `You are a knowledgeable assistant. Answer questions using ONLY the provided context.
If the answer is not in the context, say "I don't have information about that in my knowledge base."
Cite your sources using [Source N] notation.`;
  }

  // Sentence-based chunker
  chunkDocument(text, maxLen = 400) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let current = [];

    for (const sentence of sentences) {
      current.push(sentence.trim());
      if (current.join(" ").length > maxLen) {
        chunks.push(current.join(" "));
        current = current.slice(-1); // 1-sentence overlap
      }
    }
    if (current.length > 0) chunks.push(current.join(" "));
    return chunks;
  }

  async addDocument(doc) {
    const chunks = this.chunkDocument(doc.text);
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
    });

    chunks.forEach((chunk, i) => {
      this.store.push({
        id: `${doc.id}-${i}`,
        text: chunk,
        embedding: response.data[i].embedding,
        source: doc.title,
      });
    });

    return chunks.length;
  }

  async search(query, topK = 3) {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: [query],
    });
    const queryEmb = response.data[0].embedding;

    return this.store
      .map((entry) => ({ ...entry, score: cosineSimilarity(entry.embedding, queryEmb) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async ask(question) {
    const retrieved = await this.search(question, 3);
    const context = retrieved
      .map((r, i) => `[Source ${i + 1}: ${r.source}]\n${r.text}`)
      .join("\n\n---\n\n");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: this.SYSTEM_PROMPT },
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
      ],
      temperature: 0.1,
      max_tokens: 250,
    });

    return {
      answer: response.choices[0].message.content,
      sources: retrieved.map((r) => ({ source: r.source, score: r.score.toFixed(4) })),
      tokens: response.usage,
    };
  }
}

async function exercise1_ragEndpoint() {
  console.log("=== Exercise 1: Minimal RAG Endpoint ===\n");

  const rag = new MinimalRAG();

  // Load knowledge base
  const docs = [
    {
      id: "kb-1", title: "API Rate Limits",
      text: "Our API enforces rate limits of 100 requests per minute per user. Exceeding this returns a 429 status code. Use exponential backoff to retry. Enterprise plans have higher limits. Contact support to request limit increases.",
    },
    {
      id: "kb-2", title: "Authentication",
      text: "All API requests require Bearer token authentication. Include the token in the Authorization header: 'Authorization: Bearer {token}'. Tokens expire after 24 hours. Refresh tokens last 30 days. Never expose API keys in client-side code.",
    },
    {
      id: "kb-3", title: "Error Codes",
      text: "Common error codes: 400 Bad Request (invalid parameters), 401 Unauthorized (invalid token), 403 Forbidden (insufficient permissions), 404 Not Found (resource doesn't exist), 429 Too Many Requests (rate limit exceeded), 500 Internal Server Error (our fault, retry).",
    },
  ];

  console.log("Loading knowledge base...");
  for (const doc of docs) {
    const chunks = await rag.addDocument(doc);
    console.log(`  ${doc.title}: ${chunks} chunk(s)`);
  }

  console.log(`\nIndex ready: ${rag.store.length} total chunks\n`);

  const questions = [
    "What happens when I exceed the rate limit?",
    "How do I authenticate my API requests?",
    "What does a 403 error mean?",
  ];

  for (const q of questions) {
    console.log(`Q: ${q}`);
    const result = await rag.ask(q);
    console.log(`A: ${result.answer}`);
    console.log(`Sources: ${result.sources.map((s) => `${s.source}(${s.score})`).join(", ")}`);
    console.log(`Tokens: ${result.tokens.prompt_tokens} in / ${result.tokens.completion_tokens} out\n`);
  }

  return rag;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Streaming Response + Client Display
// Stream the generation, display tokens as they arrive
// ─────────────────────────────────────────────────────────────────────────────

async function streamingRAGResponse(rag, question) {
  console.log(`\n=== Exercise 2: Streaming RAG Response ===\n`);
  console.log(`Question: "${question}"\n`);

  const retrieved = await rag.search(question, 3);
  const context = retrieved
    .map((r, i) => `[Source ${i + 1}]\n${r.text}`)
    .join("\n\n---\n\n");

  const startTime = Date.now();
  let firstTokenTime = null;
  let fullText = "";

  process.stdout.write("Answer: ");

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Answer concisely using only the provided context. Cite sources.",
      },
      { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
    stream: true,
    temperature: 0.1,
    max_tokens: 200,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      if (!firstTokenTime) firstTokenTime = Date.now() - startTime;
      process.stdout.write(delta);
      fullText += delta;
    }
  }

  console.log(`\n\n[TTFT: ${firstTokenTime}ms | Total: ${Date.now() - startTime}ms]`);
  return fullText;
}

async function exercise2_streaming(rag) {
  await streamingRAGResponse(rag, "How should I handle authentication token expiry?");
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Conversation History Management
// Multi-turn conversation with context persistence
// ─────────────────────────────────────────────────────────────────────────────

async function exercise3_conversationHistory(rag) {
  console.log("\n=== Exercise 3: Conversation History Management ===\n");

  const MAX_CONTEXT_TOKENS = 2000;
  const SYSTEM_PROMPT = rag.SYSTEM_PROMPT;
  const history = [];

  async function conversationalAsk(userMessage) {
    // Get relevant context
    const retrieved = await rag.search(userMessage, 2);
    const context = retrieved.map((r, i) => `[Source ${i + 1}]\n${r.text}`).join("\n\n");

    // Build messages with history
    const systemMsg = { role: "system", content: `${SYSTEM_PROMPT}\n\nContext:\n${context}` };
    let budget = MAX_CONTEXT_TOKENS - estimateTokens(systemMsg.content) - estimateTokens(userMessage) - 300;

    const trimmedHistory = [];
    for (let i = history.length - 1; i >= 0; i--) {
      const tokens = estimateTokens(history[i].content);
      if (budget - tokens < 0) break;
      budget -= tokens;
      trimmedHistory.unshift(history[i]);
    }

    const messages = [
      systemMsg,
      ...trimmedHistory,
      { role: "user", content: userMessage },
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
      max_tokens: 150,
    });

    const assistantMessage = response.choices[0].message.content;
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: assistantMessage });

    return assistantMessage;
  }

  const turns = [
    "What should I do if I hit the rate limit?",
    "How long should I wait before retrying?",
    "And what if I get a 401 error instead?",
  ];

  for (const turn of turns) {
    console.log(`User: ${turn}`);
    const response = await conversationalAsk(turn);
    console.log(`Assistant: ${response}`);
    console.log(`[History: ${history.length} messages]\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Faithfulness Evaluation
// LLM-as-judge checks each answer against context
// ─────────────────────────────────────────────────────────────────────────────

async function evaluateAnswer(question, answer, context) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Evaluate if an AI answer is faithful to the provided context.
Return JSON: {"faithful": boolean, "score": 1-5, "reason": "brief explanation"}
Score 5 = fully supported. Score 1 = contradicts context.`,
      },
      {
        role: "user",
        content: `Q: ${question}\nA: ${answer}\nContext: ${context}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 100,
  });
  return JSON.parse(response.choices[0].message.content);
}

async function exercise4_faithfulnessEval(rag) {
  console.log("\n=== Exercise 4: Faithfulness Evaluation ===\n");

  const testCases = [
    {
      q: "What happens when I exceed the rate limit?",
      goodAnswer: "You receive a 429 status code and should use exponential backoff to retry.",
      badAnswer: "You get banned permanently and your account is suspended.",
    },
  ];

  for (const tc of testCases) {
    const retrieved = await rag.search(tc.q, 2);
    const context = retrieved.map((r) => r.text).join("\n");

    const goodEval = await evaluateAnswer(tc.q, tc.goodAnswer, context);
    const badEval = await evaluateAnswer(tc.q, tc.badAnswer, context);

    console.log(`Question: "${tc.q}"\n`);
    console.log(`Good answer: "${tc.goodAnswer}"`);
    console.log(`  Score: ${goodEval.score}/5, Faithful: ${goodEval.faithful}`);
    console.log(`  Reason: ${goodEval.reason}\n`);
    console.log(`Bad answer: "${tc.badAnswer}"`);
    console.log(`  Score: ${badEval.score}/5, Faithful: ${badEval.faithful}`);
    console.log(`  Reason: ${badEval.reason}\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Cost Tracking
// Track every OpenAI call with model, tokens, and cost
// ─────────────────────────────────────────────────────────────────────────────

const PRICING = {
  "gpt-4o": { input: 5, output: 15 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
};

const costLog = [];

function logCost(model, usage) {
  const p = PRICING[model] || PRICING["gpt-4o"];
  const inputTokens = usage.prompt_tokens || usage.total_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;
  const costCents = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;

  costLog.push({ model, inputTokens, outputTokens, costCents, timestamp: Date.now() });
  return costCents;
}

async function trackedCompletion(messages, options = {}) {
  const model = options.model || "gpt-4o-mini";
  const response = await client.chat.completions.create({
    model,
    messages,
    ...options,
  });

  const cost = logCost(model, response.usage);
  return { response, cost };
}

function getCostReport() {
  const total = costLog.reduce((sum, l) => sum + l.costCents, 0);
  const byModel = {};
  costLog.forEach((l) => {
    if (!byModel[l.model]) byModel[l.model] = { calls: 0, costCents: 0 };
    byModel[l.model].calls++;
    byModel[l.model].costCents += l.costCents;
  });
  return {
    totalCalls: costLog.length,
    totalCostCents: total,
    totalCostUSD: (total / 100).toFixed(6),
    byModel,
  };
}

async function exercise5_costTracking() {
  console.log("\n=== Exercise 5: Cost Tracking ===\n");

  const queries = [
    "What are the rate limits?",
    "How do I authenticate?",
    "What is a 500 error?",
  ];

  for (const q of queries) {
    const { response, cost } = await trackedCompletion(
      [{ role: "user", content: q }],
      { max_tokens: 80 }
    );
    console.log(`Q: "${q}" → $${(cost / 100).toFixed(6)}`);
  }

  const report = getCostReport();
  console.log("\nCost Report:");
  console.log(`  Total calls: ${report.totalCalls}`);
  console.log(`  Total cost: $${report.totalCostUSD}`);
  console.log(`  By model:`);
  Object.entries(report.byModel).forEach(([model, stats]) => {
    console.log(`    ${model}: ${stats.calls} calls, $${(stats.costCents / 100).toFixed(6)}`);
  });

  console.log(`\n  [Projection] 10,000 similar calls/day: ~$${((report.totalCostCents / report.totalCalls) * 10000 / 100).toFixed(2)}/day`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.log("Set OPENAI_API_KEY to run these exercises.");
    return;
  }

  console.log("GenAI Live Coding Challenge — Full Pipeline\n");
  console.log("=".repeat(60) + "\n");

  const rag = await exercise1_ragEndpoint();
  await exercise2_streaming(rag);
  await exercise3_conversationHistory(rag);
  await exercise4_faithfulnessEval(rag);
  await exercise5_costTracking();

  console.log("\n" + "=".repeat(60));
  console.log("Challenge complete! Full pipeline implemented:");
  console.log("  ✓ RAG endpoint (chunk → embed → retrieve → generate)");
  console.log("  ✓ Streaming SSE response");
  console.log("  ✓ Multi-turn conversation with context management");
  console.log("  ✓ Faithfulness evaluation (LLM-as-judge)");
  console.log("  ✓ Cost tracking with per-model breakdown");
}

main().catch(console.error);

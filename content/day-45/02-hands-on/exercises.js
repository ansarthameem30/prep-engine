/**
 * Day 45 — RAG Architecture: Hands-On Exercises
 * Prerequisites: npm install openai
 * Set OPENAI_API_KEY in your environment
 */

const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions
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

async function embedText(text) {
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: [text],
  });
  return res.data[0].embedding;
}

async function embedBatch(texts) {
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Minimal RAG Pipeline from Scratch
// Chunk → embed → store in-memory → retrieve → generate
// ─────────────────────────────────────────────────────────────────────────────

// Sample knowledge base: engineering team handbook
const KNOWLEDGE_BASE = [
  {
    id: "kb-001",
    title: "Code Review Process",
    text: "All code must be reviewed by at least one other engineer before merging. Reviews should focus on correctness, readability, and performance. Use GitHub pull requests. Reviewer must approve before merge. Hotfixes to production require two approvals.",
  },
  {
    id: "kb-002",
    title: "On-Call Rotation",
    text: "The on-call rotation cycles weekly among senior engineers. The on-call engineer must respond to P1 alerts within 15 minutes and P2 within 1 hour. Use PagerDuty for escalation. Document all incidents in the incident log within 24 hours.",
  },
  {
    id: "kb-003",
    title: "Deployment Process",
    text: "Deployments happen Tuesday through Thursday between 10am-3pm PST only. All deployments require a deploy ticket. Use the deployment checklist in Notion. Blue-green deployments via Kubernetes. Rollback takes less than 5 minutes via kubectl rollout undo.",
  },
  {
    id: "kb-004",
    title: "Database Migration Guidelines",
    text: "All database migrations must be backward-compatible. Never drop a column without a two-phase migration: first make the column nullable, deploy, then in a separate deploy drop the column. Use Flyway for migration management. Test migrations on staging for 24 hours before production.",
  },
  {
    id: "kb-005",
    title: "Performance Standards",
    text: "API endpoints must respond in under 200ms at p95. Database queries must complete in under 50ms. Set alerts for p99 latency above 500ms. Run load tests before major feature launches. Use DataDog for monitoring.",
  },
];

function sentenceChunker(text, maxLength = 400, overlap = 1) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = [];

  for (const sentence of sentences) {
    current.push(sentence.trim());
    if (current.join(" ").length > maxLength) {
      chunks.push(current.join(" "));
      current = current.slice(-overlap);
    }
  }
  if (current.length > 0) chunks.push(current.join(" "));
  return chunks;
}

// In-memory vector store
class InMemoryVectorStore {
  constructor() {
    this.entries = []; // [{id, text, embedding, metadata}]
  }

  async addDocument(doc) {
    const chunks = sentenceChunker(doc.text);
    const embeddings = await embedBatch(chunks);
    chunks.forEach((chunk, i) => {
      this.entries.push({
        id: `${doc.id}-chunk-${i}`,
        text: chunk,
        embedding: embeddings[i],
        metadata: { source: doc.id, title: doc.title, chunkIndex: i },
      });
    });
    console.log(`  Added "${doc.title}" → ${chunks.length} chunk(s)`);
  }

  search(queryEmbedding, topK = 3) {
    return this.entries
      .map((entry) => ({ ...entry, score: cosineSimilarity(entry.embedding, queryEmbedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

async function exercise1_minimalRAG() {
  console.log("=== Exercise 1: Minimal RAG Pipeline ===\n");

  // Stage 1-4: Build the index
  console.log("Building RAG index...");
  const store = new InMemoryVectorStore();
  for (const doc of KNOWLEDGE_BASE) {
    await store.addDocument(doc);
  }
  console.log(`Index built: ${store.entries.length} total chunks\n`);

  // Stage 5-8: Query + Generate
  const question = "When can I deploy to production, and what do I need?";
  console.log(`Question: "${question}"`);

  // Embed the query
  const queryEmbedding = await embedText(question);

  // Retrieve top-3 chunks
  const retrieved = store.search(queryEmbedding, 3);
  console.log("\nRetrieved chunks:");
  retrieved.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.score.toFixed(4)}] ${r.metadata.title}: "${r.text.substring(0, 60)}..."`);
  });

  // Generate answer with context
  const context = retrieved.map((r, i) => `[Source ${i + 1}: ${r.metadata.title}]\n${r.text}`).join("\n\n---\n\n");

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Answer questions using ONLY the provided context. Cite sources as [Source N]. If not in context, say "I don't have that information."`,
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 200,
  });

  console.log("\nRAG Answer:", response.choices[0].message.content);

  return store; // Return for use in exercise 2
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: HyDE Implementation
// Generate hypothetical answer → embed it → retrieve similar real documents
// ─────────────────────────────────────────────────────────────────────────────

async function exercise2_HyDE(store) {
  console.log("\n=== Exercise 2: HyDE (Hypothetical Document Embeddings) ===\n");

  const query = "What are the rules for database changes?";
  console.log(`Query: "${query}"`);

  // Standard retrieval: embed the query directly
  const queryEmbedding = await embedText(query);
  const standardResults = store.search(queryEmbedding, 2);
  console.log("\nStandard retrieval top-2:");
  standardResults.forEach((r, i) =>
    console.log(`  ${i + 1}. [${r.score.toFixed(4)}] ${r.metadata.title}`)
  );

  // HyDE: first generate a hypothetical answer
  const hydeResponse = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Write a brief, generic answer to the question as if you were a document that contains the answer. Be factual and specific." },
      { role: "user", content: query },
    ],
    temperature: 0,
    max_tokens: 100,
  });

  const hypotheticalAnswer = hydeResponse.choices[0].message.content;
  console.log(`\nHypothetical answer generated:\n  "${hypotheticalAnswer}"`);

  // Embed the hypothetical answer (not the query)
  const hydeEmbedding = await embedText(hypotheticalAnswer);
  const hydeResults = store.search(hydeEmbedding, 2);
  console.log("\nHyDE retrieval top-2:");
  hydeResults.forEach((r, i) =>
    console.log(`  ${i + 1}. [${r.score.toFixed(4)}] ${r.metadata.title}`)
  );

  console.log("\n[HyDE improves retrieval when query phrasing differs from document phrasing]");
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Multi-Query Retrieval with RRF
// Generate query variations → retrieve for each → merge with RRF
// ─────────────────────────────────────────────────────────────────────────────

async function generateQueryVariations(query, count = 3) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generate ${count} different phrasings of the given question. Each variation should be on a new line. No numbering or bullets.`,
      },
      { role: "user", content: query },
    ],
    temperature: 0.7,
    max_tokens: 150,
  });

  return response.choices[0].message.content
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, count);
}

function rrfMerge(resultSets, k = 60) {
  const scores = {};
  resultSets.forEach((results) => {
    results.forEach((item, rank) => {
      scores[item.id] = (scores[item.id] || 0) + 1 / (k + rank + 1);
    });
  });

  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id);
}

async function exercise3_multiQueryRAG(store) {
  console.log("\n=== Exercise 3: Multi-Query Retrieval + RRF ===\n");

  const originalQuery = "How should I handle changes to the database schema?";
  console.log(`Original query: "${originalQuery}"`);

  // Generate variations
  const variations = await generateQueryVariations(originalQuery, 3);
  console.log("\nGenerated query variations:");
  variations.forEach((v, i) => console.log(`  ${i + 1}. "${v}"`));

  // Retrieve for each variation
  const allResultSets = [];
  for (const q of [originalQuery, ...variations]) {
    const emb = await embedText(q);
    const results = store.search(emb, 5);
    allResultSets.push(results);
  }

  // Merge with RRF
  const mergedIds = rrfMerge(allResultSets);
  console.log("\nMerged (RRF) top results:");
  mergedIds.slice(0, 3).forEach((id, i) => {
    const entry = store.entries.find((e) => e.id === id);
    if (entry) console.log(`  ${i + 1}. ${entry.metadata.title}: "${entry.text.substring(0, 60)}..."`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Faithfulness Evaluator
// Use LLM to check if answer is supported by context
// ─────────────────────────────────────────────────────────────────────────────

async function evaluateFaithfulness(question, answer, context) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an evaluator. Given a question, an answer, and a context, determine if the answer is faithful to the context.
Return JSON: {"score": 1-5, "faithful": true/false, "reasoning": "brief explanation", "unsupported_claims": ["list of claims not in context"]}
Score 5 = fully supported by context. Score 1 = contradicts or ignores context.`,
      },
      {
        role: "user",
        content: `Question: ${question}\n\nAnswer: ${answer}\n\nContext:\n${context}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 200,
  });

  return JSON.parse(response.choices[0].message.content);
}

async function exercise4_faithfulnessEval() {
  console.log("\n=== Exercise 4: Faithfulness Evaluation ===\n");

  const context = `Deployments happen Tuesday through Thursday between 10am-3pm PST only.
All deployments require a deploy ticket. Use the deployment checklist in Notion.
Blue-green deployments via Kubernetes. Rollback takes less than 5 minutes via kubectl rollout undo.`;

  const testCases = [
    {
      question: "When can I deploy?",
      answer: "Deployments are allowed Tuesday through Thursday between 10am-3pm PST. You need a deploy ticket.",
      label: "faithful",
    },
    {
      question: "When can I deploy?",
      answer: "You can deploy anytime, including weekends. No approvals needed.",
      label: "unfaithful (contradicts context)",
    },
    {
      question: "When can I deploy?",
      answer: "Deployments use Kubernetes and a rollback takes less than 5 minutes. You'll need to coordinate with the DevOps team.",
      label: "partially faithful (adds unsupported claim)",
    },
  ];

  for (const { question, answer, label } of testCases) {
    const eval_ = await evaluateFaithfulness(question, answer, context);
    console.log(`Case: ${label}`);
    console.log(`  Answer: "${answer.substring(0, 70)}"`);
    console.log(`  Score: ${eval_.score}/5 | Faithful: ${eval_.faithful}`);
    console.log(`  Reasoning: ${eval_.reasoning}`);
    if (eval_.unsupported_claims?.length > 0) {
      console.log(`  Unsupported claims: ${eval_.unsupported_claims.join("; ")}`);
    }
    console.log();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Streaming RAG
// Stream the generation response after retrieval is complete
// ─────────────────────────────────────────────────────────────────────────────

async function exercise5_streamingRAG(store) {
  console.log("\n=== Exercise 5: Streaming RAG ===\n");

  const question = "What are the on-call responsibilities and response times?";
  console.log(`Question: "${question}"\n`);

  // Retrieval (happens fully before streaming starts)
  const retrievalStart = Date.now();
  const queryEmbedding = await embedText(question);
  const retrieved = store.search(queryEmbedding, 3);
  const retrievalTime = Date.now() - retrievalStart;

  console.log(`Retrieval complete in ${retrievalTime}ms. Streaming answer:\n`);

  const context = retrieved.map((r, i) => `[Source ${i + 1}]\n${r.text}`).join("\n\n");

  // Stream the generation
  const generationStart = Date.now();
  let firstTokenTime = null;
  let totalText = "";

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Answer questions using only the provided context. Cite sources.",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
    stream: true,
    temperature: 0.1,
    max_tokens: 200,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      if (!firstTokenTime) firstTokenTime = Date.now() - generationStart;
      process.stdout.write(delta);
      totalText += delta;
    }
  }

  console.log(`\n\n[First token: ${firstTokenTime}ms | Total generation: ${Date.now() - generationStart}ms]`);
  console.log(`[Total pipeline: retrieval ${retrievalTime}ms + first token ${firstTokenTime}ms]`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.log("Set OPENAI_API_KEY to run these exercises.");
    return;
  }

  const store = await exercise1_minimalRAG();
  await exercise2_HyDE(store);
  await exercise3_multiQueryRAG(store);
  await exercise4_faithfulnessEval();
  await exercise5_streamingRAG(store);
}

main().catch(console.error);

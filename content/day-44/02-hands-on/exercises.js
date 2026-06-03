/**
 * Day 44 — Embeddings + Semantic Search: Hands-On Exercises
 * Prerequisites: npm install openai
 * Set OPENAI_API_KEY in your environment
 */

const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Cosine Similarity
// ─────────────────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  if (a.length !== b.length) throw new Error("Vector dimension mismatch");
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Embed 10 sentences, compute cosine similarity matrix
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_SENTENCES = [
  "Machine learning models learn patterns from training data.",
  "Deep learning uses neural networks with many layers.",
  "JavaScript is a versatile programming language for the web.",
  "Python is widely used in data science and AI.",
  "The stock market experienced significant volatility today.",
  "Investment strategies should consider risk tolerance.",
  "Neural networks are inspired by the human brain.",
  "Node.js allows JavaScript to run on the server side.",
  "Portfolio diversification reduces investment risk.",
  "Transformer models revolutionized natural language processing.",
];

async function exercise1_similarityMatrix() {
  console.log("=== Exercise 1: Embedding Similarity Matrix ===\n");

  // Batch embed all sentences in one API call
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: SAMPLE_SENTENCES,
  });

  const embeddings = response.data.map((d) => d.embedding);

  // Compute similarity matrix
  console.log("Similarity matrix (values > 0.7 are semantically related):\n");
  const labels = SAMPLE_SENTENCES.map((s, i) => `S${i + 1}: "${s.substring(0, 35)}..."`);

  for (let i = 0; i < 10; i++) {
    const row = [];
    for (let j = 0; j < 10; j++) {
      const sim = cosineSimilarity(embeddings[i], embeddings[j]);
      row.push(sim.toFixed(2));
    }
    console.log(`S${i + 1}: [${row.join(", ")}]`);
  }

  // Find the most similar pairs (excluding self-similarity)
  console.log("\nTop 5 most similar pairs:");
  const pairs = [];
  for (let i = 0; i < 10; i++) {
    for (let j = i + 1; j < 10; j++) {
      pairs.push({
        i, j,
        similarity: cosineSimilarity(embeddings[i], embeddings[j]),
      });
    }
  }
  pairs.sort((a, b) => b.similarity - a.similarity);
  pairs.slice(0, 5).forEach(({ i, j, similarity }) => {
    console.log(`  ${similarity.toFixed(4)}: S${i + 1} vs S${j + 1}`);
    console.log(`    "${SAMPLE_SENTENCES[i].substring(0, 50)}"`);
    console.log(`    "${SAMPLE_SENTENCES[j].substring(0, 50)}"`);
  });

  return embeddings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: In-Memory Semantic Search
// Embed a document collection, search with natural language queries
// ─────────────────────────────────────────────────────────────────────────────

const DOCUMENTS = [
  { id: 1, title: "React Hooks Guide", content: "React hooks like useState and useEffect allow functional components to manage state and side effects. useCallback memoizes functions, useMemo memoizes values." },
  { id: 2, title: "TypeScript Generics", content: "Generic types in TypeScript allow creating reusable components that work with multiple types. Use <T> syntax to define type parameters." },
  { id: 3, title: "PostgreSQL Indexing", content: "Database indexes improve query performance. B-tree indexes work for equality and range queries. GIN indexes are for arrays and full-text search." },
  { id: 4, title: "Redis Caching Strategies", content: "Redis supports multiple caching patterns: cache-aside, write-through, write-behind. TTL controls expiration. Use SETEX for atomic set-with-expiry." },
  { id: 5, title: "Docker Networking", content: "Docker containers communicate via bridge networks by default. Use docker-compose networks for service discovery. Expose ports with -p flag." },
  { id: 6, title: "JWT Authentication", content: "JSON Web Tokens contain header, payload, and signature. Sign with secret using HMAC-SHA256. Verify on each request. Refresh tokens extend session." },
  { id: 7, title: "GraphQL vs REST", content: "GraphQL allows clients to request exactly the data they need. Solves over-fetching and under-fetching. Mutations modify data, queries read data." },
  { id: 8, title: "Kubernetes Pods", content: "A Pod is the smallest deployable unit in Kubernetes. Multiple containers can share network and storage in a pod. Use deployments for scaling." },
];

async function buildInMemorySearchIndex(documents) {
  const texts = documents.map((d) => `${d.title}: ${d.content}`);
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return documents.map((doc, i) => ({
    ...doc,
    embedding: response.data[i].embedding,
  }));
}

async function semanticSearch(indexedDocs, query, topK = 3) {
  // Embed the query
  const queryResponse = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: [query],
  });
  const queryEmbedding = queryResponse.data[0].embedding;

  // Score all documents
  const scored = indexedDocs.map((doc) => ({
    ...doc,
    score: cosineSimilarity(doc.embedding, queryEmbedding),
  }));

  // Return top-K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ id, title, content, score }) => ({ id, title, content, score }));
}

async function exercise2_semanticSearch() {
  console.log("\n=== Exercise 2: In-Memory Semantic Search ===\n");

  console.log("Building search index...");
  const index = await buildInMemorySearchIndex(DOCUMENTS);
  console.log(`Index built for ${index.length} documents\n`);

  const queries = [
    "How do I manage component state in React?",
    "securing API endpoints with tokens",
    "database performance optimization",
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    const results = await semanticSearch(index, query, 2);
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.score.toFixed(4)}] ${r.title}`);
      console.log(`     ${r.content.substring(0, 80)}...`);
    });
    console.log();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Chunking Comparison
// Fixed-size vs sentence-based on the same document
// ─────────────────────────────────────────────────────────────────────────────

const LONG_DOCUMENT = `
Machine learning is a subset of artificial intelligence that enables computers to learn from experience without being explicitly programmed. Instead of writing specific rules, you provide the system with data and let it discover patterns on its own.

There are three main types of machine learning. Supervised learning uses labeled training data where the model learns to map inputs to outputs. Common algorithms include linear regression for continuous outputs and classification algorithms for categorical outputs.

Unsupervised learning works with unlabeled data, discovering hidden structure. Clustering algorithms like K-means group similar data points together. Dimensionality reduction techniques like PCA help visualize high-dimensional data.

Reinforcement learning involves an agent learning through interaction with an environment. The agent takes actions and receives rewards or penalties, gradually learning a policy that maximizes cumulative reward. This approach powers game-playing AI like AlphaGo and robotics control systems.

Deep learning is a specific type of machine learning using neural networks with many layers. These networks automatically learn hierarchical features from raw data. Convolutional Neural Networks (CNNs) excel at image recognition. Recurrent Neural Networks (RNNs) handle sequential data like text and time series.
`.trim();

function fixedSizeChunker(text, chunkSize = 200, overlap = 40) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push({ text: text.slice(start, end), start, end });
    start += chunkSize - overlap;
  }
  return chunks;
}

function sentenceChunker(text, maxChunkLength = 300, overlap = 1) {
  // Split on sentence-ending punctuation
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = "";
  let sentenceBuffer = [];

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChunkLength && current.length > 0) {
      chunks.push({ text: current.trim(), sentenceCount: sentenceBuffer.length });
      // Keep last 'overlap' sentences for context continuity
      sentenceBuffer = sentenceBuffer.slice(-overlap);
      current = sentenceBuffer.join(" ");
    }
    current += " " + sentence;
    sentenceBuffer.push(sentence.trim());
  }
  if (current.trim()) chunks.push({ text: current.trim(), sentenceCount: sentenceBuffer.length });

  return chunks;
}

function exercise3_chunkingComparison() {
  console.log("\n=== Exercise 3: Chunking Comparison ===\n");

  const fixedChunks = fixedSizeChunker(LONG_DOCUMENT, 200, 40);
  const sentenceChunks = sentenceChunker(LONG_DOCUMENT, 300, 1);

  console.log("Fixed-size chunks (200 chars, 40 overlap):");
  fixedChunks.forEach((c, i) => {
    console.log(`  Chunk ${i + 1} (${c.text.length} chars): "${c.text.substring(0, 60)}..."`);
  });

  console.log("\nSentence-based chunks (max 300 chars, 1 sentence overlap):");
  sentenceChunks.forEach((c, i) => {
    console.log(`  Chunk ${i + 1} (${c.text.length} chars, ${c.sentenceCount} sentences): "${c.text.substring(0, 60)}..."`);
  });

  // Show why sentence-based is better: a fixed-size chunk might cut mid-sentence
  console.log("\nFixed chunk boundary example:");
  if (fixedChunks.length > 0) {
    const fc = fixedChunks[0];
    console.log(`  Ends with: "...${fc.text.slice(-40)}"`);
    console.log(`  Notice: may cut mid-sentence`);
  }

  console.log("\nSentence chunk boundary example:");
  if (sentenceChunks.length > 0) {
    const sc = sentenceChunks[0];
    console.log(`  Ends with: "...${sc.text.slice(-40)}"`);
    console.log(`  Notice: always ends at sentence boundary`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Hybrid Search
// Combine TF-IDF keyword matching + semantic similarity
// ─────────────────────────────────────────────────────────────────────────────

function computeTFIDF(documents, query) {
  const queryTerms = query.toLowerCase().split(/\s+/);

  return documents.map((doc) => {
    const docTerms = (doc.title + " " + doc.content).toLowerCase().split(/\s+/);
    const docLength = docTerms.length;

    // TF: term frequency in document
    const tf = queryTerms.reduce((score, term) => {
      const count = docTerms.filter((t) => t.includes(term)).length;
      return score + count / docLength;
    }, 0);

    // Simple BM25-like score (without IDF for simplicity)
    return { ...doc, keywordScore: tf };
  });
}

function reciprocalRankFusion(results1, results2, k = 60) {
  // results1, results2: arrays of {id, ...} sorted by relevance
  const scores = {};

  results1.forEach((item, rank) => {
    scores[item.id] = (scores[item.id] || 0) + 1 / (k + rank + 1);
  });

  results2.forEach((item, rank) => {
    scores[item.id] = (scores[item.id] || 0) + 1 / (k + rank + 1);
  });

  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([id, score]) => ({ id: parseInt(id), rrfScore: score }));
}

async function exercise4_hybridSearch() {
  console.log("\n=== Exercise 4: Hybrid Search ===\n");

  const query = "database index performance";

  // Build semantic index
  const index = await buildInMemorySearchIndex(DOCUMENTS);

  // Semantic results
  const semanticResults = await semanticSearch(index, query, 8);

  // Keyword results (sorted by TF-IDF score)
  const keywordScored = computeTFIDF(DOCUMENTS, query);
  const keywordResults = [...keywordScored]
    .sort((a, b) => b.keywordScore - a.keywordScore);

  // Hybrid results via RRF
  const hybridRanking = reciprocalRankFusion(semanticResults, keywordResults);

  console.log("Query:", query);
  console.log("\nSemantic-only top 3:");
  semanticResults.slice(0, 3).forEach((r, i) =>
    console.log(`  ${i + 1}. [${r.score.toFixed(4)}] ${r.title}`)
  );

  console.log("\nKeyword-only top 3:");
  keywordResults.slice(0, 3).forEach((r, i) =>
    console.log(`  ${i + 1}. [${r.keywordScore.toFixed(6)}] ${r.title}`)
  );

  console.log("\nHybrid RRF top 3:");
  hybridRanking.slice(0, 3).forEach((r, i) => {
    const doc = DOCUMENTS.find((d) => d.id === r.id);
    console.log(`  ${i + 1}. [RRF: ${r.rrfScore.toFixed(4)}] ${doc.title}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Semantic Cache
// Given a query, check if similar query was asked before
// ─────────────────────────────────────────────────────────────────────────────

class SemanticCache {
  constructor(threshold = 0.95) {
    this.threshold = threshold;
    this.cache = []; // [{queryEmbedding, query, response, hits}]
  }

  async lookup(query) {
    if (this.cache.length === 0) return null;

    const queryEmbedding = await this.embed(query);
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const entry of this.cache) {
      const sim = cosineSimilarity(queryEmbedding, entry.queryEmbedding);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMatch = entry;
      }
    }

    if (bestSimilarity >= this.threshold) {
      bestMatch.hits++;
      return { response: bestMatch.response, similarity: bestSimilarity, originalQuery: bestMatch.query };
    }

    return null;
  }

  async store(query, response) {
    const queryEmbedding = await this.embed(query);
    this.cache.push({ query, queryEmbedding, response, hits: 0 });
  }

  async embed(text) {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: [text],
    });
    return response.data[0].embedding;
  }

  stats() {
    return {
      cacheSize: this.cache.length,
      totalHits: this.cache.reduce((sum, e) => sum + e.hits, 0),
    };
  }
}

async function exercise5_semanticCache() {
  console.log("\n=== Exercise 5: Semantic Cache ===\n");

  const cache = new SemanticCache(0.92);

  // Seed the cache
  await cache.store(
    "What are React hooks?",
    "React hooks are functions that let you use state and lifecycle features in functional components."
  );
  await cache.store(
    "How does PostgreSQL indexing work?",
    "PostgreSQL indexes create sorted data structures (B-tree, GIN, GiST) that speed up row lookups."
  );

  // Test similar queries
  const queries = [
    "What are React hooks?",               // Exact match
    "Can you explain React hooks to me?",   // Semantic match
    "How do I use useState?",              // Related but different
    "Tell me about PostgreSQL indexes",    // Semantic match for second entry
    "What is machine learning?",           // Cache miss
  ];

  for (const query of queries) {
    const cached = await cache.lookup(query);
    if (cached) {
      console.log(`CACHE HIT  [sim=${cached.similarity.toFixed(4)}] "${query}"`);
      console.log(`  Matched: "${cached.originalQuery}"`);
      console.log(`  Response: "${cached.response.substring(0, 60)}..."\n`);
    } else {
      console.log(`CACHE MISS "${query}"`);
      console.log(`  Would call OpenAI API here\n`);
    }
  }

  console.log("Cache stats:", cache.stats());
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.log("Set OPENAI_API_KEY to run these exercises.");
    exercise3_chunkingComparison(); // Can run without API
    return;
  }

  exercise3_chunkingComparison(); // No API needed
  const embeddings = await exercise1_similarityMatrix();
  await exercise2_semanticSearch();
  await exercise4_hybridSearch();
  await exercise5_semanticCache();
}

main().catch(console.error);

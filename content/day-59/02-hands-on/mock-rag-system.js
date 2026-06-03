/**
 * Day 59 — Mini RAG System (Interview Simulation)
 * Build a complete RAG pipeline live — common AI engineering interview task.
 *
 * Components:
 *  1. In-memory vector store with cosine similarity
 *  2. Text chunking function
 *  3. Mock embedding (random vectors for speed — swap with real OpenAI call)
 *  4. RAG query function
 *  5. Express endpoint for the full system
 */

// ─────────────────────────────────────────────────────────────
// 1. In-Memory Vector Store with Cosine Similarity
// ─────────────────────────────────────────────────────────────
class VectorStore {
  constructor() {
    this.documents = []; // [{ id, text, embedding, metadata }]
  }

  // Add a document with its embedding
  add(id, text, embedding, metadata = {}) {
    this.documents.push({ id, text, embedding, metadata });
  }

  // Cosine similarity: measures angle between two vectors
  // Range: -1 to 1 (1 = identical direction, 0 = orthogonal, -1 = opposite)
  cosineSimilarity(a, b) {
    if (a.length !== b.length) throw new Error('Vector dimension mismatch');

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;
    return dotProduct / magnitude;
  }

  // Search for top-k most similar documents
  search(queryEmbedding, topK = 5) {
    const scored = this.documents.map(doc => ({
      ...doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // Remove all documents
  clear() {
    this.documents = [];
  }

  size() {
    return this.documents.length;
  }
}

// ─────────────────────────────────────────────────────────────
// 2. Text Chunking Function
// ─────────────────────────────────────────────────────────────
/**
 * Split text into overlapping chunks for better context preservation.
 * Overlap ensures that information at chunk boundaries isn't lost.
 *
 * Chunking strategies:
 *   - Fixed size: simple, may split sentences mid-way
 *   - Sentence-based: preserves sentences, variable chunk size
 *   - Paragraph-based: natural breaks, best for structured text
 *
 * Interview point: The chunk size affects RAG quality.
 * Too small: lack context, too large: retrieval becomes less precise.
 * Typical: 256-512 tokens, 10-20% overlap
 */
function chunkText(text, options = {}) {
  const {
    chunkSize  = 200,   // characters (in production: tokens)
    chunkOverlap = 40,  // overlap between consecutive chunks
    separator  = '\n',  // prefer splitting on newlines
  } = options;

  if (text.length <= chunkSize) return [text];

  const chunks = [];

  // Try to split on paragraph boundaries first
  const paragraphs = text.split('\n\n').filter(p => p.trim());

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // If adding this paragraph exceeds chunk size, save current chunk and start new one
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Overlap: start new chunk with the end of the previous chunk
      const overlapText = currentChunk.slice(-chunkOverlap);
      currentChunk = overlapText + ' ' + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  return chunks;
}

// ─────────────────────────────────────────────────────────────
// 3. Embedding Function
// ─────────────────────────────────────────────────────────────
/**
 * Production: use OpenAI text-embedding-3-small or Cohere embed-english-v3.0
 * For interview demo: use a deterministic mock that captures some semantic signal
 * (or explain "I'd use OpenAI API here, substituting with mock for speed")
 */

// Mock embedding: creates a pseudo-semantic vector
// In a real interview, say: "I'd call openai.embeddings.create() here"
function mockEmbed(text) {
  const DIM = 128;
  const vector = new Array(DIM).fill(0);

  // Simple character-frequency based vector (NOT real semantic embedding)
  // Just demonstrates the interface — real embeddings capture meaning
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    vector[charCode % DIM] += 1 / text.length;
  }

  // Add some "word presence" signal for common words
  const words = text.toLowerCase().split(/\s+/);
  const wordMap = {
    'javascript': [0, 1, 0], 'react': [1, 0, 0], 'node': [0, 0, 1],
    'python': [1, 1, 0], 'api': [0, 1, 1], 'database': [1, 0, 1],
    'performance': [0, 0, 0.5], 'security': [0.5, 0, 0], 'cache': [0, 0.5, 0],
  };

  for (const word of words) {
    if (wordMap[word]) {
      vector[DIM - 3] += wordMap[word][0];
      vector[DIM - 2] += wordMap[word][1];
      vector[DIM - 1] += wordMap[word][2];
    }
  }

  // Normalize to unit vector (required for cosine similarity to work properly)
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vector : vector.map(v => v / norm);
}

// Interface that can be swapped for real OpenAI embedding
async function embed(text) {
  // In production:
  // const response = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text });
  // return response.data[0].embedding;

  return mockEmbed(text); // Mock for interview demo
}

// ─────────────────────────────────────────────────────────────
// 4. RAG Query Function
// ─────────────────────────────────────────────────────────────
/**
 * Full RAG pipeline:
 *   1. Embed the query
 *   2. Search vector store for relevant chunks
 *   3. Build context from retrieved chunks
 *   4. Generate answer using LLM with context (mocked here)
 */
async function ragQuery(vectorStore, query, options = {}) {
  const { topK = 3, minScore = 0.1 } = options;

  // Step 1: Embed the query
  const queryEmbedding = await embed(query);

  // Step 2: Retrieve top-K relevant chunks
  const results = vectorStore.search(queryEmbedding, topK);
  const relevantChunks = results.filter(r => r.score > minScore);

  if (relevantChunks.length === 0) {
    return {
      answer: "I don't have relevant information to answer this question.",
      sources: [],
      query,
    };
  }

  // Step 3: Build context from retrieved chunks
  const context = relevantChunks
    .map((r, i) => `[Source ${i + 1}] (relevance: ${r.score.toFixed(3)})\n${r.text}`)
    .join('\n\n---\n\n');

  // Step 4: Generate answer (mocked — in production: call Claude/OpenAI)
  const prompt = `Answer the following question using ONLY the provided context. If the context doesn't contain the answer, say so.

Context:
${context}

Question: ${query}

Answer:`;

  // In production:
  // const response = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-6',
  //   messages: [{ role: 'user', content: prompt }],
  //   max_tokens: 500,
  // });
  // const answer = response.content[0].text;

  // Mock answer generation for demo
  const answer = `[LLM would answer here based on ${relevantChunks.length} retrieved chunks]\n\nMost relevant source: "${relevantChunks[0].text.slice(0, 100)}..."`;

  return {
    answer,
    sources: relevantChunks.map(r => ({ id: r.id, score: r.score, snippet: r.text.slice(0, 150) })),
    query,
    chunksRetrieved: relevantChunks.length,
  };
}

// ─────────────────────────────────────────────────────────────
// 5. Full RAG System with Document Ingestion
// ─────────────────────────────────────────────────────────────
class RAGSystem {
  constructor() {
    this.vectorStore = new VectorStore();
    this.docCount = 0;
  }

  async ingestDocument(text, metadata = {}) {
    const chunks = chunkText(text, { chunkSize: 300, chunkOverlap: 50 });

    console.log(`[RAG] Ingesting document: ${chunks.length} chunks`);

    for (const chunk of chunks) {
      const id = `doc_${++this.docCount}_chunk_${chunks.indexOf(chunk)}`;
      const embedding = await embed(chunk);
      this.vectorStore.add(id, chunk, embedding, metadata);
    }

    return { chunksAdded: chunks.length, totalVectors: this.vectorStore.size() };
  }

  async query(question, options = {}) {
    return ragQuery(this.vectorStore, question, options);
  }

  getStats() {
    return { totalVectors: this.vectorStore.size() };
  }
}

// ─────────────────────────────────────────────────────────────
// 6. Express API Endpoint (interview simulation)
// ─────────────────────────────────────────────────────────────
// Note: Requires express — run in a real Node.js environment

function createRAGApp(ragSystem) {
  // const express = require('express');
  // const app = express();
  // app.use(express.json());

  const routes = {
    // POST /documents — ingest a document
    'POST /documents': async (body) => {
      const { text, title } = body;
      if (!text) return { error: 'text is required', status: 400 };

      const result = await ragSystem.ingestDocument(text, { title });
      return { success: true, ...result };
    },

    // POST /query — RAG query
    'POST /query': async (body) => {
      const { question, topK = 3 } = body;
      if (!question) return { error: 'question is required', status: 400 };

      const result = await ragSystem.query(question, { topK });
      return result;
    },

    // GET /stats
    'GET /stats': async () => ragSystem.getStats(),
  };

  return routes;
}

// ─────────────────────────────────────────────────────────────
// Demo
// ─────────────────────────────────────────────────────────────
async function runDemo() {
  console.log('=== RAG System Demo ===\n');

  const rag = new RAGSystem();

  // Ingest sample documents
  await rag.ingestDocument(`
JavaScript is a high-level, interpreted programming language that is one of the core technologies of the web.
JavaScript is dynamic, weakly typed, and has first-class functions.

JavaScript supports event-driven, functional, and object-oriented programming paradigms.
The language was originally designed to add dynamic behavior to web pages.

Node.js allows JavaScript to run on the server side, outside of a web browser.
Node.js uses an event-driven, non-blocking I/O model that makes it efficient for real-time applications.
  `, { title: 'JavaScript Overview' });

  await rag.ingestDocument(`
React is a JavaScript library for building user interfaces, primarily for single-page applications.
React uses a virtual DOM to improve performance by minimizing direct DOM manipulation.

React components are the building blocks of React applications.
A component can be a class or a function, and each component manages its own state.

React hooks like useState and useEffect allow functional components to use state and lifecycle features.
The useCallback and useMemo hooks help optimize performance by memoizing values and functions.
  `, { title: 'React Guide' });

  await rag.ingestDocument(`
Database indexing is crucial for query performance. Without indexes, a database performs a full table scan.
An index creates a data structure (usually a B-tree) that allows the database to find rows quickly.

SQL EXPLAIN ANALYZE shows the query execution plan. A "Sequential Scan" on a large table indicates a missing index.
Composite indexes can cover multiple columns and serve as "covering indexes" for specific queries.

NoSQL databases like MongoDB use different indexing strategies.
Cassandra uses partition keys and clustering columns as its primary indexing mechanism.
  `, { title: 'Database Indexing' });

  console.log('Stats:', rag.getStats());

  // Query the RAG system
  const queries = [
    'How does Node.js handle asynchronous operations?',
    'What are React hooks?',
    'Why are database indexes important?',
  ];

  for (const question of queries) {
    console.log(`\n--- Query: "${question}" ---`);
    const result = await rag.query(question, { topK: 2 });
    console.log(`Retrieved ${result.chunksRetrieved} chunks`);
    console.log('Sources:');
    result.sources.forEach(s => {
      console.log(`  [score: ${s.score.toFixed(3)}] ${s.snippet.slice(0, 80)}...`);
    });
  }

  // Simulate API usage
  const routes = createRAGApp(rag);
  console.log('\n--- API Route Test ---');
  const queryResult = await routes['POST /query']({ question: 'What is React?', topK: 2 });
  console.log('API result:', queryResult.query, `(${queryResult.chunksRetrieved} sources)`);
}

runDemo().catch(console.error);

/**
 * INTERVIEW TALKING POINTS
 * ─────────────────────────────────────────────────────────────
 *
 * 1. Real embedding swap:
 *    Replace mockEmbed() with:
 *    const { data } = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text });
 *    return data[0].embedding;
 *
 * 2. Real LLM generation:
 *    Replace mock answer with Claude/OpenAI call.
 *    Always instruct: "Answer ONLY using the provided context".
 *    This reduces hallucination — the model stays grounded.
 *
 * 3. Chunking strategy matters:
 *    Experiment with chunk sizes. Too small = no context, too large = imprecise retrieval.
 *    For code: chunk by function. For prose: chunk by paragraph. For legal docs: chunk by clause.
 *
 * 4. Production improvements to mention:
 *    - Persistent vector store: Pinecone, Weaviate, pgvector (PostgreSQL extension)
 *    - Hybrid search: keyword (BM25) + semantic — better than either alone
 *    - Re-ranking: after retrieval, use a cross-encoder model to re-rank for precision
 *    - Streaming: stream the LLM response for better UX
 *    - Semantic caching: cache query results by embedding similarity
 */

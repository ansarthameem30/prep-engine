# Day 44 — Embeddings + Semantic Search

## What Are Embeddings?

An embedding is a dense vector — a list of floating-point numbers — that represents the semantic meaning of a piece of text. Unlike sparse bag-of-words representations, embeddings capture semantic relationships: "automobile" and "car" have vectors that are geometrically close, while "banana" and "car" are far apart.

**How they're created:**
Transformer models (BERT, sentence-transformers, OpenAI's embedding models) take input text, process it through multiple attention layers, and produce a final dense representation. For sentence embeddings, the [CLS] token representation or a mean pool of all token representations serves as the sentence embedding. These models are trained via **contrastive learning** — trained on millions of (similar text, similar text) and (dissimilar text, dissimilar text) pairs. The training objective pushes similar pairs close together and dissimilar pairs apart in the vector space.

---

## OpenAI Embedding Models

| Model | Dimensions | Price/1M tokens | Notes |
|---|---|---|---|
| `text-embedding-3-small` | 1536 | $0.02 | Best for most RAG use cases |
| `text-embedding-3-large` | 3072 | $0.13 | Higher accuracy, 6.5x more expensive |
| `ada-002` | 1536 | $0.10 | Legacy, worse than 3-series at same price |

The 3-series models support a `dimensions` parameter for truncation: you can request 512 dims from `text-embedding-3-large` for a storage/speed tradeoff while keeping the model quality advantages.

---

## Similarity Metrics

### Cosine Similarity
Measures the angle between two vectors. Returns [-1, 1] where 1 = identical direction, 0 = orthogonal, -1 = opposite.

```js
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (magA * magB);
}
```

**Scale-invariant:** cosine similarity doesn't care about the magnitude (length) of vectors, only their direction. This is why two sentences with the same meaning but different lengths can have high cosine similarity.

### Dot Product
`dot(a, b) = sum(a[i] * b[i])` — equals cosine similarity × magnitude of both vectors. Faster to compute (no square root). If vectors are normalized (unit length, which OpenAI embedding models produce by default), dot product = cosine similarity. pgvector's `<#>` operator uses inner product (negative dot product, because pgvector minimizes distance).

### Euclidean Distance (L2)
`sqrt(sum((a[i] - b[i])^2))` — the geometric distance. Less commonly used for embeddings because it's sensitive to vector magnitude. pgvector's `<->` operator.

**In practice:** For OpenAI embeddings (already normalized), use cosine similarity. It's the most interpretable and consistent choice. In pgvector, use `<=>` (cosine distance = 1 - cosine similarity).

---

## Chunking Strategies

Chunking is how you split documents into embeddable pieces. The choice dramatically affects retrieval quality.

### Fixed-Size Chunking
Split every N characters or tokens regardless of content boundaries.
- **Pros:** Simple, fast, predictable token counts
- **Cons:** Arbitrarily cuts sentences, paragraphs, even words mid-idea
- **Use when:** Quick prototype or when document structure doesn't matter

```js
function fixedSizeChunker(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
    if (i + chunkSize >= text.length) break;
  }
  return chunks;
}
```

### Sentence-Based Chunking
Use a sentence tokenizer (NLTK in Python, or regex in JS) to split at sentence boundaries. Group sentences until approaching the target size.
- **Pros:** Preserves semantic coherence at chunk level
- **Cons:** Sentence lengths vary, harder to ensure consistent chunk sizes
- **Best for:** Prose documents (articles, documentation, books)

### Semantic Chunking
Embed individual sentences, then group consecutive sentences whose embedding similarity stays above a threshold. When similarity drops significantly (topic shift), start a new chunk.
- **Pros:** Best semantic coherence, chunks align with topic boundaries
- **Cons:** Expensive (embed every sentence), complex implementation
- **Best for:** Long documents where topic boundaries are important

### Recursive Text Splitter (LangChain approach)
Try to split on: `\n\n` (paragraphs) → `\n` (lines) → `.` (sentences) → ` ` (words) → characters. At each level, recursively split if still too large, merge if too small.

### Chunk Overlap
Always use 10-20% overlap between consecutive chunks. This ensures a sentence that straddles a chunk boundary is present in both chunks — preventing it from being missed in retrieval.

**Typical production settings:**
- General RAG: 512-token chunks, 100-token overlap
- Long-form Q&A: 256-token chunks (more precise), 50-token overlap
- Code: split on function/class boundaries (structural, not size-based)

---

## Embedding Dimensions Tradeoffs

| Dimension | Storage (per vector) | Similarity Search | Accuracy |
|---|---|---|---|
| 512 | 2KB | Very fast | Good |
| 1536 | 6KB | Fast | Better |
| 3072 | 12KB | Slower | Best |

At 1 million vectors: 1536 dims = 6GB storage, 3072 dims = 12GB. Index build time and query time scale roughly linearly with dimensions. For most RAG use cases, `text-embedding-3-small` at 1536 dims is the right choice.

---

## Hybrid Search

Pure semantic search misses exact keyword matches (specific names, product codes, IDs). Pure keyword search (BM25) misses semantic similarity. Hybrid search combines both.

**Reciprocal Rank Fusion (RRF):**
```
RRF_score(doc) = 1/(k + rank_semantic) + 1/(k + rank_keyword)
```
where k = 60 (typical constant). Merge results from both retrievers, rank by combined RRF score.

This is better than simply combining scores because it's robust to different score scales and distributions between the two systems.

---

## Re-ranking

After initial retrieval (top-K from semantic search), a cross-encoder re-scores each (query, chunk) pair. Cross-encoders process query and chunk together in a single forward pass, which is much more accurate than bi-encoder retrieval but much slower — they can't pre-compute the chunk representations.

**In practice:**
1. Retrieve top-20 candidates with fast bi-encoder (vector similarity)
2. Re-rank top-20 with cross-encoder, return top-5
3. Use top-5 as context for generation

Cohere Rerank API is a popular cloud option. For self-hosted: `cross-encoder/ms-marco-MiniLM-L-6-v2` from Hugging Face.

---

## pgvector in Practice

```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table with embedding column
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT,
  metadata JSONB,
  embedding vector(1536)  -- 1536 dims for text-embedding-3-small
);

-- Create HNSW index (preferred for accuracy + speed)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Or IVFFlat (less accurate, faster to build)
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Similarity search (cosine distance — lower = more similar)
SELECT content, 1 - (embedding <=> $1::vector) AS similarity
FROM documents
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

**Index choice:**
- **HNSW:** Hierarchical Navigable Small World. Better recall, faster queries. Recommended for production. Higher memory usage at build time.
- **IVFFlat:** Inverted File Flat. Divides vectors into `lists` clusters, probes `probes` clusters at query time. Faster to build, slightly less accurate. Good for frequently updated datasets.

**HNSW parameters:**
- `m = 16`: number of connections per node (more = better accuracy, more memory)
- `ef_construction = 64`: size of dynamic list during index build (more = better accuracy, slower build)
- `ef_search = 40`: set at query time, controls recall vs speed

---

## Semantic Cache

If the same or very similar query is asked again, return the cached answer instead of calling the LLM.

```js
async function semanticCacheLookup(query, queryEmbedding, threshold = 0.95) {
  const similar = await db.query(`
    SELECT cached_answer, 1 - (embedding <=> $1) AS similarity
    FROM query_cache
    WHERE 1 - (embedding <=> $1) > $2
    ORDER BY embedding <=> $1 LIMIT 1
  `, [pgvectorFormat(queryEmbedding), threshold]);

  return similar.rows[0] || null; // null = cache miss
}
```

Threshold of 0.95 means "nearly identical queries." Lower thresholds increase hit rate but risk returning wrong cached answers.

---

## Batch Embedding

OpenAI's embedding API accepts up to 2048 texts per request. Always batch:

```js
// Good: batch 100 texts in one request
await client.embeddings.create({
  model: "text-embedding-3-small",
  input: texts.slice(0, 100)  // Up to 2048
});

// Bad: 100 individual API calls
for (const text of texts) {
  await client.embeddings.create({ model: "text-embedding-3-small", input: text });
}
```

Batching reduces latency dramatically (1 network roundtrip vs 100) and improves throughput.

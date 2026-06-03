# Day 45 — RAG Architecture

## Why RAG: The Core Problem

LLMs have two fundamental knowledge limitations: (1) **Training cutoff** — GPT-4's knowledge ends at some date; it doesn't know about events after that; (2) **Proprietary knowledge gaps** — the model never saw your company's internal documentation, customer data, or specialized domain knowledge.

The naive solution — fine-tuning — is expensive, requires clean training data, takes days to train, and produces a static snapshot that's already outdated as soon as you deploy it. Fine-tuning also tends to suffer from "catastrophic forgetting" and is hard to update.

**RAG (Retrieval-Augmented Generation)** solves both problems elegantly: at query time, retrieve the relevant documents from an external knowledge base and inject them into the prompt. The model's job becomes comprehension and synthesis, not recall. This is cheaper than fine-tuning, real-time updatable, and more verifiable (you can show the sources).

---

## The 8-Stage RAG Pipeline

### Stage 1: Document Ingestion
Load raw documents from various sources: PDFs (pypdf, pdfplumber), HTML (BeautifulSoup, trafilatura), DOCX (python-docx), Markdown, JIRA tickets, Confluence pages. Extract clean text — remove boilerplate, navigation, ads. Normalize encoding. Track metadata: source URL, document title, publication date, author.

```js
// Simplified document ingestion
async function ingestDocument(source) {
  const rawText = await loadDocument(source); // fetch/parse
  const cleanText = cleanText(rawText);       // strip HTML, normalize
  const metadata = extractMetadata(source);   // title, date, source_id
  return { text: cleanText, metadata };
}
```

### Stage 2: Chunking
Split documents into retrievable units. The chunk size is a fundamental hyperparameter:
- **Small chunks (128-256 tokens):** More precise retrieval, less context per chunk. Risk: answer might span multiple chunks.
- **Large chunks (512-1024 tokens):** More context, but retrieval noise increases (irrelevant content in same chunk).
- **Typical sweet spot:** 256-512 tokens with 50-100 token overlap.

The overlap is critical — it ensures a concept at the boundary of two chunks appears in both, preventing it from being missed.

### Stage 3: Embedding
Generate a vector embedding for each chunk. For efficiency, batch chunks in groups of up to 2048 per API call. Store both the embedding and the original text. This is a one-time cost per document; embeddings are reused for all future queries.

```js
async function embedChunks(chunks, batchSize = 100) {
  const embeddings = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize).map(c => c.text);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch
    });
    embeddings.push(...response.data.map(d => d.embedding));
  }
  return embeddings;
}
```

### Stage 4: Vector Storage
Store chunks + embeddings + metadata in a vector database. Always store metadata alongside the vector for filtering:

```sql
-- pgvector schema
CREATE TABLE chunks (
  id SERIAL PRIMARY KEY,
  document_id TEXT NOT NULL,
  chunk_index INTEGER,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,           -- {source, title, date, section}
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON chunks (document_id);
CREATE INDEX ON chunks USING gin (metadata);  -- For metadata filtering
```

**Vector DB Comparison:**

| DB | Type | Strengths | Weaknesses |
|---|---|---|---|
| pgvector | Extension | Add to existing Postgres, ACID | Slower at >10M vectors |
| Pinecone | Managed | Serverless, very easy | Expensive at scale, vendor lock-in |
| Qdrant | Open-source | Fast, rich filters, self-hostable | More infra to manage |
| Weaviate | Open-source | GraphQL API, modules (reranker, summarizer) | Complex schema |
| Chroma | Open-source | Local dev, Python-first | Not production-ready |

### Stage 5: Query Processing
User query arrives → embed it → optionally transform it before retrieval.

**Query rewriting strategies:**
- **Multi-query:** Generate 3 variations of the query (covering different phrasings) → retrieve for each → merge. Catches more relevant documents.
- **HyDE (Hypothetical Document Embeddings):** Generate a hypothetical answer to the query → embed that answer → use the answer embedding (not query embedding) for retrieval. Rationale: the answer embedding is more similar to actual answer-containing documents than the question embedding.

### Stage 6: Retrieval
Execute similarity search in the vector database. Key parameters:
- **Top-K:** Retrieve K candidates. Typically K=10-20 before re-ranking.
- **Metadata filters:** Limit search to documents from a specific source, date range, or category.
- **MMR (Maximum Marginal Relevance):** Balance relevance with diversity. Prevents returning 5 nearly identical chunks from the same document.

```sql
-- Retrieve top-10 chunks with cosine similarity, filtered by document_id
SELECT content, metadata, 1 - (embedding <=> $1) AS score
FROM chunks
WHERE metadata->>'source' = $2   -- Metadata filter
ORDER BY embedding <=> $1
LIMIT 10;
```

### Stage 7: Re-ranking
The top-K results from bi-encoder retrieval are good but not perfectly ordered. A cross-encoder model re-scores each (query, chunk) pair by processing them together — much more accurate but can't be pre-computed.

Typical flow: retrieve top-20 → re-rank → return top-5. Cohere Rerank API, Flashrank (local), or Colbert-style re-rankers.

### Stage 8: Augmentation + Generation
Construct the final prompt by stuffing the re-ranked chunks as context, then generate the answer.

```js
function buildRAGPrompt(query, chunks) {
  const context = chunks.map((c, i) =>
    `[Source ${i+1}: ${c.metadata.title}]\n${c.content}`
  ).join("\n\n---\n\n");

  return `You are a helpful assistant. Answer the question using ONLY the information in the provided context.
If the answer is not in the context, say "I don't have information about that."
Always cite the source number (e.g., [Source 1]) when stating a fact.

CONTEXT:
${context}

QUESTION: ${query}`;
}
```

---

## Advanced RAG Patterns

### HyDE (Hypothetical Document Embeddings)
The problem with query embeddings: "What is the capital of France?" is semantically dissimilar to "The capital of France is Paris." HyDE solves this by generating a hypothetical answer first.

```
Step 1: Query = "What is the return policy for electronics?"
Step 2: Generate hypothetical answer: "Electronics can be returned within 30 days with receipt..."
Step 3: Embed the hypothetical answer (not the original query)
Step 4: Retrieve documents similar to this hypothetical answer
Step 5: Those documents are likely actual policy documents
```

### FLARE (Forward-Looking Active Retrieval)
Instead of retrieving once at the start, retrieve when the model's uncertainty spikes (low-probability tokens). More token-efficient than upfront retrieval but complex to implement.

### Multi-Query Retrieval
```
Original: "How does JWT authentication work?"
Generated:
  1. "JWT token structure and components"
  2. "JSON web token authentication flow"
  3. "Verifying JWT signature in Node.js"
Retrieve for all 3 → merge with RRF → use merged top-K as context
```

### Parent Document Retrieval
Store two granularities: small child chunks for precise retrieval + large parent chunks for rich context. When a child chunk is retrieved, return its parent chunk to the LLM instead.

### Self-Query Retriever
Model analyzes the natural language query to generate a structured metadata filter:
```
Query: "Recent articles about React from 2024"
→ semantic_query: "React framework"
   filter: { date: {gte: "2024-01-01"}, topic: "frontend" }
```

---

## RAG Evaluation with RAGAS

RAGAS provides four key metrics:

1. **Faithfulness:** Does the answer contradict the retrieved context? Score = proportion of claims in answer that are supported by context.
2. **Answer Relevancy:** Does the answer actually address the question? (Can measure by embedding-based similarity between question and answer.)
3. **Context Precision:** Are the retrieved chunks relevant to the query? (Proportion of relevant chunks in retrieved set.)
4. **Context Recall:** Was all the necessary information retrieved? (Requires ground truth answers to check.)

For production monitoring, I track Faithfulness and Context Precision — they don't require ground truth labels and can be computed automatically on every request (sampling 10% for cost control).

---

## RAG vs Fine-tuning vs Prompting Decision Matrix

| Need | Solution |
|---|---|
| Model needs real-time or private knowledge | RAG |
| Model needs to follow specific output format reliably | Fine-tune |
| Task is straightforward and model already knows the domain | Prompting |
| Knowledge changes frequently | RAG (not fine-tuning) |
| Need attribution/citations | RAG |
| Need specific writing style or persona | Fine-tune |
| Maximum control, no external dependencies | Prompting |

# Day 44 – Embeddings & Semantic Search: Chunking, Similarity & Hybrid Search | DSA: Word Break

> **Phase 5 – GenAI Engineering** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Embeddings internals, similarity metrics, chunking strategies, hybrid search with RRF, re-ranking |
| Hands-On | 00:40–01:10 | Build a semantic search pipeline: chunk docs → embed → store → query with cosine similarity |
| DSA | 01:10–01:25 | Word Break (LeetCode #139) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Explain what embeddings geometrically represent and why similar concepts cluster
- [ ] Implement cosine similarity, dot product, and Euclidean distance — know when to use each
- [ ] Build three chunking strategies: fixed-size, sentence-based, semantic
- [ ] Implement hybrid search with Reciprocal Rank Fusion (RRF)
- [ ] Solve: Word Break (#139)
- [ ] Review 5 interview questions

---

## Concept: Embeddings & Semantic Search

### What to Study
- **What embeddings represent:** High-dimensional vectors (256–3072 dims) where semantic similarity maps to geometric proximity; trained via contrastive learning (similar pairs pulled together, dissimilar pushed apart); why they capture meaning beyond keyword matching; the embedding space as a semantic coordinate system
- **Similarity metrics:** Cosine similarity (angle between vectors, scale-invariant — best for text), dot product (cosine × magnitude — good when magnitude encodes confidence), Euclidean distance (L2, sensitive to magnitude — less common for NLP); when normalized vectors make cosine = dot product
- **Embedding dimensions and tradeoffs:** Higher dimensions = more expressive but more storage/compute; `text-embedding-3-small` 1536-dim vs `text-embedding-3-large` 3072-dim; the `dimensions` parameter for Matryoshka representation learning (truncate without full retraining); performance vs cost curve is sublinear
- **Chunking strategies:** Fixed-size (character/token-count windows) — simple but splits context; sentence/paragraph chunking — preserves semantic units; semantic chunking (embed and split where cosine similarity drops) — best quality but expensive; recursive character text splitter (LangChain default); choosing chunk size (512–1024 tokens sweet spot for most RAG)
- **Chunk overlap:** Why overlap (50–200 tokens typical) prevents cutting concepts at boundaries; tradeoff with storage and retrieval noise; sliding window analogy
- **Batch embedding:** Sending arrays of texts in one API call; rate limit implications; async batching patterns for large corpora; upsert strategies for incremental indexing
- **Similarity threshold tuning:** Why top-k retrieval without thresholding returns irrelevant results; calibrating thresholds from validation data; confidence scoring
- **Hybrid search:** BM25 (keyword/TF-IDF) + dense vector search; Reciprocal Rank Fusion (RRF) formula: `score = Σ 1/(rank + k)` where k=60; sparse + dense fusion in Pinecone, Qdrant hybrid mode, pgvector + pg_trgm
- **Re-ranking models:** Cross-encoder vs bi-encoder; Cohere Rerank API, `cross-encoder/ms-marco-MiniLM`; why re-ranking after top-50 retrieval improves precision; latency vs quality tradeoff

### Key Mental Models
- **Embeddings collapse meaning to geometry:** "Two concepts are related" becomes "two vectors have a small angle between them" — all semantic operations become linear algebra
- **Chunking is the most impactful RAG parameter:** Bad chunk boundaries cause retrieval misses before the model even sees the content — garbage in, garbage out at the retrieval layer
- **Hybrid search beats pure semantic for recall:** Exact keyword matches (product names, codes, acronyms) are lost in semantic search alone; hybrid with RRF captures both lexical precision and semantic recall

### Why This Matters in Interviews
Semantic search is the retrieval backbone of every RAG system. Interviewers building search or AI products expect you to reason about chunking tradeoffs, explain why hybrid search outperforms pure semantic, and tune retrieval quality. The ability to discuss re-ranking signals deep applied ML knowledge beyond "call the embeddings API."

---

## DSA Focus: Dynamic Programming – String Segmentation

- **Problem:** Word Break (LeetCode #139)
- **Difficulty:** Medium
- **Pattern:** 1D DP — can the string be segmented using dictionary words
- **Time Target:** < 20 minutes
- **Key Insight:** `dp[i]` = true if `s[0..i]` can be segmented; for each position `i`, check all `j < i` where `dp[j]` is true AND `s[j..i]` is in the word set; use a Set for O(1) word lookup; initialize `dp[0] = true`

---

## Today's 5 Interview Questions
1. Why is cosine similarity preferred over Euclidean distance for comparing text embeddings?
2. You're building a RAG system and retrieval quality is poor — walk me through how you'd diagnose whether it's a chunking, embedding, or retrieval threshold problem.
3. What is Reciprocal Rank Fusion and why does hybrid search (BM25 + vector) outperform pure semantic search in practice?
4. Explain the tradeoff between chunk size and retrieval quality — what happens when chunks are too large vs too small?
5. When would you use a re-ranking model after initial retrieval, and what's the latency/quality tradeoff?

---

## Files
- `01-concept/` → Notes on embedding geometry, similarity metrics, chunking strategies, hybrid search + RRF formula
- `02-hands-on/` → semantic-search-pipeline.js — full pipeline: chunk → embed (OpenAI) → in-memory cosine search → hybrid RRF demo
- `03-dsa/` → word-break.js — 1D DP with trace, BFS alternative approach
- `04-interview-prep/` → embeddings-qa.md — 5 Q&As with diagrams described in text

---

## Success Criteria
- [ ] Can explain cosine similarity vs dot product with a concrete example
- [ ] Can implement three chunking strategies and articulate when to use each
- [ ] Solved Word Break with correct DP in < 20 min
- [ ] Confident on all 5 interview questions

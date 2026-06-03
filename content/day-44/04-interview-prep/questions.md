# Day 44 — Embeddings + Semantic Search: Interview Q&A

---

## Q1: What is cosine similarity and why is it preferred over Euclidean distance for text embeddings?

**A:** Cosine similarity measures the angle between two vectors: `dot(A, B) / (|A| × |B|)`. It returns 1 for identical direction (semantically identical), 0 for perpendicular (unrelated), and -1 for opposite. Euclidean distance measures the actual geometric distance between two points: `sqrt(sum((a_i - b_i)²))`. For text embeddings, cosine similarity is preferred because it's scale-invariant — it ignores the magnitude (length) of vectors, only the direction. This matters because "The cat sat" and "The cat sat. The cat sat. The cat sat." should be semantically similar, but the longer text might produce a higher-magnitude embedding that would distort Euclidean distance. OpenAI's embedding models produce unit-normalized vectors, which means dot product equals cosine similarity — making dot product the fastest option in production. In pgvector, I use the `<=>` operator (cosine distance = 1 - cosine similarity), not `<->` (L2 distance).

---

## Q2: Walk me through chunking strategies for RAG. What are the tradeoffs?

**A:** Three main strategies. Fixed-size: split every N characters or tokens with an overlap. Simplest and fastest but cuts at arbitrary points, often mid-sentence or mid-concept. Good for prototypes. Sentence-based: use a sentence tokenizer to split at sentence boundaries, then group until approaching the target size. Better semantic coherence — no mid-sentence cuts — but chunk sizes vary significantly. Good for prose. Semantic chunking: embed each sentence, detect topic shifts by monitoring embedding similarity drops, start new chunks at topic boundaries. Best coherence but expensive (must embed every sentence). Overlap is important for all approaches: 10-20% overlap ensures content near chunk boundaries appears in adjacent chunks, preventing relevant content from being missed in retrieval. For production RAG, my default is sentence-based chunking with 512-token target and 100-token overlap. For code documentation, I chunk by function/class boundaries regardless of size.

---

## Q3: What is Reciprocal Rank Fusion and why does hybrid search outperform either component alone?

**A:** Reciprocal Rank Fusion combines rankings from multiple retrieval systems using the formula: `RRF_score(doc) = sum(1 / (k + rank_i))` where k=60 is a constant and rank_i is the document's rank in retrieval system i. It's robust because it normalizes across systems with different score scales and distributions — it doesn't matter if semantic scores range from 0.6-0.9 while BM25 scores range from 0.001-0.05. Hybrid search outperforms either alone because they cover different failure modes: semantic search fails on exact keyword matches (product IDs, names, codes), while keyword search (BM25) fails on synonym resolution and paraphrase. For example, querying "automobile maintenance" — BM25 might miss documents about "car servicing" while semantic search might rank them highest. Combined, both relevant documents surface. In practice I see 10-20% recall improvement from hybrid vs semantic-only in production RAG systems.

---

## Q4: Compare IVFFlat and HNSW indexes in pgvector. When would you choose each?

**A:** IVFFlat (Inverted File Flat) clusters vectors into `lists` partitions, and at query time probes `probes` partitions. It's fast to build and has predictable memory usage. Recall depends on the probes parameter — higher probes = better recall but slower queries. Best for: frequently updated datasets (add vectors without rebuilding), large datasets where build time matters, or when approximate results are acceptable. HNSW (Hierarchical Navigable Small World) builds a multi-layer graph where each node connects to its nearest neighbors. Query traversal is logarithmic. It provides better accuracy at the same query speed compared to IVFFlat, and query performance degrades gracefully. Best for: production workloads where query accuracy matters, static or slowly changing datasets, when you can afford higher build-time memory usage. My production default is HNSW. I'd use IVFFlat for a vector store updated many times per second (e.g., real-time document ingestion pipeline).

---

## Q5: What is the "dimensions" parameter on text-embedding-3 models, and when would you use truncated embeddings?

**A:** The `dimensions` parameter lets you request a truncated embedding from `text-embedding-3-small` or `text-embedding-3-large`. For example, you can request 512 dimensions from `text-embedding-3-large` instead of the full 3072. OpenAI trains these models with a technique called Matryoshka Representation Learning (MRL), which ensures that the first N dimensions of a longer embedding are already a high-quality embedding at dimension N — not just random truncation. This means a 512-dim version of text-embedding-3-large retains strong quality while giving you: 6x smaller storage (2KB vs 12KB per vector), significantly faster index builds, and faster similarity queries. I use truncated embeddings when: (1) storage/cost is critical at scale (>10M vectors); (2) I've measured that accuracy is acceptable at the reduced dimension for my specific use case; (3) I need faster query performance and can tolerate a small accuracy drop. The tradeoff versus text-embedding-3-small is that you still get 3-large quality in the first 512 dims, which is generally better than 3-small at 512 dims.

---

## Q6: How would you design a semantic cache for a production RAG system?

**A:** The semantic cache sits in front of the LLM call. Architecture: (1) Embed the incoming query; (2) Query a vector database (Redis with vector search or pgvector) for the nearest cached query, filtering by a minimum similarity threshold (typically 0.95); (3) If found, return the cached response and the cache metadata (hit rate, original query) — no LLM call; (4) On cache miss, proceed with the full RAG pipeline (retrieval + generation), then store the (query embedding, response) pair in the cache with a TTL. Key design decisions: threshold selection (0.95 means "nearly identical" — lower increases hit rate but risks wrong answers), TTL (depends on how frequently the underlying knowledge base changes), cache invalidation strategy (when docs are updated, do you flush the cache or let TTL handle it?), and monitoring (track hit rate, saved API calls, cost savings). I also track the distribution of similarity scores at the cache lookup boundary — if many queries are scoring 0.93-0.94, I might lower the threshold slightly or examine whether they're truly equivalent.

---

## Q7: What is re-ranking, and why does it improve RAG quality over simple top-K retrieval?

**A:** Initial retrieval uses a bi-encoder: query and document are embedded independently, then compared via cosine similarity. This is fast because document embeddings are pre-computed. But bi-encoders are limited — they reduce both query and document to single vectors that must capture everything, which means subtle query-document interactions get lost. Re-ranking uses a cross-encoder: both query and document are processed together in a single forward pass, allowing the model to directly compare all query tokens against all document tokens. This is dramatically more accurate but can't be pre-computed — you must run it at query time for each (query, document) pair. The standard production pattern: (1) fast bi-encoder retrieves top-20 candidates; (2) cross-encoder re-ranks those 20, returning top-5; (3) top-5 become the RAG context. The cross-encoder only runs on 20 documents, so latency is acceptable (~200ms). Cohere Rerank API is the most common cloud option. For latency-critical applications, I skip re-ranking and improve retrieval quality through better chunking and hybrid search instead.

---

## Q8: How do embeddings enable semantic search to work across different phrasings of the same question?

**A:** The embedding model is trained with contrastive learning on millions of (semantically similar, semantically dissimilar) pairs — for example, from search query logs where the same URL was clicked for different query phrasings. This training pushes semantically equivalent sentences close together in the vector space, regardless of surface form. So "How do I reverse a linked list?" and "algorithm to flip a singly linked list" both end up near a document that says "Reversing a linked list involves..." — even though none of those three share the same words. The vector space captures meaning, not spelling. This is fundamentally different from keyword search, which would require matching "reverse" to "flip" and "linked list" to "singly linked list" via a thesaurus. The tradeoff: embeddings are less reliable for very specific technical identifiers (product IDs, error codes, function names) where exact match is needed — which is why hybrid search combining embeddings + BM25 is the production standard.

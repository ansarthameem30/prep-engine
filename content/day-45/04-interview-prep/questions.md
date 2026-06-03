# Day 45 — RAG Architecture: Interview Q&A

---

## Q1: Walk me through all the stages of a production RAG pipeline.

**A:** Eight stages. (1) **Ingestion:** load documents from PDFs, HTML, DOCX, databases — extract clean text, strip boilerplate, track metadata (source, date, section). (2) **Chunking:** split into retrievable units, typically 256-512 tokens with 50-100 token overlap; choice of chunking strategy significantly impacts retrieval quality. (3) **Embedding:** generate vector embeddings per chunk via OpenAI or open-source models, batch processing for efficiency. (4) **Vector storage:** store embedding + original text + metadata in a vector database (pgvector, Pinecone, Qdrant); include metadata for filtering. (5) **Query processing:** embed the user query; optionally rewrite it (HyDE, multi-query) for better retrieval. (6) **Retrieval:** top-K similarity search, apply metadata filters, use MMR for diversity. (7) **Re-ranking:** cross-encoder re-scores top-K results for higher accuracy — retrieve 20, re-rank, return top-5. (8) **Generation:** stuff chunks into prompt with source citations, stream the response. Most production bugs live in stages 2 and 5 — chunking and query processing.

---

## Q2: What is HyDE and when would you use it?

**A:** HyDE (Hypothetical Document Embeddings) addresses the mismatch between question embeddings and answer-document embeddings. A question like "What are the deployment rules?" has a different embedding than the document that answers it, which might start "Deployments happen Tuesday through Thursday." The question embedding might actually be closer to FAQ-style documents, not procedural documents. HyDE fixes this: (1) use a fast LLM to generate a hypothetical answer to the question — essentially predicting what an answer would look like; (2) embed the hypothetical answer instead of the question; (3) retrieve documents similar to the hypothetical answer. Since the hypothetical answer uses the same linguistic style as real answer documents, the retrieval is more accurate. I use HyDE when I see retrieval recall is low — queries are not finding the right documents — and when the query style differs significantly from document style. The cost is one extra LLM call (can use gpt-4o-mini cheaply). I don't use it when latency is critical or when queries already match document style.

---

## Q3: How would you choose between chunk sizes of 256 vs 512 tokens?

**A:** The tradeoff is precision vs context. Smaller chunks (256 tokens) produce more precise retrieval — each chunk is about one specific thing, so the top-3 retrieved chunks are highly relevant with low noise. But the answer to a question might span multiple chunks. Larger chunks (512 tokens) provide more context per chunk and reduce the risk of cutting an answer in half, but include more off-topic content per chunk, making retrieval noisier. My decision process: (1) analyze the document structure — if documents have clear paragraph breaks, use sentence-based chunking sized to paragraphs rather than a fixed token count; (2) for Q&A over documentation, I start with 512 tokens; (3) for factual extraction from dense technical documents, I use 256 tokens; (4) I always test both on 20-30 representative queries and measure retrieval recall (did the correct document appear in top-5?). The "parent document retrieval" pattern lets me have the best of both: embed 256-token child chunks for precision, but return the 512-token parent chunk to the LLM for context.

---

## Q4: What are the four RAGAS evaluation metrics? How would you compute them in production without ground truth?

**A:** RAGAS measures: (1) **Faithfulness** — does the answer contain claims not supported by the retrieved context? Measure by breaking the answer into individual claims and checking each against the context using LLM-as-judge. (2) **Answer Relevancy** — does the answer address the question? Measure by generating questions from the answer and computing embedding similarity between generated questions and original question. (3) **Context Precision** — of the retrieved chunks, what fraction are actually relevant to the query? Measure by LLM-judging relevance of each chunk. (4) **Context Recall** — was all necessary information retrieved? This requires ground truth annotations. For production without ground truth, I compute faithfulness and context precision on a sample (5-10% of queries) using automated LLM-as-judge — these don't require pre-labeled data. I track trends: if faithfulness drops week-over-week, something in the pipeline changed. Context recall requires a labeled test set, which I build manually for the top 50-100 most common query types.

---

## Q5: Compare pgvector vs Pinecone vs Qdrant for a production RAG system. When would you choose each?

**A:** pgvector: extension to existing Postgres, no new infrastructure, ACID transactions, good SQL filtering with jsonb metadata, supports up to ~10M vectors comfortably. Choose when you're already on Postgres, have simple vector needs, and want minimal infra. Pinecone: fully managed, serverless, excellent developer experience, gets to production in hours. Choose when you want to move fast, don't want to manage infra, and cost is not a primary concern at scale. Gets expensive at >10M vectors. Qdrant: open-source, self-hostable or cloud, high performance, rich filtering API (payload filters are first-class), supports hybrid search natively. Choose when you want control, need advanced filtering, or are cost-sensitive at scale. Weaviate: schema-based, has built-in modules (automatic re-ranking, summarization), GraphQL API. Choose when you want those modules or have a complex multi-class schema. My personal default for a new product: pgvector if already on Postgres (no new infra), Qdrant if starting fresh (performance + control), Pinecone if the team needs to ship fast and will revisit at scale.

---

## Q6: What is MMR (Maximum Marginal Relevance) and why does it matter in RAG retrieval?

**A:** Without MMR, if the user asks "What is our refund policy?" and the knowledge base has five slightly different chunks from the same refund policy document, the top-5 retrieved results might all be variants of the same content. This wastes context window space and provides no additional information to the model. MMR balances relevance with diversity: each item selected maximizes `λ × relevance_to_query − (1−λ) × max_similarity_to_already_selected`. With λ=0.7, you weight relevance 70% and diversity 30%. The result is that after selecting the most relevant chunk, the next selected chunk is chosen to be both relevant AND dissimilar to what's already selected. For RAG, this means the context window contains diverse information, covering more aspects of the question, rather than repetitive versions of the same information. I set λ=0.7 for most use cases; λ=1.0 = pure relevance (no diversity); λ=0.5 = equal weight on both.

---

## Q7: A user reports that your RAG system gave incorrect information. How do you debug it?

**A:** I follow the pipeline backwards. (1) **Check the answer vs context:** retrieve the same chunks that were used for this query and verify whether the incorrect fact is in the context. If the model stated something not in the context — faithfulness failure — check the system prompt (was the "only use provided context" instruction clear?) and temperature (lower for factual Q&A). (2) **Check retrieval:** if the fact should have been in the knowledge base but wasn't retrieved, check if the correct chunk exists in the vector store, then check if the query embedding was close enough (compute similarity manually). This might indicate a chunking issue (the relevant text was split across chunks) or an embedding mismatch (HyDE would help). (3) **Check document ingestion:** verify the source document was ingested correctly — no parsing artifacts, correct metadata. (4) **Check if the document exists at all:** maybe the knowledge base doesn't have this information, and the model hallucinated despite instructions. All of this requires logging: log the query, retrieved chunks, and generated answer for every request (sample if volume is too high).

---

## Q8: How would you scale a RAG system from prototype to handling 1 million documents?

**A:** Key changes at scale: (1) **Vector store:** migrate from in-memory or SQLite to pgvector with HNSW index or a dedicated vector database (Qdrant/Pinecone). At 1M documents with ~4 chunks each = 4M vectors; HNSW at 1536 dims ≈ 24GB — fits comfortably in a dedicated instance. (2) **Ingestion pipeline:** parallel processing with a job queue (BullMQ + Redis); batch embed 2048 texts per API call; upsert to vector store in batches. At 1M documents, ingestion takes hours — use async background jobs. (3) **Replication:** read replicas for the vector store to scale query throughput. (4) **Caching:** semantic cache for frequent queries (30%+ hit rate typical). (5) **Metadata indexes:** GIN index on jsonb metadata for fast filtering before vector search. (6) **Query optimization:** use metadata pre-filters to reduce the search space before vector similarity (e.g., filter by date range first, then vector search within that subset). (7) **Monitoring:** track query latency per percentile, retrieval quality metrics, ingestion lag.

# Day 45 – RAG Architecture: Full Pipeline Design, Vector Stores & Evaluation | DSA: Trapping Rain Water

> **Phase 5 – GenAI Engineering** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Full RAG pipeline, pgvector, vector store comparison, retrieval strategies, RAG evaluation metrics, advanced patterns |
| Hands-On | 00:40–01:10 | Build a complete RAG pipeline: ingest PDFs → chunk → embed → pgvector → query → generate with citations |
| DSA | 01:10–01:25 | Trapping Rain Water (LeetCode #42) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Design the full RAG pipeline (8 stages) from memory with tradeoffs at each stage
- [ ] Implement pgvector with PostgreSQL for vector storage and similarity search
- [ ] Compare Pinecone vs Qdrant vs Weaviate on key dimensions
- [ ] Explain lost-in-the-middle problem and context window management strategies
- [ ] Solve: Trapping Rain Water (#42)
- [ ] Review 5 interview questions

---

## Concept: RAG Architecture

### What to Study
- **Full RAG pipeline (8 stages):**
  1. **Ingest** — load documents (PDF, web, DB); handle formats, metadata extraction
  2. **Chunk** — split into retrievable units (see Day 44 strategies); preserve metadata (source, page, section)
  3. **Embed** — generate vectors; batch for cost efficiency; handle updates/deletions
  4. **Store** — upsert to vector DB with metadata; index management; namespace/collection design
  5. **Query** — embed the user query; optionally rewrite/expand query (HyDE, query expansion)
  6. **Retrieve** — top-k, MMR (Maximal Marginal Relevance — diversity), hybrid; metadata filtering (pre-filter on source, date, user permissions)
  7. **Augment** — inject retrieved chunks into prompt; citation tracking; context truncation if over limit
  8. **Generate** — call LLM; stream response; source attribution in output
- **pgvector:** PostgreSQL extension adding `vector` type; `ivfflat` index (approximate, configurable lists) vs `hnsw` (hierarchical navigable small world — better recall, more memory); `<=>` cosine, `<->` L2, `<#>` dot product operators; combining with SQL filters for metadata; free, self-hosted, existing Postgres infra
- **Pinecone vs Qdrant vs Weaviate:**
  - Pinecone: fully managed, serverless tier, sparse+dense hybrid built-in, no self-host option, easiest to start
  - Qdrant: open source + managed, payload filtering (rich), sparse vectors (SPLADE), Rust-based performance, good self-host story
  - Weaviate: open source + managed, built-in module system (auto-vectorizer, generative modules), GraphQL API, good for multi-modal
- **Retrieval strategies:** Top-k (simplest, can return redundant results); MMR (balances relevance vs diversity — penalizes similar retrieved docs); hybrid with RRF; self-query retrieval (LLM generates metadata filters from natural language query)
- **Context window management:** Ranking chunks by score before injection; `lost-in-the-middle` problem (model attends well to start and end of context, not middle) — put most relevant chunks at start and end; context compression (LLMLingua, reranker-based); dynamic context sizing
- **RAG evaluation metrics (RAGAS):** Faithfulness (is the answer grounded in retrieved context?), Answer Relevance (does the answer address the question?), Context Precision (are retrieved chunks relevant?), Context Recall (were all necessary chunks retrieved?); LLM-as-judge pattern
- **Advanced RAG patterns:**
  - **HyDE (Hypothetical Document Embeddings):** Generate a hypothetical answer, embed it, use that vector to retrieve — improves recall for vague queries
  - **FLARE (Forward-Looking Active Retrieval):** Model triggers retrieval mid-generation when it predicts low-confidence tokens — reduces hallucination on knowledge-intensive generation

### Key Mental Models
- **RAG is a retrieval-augmented search engine feeding an LLM:** The quality of your answer is bounded by the quality of your retrieval — a brilliant LLM cannot compensate for irrelevant retrieved context
- **Metadata filtering is your access control layer:** In multi-tenant RAG, you must filter by user permissions at the vector DB level — never rely on the LLM to honor tenant boundaries
- **Evaluation is the only truth:** You cannot judge RAG quality by reading outputs manually at scale — RAGAS scores, A/B testing, and human eval sampling are your instruments

### Why This Matters in Interviews
RAG is the dominant architecture for enterprise LLM applications. System design rounds at AI-forward companies commonly ask "design a document Q&A system" or "design an AI customer support agent." This requires fluency in the full pipeline, ability to articulate tradeoffs between vector stores, and knowledge of evaluation frameworks to prove the system works.

---

## DSA Focus: Two Pointers / Stack – Classic Hard

- **Problem:** Trapping Rain Water (LeetCode #42)
- **Difficulty:** Hard
- **Pattern:** Two pointers (O(1) space) or monotonic stack
- **Time Target:** < 20 minutes
- **Key Insight:** Two pointer approach: maintain `leftMax` and `rightMax`; whichever side has the smaller max is the bottleneck — water at that position = max - height; advance the pointer with the smaller max toward center

---

## Today's 5 Interview Questions
1. Walk me through every stage of a production RAG pipeline — what decisions do you make at each stage and why?
2. How does the "lost-in-the-middle" problem affect RAG, and how do you architect your context injection to mitigate it?
3. Compare pgvector vs Pinecone for a startup building a RAG system — when would you choose each?
4. Explain the HyDE technique — why does generating a hypothetical answer improve retrieval recall?
5. How would you evaluate whether your RAG system is actually faithful (not hallucinating) at scale?

---

## Files
- `01-concept/` → Notes on full 8-stage RAG pipeline diagram, vector store comparison table, RAGAS metrics explained
- `02-hands-on/` → rag-pipeline.js — complete Node.js RAG: PDF ingest → chunk → OpenAI embed → pgvector upsert → query → generate with citations
- `03-dsa/` → trapping-rain-water.js — two pointer O(1) + monotonic stack solutions
- `04-interview-prep/` → rag-architecture-qa.md — 5 Q&As with architecture diagrams in ASCII

---

## Success Criteria
- [ ] Can draw the full RAG pipeline from memory with tradeoffs at each stage
- [ ] Can implement pgvector queries with metadata filtering
- [ ] Solved Trapping Rain Water with two-pointer approach in < 20 min
- [ ] Confident on all 5 interview questions

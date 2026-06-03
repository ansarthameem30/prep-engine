# Day 50 — GenAI Mock Interview Day

## Top 20 GenAI Engineering Concepts Checklist

Use this as your pre-interview review. If you can explain each concept clearly in 60 seconds, you're ready.

1. **Transformer Architecture** — attention mechanism, Q/K/V, why it parallelizes better than RNN
2. **Tokenization** — BPE, why token counts matter for pricing and context limits
3. **Context Window** — input + output tokens combined, lost-in-the-middle problem
4. **Temperature / Top-p / Top-k** — when to use each, production defaults
5. **Hallucination** — root cause (next-token prediction objective), detection, mitigation
6. **RAG Pipeline** — all 8 stages, when to use vs fine-tuning vs prompting
7. **Embeddings** — what they represent, cosine similarity, dimensionality tradeoffs
8. **Vector Databases** — pgvector vs Pinecone vs Qdrant, HNSW vs IVFFlat
9. **Chunking Strategies** — fixed vs sentence vs semantic, overlap, parent document retrieval
10. **Prompt Engineering** — zero-shot, few-shot, CoT, ReAct, structured output
11. **Function Calling / Tool Use** — full cycle, parallel calls, tool design principles
12. **AI Agents** — ReAct loop, multi-agent patterns, memory types, safety guardrails
13. **LangChain LCEL** — pipe operator, RunnableParallel, when to use vs raw SDK
14. **LangGraph** — state management, cycles, checkpointers, human-in-the-loop
15. **Streaming SSE** — implementation, abort on disconnect, client consumption
16. **Token Budget Management** — counting, per-user limits, conversation truncation
17. **Model Routing** — cost rationale, classification signals, quality monitoring
18. **Semantic Caching** — architecture, threshold tuning, invalidation
19. **LLM-as-Judge / RAGAS** — evaluation metrics, CI integration, limitations
20. **Production Observability** — what to log, what to monitor, alert thresholds

---

## Common Interview Scenarios

### Scenario 1: "Design an AI chatbot for customer support"

**Strong answer structure:**
1. **Clarify requirements** — How many users? Real-time? What's the knowledge base (static docs vs live DB)?
2. **Architecture** — Express API → OpenAI (streaming) → SSE to client. Postgres for conversations + docs. pgvector for semantic search.
3. **RAG pipeline** — Ingest KB docs → chunk (512 tokens, 100 overlap) → embed → pgvector with HNSW index → query: embed → retrieve top-5 → re-rank → generate.
4. **Conversation management** — session_id + user_id → load history → truncate to fit context → save after response.
5. **Safety** — Moderation API on input + output, PII scrubbing before sending to LLM, prompt injection detection.
6. **Cost optimization** — Route to GPT-4o-mini for common FAQ questions, GPT-4o for complex issues, semantic cache for top 20% of repeated queries.
7. **Evaluation** — Faithfulness score (LLM-judge), user thumbs up/down, ticket escalation rate (proxy for AI failure).
8. **Scale** — 1M users: read replicas for pgvector, Redis for semantic cache, horizontal scaling for API layer.

### Scenario 2: "How would you evaluate if your RAG system is working well?"

**Strong answer:** Four dimensions: (1) Retrieval quality — context precision (are retrieved chunks relevant?) and recall (did we get all necessary information?); (2) Generation quality — faithfulness (no hallucination vs context), answer relevancy (did we answer the question?); (3) User signals — follow-up "clarify" questions, regeneration requests, thumbs down rate; (4) Business metrics — ticket deflection rate, CSAT, resolution time. Implementation: run automated RAGAS on 10% sampled traffic, manual review 20 conversations/week, regression test suite of 100 golden examples run weekly. Alert when faithfulness drops below 3.5/5 sustained for 1 hour.

### Scenario 3: "A user says the AI gave wrong information. Debug and fix it."

**Strong answer (follow the pipeline backwards):**
1. Retrieve the full trace — logged prompt, retrieved chunks, and response.
2. Was the answer faithful to the context? If YES → retrieval was good but prompt instruction failed. If NO → check retrieval.
3. Was the correct chunk retrieved? Find the chunk that should have contained the answer. If present → ranking issue (went to position 6, only top-5 used). If absent → chunking issue (content split across chunks) or embedding mismatch (HyDE would help).
4. Was the source document correctly ingested? Check for parsing artifacts or encoding issues.
5. Fix: if retrieval issue → improve chunking, add HyDE, increase K before re-ranking. If generation issue → strengthen system prompt ("only use provided context", "say 'I don't have that information' if uncertain").

### Scenario 4: "How would you reduce the cost of our AI feature by 50%?"

**Strong answer:** Three-lever approach: (1) **Model routing** — classify query complexity, route 60-70% simple queries to GPT-4o-mini (28x cheaper). Expected reduction: 40-50% alone. (2) **Semantic caching** — cache responses for semantically similar queries at threshold 0.93. Typical hit rate 20-40%. Expected reduction: 10-20% additional. (3) **Batch API** — migrate all non-real-time workflows (nightly summaries, data enrichment) to Batch API at 50% discount. Combined: likely 50-65% reduction. Monitor quality: LLM-judge scores should stay within 10% of baseline after routing. Rollout: canary 5% → validate → 25% → validate → 100%.

### Scenario 5: "Design a multi-agent research system"

**Strong answer:** Supervisor pattern with three specialist agents. Orchestrator receives research task, decomposes into: (1) Web research agent — has web_search + summarize tools, gathers current information; (2) Analysis agent — has database_query + calculate tools, processes structured data; (3) Writing agent — synthesizes findings into a report with citations. State managed by LangGraph: supervisor maintains task state and agent results. Each agent runs serially in dependency order or in parallel when independent. Human-in-the-loop checkpoint before publishing any output. Safety: max iterations per agent (10), cost budget per run ($1), output validation before passing between agents.

---

## Live Coding Scenario: Minimal RAG Pipeline in Node.js

```
"Implement a basic RAG endpoint in 20 minutes"
```

**What to say and build:**
1. "I'll implement: document ingestion (chunk + embed), storage (in-memory vector store), retrieval (cosine similarity), and generation (OpenAI)."
2. Write `sentenceChunker`, `cosineSimilarity`, in-memory store with `addDocument` and `search`, and a `POST /ask` handler.
3. Narrate your design decisions: "I'm using sentence-based chunking because it preserves semantic coherence better than fixed-size."
4. "In production I'd add: pgvector instead of in-memory, HNSW index, re-ranking, streaming response, token budget middleware."

---

## Architecture at Scale: 1M Users

When asked "how does this work at 1M users?":

| Component | Change at Scale |
|---|---|
| API layer | Horizontal scaling (Kubernetes), load balancer |
| Conversation DB | Postgres with read replicas, Redis for hot sessions |
| Vector store | Dedicated pgvector instance or migrate to Qdrant |
| Embeddings | Cache embeddings (same text = same embedding), batch ingestion |
| LLM calls | Rate limit per user, queue heavy requests, circuit breaker |
| Semantic cache | Redis Vector Search, distributed cache |
| Monitoring | DataDog, Langfuse for AI traces, PagerDuty for alerts |

---

## What Impresses Interviewers (Talking Points)

1. **Evaluation first** — "Before building, I'd define how to measure if it's working."
2. **Cost awareness** — "The 28x cost difference between GPT-4o and mini means routing is a must for any production system."
3. **Safety first** — "I'd add moderation API on input/output before anything else goes live."
4. **Observability** — "I log every LLM call: model, tokens, cost, latency, prompt version. Can't debug what you can't observe."
5. **Graceful degradation** — "What happens when OpenAI is down? Fallback model, static responses, and circuit breaker."
6. **Incremental rollout** — "New prompts get 5% canary traffic first, with automated quality gates before promotion."
7. **RAG over fine-tuning** — "For most knowledge base use cases, RAG is faster to ship, cheaper, and easier to keep current."
8. **Honest tradeoffs** — "LangChain adds value for complex pipelines but raw SDK is simpler for single calls. I choose based on complexity."

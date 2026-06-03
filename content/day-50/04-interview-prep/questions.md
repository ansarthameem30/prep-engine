# Day 50 — GenAI Mock Interview: Full Q&A (15 Questions)

---

## Q1: Design an AI-powered customer support chatbot for a SaaS product. Walk me through the full architecture.

**A:** I'd build a RAG-based chatbot with streaming responses. Architecture layers: (1) **Frontend** — React chat UI consuming SSE stream, typing indicators, source citations display; (2) **API layer** — Node.js/Express with endpoints: POST /chat (returns session_id), GET /chat/:sessionId/stream (SSE), POST /feedback; (3) **AI pipeline** — incoming message → moderation API check → load conversation history → semantic cache lookup → if miss: RAG retrieval (embed query → pgvector search top-10 → re-rank to top-5) → build prompt with context → OpenAI stream → log usage; (4) **Storage** — Postgres for conversations/messages/users, pgvector extension for knowledge base embeddings, Redis for session cache + rate limit counters; (5) **Knowledge base** — periodic ingestion job: load docs from Notion/Zendesk → chunk (512 tokens, 100 overlap) → embed → upsert to pgvector. Safety: moderation API on input + output, PII scrubbing, prompt injection detection. Cost: model routing (mini for FAQ, GPT-4o for complex), semantic cache with 0.93 threshold. Evaluation: faithfulness score (LLM-judge, 10% sampled), ticket escalation rate as quality proxy.

---

## Q2: How would you evaluate if your RAG system is working well in production?

**A:** Four measurement layers. (1) **Automated quality metrics** — run on 10% sampled traffic: Faithfulness (does answer contradict context? LLM-judge, alert if < 3.5/5), Context Precision (are retrieved chunks relevant? LLM-judge per chunk), Answer Relevancy (does answer address question? embedding similarity). These don't require ground truth labels. (2) **User signals** — thumbs up/down rate, follow-up "clarify" questions (suggests first answer was incomplete), regeneration requests, session abandonment after AI response. (3) **Business metrics** — ticket deflection rate (did the bot solve the issue?), escalation rate to human agents, CSAT scores for bot interactions. (4) **Regression testing** — manually labeled gold set of 100-200 Q&A pairs covering common queries, run weekly with full RAGAS evaluation including Context Recall. Alert if any metric drops >10% week-over-week. When I see problems: I trace back through the pipeline — check if the right chunks were retrieved, if the generation was faithful, and if the source documents are up-to-date.

---

## Q3: A user reports that your AI chatbot gave incorrect medical information. What do you do?

**A:** This is a P1 incident. Immediate response: (1) **Triage** — determine if this is isolated or systematic. Pull the full trace: exact prompt sent, chunks retrieved, response generated. Check if the incorrect claim appears in the retrieved context (generation failure) or if the context itself had wrong information (knowledge base failure); (2) **Contain** — if systematic (multiple similar wrong answers): add an interim guardrail to the system prompt explicitly restricting medical advice ("Do not provide medical diagnoses or treatment recommendations. Always recommend consulting a healthcare professional"); (3) **Root cause** — if generation failure: strengthen "only use provided context" instruction, reduce temperature; if knowledge base failure: identify and update/remove the incorrect source document; if hallucination despite good context: the model needs stronger instruction to decline when uncertain; (4) **Fix and validate** — deploy fix, add this query to the regression test suite, verify fix doesn't break other test cases; (5) **Process improvement** — for sensitive domains (medical, legal, financial), add a second LLM as a safety reviewer that checks the primary response before returning it to the user.

---

## Q4: How would you reduce AI feature costs by 50%? What's your sequencing?

**A:** Three-lever approach, sequenced by impact-to-effort ratio. First (highest ROI, week 1): **Model routing**. Analyze production query distribution — typically 60-70% are simple FAQ-style queries. Build a classifier: message length < 200 chars + no system design keywords → GPT-4o-mini (28x cheaper). Measure: compare LLM-judge quality scores between mini and GPT-4o on a sample. Expected reduction: 40-55%. Second (week 2): **Semantic caching**. Embed queries, check similarity against cached responses (threshold 0.93). Customer support chatbots typically see 25-40% cache hit rates — the same questions recur constantly. Expected additional reduction: 10-20%. Third (week 3-4): **Batch API** for non-real-time workflows. Any nightly batch job, data enrichment pipeline, or offline evaluation can use OpenAI Batch API at 50% discount. Combined effect: 60-70% total reduction typical. Monitoring throughout: track LLM-judge quality scores per routing decision, alert if mini-routed answers drop below threshold (then route those query types back to GPT-4o).

---

## Q5: Design a multi-agent research and writing system. How do you coordinate the agents?

**A:** I'd use a LangGraph supervisor pattern with four agents. Architecture: **Supervisor Agent** receives the research task and decomposes it into subtasks. It maintains global state: {task, research_findings, analysis, draft, review_feedback, final_output}. Three specialist agents: (1) **Research Agent** — tools: web_search, fetch_url, search_documentation. Gathers current information, returns structured findings with sources; (2) **Analysis Agent** — tools: execute_code, query_database, calculate. Processes quantitative data, validates claims, generates charts; (3) **Writing Agent** — composes the report from research findings + analysis, cites sources, formats output. Coordination: LangGraph StateGraph with conditional edges — supervisor routes to agents based on task state, agents write back to shared state. Parallel execution where possible (research + analysis can run concurrently if research output isn't needed for analysis). Human-in-the-loop: checkpoint before Publishing step — supervisor presents draft to user for approval. Safety: max 10 iterations per agent, $2 cost budget per run, abort if any agent hits error limit.

---

## Q6: What is the difference between RAG and fine-tuning? When would you use each?

**A:** RAG injects relevant context at query time — the model uses its reasoning abilities on the provided documents rather than relying on memorized training data. Fine-tuning adapts model weights through additional training on specific data. Key differences: RAG is real-time updatable (add a document, it's immediately searchable), doesn't require training, and is auditable (you can show which sources informed the answer). Fine-tuning is permanent behavioral change baked into the model — better for consistent style/format/tone and domain-specific terminology the model should always use. Decision framework: (1) Knowledge questions (internal docs, recent events, proprietary info) → RAG, always. The model needs access to the data, not memorization of it; (2) Behavioral consistency (always respond in a specific format, use company jargon, maintain a persona) → Fine-tuning. Prompting can achieve this but fine-tuning is more reliable at scale; (3) General tasks → prompting first, almost always. The combination that works best for specialized applications: fine-tune on behavior/format (small, high-quality dataset) + RAG for knowledge. Never fine-tune just to add knowledge — RAG does it better, cheaper, and with the ability to update.

---

## Q7: How do you handle AI agent safety in production? What are your non-negotiables?

**A:** Five non-negotiables: (1) **Principle of least privilege** — the agent only has tools it actually needs. A customer service bot has no business with database write access or email sending capabilities. Every extra tool is attack surface; (2) **Hard iteration limit** — every agent loop has a maximum iteration count (10-15 is typical). Without this, a stuck agent generates infinite API calls and costs; (3) **Cost budget per run** — calculate token cost after each LLM call, abort if over budget ($1-5 per run depending on use case). Prevents runaway agents; (4) **Human approval for destructive actions** — any action that's irreversible (delete data, send communications, make payments) must pause for human confirmation. Implement via LangGraph interrupt_before; (5) **Tool call validation** — before executing any tool, validate the arguments: check for SQL injection patterns, validate email formats, ensure IDs exist in the database, verify the operation doesn't violate business rules. Log every tool call with arguments and result for audit trails. Additionally: input sanitization against prompt injection, output validation that responses match expected schema, and circuit breakers for external tool dependencies.

---

## Q8: Walk me through implementing streaming from OpenAI to a browser client.

**A:** The chain: OpenAI stream → Node.js → SSE → Browser EventSource. Node.js server: set headers `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, call `res.flushHeaders()` immediately. Create an AbortController, pass its signal to the OpenAI call, and call `controller.abort()` on `req.on("close")` — this cancels OpenAI generation when the user navigates away (avoids paying for orphaned tokens). Iterate the OpenAI async stream, writing each `delta.content` chunk as `res.write("data: " + JSON.stringify({content: delta}) + "\n\n")`. Signal completion with `data: {"done": true}\n\n` and `res.end()`. Browser client: `const es = new EventSource("/api/stream")` — `es.onmessage` fires for each SSE event. Parse `JSON.parse(event.data)`, append `data.content` to the display element, close the EventSource on `data.done`. Why SSE over WebSockets: SSE is unidirectional (server → client), uses regular HTTP (no protocol upgrade), handles reconnection automatically, and is simpler to implement and scale. WebSockets are appropriate for bidirectional real-time (collaborative editing, live cursor positions) — not needed for streaming AI responses.

---

## Q9: Explain cosine similarity. Why do we use it for embeddings instead of Euclidean distance?

**A:** Cosine similarity measures the angle between two vectors: `dot(A,B) / (|A| × |B|)`. Returns 1 for identical direction (semantically identical), 0 for perpendicular (unrelated), -1 for opposite. Euclidean distance measures geometric distance: `sqrt(sum((a_i - b_i)²))`. For embeddings, cosine similarity is preferred because it's scale-invariant — it ignores vector magnitude and only cares about direction. This matters because text length correlates with embedding magnitude but not semantic meaning. "The cat sat" and "The cat sat. The cat sat. The cat sat." should be semantically similar, but the longer text produces a larger-magnitude embedding that would inflate Euclidean distance. Cosine similarity correctly sees these as nearly identical. OpenAI embedding models produce unit-normalized vectors (magnitude = 1), so for these models `cosine_similarity = dot_product` — and dot product is faster (no square root). In pgvector: use `<=>` operator for cosine distance (1 - cosine similarity). Use `<->` for L2/Euclidean. For normalized vectors (OpenAI), both give the same ranking — but cosine distance is the semantically correct choice.

---

## Q10: How would you make an AI feature work at 1 million users?

**A:** Break it down by component. API layer: horizontal scaling with Kubernetes (start at 3 pods, auto-scale based on CPU/request queue depth), load balancer. No stateful code in API servers — all state in external stores. Database: Postgres with 1 read replica minimum, pgBouncer for connection pooling (each Pod has limited DB connections), Redis for session cache and hot data. Vector store: at 1M users with a 10K-document knowledge base — ~40K vectors — pgvector handles this easily. At 1M documents (400K vectors): consider dedicated pgvector instance with HNSW index, or migrate to Qdrant for better performance. LLM calls: rate limit per user (token bucket, Redis), queue burst requests with BullMQ + Redis (prevents overwhelming OpenAI), circuit breaker pattern for when OpenAI is slow. Cost: model routing (route ~65% of queries to mini), semantic cache (30-40% cache hit rate = 30-40% fewer OpenAI calls), prompt compression for long conversations. Observability at scale: DataDog for infrastructure metrics, Langfuse for AI traces (sample 1-5% for cost), Sentry for errors. The single biggest scaling risk: OpenAI rate limits. Solution: multiple API keys across different OpenAI organizations, request queuing, and circuit breaker with user-friendly degradation.

---

## Q11: What is chain-of-thought prompting and when does it help?

**A:** Chain-of-thought (CoT) adds "Think step by step" or equivalent to the prompt, forcing the model to generate intermediate reasoning before the final answer. It works because each generated token becomes context for subsequent tokens — writing out "Step 1: revenue = 45000 × 0.08 = 3600" makes that computed value available for the next step, rather than trying to compute everything in one token prediction. Wei et al. showed CoT improved accuracy from 18% to 57% on math benchmarks with GPT-3 scale models. When to use: multi-step reasoning, math, logic puzzles, code debugging, any task where "showing your work" would help a human. When not to use: simple factual retrieval, classification, latency-critical endpoints (CoT adds ~30-50% more output tokens), cost-sensitive pipelines. Variants: zero-shot CoT (just add "think step by step" — free), few-shot CoT (provide full reasoning trace examples — better accuracy, costs tokens), self-consistency (sample N CoT paths, take majority vote — most accurate, N× cost). For production code generation, I use low temperature + zero-shot CoT and see 15-20% reduction in obvious logical errors.

---

## Q12: What are the four RAGAS metrics? Which can you compute without ground truth?

**A:** Faithfulness, Answer Relevancy, Context Precision, Context Recall. Without ground truth: Faithfulness — decompose answer into claims, check each against retrieved context using LLM-judge. No reference needed. Context Precision — for each retrieved chunk, LLM judges "is this relevant to the question?" No reference needed. Answer Relevancy — embed the answer, generate questions from the answer, measure similarity to original question. No reference needed. Requires ground truth: Context Recall — "was all necessary information retrieved?" Needs a reference answer to measure what information was required. Practical production setup: run Faithfulness and Context Precision automatically on 10% of traffic (random sample, async, doesn't affect latency). Build a 100-200 query "gold set" with manually written reference answers for Context Recall and full RAGAS evaluation — run this gold set weekly as part of pipeline health checks. Alert if Faithfulness drops below 3.5/5 sustained over 1 hour (automated), or if weekly gold set scores drop >10% from baseline (manual review trigger).

---

## Q13: You're debugging a production AI agent that sometimes enters infinite loops. What's your approach?

**A:** Systematic diagnosis. First: look at the traces (LangSmith, Langfuse, or custom logs). Every iteration's messages array should be logged — find the iteration where the loop begins. Common root causes and fixes: (1) **Tool returning error the model doesn't know how to handle** — model retries the same call indefinitely. Fix: add explicit error handling instructions to system prompt: "If a tool returns an error twice in a row, stop retrying and explain to the user what failed." Return user-facing error messages, not stack traces; (2) **Model never receives a "done" signal** — system prompt doesn't specify when to stop. Fix: add "When you have gathered sufficient information to answer the question, provide your final answer immediately without calling more tools"; (3) **Circular tool dependency** — tool A provides output that causes tool B to be called, which provides output that causes tool A to be called. Fix: add state tracking of which tools have been called with which arguments; if same tool+args called twice, return cached result or error; (4) **Context length exceeded** — model loses earlier context and re-requests information it already has. Fix: implement conversation summarization for long agent runs. Immediate mitigation for production: max_iterations guard (abort at 10-15 with partial answer) + cost budget guard.

---

## Q14: What's the difference between prompting, RAG, and fine-tuning? Give me a concrete example of when to choose each.

**A:** Prompting: zero/few-shot instructions in the messages array. No training, no infrastructure. Use when: the model already has the knowledge and just needs direction. Example: "Classify this support ticket as billing/technical/general — reply with only the category name." Takes 5 minutes to ship. RAG: retrieve relevant documents at query time, inject as context. Use when: the model needs access to knowledge it doesn't have (private docs, recent events, large knowledge bases). Example: a customer chatbot that needs to answer questions about YOUR product's pricing, policies, and features — the model doesn't know this, but you can retrieve it. Fine-tuning: additional training to modify model weights. Use when: you need consistent behavioral changes that prompting doesn't reliably achieve. Example: a model that needs to always respond in a specific JSON schema for a legacy system integration, always use your company's formal communication style, or use domain-specific terminology consistently (legal, medical). The decision tree: try prompting first (hours to days); if you need external knowledge → add RAG (days to weeks); if you need behavioral consistency → fine-tune (weeks). Most production systems should be "prompting + RAG" with fine-tuning only for specific behavioral requirements.

---

## Q15: Walk me through a full live coding challenge: "Implement a basic RAG pipeline in Node.js in 20 minutes."

**A:** I'd narrate my approach clearly, then build: "I'll implement 4 components: a sentence-based chunker (preserves semantic coherence), cosine similarity function for retrieval, an in-memory vector store, and the RAG query function. In production I'd use pgvector instead of in-memory."

```javascript
// Step 1: Chunker
function sentenceChunk(text, maxLen=400) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [], current = [];
  for (const s of sentences) {
    current.push(s.trim());
    if (current.join(' ').length > maxLen) {
      chunks.push(current.join(' '));
      current.splice(0, current.length - 1); // Keep last sentence as overlap
    }
  }
  if (current.length) chunks.push(current.join(' '));
  return chunks;
}

// Step 2: Similarity
function cosineSim(a, b) { /* dot / (|a| * |b|) */ }

// Step 3: Index + Retrieval
const store = [];
async function addDoc(id, text, title) {
  const chunks = sentenceChunk(text);
  const { data } = await openai.embeddings.create({ model: 'text-embedding-3-small', input: chunks });
  chunks.forEach((c, i) => store.push({ id: `${id}-${i}`, text: c, embedding: data[i].embedding, source: title }));
}
async function search(query, k=3) {
  const { data } = await openai.embeddings.create({ model: 'text-embedding-3-small', input: [query] });
  return store.map(e => ({...e, score: cosineSim(e.embedding, data[0].embedding)}))
    .sort((a, b) => b.score - a.score).slice(0, k);
}

// Step 4: RAG query
async function ask(question) {
  const docs = await search(question);
  const context = docs.map((d, i) => `[Source ${i+1}]\n${d.text}`).join('\n\n');
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Answer using only the provided context. Cite sources.' },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
    ],
    temperature: 0.1, max_tokens: 200
  });
  return { answer: response.choices[0].message.content, sources: docs.map(d => d.source) };
}
```

Then I'd add: "In production I'd add pgvector with HNSW index, re-ranking with Cohere, streaming response with SSE, conversation history, token budget middleware, and faithfulness evaluation on sampled responses."

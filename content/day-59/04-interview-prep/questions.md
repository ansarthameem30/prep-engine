# Day 59 — Full GenAI + DevOps Mock Interview

---

## Q1 (GenAI): What is RAG? How do you evaluate if a RAG pipeline is working well?

**Model Answer:**
RAG (Retrieval-Augmented Generation) grounds LLM responses in specific documents/data. Instead of relying on the model's training data alone, you retrieve relevant context at query time and include it in the prompt.

**Architecture**: Query → Embed query → Search vector store → Retrieve top-K chunks → Build prompt with context → LLM generates answer grounded in context.

**Why RAG vs fine-tuning**: Fine-tuning bakes knowledge into model weights — expensive, requires retraining when data changes. RAG is dynamic — update the vector store, RAG immediately uses new data. RAG also provides citation/attribution (you know which source each answer came from).

**Evaluation with RAGAS**:
- **Context Recall** (0-1): Does the retrieved context contain the answer? Low = your vector store lacks relevant content, or retrieval is failing. Fix: improve chunking, try hybrid search, check embeddings.
- **Answer Faithfulness** (0-1): Is the generated answer supported by the retrieved context? Low = the LLM is hallucinating, adding information not in context. Fix: stronger grounding instruction: "Answer ONLY using the provided context."
- **Context Precision** (0-1): Are all retrieved chunks relevant? Low = you're retrieving noise. Fix: reduce topK, increase similarity threshold, improve chunking.
- **Answer Relevance** (0-1): Does the answer address the question? Low = model is going off-topic.

**Regression testing**: Maintain a golden set of 100+ question/answer pairs. Run eval after every RAG pipeline change. Block merges if any metric degrades below threshold.

---

## Q2 (GenAI): How do you optimize LLM application costs at scale?

**Model Answer:**
LLM costs can dominate infrastructure spend. A senior engineer has a toolkit for this:

**1. Model tiering**: Route simple tasks to cheap models. Classification, structured extraction, simple Q&A → Haiku/GPT-4o-mini (10-100x cheaper). Complex reasoning, code generation, long-form writing → Sonnet/GPT-4o. Use a router LLM to classify task complexity and route accordingly.

**2. Prompt caching**: Anthropic (and others) cache repeated prompt prefixes. Your system prompt is sent identically for all users — cache it. A 10K-token system prompt cached costs ~90% less for subsequent requests with the same prefix. Cache hit rate depends on prompt prefix length and usage patterns.

**3. Semantic caching**: Embed incoming queries. If cosine similarity > 0.95 with a cached query, return the cached response. LLM cache hit rate in customer support can be 40-60% (users ask the same questions repeatedly).

**4. RAG context reduction**: Without RAG: "Summarize this 100K token document" = $1.00 per call. With RAG: retrieve 3-5 relevant chunks = $0.05 per call. 95% reduction.

**5. Output token limits**: Instruct the model to be concise. Add `max_tokens` limits. Output tokens cost 3-5x more than input tokens per million.

**6. Batch API**: For async processing (document analysis, embedding generation), use the batch API — 50% cheaper, just slower (hours instead of seconds).

**Monitoring**: Track cost/request, cost/user, cost by model. Alert when cost/request exceeds threshold. Identify which prompt templates are most expensive.

---

## Q3 (GenAI): Design an LLM agent for automating customer support ticket resolution.

**Model Answer:**
**Requirements clarification** (ask these in interview): What's the scope? (respond only, or also take actions like issue refunds?), What's the escalation threshold?, What data does the agent have access to?

**Architecture**:
1. **Input**: Incoming support ticket (text, optionally with attachments)
2. **Intent classification**: Fast, cheap model (Haiku) classifies intent: billing/technical/account/other
3. **Context retrieval (RAG)**: Retrieve relevant KB articles + customer's account history
4. **Agent reasoning** (Sonnet): Given intent, context, and available tools — decide action
5. **Tools available**: `get_account_info(userId)`, `get_order_status(orderId)`, `issue_refund(orderId, amount)` (requires approval), `escalate_to_human(ticketId, reason)`, `send_reply(ticketId, message)`
6. **Output**: Reply sent to customer, or escalated to human agent

**Production concerns**:
- **Authorization boundaries**: `issue_refund` only if amount < $50, otherwise require human approval
- **Confidence thresholds**: If agent confidence < 0.7, escalate rather than respond
- **Max iterations**: `max_steps: 5` — prevent infinite loops
- **Human-in-the-loop checkpoint**: Any action that modifies account data requires approval flow
- **Audit logging**: Every tool call, every LLM decision logged with timestamps and input/output
- **Fallback**: Always escalate if agent returns an error, never fail silently

**Evaluation**: Resolution rate, customer satisfaction (CSAT after AI-resolved tickets vs human-resolved), escalation rate, wrong-answer rate (manual sampling of responses).

---

## Q4 (GenAI): How do you implement LLM response streaming?

**Model Answer:**
Streaming is critical for UX — a 5-second wait with no feedback feels broken. Streaming shows text appearing progressively.

**Backend (Node.js + Anthropic)**:
```js
app.post('/api/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    messages: req.body.messages,
    max_tokens: 1024,
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
});
```

**Frontend (React)**:
```js
const [response, setResponse] = useState('');
const source = new EventSource('/api/chat');
source.onmessage = (event) => {
  if (event.data === '[DONE]') { source.close(); return; }
  const { text } = JSON.parse(event.data);
  setResponse(prev => prev + text);
};
```

**Edge cases**: User closes tab mid-stream → detect `request.on('close', () => abortController.abort())` to cancel LLM inference and stop billing for tokens you won't use.

---

## Q5 (GenAI): How do you handle LLM reliability issues (hallucinations, rate limits, errors)?

**Model Answer:**
LLMs are probabilistic and their APIs are rate-limited. Production systems need multiple reliability layers.

**Hallucination mitigation**:
1. **Grounding**: Always provide context (RAG) and instruct "answer only from provided context"
2. **Structured output**: Use JSON mode or structured outputs (Anthropic `tool_use`, OpenAI function calling) — model is less likely to hallucinate when filling a schema
3. **Self-critique**: For critical responses, ask the model to review its own answer: "Does this answer contradict any of the provided context?"
4. **Human review**: For high-stakes domains (medical, legal, financial), route to human review above a certain confidence threshold

**Rate limit handling**:
```js
// Exponential backoff with jitter
async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); }
    catch (err) {
      if (err.status !== 429) throw err; // only retry rate limits
      const delay = Math.min(1000 * 2 ** attempt, 16000) + Math.random() * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

**Circuit breaker**: If the LLM API has persistent issues, fail fast with a fallback (cached response, simpler response, or graceful degradation) rather than queuing thousands of retries.

**Fallback models**: Primary: claude-sonnet-4-6; Fallback: gpt-4o-mini. If primary is down, route to fallback automatically.

---

## Q6 (DevOps): Design a CI/CD pipeline for a microservices application.

**Model Answer:**
```yaml
# GitHub Actions example
on: push to any branch

jobs:
  validate:
    steps:
      - lint (ESLint, TypeScript check)
      - unit tests
      - security scan (npm audit, Snyk)
    # Run in parallel: lint || tests

  build:
    needs: validate
    steps:
      - docker build --target production
      - tag with git SHA: myapp:abc1234
      - push to ECR (AWS container registry)

  integration-test:
    needs: build
    steps:
      - docker-compose up (app + real DB + Redis)
      - run integration test suite
      - docker-compose down

  deploy-staging:
    needs: integration-test
    if: branch == 'main'
    steps:
      - kubectl set image deployment/app app=myapp:abc1234
      - kubectl rollout status deployment/app (wait for health)
      - smoke tests (hit /health, /api/users)

  deploy-production:
    needs: deploy-staging
    environment: production  # requires manual approval
    steps:
      - same as staging deploy
      - post-deploy synthetic monitoring for 5 min
      - alert if error rate spikes
```

**Key principles**: Build once, promote the same image (abc1234) through all environments — guarantees what's tested is what's deployed. Never rebuild for production.

---

## Q7 (DevOps): How do you optimize a multi-stage Docker build?

**Model Answer:**
```dockerfile
# Stage 1: Build (full dependencies + build tools)
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                          # install ALL deps (including devDeps)
COPY . .
RUN npm run build                   # TypeScript compile, webpack, etc.

# Stage 2: Production (minimal runtime)
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev               # production deps only
COPY --from=builder /app/dist ./dist
USER node                           # run as non-root
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Result**: Development image ~1.5GB → production image ~150MB.

**Layer caching**: `package.json` and `npm ci` are separate layers BEFORE `COPY . .`. If source code changes but `package.json` doesn't, the `npm ci` layer is cached — much faster builds.

**Alpine image**: `node:20-alpine` vs `node:20` — 5-10x smaller base image. Occasionally breaks native modules that need glibc — then use `node:20-slim` (Debian slim, smaller but not Alpine).

---

## Q8 (DevOps): Design a rollback strategy for a bad production deployment.

**Model Answer:**
Multiple rollback mechanisms depending on how much went wrong:

**1. Feature flag (fastest, 0 downtime)**: If the bad behavior is behind a flag, simply turn it off. No deployment needed. This is why you always ship new features behind flags.

**2. Kubernetes rolling deployment rollback** (2-5 min):
```bash
kubectl rollout undo deployment/api-service
# or to a specific revision:
kubectl rollout undo deployment/api-service --to-revision=3
```
Kubernetes keeps previous ReplicaSet configurations. Rolling undo gradually replaces new pods with old ones. Zero downtime.

**3. Blue/Green switch** (seconds): Traffic switches from green (bad) back to blue (stable). Instant. Requires maintaining two full environments.

**4. Database rollback** (hardest): If the bad deployment included a DB migration, you need:
- Never do destructive migrations (DROP COLUMN) in the same deploy as code changes. Deploy code that handles both old+new schema first, then migrate, then clean up.
- Backward-compatible migrations: ADD COLUMN (safe), DROP COLUMN (deploy removal code first, then migrate)
- Emergency: restore from the pre-migration snapshot (data loss from the window between snapshot and bad deploy — acceptable for true disasters)

**Post-rollback**: Immediately open a postmortem. What detection lag? What prevented catching this in staging? Fix the process before re-deploying.

---

## Q9 (AWS): Design a highly available Node.js API on AWS.

**Model Answer:**
```
Route 53 (DNS + health checks)
    ↓
CloudFront (CDN, SSL termination, DDoS mitigation via Shield)
    ↓
ALB (Application Load Balancer — L7, sticky sessions optional)
    ↓
ECS Fargate (containerized Node.js, auto-scaling group)
    - Multiple AZs (us-east-1a, 1b, 1c)
    - Target tracking scaling: scale up when CPU > 70%
    ↓
ElastiCache (Redis cluster, multi-AZ, in-memory caching + sessions)
    ↓
RDS PostgreSQL (Multi-AZ: synchronous replication, auto-failover < 60s)
    - Read replica(s) for read-heavy workloads
```

**HA guarantees**:
- ALB health checks: remove unhealthy instances within 10 seconds
- Multi-AZ: if one availability zone goes down, traffic routes to other AZs automatically
- RDS Multi-AZ: primary fails → automatic failover to standby in < 60s
- Fargate: AWS manages the underlying EC2 — if a host fails, tasks restart on a different host

**Monitoring**: CloudWatch metrics → SNS alerts → PagerDuty. Target: p99 < 500ms, error rate < 0.1%.

---

## Q10 (AWS): How do you optimize costs for a Node.js Lambda function?

**Model Answer:**
**Memory allocation**: Lambda performance scales with memory. Increasing memory from 128MB to 1024MB also increases CPU proportionally. Profile to find the memory sweet spot where execution time reduction offsets the memory cost increase. Use AWS Lambda Power Tuning tool (open source).

**Cold starts**:
- Node.js has fast cold starts (~200-500ms) vs Java (~2-5s)
- **Provisioned concurrency**: pre-warm N Lambda instances — eliminates cold starts, costs more
- For APIs: keep functions warm with a scheduled ping every 5 min (crude but free)
- Move heavy initialization outside the handler: DB connections, SDK initialization — runs once per container, cached for subsequent invocations

**Cost**: Lambda is priced per GB-second of compute. Optimize: reduce execution time (faster code), right-size memory, avoid long polling loops.

**When Lambda is NOT cost-effective**: Consistently high traffic (24/7 1000+ req/sec) → ECS/EKS is cheaper. Lambda pricing becomes expensive vs reserved EC2 at high sustained load. Lambda shines for variable/spiky traffic and event-driven workloads.

---

## Q11 (RAG Follow-up): How would you add re-ranking to the RAG system from the live coding?

**Model Answer:**
The initial vector similarity search returns the top-K chunks by cosine similarity — but cosine similarity measures embedding space proximity, not true semantic relevance to the query. Re-ranking uses a more accurate (but slower) model to re-order the retrieved chunks.

**Implementation**:
1. Retrieve top-20 from vector store (cast wide net)
2. For each of the 20 results, score relevance using a cross-encoder: `score(query, chunk)` — a model that reads BOTH query and chunk together (not independently embedded)
3. Sort by cross-encoder score, take top-3
4. Pass top-3 to LLM for generation

**Code addition**:
```js
async function rerank(query, chunks) {
  // In production: use Cohere Rerank API or a local cross-encoder model
  // const scores = await cohere.rerank({ query, documents: chunks.map(c => c.text), top_n: 3 });

  // Mock: use simple keyword overlap as proxy for cross-encoder
  const queryWords = new Set(query.toLowerCase().split(/\s+/));
  return chunks
    .map(chunk => ({
      ...chunk,
      rerankScore: [...chunk.text.toLowerCase().split(/\s+/)].filter(w => queryWords.has(w)).length / queryWords.size,
    }))
    .sort((a, b) => b.rerankScore - a.rerankScore)
    .slice(0, 3);
}
```

**Effect**: In practice, re-ranking improves RAG quality measurably (RAGAS scores improve 10-20%), especially for queries where the initial embedding search retrieves tangentially related chunks.

---

## Q12 (Live Coding Follow-up): Add streaming to the RAG endpoint.

**Model Answer:**
Change the Express endpoint to use SSE (Server-Sent Events) for streaming:

```js
app.post('/api/query-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const { question } = req.body;
  
  // Step 1: Retrieval (fast, not streamed)
  const embedding = await embed(question);
  const chunks = vectorStore.search(embedding, 3);
  const context = chunks.map(c => c.text).join('\n\n');
  
  // Step 2: Stream the LLM generation
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    messages: [{
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer using only the context:`
    }],
    max_tokens: 500,
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta') {
      res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
    }
  }
  
  res.write('data: [DONE]\n\n');
  res.end();
});
```

**Why SSE over WebSocket for this**: SSE is request-response (client sends question, server streams answer). No bidirectional communication needed. SSE is simpler, HTTP/2 native, and works with standard HTTP infrastructure.

---

## Q13 (Live Coding Follow-up): Add semantic caching to the RAG system.

**Model Answer:**
Semantic caching: if a new query is similar to a previous query (cosine similarity > threshold), return the cached response without calling the LLM.

```js
class SemanticCache {
  constructor(threshold = 0.92) {
    this.cache = []; // [{ queryEmbedding, response }]
    this.threshold = threshold;
  }

  async lookup(queryEmbedding) {
    for (const entry of this.cache) {
      const sim = cosineSimilarity(queryEmbedding, entry.queryEmbedding);
      if (sim >= this.threshold) {
        return entry.response; // cache hit
      }
    }
    return null; // cache miss
  }

  set(queryEmbedding, response) {
    this.cache.push({ queryEmbedding, response });
    // LRU eviction: keep last 1000 entries
    if (this.cache.length > 1000) this.cache.shift();
  }
}
```

**TTL consideration**: Cached responses can become stale if the knowledge base is updated. Add a `cachedAt` timestamp and a TTL (e.g., 1 hour) — after TTL expires, bypass cache and re-generate.

**Cache hit rate in production**: For customer support bots, semantic cache hit rates of 30-50% are common — users frequently ask variations of the same questions.

---

## Q14 (Behavioral): Describe an AI project you led.

**Model Answer (STAR):**
**Situation**: Our customer success team was spending 30% of their time searching through documentation to answer customer queries. Response time averaged 4 hours.

**Task**: Build an AI-powered knowledge assistant that could answer common questions instantly, escalating complex ones to the CS team.

**Action**:
1. Collected 500 historical Q&A pairs from the CS team for evaluation baseline
2. Built RAG pipeline: chunked 2000 documentation pages, embedded with `text-embedding-3-small`, stored in Pinecone
3. Initial results: 62% answer quality (RAGAS faithfulness). Problem: chunks were too large (1000 tokens) and lost context.
4. Reduced chunk size to 400 tokens with 80-token overlap + added document title to each chunk prompt — quality jumped to 81%
5. Added re-ranking with Cohere — quality reached 87%
6. Built escalation logic: if answer confidence < 0.7 or question contains certain intent categories, route to CS team with the RAG context pre-loaded for them
7. Integrated Slack interface for CS team — they could see RAG reasoning to verify or correct answers

**Result**: Answer quality 87% (validated by CS team sampling). Time for CS team dropped from 30% to 12% of time on documentation lookup. Average response time: 15 seconds for AI-answered queries. CS team satisfaction improved — they were handling harder, more interesting questions.

**Reliability issue I handled**: After 2 weeks in production, we discovered the LLM was occasionally answering questions using outdated product pricing. Root cause: pricing page wasn't being updated in our vector store after each pricing change. Solution: webhook from CMS updates triggering re-ingestion of changed pages.

---

## Q15 (Behavioral): How did you handle LLM reliability issues in production?

**Model Answer (STAR):**
**Situation**: Our LLM-powered code review assistant (internal tool) started giving inconsistent recommendations. The same code would get "approve" one day and "needs changes" the next.

**Task**: Diagnose why the same input was producing different outputs and establish reliability.

**Action**:
1. Added request/response logging with input hashes. Discovered: the system prompt was being modified by a feature flag without version tracking — different users were getting different system prompts.
2. Fixed: system prompt versioning — each prompt version has a hash, logged with every request.
3. Found a second issue: temperature was set to 0.8 (creative), causing non-determinism. For code review, we wanted deterministic behavior. Changed to temperature 0.1.
4. Implemented golden-set regression testing: 50 code snippets with expected recommendation. Run nightly. Alert if pass rate drops below 90%.
5. Added a consistency check: for high-stakes reviews, call the LLM twice with the same prompt. If responses disagree significantly, escalate to human review.

**Result**: Consistency improved from ~70% to ~95% for same-input scenarios. Regression suite caught two model updates that changed behavior before they reached production. The temperature change alone eliminated most of the non-determinism.

**Lesson**: Temperature is a frequently overlooked reliability lever. For factual/deterministic tasks (code review, extraction, classification), low temperature (0-0.3) dramatically improves consistency. Save high temperature (0.7+) for creative generation.

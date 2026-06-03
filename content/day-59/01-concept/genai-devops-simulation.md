# Day 59 — GenAI + DevOps Mock Interview Guide

## GenAI Engineering Questions That Differentiate Senior Candidates

### 1. RAG Evaluation — How do you measure if your RAG pipeline is good?

Most candidates describe building a RAG pipeline. Senior candidates know how to measure if it's working.

**Metrics**:
- **Context Recall**: Does the retrieved context contain the answer? (Measures retrieval quality)
- **Answer Faithfulness**: Does the generated answer stick to the retrieved context, or does it hallucinate? (Measures generation quality)
- **Answer Relevance**: Is the answer actually addressing the question asked?
- **Context Precision**: Are the retrieved chunks relevant, or are you including irrelevant noise?

**RAGAS framework** (standard evaluation library): Automated evaluation using an LLM judge. Requires: question, answer, retrieved contexts, ground truth answer. Returns scores 0-1 for each metric.

**Human evaluation baseline**: For initial calibration, manually label 100 question-answer pairs, then compare automated metrics against human scores.

**Regression testing**: Every RAG pipeline change runs against a fixed evaluation set. If faithfulness drops below threshold, the PR is blocked.

### 2. Cost Optimization for LLM Applications

At scale, LLM API costs can dominate your infrastructure bill. Senior candidates know how to control this.

**Techniques**:
- **Prompt caching**: Anthropic and OpenAI offer caching for repeated prompt prefixes. If your system prompt is the same for all requests, cache it — pay for it once per session, not per token.
- **Smaller models for simple tasks**: Use `haiku`/`gpt-4o-mini` for classification, routing, simple Q&A. Use larger models only for complex reasoning. Route based on task complexity.
- **Batch API**: For non-real-time tasks (document processing, embeddings generation), use batch API — 50% cheaper, processes async.
- **Semantic caching**: Cache LLM responses by embedding similarity. If two questions are semantically identical (cosine similarity > 0.95), return the cached response without calling the LLM.
- **Output token optimization**: Instruct the model to be concise. Output tokens cost more than input tokens (2-4x per token ratio).
- **RAG reduces context**: Instead of sending a 100K token document in every request, retrieve 3-5 relevant chunks (~2K tokens). 95% cost reduction.

**Monitoring**: Track tokens/request, cost/request, cost/user, cost by model. Set budget alerts.

### 3. Agent Design — What makes a production-grade LLM agent?

An "agent" is an LLM that can call tools (functions), observe results, and decide what to do next.

**Core components**:
- **Tool definitions**: JSON Schema describing what each tool does, its parameters, and return type. Clear descriptions are crucial — the model decides which tool to use based on the description.
- **Max iterations limit**: An agent can loop indefinitely if not constrained. Always set `max_steps: 10` or similar.
- **Tool call validation**: Validate tool inputs BEFORE executing. The LLM sometimes hallucinated tool parameters — catch this before it causes damage.
- **Retry with feedback**: If a tool fails, send the error back to the LLM and ask it to try a different approach (not just blindly retry).
- **Checkpointing**: For long-running agents, persist state between steps. If the process crashes at step 7/10, resume from step 7.

**Production concerns**:
- **Cost runaway**: A buggy agent can make 1000 tool calls and accumulate enormous costs. Set hard budget limits.
- **Security**: Agents shouldn't have more permissions than needed. Principle of least privilege for tool access.
- **Observability**: Log every LLM call, every tool call, every response. You need traces to debug agent behavior.
- **Human-in-the-loop**: For high-stakes actions (sending emails, making purchases), require human approval.

### 4. Streaming LLM Responses

**Why stream?**: LLM generation takes 1-30 seconds. Without streaming, the user sees nothing until the response is complete. With streaming, they see text appear token by token — much better UX (perceived performance).

**Implementation**:
- **OpenAI/Anthropic**: `.stream()` or `stream: true` option — returns an AsyncIterable of deltas
- **Server-Sent Events (SSE)**: Stream from your backend to the frontend using SSE (`text/event-stream` content type)
- **React**: State management during streaming — append tokens to a string state, render progressively

**Tricky parts**:
- **Error mid-stream**: Handle partial responses — you may have received 50 tokens before an error. Show what was received + an error indicator.
- **Tool calls mid-stream**: If the model calls a tool, streaming pauses. Execute the tool, send result back, streaming resumes.
- **Cancellation**: User can close the connection. Use `AbortController` to cancel the in-flight request, freeing compute.

### 5. Model Selection for Production

Deciding which model to use based on the task:

**Cost-performance tiers** (approximate as of 2025):
- **Tier 1 (cheapest)**: Claude Haiku 3.5, GPT-4o-mini — simple extraction, classification, routing
- **Tier 2 (balanced)**: Claude Sonnet 4+, GPT-4o — standard chat, RAG, code generation
- **Tier 3 (most capable)**: Claude Opus 4, o3 — complex reasoning, long-context analysis, adversarial evaluation

**Model selection framework**:
1. Start with Tier 2 for everything
2. Identify tasks that don't need Tier 2 capability → move to Tier 1 (10-100x cost reduction)
3. Identify tasks where Tier 2 quality is insufficient → move to Tier 3 for those only

---

## DevOps/Infrastructure Questions for Full-Stack Devs

### CI/CD Pipeline Design for Microservices
A complete pipeline: Code push → Lint + Type check → Unit tests → Build Docker image → Integration tests (docker-compose) → Push to ECR → Deploy to staging (Kubernetes) → Smoke tests → Deploy to production (rolling deployment) → Synthetic monitoring.

**Key practices**:
- Parallel jobs where possible (unit tests + lint run simultaneously)
- Fail fast: cheapest checks first (lint before integration tests)
- Artifact promotion: build once, promote the same image through environments (don't rebuild for production)
- Rollback: `kubectl rollout undo` for immediate rollback

### Docker Optimization
Common interview question: "How do you make your Docker images smaller?"
- Multi-stage builds: build stage (node:18) installs all devDependencies + builds; production stage (node:18-slim) copies only build artifacts + production dependencies
- `.dockerignore`: exclude `node_modules`, `.git`, `tests/`, `*.md` — don't copy what you don't need
- Layer caching: copy `package.json` + `package-lock.json` BEFORE copying source code — if source changes but dependencies don't, the `npm install` layer is cached
- Use alpine base images: `node:18-alpine` instead of `node:18` — 5x smaller base
- Run as non-root user: `USER node` in Dockerfile — security best practice

### Rollback Strategy
- **Rolling deployment**: gradually replace old pods with new ones. Rollback: Kubernetes reverts to previous ReplicaSet
- **Blue/Green**: two identical environments. Switch traffic from blue (current) to green (new). Rollback: switch traffic back instantly
- **Canary**: route 5% of traffic to new version. Monitor. Gradually increase to 100%. Rollback: reduce canary to 0%.
- **Feature flags**: the safest rollback — flip a flag off, no deployment needed

---

## Answering "Design an AI System" Questions

**Framework**:
1. **Clarify**: What problem does the AI solve? What's the accuracy requirement? Latency requirement? Volume?
2. **Data flow**: Input → preprocessing → model inference → post-processing → output
3. **Model choice**: Rule-based for simple, ML model for patterns, LLM for language understanding
4. **Guardrails**: Input validation, output validation, content filtering, rate limiting
5. **Observability**: Log every inference, track accuracy metrics, monitor for drift
6. **Feedback loop**: How do you improve the model over time? User feedback, labeled corrections

Example: "Design an AI customer support system"
- Input: user message → intent classification (Haiku, fast, cheap) → if complex: RAG search over knowledge base → response generation (Sonnet) → human agent escalation threshold
- Guardrails: PII detection before logging, content filtering, response length limits
- Feedback: thumbs up/down on each response → periodic fine-tuning dataset curation

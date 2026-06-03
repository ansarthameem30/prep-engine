# Day 49 – GenAI Production Patterns: Evaluation, Observability, Cost Optimization & Safety | DSA: Mock Mixed Hard

> **Phase 5 – GenAI Engineering** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | LLM-as-judge evaluation, RAGAS, prompt regression testing, observability stack, cost optimization, safety filters |
| Hands-On | 00:40–01:10 | Build an evaluation harness with LLM-as-judge + Langfuse tracing + prompt regression test suite |
| DSA | 01:10–01:25 | Mixed Hard Mock — pick any unsolved Hard from Phase 5 |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Build an LLM-as-judge evaluation pipeline for RAG response quality
- [ ] Implement prompt regression testing with a golden dataset
- [ ] Integrate Langfuse for distributed tracing of LLM calls
- [ ] Design cost optimization: model routing, prompt compression, semantic caching
- [ ] Solve: One Hard problem from Phase 5 under timed conditions
- [ ] Review 5 interview questions

---

## Concept: GenAI Production Patterns

### What to Study
- **Evaluation frameworks:**
  - **LLM-as-judge:** Use a stronger model (GPT-4o) to evaluate outputs from a weaker model; prompt the judge with rubric (correctness, completeness, tone, citation accuracy); multi-dimensional scoring (1–5 per dimension); pairwise comparison (A vs B) vs pointwise scoring; bias considerations (position bias, length bias, self-serving bias)
  - **RAGAS metrics:** Faithfulness (claims grounded in context), Answer Relevance (answer addresses question), Context Precision (retrieved chunks relevant), Context Recall (necessary information retrieved); running RAGAS with async evaluator; interpreting scores and what to fix at each layer
  - **Human eval sampling:** 1–5% of production traffic reviewed by humans; annotation guidelines; inter-annotator agreement; using human labels to calibrate LLM-as-judge
- **Prompt regression testing:** Treat prompts as code with tests; golden dataset (input → expected output characteristics, not exact match); run test suite on every prompt change; CI integration (fail PR if score drops > 5%); version-tagged prompt snapshots in DB; A/B canary deployment for prompt changes
- **Observability:**
  - **LangSmith:** Automatic tracing via env vars, run comparison, dataset management, prompt playground
  - **Langfuse:** Open source alternative, self-hostable, scores API (attach human/LLM eval scores to traces), user session tracking, cost tracking per trace, generative analytics
  - **Custom logging:** Structured logs with `{traceId, userId, model, promptVersion, latencyMs, promptTokens, completionTokens, cost, scores}`; correlation IDs across services; OpenTelemetry spans for LLM calls (semantic conventions for gen_ai spans)
- **Cost optimization strategies:**
  - **Prompt caching:** Anthropic and OpenAI cache prefix tokens (save 50–90% on repeated system prompts); structure prompts with static content first
  - **Model routing:** Use a classifier to route simple queries to GPT-3.5 / Haiku and complex queries to GPT-4o; saves 10–50x on cost; routing classifier itself is cheap (embed + cosine to cluster centroids)
  - **Prompt compression:** LLMLingua (remove redundant tokens while preserving meaning), selective context (use LLM to identify irrelevant retrieved chunks before main call)
  - **Batching:** OpenAI Batch API (50% discount, 24h latency) for non-real-time workloads
  - **Response caching:** Semantic cache (Day 48); exact cache for repeated identical queries
- **Safety filters and moderation:**
  - OpenAI Moderation API (free, multi-category: hate/violence/sexual/self-harm)
  - Input moderation (before prompt), output moderation (before serving response)
  - Custom classifiers for domain-specific safety (financial advice detection, PII detection)
  - Content blocklist and allow-list patterns
  - Jailbreak detection patterns (instruction override attempts, role-play boundary bypasses)
- **Graceful degradation:** If LLM is down/slow: serve cached response, serve template response, queue for async processing, show "AI temporarily unavailable" with fallback to keyword search; circuit breaker pattern (open circuit after 5 failures in 30s, half-open probe after 60s)
- **Latency optimization:** Streaming (perceived latency), parallel LLM calls for independent subtasks, speculative decoding concepts, smaller models for latency-sensitive paths, geographic routing to nearest model endpoint, connection keep-alive and HTTP/2 for API calls

### Key Mental Models
- **Production GenAI requires the full observability loop:** Build → Evaluate → Observe → Optimize; without evaluation, you don't know if changes help; without observability, you can't diagnose production failures; without optimization, you can't scale economically
- **Cost optimization is model architecture:** Which model handles which query tier is a design decision as important as database schema — get it wrong and you're either overpaying or underserving users
- **Safety is a multi-layer system:** No single filter catches everything; input moderation + output moderation + rate limiting + human review sampling + anomaly detection work in concert

### Why This Matters in Interviews
The difference between a prototype GenAI feature and a production GenAI product is evaluation, observability, and cost management. Senior engineers are expected to design these systems, not just call the API. Interviewers ask "how do you know your RAG system is working?" — the answer requires knowing RAGAS, LLM-as-judge, and how to run regression tests on prompt changes.

---

## DSA Focus: Mixed Hard Review

- **Problem:** Your choice — revisit one unsolved Hard from Days 41–48 OR attempt LeetCode #123 (Stock III), #312 (Burst Balloons), or #1235 (Job Scheduling) under strict 20-minute timer
- **Difficulty:** Hard
- **Pattern:** DP variant (review your weakest pattern from Phase 5)
- **Time Target:** < 20 minutes
- **Key Insight:** Focus on the reframe: what's the right subproblem definition? State transitions follow from the reframe.

---

## Today's 5 Interview Questions
1. How do you evaluate whether a RAG system is producing faithful responses at scale — what's your evaluation pipeline?
2. Explain model routing for cost optimization — how do you build a classifier that routes simple vs complex queries to different models?
3. Your prompt changed and production quality dropped — how does your regression testing system catch this before it reaches all users?
4. Walk through your observability stack for a production LLM API — what do you log, what do you trace, and what alerts do you set up?
5. How do you implement graceful degradation when the OpenAI API is experiencing an outage?

---

## Files
- `01-concept/` → Notes on evaluation frameworks (RAGAS, LLM-as-judge rubrics), observability stack comparison, cost optimization decision tree
- `02-hands-on/` → eval-harness.js — LLM-as-judge evaluator, RAGAS score runner, Langfuse trace integration, prompt regression test suite
- `03-dsa/` → mixed-hard-review.js — whichever Hard problem you tackle with full solution and complexity analysis
- `04-interview-prep/` → genai-production-qa.md — 5 Q&As with architecture patterns and decision frameworks

---

## Success Criteria
- [ ] Can design a complete LLM evaluation pipeline (automated + human) for a RAG product
- [ ] Can explain model routing and cost optimization strategy with concrete numbers
- [ ] Solved a Hard DSA problem in < 20 min
- [ ] Confident on all 5 interview questions

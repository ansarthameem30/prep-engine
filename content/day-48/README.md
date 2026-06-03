# Day 48 – Building AI-Powered Node.js APIs: Streaming, Cost Tracking & Semantic Caching | DSA: Burst Balloons

> **Phase 5 – GenAI Engineering** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | SSE streaming in Node.js, token middleware, cost tracking, conversation management, model fallback chains, semantic caching |
| Hands-On | 00:40–01:10 | Build production-grade AI API: streaming + per-user rate limiting + cost tracking + Redis semantic cache |
| DSA | 01:10–01:25 | Burst Balloons (LeetCode #312) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Implement SSE streaming from Node.js with correct headers and flush behavior
- [ ] Build token counting middleware that tracks spend per user and request
- [ ] Implement conversation history management with smart truncation strategies
- [ ] Build a model fallback chain (GPT-4o → GPT-3.5-turbo) with error routing
- [ ] Implement semantic caching with Redis and cosine similarity
- [ ] Solve: Burst Balloons (#312)
- [ ] Review 5 interview questions

---

## Concept: Building AI-Powered Node.js APIs

### What to Study
- **Streaming SSE responses in Node.js:**
  - Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no` (for nginx)
  - `res.write('data: ' + JSON.stringify(chunk) + '\n\n')` for each delta token
  - `res.flush()` (requires `compression` middleware to call flush, or just avoid compression on SSE routes)
  - Sending `data: [DONE]\n\n` sentinel on completion
  - Error handling mid-stream (cannot change status code after headers sent — send error as a special event type)
  - Client-side: `EventSource` for GET, `fetch` + `ReadableStream` for POST streaming (more common)
  - Abort controller to cancel upstream OpenAI stream when client disconnects (`req.on('close', () => controller.abort())`)
- **Token counting middleware:** Pre-request: count tokens with tiktoken before sending (reject if over budget); post-request: parse `usage` object from response; per-user token quota with Redis counters (INCR + EXPIRE for sliding window); token-to-cost conversion table per model
- **Cost tracking per request:** Log `{userId, model, promptTokens, completionTokens, cost, timestamp}` to DB; aggregate dashboard queries; alert on cost anomalies; per-feature cost attribution with request metadata
- **Conversation history management:** Naive: append all messages until context overflow; smart truncation strategies:
  - **Sliding window:** Keep last N messages
  - **Summarization:** Summarize older messages into a single system message when approaching limit
  - **Importance scoring:** Embed messages, score by relevance to current query, keep top-k
  - Always preserve system prompt; always keep the last 2 user/assistant turns for coherence
- **Context injection patterns:** Pre-pending retrieved RAG context as a system message; injecting user profile/preferences; dynamic context sizing based on query complexity
- **Model fallback chains:** Try GPT-4o → on 429/500 → fall back to GPT-3.5-turbo; tag fallback responses in metadata; exponential backoff before fallback (distinguish rate limit from capability); logging fallback events for capacity planning; feature flags to force model selection
- **Caching AI responses:** Exact cache (SHA hash of prompt → response, Redis, cheap), semantic cache (embed query → cosine similarity against cached query vectors → if similarity > threshold, return cached response); cache TTL strategy (static knowledge = long TTL, dynamic queries = short or no TTL); cache invalidation on prompt version change
- **Per-user rate limiting for AI endpoints:** Redis-based sliding window (more accurate than fixed window); separate limits for free/pro tiers; token-based limiting (not just request count — 1 req × 10k tokens costs more than 10 reqs × 100 tokens); response headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`

### Key Mental Models
- **AI API calls are expensive I/O, not just slow I/O:** Unlike a database query, a GPT-4o call can cost $0.05–$0.50 — cost management is a first-class architectural concern, not an afterthought
- **Semantic caching is a probabilistic optimization:** Cache hits reduce latency by 10–100x and cost to near-zero for repeated semantically similar queries; the tradeoff is stale responses and similarity threshold tuning
- **Streaming is about perceived performance:** The actual time-to-complete is the same; streaming dramatically improves perceived UX because users see the first token in ~500ms instead of waiting 5–30s for the full response

### Why This Matters in Interviews
Production AI APIs at scale require sophisticated cost management, streaming for UX, and caching for economics. Interviewers for senior full-stack roles building AI products will ask you to architect these systems end-to-end. Knowing semantic caching is a differentiator — most candidates know Redis caching but not how to extend it to vector similarity for LLM responses.

---

## DSA Focus: Dynamic Programming – Interval DP (Hard)

- **Problem:** Burst Balloons (LeetCode #312)
- **Difficulty:** Hard
- **Pattern:** Interval DP — think about which balloon to burst LAST in a range
- **Time Target:** < 20 minutes
- **Key Insight:** Reframe: instead of "which to burst first," think "which to burst LAST in range [left, right]"; pad array with 1s at boundaries; `dp[left][right]` = max coins from bursting all balloons strictly between `left` and `right`; for each choice of last balloon `k`: `dp[l][r] = max(nums[l]*nums[k]*nums[r] + dp[l][k] + dp[k][r])`; iterate by interval length

---

## Today's 5 Interview Questions
1. Walk me through implementing streaming SSE in Express — what headers do you set, how do you handle client disconnect, and what breaks with nginx by default?
2. How would you implement semantic caching for an LLM endpoint? What similarity threshold do you use and how do you handle cache invalidation?
3. Design a token budget system that enforces per-user daily limits — how do you count tokens before AND after the API call?
4. Your AI endpoint's costs doubled overnight. Walk me through how you diagnose and fix it using the monitoring you've built.
5. Implement a model fallback chain — when should you fall back, what do you log, and how do you ensure the fallback doesn't degrade product quality silently?

---

## Files
- `01-concept/` → Notes on SSE implementation details, semantic cache architecture, cost tracking schema, conversation truncation strategies
- `02-hands-on/` → ai-api-production.js — Express app with streaming endpoint, token middleware, Redis semantic cache, model fallback, per-user rate limiting
- `03-dsa/` → burst-balloons.js — interval DP with full state trace and length-order iteration
- `04-interview-prep/` → production-ai-api-qa.md — 5 Q&As with architecture patterns

---

## Success Criteria
- [ ] Can implement a streaming SSE endpoint with abort handling from memory
- [ ] Can design a semantic caching layer with Redis and explain the similarity threshold decision
- [ ] Solved Burst Balloons with interval DP (recognized "last to burst" reframe) in < 20 min
- [ ] Confident on all 5 interview questions

# Day 42 – OpenAI API Mastery: Chat Completions, Streaming & Function Calling | DSA: Longest Increasing Subsequence

> **Phase 5 – GenAI Engineering** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Chat completions API, SSE streaming, function calling, JSON mode, embeddings API |
| Hands-On | 00:40–01:10 | Build a streaming chat endpoint with tool use and token cost tracking |
| DSA | 01:10–01:25 | Longest Increasing Subsequence (LeetCode #300) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Implement chat completions with proper message array structure
- [ ] Build streaming SSE response handler from scratch
- [ ] Implement function calling with parallel tool call support
- [ ] Integrate tiktoken for real-time token counting and cost estimation
- [ ] Solve: Longest Increasing Subsequence (#300)
- [ ] Review 5 interview questions

---

## Concept: OpenAI API Mastery

### What to Study
- **Chat Completions API:** `messages` array structure (system/user/assistant roles and their semantics), `model`, `max_tokens`, `temperature`; how the system role shapes behavior vs user role; multi-turn conversation management; `finish_reason` values (stop, length, tool_calls, content_filter)
- **Streaming with SSE:** `stream: true`, reading `data:` chunks, parsing `delta.content`, handling `[DONE]` sentinel, implementing `res.write()` / `res.flush()` in Node.js Express, client-side EventSource vs fetch with ReadableStream
- **Function calling / Tool use:** `tools` array schema (type, function, name, description, parameters as JSON Schema), `tool_choice` (auto, none, required, specific function), parsing `tool_calls` in response, sending tool result back as `tool` role message, parallel tool calls handling
- **JSON mode:** `response_format: { type: "json_object" }`, when to use vs structured output schema, pitfalls (still needs instruction in prompt), new `response_format` with JSON Schema (structured outputs)
- **Vision API:** Passing image URLs or base64 in `content` array, token costs for images, `detail: "low"` vs `"high"`, use cases
- **Embeddings API:** `text-embedding-3-small` (1536 dims, cheap) vs `text-embedding-3-large` (3072 dims), `dimensions` parameter for truncation, batching with arrays, cost per 1M tokens
- **tiktoken:** `encoding_for_model()`, `encode()` + `decode()`, counting tokens before sending, building a token budget middleware
- **Rate limits & retry:** Tier-based RPM/TPM limits, 429 status handling, exponential backoff with jitter (`retry-after` header), circuit breaker pattern for AI calls

### Key Mental Models
- **The messages array is the entire "memory":** The model has no state between calls — you are responsible for threading conversation history, and every token in that history costs money
- **Function calling is structured output with a routing layer:** The model doesn't "call" your function — it outputs a structured JSON blob that your code interprets and executes; you then feed results back in
- **Streaming is chunked inference:** Tokens arrive as they are generated; the model hasn't "decided" the full response before the first chunk arrives, so you cannot validate format until the stream closes

### Why This Matters in Interviews
Production GenAI features almost always require streaming (UX), tool use (autonomous behavior), and cost control (business viability). Interviewers building AI products want engineers who can implement these primitives correctly and handle edge cases — malformed tool calls, stream interruption, token budget overflows — without framework hand-holding.

---

## DSA Focus: Dynamic Programming – Classic LIS

- **Problem:** Longest Increasing Subsequence (LeetCode #300)
- **Difficulty:** Medium
- **Pattern:** DP with binary search optimization (patience sorting)
- **Time Target:** < 20 minutes
- **Key Insight:** O(n²) DP is straightforward — `dp[i] = max(dp[j]+1 for j<i if nums[j]<nums[i])`; O(n log n) uses a `tails` array where binary search finds the insertion point, maintaining the smallest possible tail for each subsequence length

---

## Today's 5 Interview Questions
1. Describe the complete lifecycle of a multi-turn conversation using the OpenAI Chat Completions API — what does the messages array look like after 3 turns?
2. Walk me through implementing streaming in a Node.js Express endpoint and on the client side — what are the key pitfalls?
3. What happens when a model returns `finish_reason: "tool_calls"`? Walk me through the full function calling flow including the follow-up request.
4. How would you build token counting middleware that prevents requests exceeding a budget before they reach the API?
5. Compare `text-embedding-3-small` and `text-embedding-3-large` — when would you choose each, and how does the `dimensions` parameter help?

---

## Files
- `01-concept/` → Notes on full API surface: completions, streaming, function calling, embeddings, tiktoken
- `02-hands-on/` → streaming-chat-api.js — Express endpoint with SSE streaming + tool use + token tracking
- `03-dsa/` → lis.js — O(n²) DP + O(n log n) patience sort solution with complexity analysis
- `04-interview-prep/` → openai-api-qa.md — 5 Q&As with code snippets

---

## Success Criteria
- [ ] Can implement a streaming chat endpoint with tool use from memory
- [ ] Can explain the full function calling message flow (5 steps)
- [ ] Solved LIS with both O(n²) and O(n log n) approaches
- [ ] Confident on all 5 interview questions

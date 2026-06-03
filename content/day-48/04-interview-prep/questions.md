# Day 48 — Building AI-Powered Node.js APIs: Interview Q&A

---

## Q1: Walk me through implementing Server-Sent Events (SSE) for streaming OpenAI responses in Express. What headers are required?

**A:** Three required headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`. Call `res.flushHeaders()` immediately after setting them so the client knows streaming has begun. Each SSE message must follow the format `data: {json}\n\n` — the double newline is the message delimiter. The implementation: enable streaming in the OpenAI call with `stream: true`, iterate the async generator with `for await (const chunk of stream)`, and write each `delta.content` to `res`. For the completion signal, write `data: {"done": true}\n\n`. Critical detail: always create an AbortController and pass its signal to the OpenAI client, then call `controller.abort()` inside `req.on("close", ...)`. Without abort handling, you continue paying OpenAI for tokens generated after the client has navigated away. At 10,000 disconnections per day with 200-token average orphaned responses, that's 2M tokens wasted daily.

---

## Q2: How do you implement per-user token budgets? Walk me through the Redis + database architecture.

**A:** Two-tier tracking: Redis for real-time enforcement, PostgreSQL for analytics. On each API request: (1) Check the Redis key `token_budget:{userId}:{today}` — if the value exceeds the daily limit, return 429 immediately before calling OpenAI; (2) On each successful OpenAI response, get the actual token count from `response.usage`, increment the Redis counter with `INCRBYFLOAT` (or `INCRBY` for integer counts), and async-write to a `usage_logs` table for billing analytics. The Redis key TTL should be 25 hours (not 24, to handle timezone edge cases) — no need for explicit reset logic. For plan-based limits: store the daily limit in the user record, load it once and cache in Redis for the session. The enforcement check is a Redis O(1) GET per request, so overhead is minimal. For granular control, implement token-based rate limiting (not just count-based): a user who sends one 50,000-token request should be treated the same as 100 requests of 500 tokens each.

---

## Q3: What is your conversation truncation strategy, and why does it matter?

**A:** The challenge: conversation history grows unboundedly but the context window is finite. My strategy: keep the system prompt + summarize the oldest N messages + keep the most recent M full messages. Specifically: load all messages for the session, walk backward from newest, adding messages until the token budget (max_context - reserved_for_response) is exhausted. Older messages fall off. Why "walk backward" matters: the most recent exchange is always most contextually relevant — you never want to drop a message the user just sent. The summarization approach: when history exceeds 20 messages, generate a brief summary of the oldest 10 and store it alongside the recent messages. This gives the model a compressed memory of earlier context without burning the full context budget. A common mistake is aggressive truncation without summarization — the model then loses important context established early in the conversation (e.g., "I'm working on a React app" established in message 1 gets dropped, and later answers miss the context).

---

## Q4: How does model routing work, and what cost savings can you expect?

**A:** Model routing automatically selects the cheapest model that's likely sufficient for the task. Classification factors: message length (longer messages usually imply more complex tasks), presence of system design keywords ("architect", "scale", "distributed"), presence of code, conversation depth, and explicit complexity signals. A rule-based classifier routes to GPT-4o for scores ≥ 2 and GPT-4o-mini for lower scores. Cost impact: GPT-4o is ~$5/1M input + $15/1M output; GPT-4o-mini is $0.15/1M input + $0.60/1M output — roughly 15-28x cheaper. If routing correctly classifies 70% of queries as "simple" (routing to mini), total cost drops by 70% × (1 - 1/20) ≈ 65%. In practice I measure 40-60% cost reduction from routing in production chat applications. Monitoring is critical: track response quality per model (LLM-as-judge) and bump queries to GPT-4o if mini's quality drops below threshold. Avoid training the classifier on vague signals — test each routing rule with 20 examples before deploying.

---

## Q5: Describe your semantic caching implementation. What threshold do you use and why?

**A:** Semantic cache: embed incoming query → vector similarity search against cached queries → return cached response if similarity ≥ threshold. The threshold choice is critical and requires empirical tuning on your specific query distribution. A threshold of 0.97 means "essentially identical queries" — very high precision, low recall. A threshold of 0.90 risks returning wrong cached answers for related but different queries ("What is React?" vs "What is React Native?" might score 0.91). My production default is 0.95, which catches paraphrases ("explain closures" vs "what are closures in JS") while avoiding false positives. Monitoring: log the similarity score for every cache lookup. If you see many scores in the 0.91-0.94 range, review those manually — they indicate borderline cases where you need to tune the threshold or the cache key. Cache invalidation: when the underlying knowledge base changes (new docs, policy updates), flush all semantic cache entries or reduce TTL. Store cache entries with document version tags to enable targeted invalidation.

---

## Q6: How do you handle OpenAI API errors in production? What's your retry strategy?

**A:** Categorize by retryability: (1) **Retry with backoff** — 429 (rate limit), 500 (server error), 503 (service unavailable); (2) **Don't retry** — 400 (bad request, malformed input), 401 (invalid API key), 403 (forbidden), 400 with "context_length_exceeded" (fix the truncation, then retry); (3) **Special handling** — context length exceeded: truncate messages and retry once; content policy violation: return user-friendly error, log for review. Retry logic: exponential backoff with jitter — `delay = min(baseDelay * 2^attempt, 60000) + random(0, 1000)ms`. The jitter prevents thundering herd when many requests fail simultaneously. Max 3 retries for 429/500/503. Fallback chain: if primary model (GPT-4o) fails after retries, try GPT-4o-mini, then return a static graceful degradation message. Log every error with: user ID, request ID, model, error type, token count, and whether it was retried — this data is essential for debugging production issues.

---

## Q7: How would you implement a per-user AI token rate limiter using Redis?

**A:** Two approaches: request-based (simpler) and token-based (more accurate). For token-based: (1) Before each request, check `GET rate_limit:{userId}:tokens:{minute_bucket}` in Redis; if the value exceeds the per-minute token limit, reject with 429; (2) After each response, `INCRBY rate_limit:{userId}:tokens:{minute_bucket} {actual_tokens_used}` with a 2-minute TTL (so keys auto-expire). The minute bucket is `Math.floor(Date.now() / 60000)`. For daily limits, use a separate `rate_limit:{userId}:tokens:{date}` key with 25-hour TTL. The difference from request-based limiting: a user who sends one 100K-token request should be rate-limited the same as 100 users sending 1K-token requests each. Most web API rate limiters count requests, not tokens — for AI endpoints, token-based limiting is much more fair and accurate. Expose the limits in response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` — this lets clients self-throttle and improves developer experience.

---

## Q8: What is a fallback chain for AI models, and how do you implement graceful degradation?

**A:** A fallback chain defines what to try if the primary model fails: GPT-4o → GPT-4o-mini → pre-generated static response. Implementation: wrap each model call in try/catch, only catch retryable errors (429, 500, 503), and propagate non-retryable errors (400, 401) immediately. For 429 on the primary model, try the fallback model immediately (different rate limit quota) rather than waiting for backoff. Log which fallback level was used for every request — if you're frequently hitting fallback level 2 (static response), that indicates a systemic problem with your OpenAI integration. Static fallback responses should be pre-approved by product for each endpoint: a chatbot should return "I'm experiencing technical difficulties, please try again in a few minutes" rather than throwing a 500 error to the user. For RAG systems, you can partially degrade: if retrieval fails, fall back to the model's general knowledge with a caveat ("I couldn't access the latest documents, but based on my training..."). This is better than a hard failure and often provides useful answers.

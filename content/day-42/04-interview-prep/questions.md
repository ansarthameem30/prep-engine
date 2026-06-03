# Day 42 — OpenAI API Mastery: Interview Q&A

---

## Q1: Walk me through the complete function calling cycle in the OpenAI API. What happens on each step?

**A:** The cycle has five steps. Step 1: send the initial request with a `tools` array defining available functions plus `tool_choice: "auto"`. Step 2: the model responds with `finish_reason: "tool_calls"` and a `tool_calls` array containing the function name and JSON arguments it wants to invoke — it does not execute anything, only decides what to call. Step 3: your code parses each `tool_calls[i].function.arguments` (always a JSON string), executes the actual function, and collects results. For multiple tool calls, I execute them with `Promise.all()` for parallel execution. Step 4: append the assistant's message (which contains the tool_calls) to the messages array, then append each result as a `{role: "tool", tool_call_id: ..., content: JSON.stringify(result)}` message. Step 5: make another completion request with this extended messages array — the model now generates the final answer using the tool results. In agentic scenarios this loop repeats until `finish_reason === "stop"`.

---

## Q2: What is the difference between JSON mode and Structured Outputs in the OpenAI API?

**A:** JSON mode (`response_format: { type: "json_object" }`) guarantees that the output is syntactically valid JSON, but you have no control over the schema — the model decides the keys and structure. You still need to describe the schema in your prompt and write defensive parsing code. Structured Outputs (`response_format: { type: "json_schema", json_schema: { schema: {...}, strict: true } }`) are strictly schema-validated: the response will exactly match your JSON Schema with no extra fields, no missing required fields, guaranteed. This eliminates defensive parsing entirely. I use structured outputs for any production extraction or transformation task. The tradeoff is that the schema must be statically defined and there are some schema features not supported (anyOf with multiple types, etc.). For strict: true, every object in the schema must have `additionalProperties: false` and all properties listed in `required`.

---

## Q3: How do you handle OpenAI rate limits in production? What is exponential backoff with jitter and why does jitter matter?

**A:** When hitting a 429, I retry with exponential backoff: `delay = min(baseDelay * 2^attempt, maxDelay)`. The delay doubles each attempt — 1s, 2s, 4s, 8s — capping at something like 60 seconds. Jitter adds randomness: `delay = delay + random(0, 1) * 1000`. Without jitter, if 100 concurrent requests all get 429'd simultaneously, they all retry at the exact same time after `2^1` seconds — creating a "thundering herd" that causes another wave of 429s. Jitter spreads those retries across a time window, smoothing the load on both your service and OpenAI's. For token-limited (TPM) rate limits, I also track token usage per minute and implement proactive throttling before hitting the limit. In high-throughput scenarios I use a token bucket or leaky bucket rate limiter on the client side to avoid 429s entirely.

---

## Q4: How would you design conversation history management for a production chatbot serving 10,000 concurrent users?

**A:** Each conversation gets a session ID. Messages are stored in a database (Postgres with a jsonb column or a dedicated messages table with session_id foreign key). On each new user message: (1) load the conversation history for that session; (2) apply a truncation strategy to fit within the model's context window minus reserved space for the response; my preferred strategy is "keep system prompt + summarize older messages + keep last N full messages" — the summary acts as a compressed memory; (3) send the constructed messages array to OpenAI; (4) save both user and assistant messages to DB. For token management, I estimate tokens before sending using tiktoken and refuse/truncate if over budget. For 10K concurrent users, the DB becomes a bottleneck — I cache recent conversation state in Redis (TTL = 30 minutes of inactivity) and only fall back to Postgres on cache miss.

---

## Q5: Explain streaming SSE implementation from Node.js. How do you handle a client disconnecting mid-stream?

**A:** In Express I set headers `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, then write each chunk as `res.write("data: " + JSON.stringify(chunk) + "\n\n")`. To handle client disconnect, I listen to `req.on("close", ...)` and create an `AbortController`. When "close" fires, I call `controller.abort()`. I pass the controller's signal to the OpenAI client call: `client.chat.completions.create({ ..., signal: controller.signal })`. This cancels the underlying HTTP request to OpenAI immediately — important because OpenAI charges for tokens generated even if the client doesn't receive them. Without abort handling, you'd continue paying for generation after the user navigates away. I also track these cancellations in metrics — high cancellation rate is a signal that responses are too slow.

---

## Q6: What are the practical differences between text-embedding-3-small and text-embedding-3-large?

**A:** `text-embedding-3-small` produces 1536-dimensional vectors and costs $0.02/1M tokens. `text-embedding-3-large` produces 3072-dimensional vectors and costs $0.13/1M tokens — 6.5x more expensive. In practice, text-embedding-3-small is sufficient for most RAG applications and delivers strong performance on standard benchmarks. I use 3-large when I need maximum retrieval accuracy — for example, in a high-stakes medical or legal search system where a missed relevant chunk has serious consequences. A practical consideration: higher-dimensional vectors also mean larger storage in pgvector (1536 floats × 4 bytes = 6KB per vector vs 3072 × 4 = 12KB), slower index builds, and slower query time at large scale. The 3-series models also support `dimensions` parameter — you can request truncated embeddings (e.g., 512 dims from 3-large) for a speed/storage tradeoff.

---

## Q7: How would you implement semantic caching for an OpenAI-powered API?

**A:** Semantic caching checks if a "similar" query was asked before and returns the cached answer. Implementation: (1) embed the incoming query using `text-embedding-3-small`; (2) query a vector database (Redis with vector search, pgvector, or Pinecone) for the nearest cached query embedding; (3) if the cosine similarity is above threshold (typically 0.95-0.97), return the cached response without calling OpenAI; (4) on cache miss, call OpenAI, store the (query embedding, response) pair in the cache with a TTL. The threshold choice matters — 0.97 means "nearly identical queries", 0.90 might return wrong answers for different-but-related queries. I expose a cache bypass header for testing. For cache invalidation, if the underlying knowledge base changes (new docs in RAG), I flush the semantic cache or reduce TTL. GPTCache is a library that implements this, but the custom implementation gives more control over the threshold and eviction strategy.

---

## Q8: What is the Vision API, and what are the token cost implications of using high-detail mode?

**A:** The Vision API accepts images in the `content` array of a user message — either as a URL or a base64-encoded string. The `detail` parameter is `"low"` or `"high"`. Low detail: the image is resized to 512×512 and costs a flat 85 tokens regardless of original size. High detail: the image is first scaled to fit within 2048×2048, then divided into 512×512 tiles, each costing 170 tokens, plus the base 85 tokens. A 1024×1024 image in high detail = 4 tiles × 170 + 85 = 765 tokens ≈ $0.004 at GPT-4o pricing. A 4K screenshot (3840×2160) would scale to ~2048×1152, tiling to 12 tiles = 12 × 170 + 85 = 2125 tokens. This adds up fast in image-heavy workflows. I use low detail for classification tasks ("does this image contain a chart?") and high detail for extraction tasks ("extract all numbers from this chart"). Always resize and compress images before sending — a 300KB JPEG is cheaper than a 5MB PNG for the same semantic content.

# Day 42 — OpenAI API Mastery

## Chat Completions API Deep Dive

The `/v1/chat/completions` endpoint is the workhorse of every GPT-based application. Understanding its full surface area is prerequisite to building production-grade AI features.

### Messages Array Structure

Every chat completion requires a `messages` array. Three roles: `system`, `user`, `assistant`.

```js
const messages = [
  { role: "system",    content: "You are a helpful code reviewer." },
  { role: "user",      content: "Review this function for bugs." },
  { role: "assistant", content: "I see two issues: ..." },
  { role: "user",      content: "How would you fix the second issue?" },
];
```

**System prompt best practices:**
- Define the persona clearly: "You are a senior TypeScript engineer at a fintech company."
- Specify output format: "Always respond in JSON with keys: {issue, severity, fix}."
- Set constraints: "Never suggest using eval(). If asked, explain why it's dangerous."
- Inject context: "The user's account type is {accountType}. Tailor advice accordingly."
- Keep it focused — a 2000-token system prompt competes with your actual content.

---

## Streaming with Server-Sent Events (SSE)

When `stream: true`, the API returns chunks incrementally instead of waiting for the full response.

```js
const stream = await client.chat.completions.create({
  model: "gpt-4o",
  messages,
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
  if (chunk.choices[0]?.finish_reason === "stop") break;
}
```

**Why streaming matters:** Perceived latency drops from ~3s (full response) to ~0.2s (first token). Users see text appearing immediately. Crucial for chat UIs and long responses.

**Handle `[DONE]`:** The SDK handles this automatically, but in raw HTTP you check for `data: [DONE]` in the SSE stream before closing.

---

## Function Calling / Tool Use

Function calling lets the model request execution of your code. The model decides which function to call and with what arguments; your code executes it and returns the result.

### Complete Tool Use Cycle

```js
const tools = [{
  type: "function",
  function: {
    name: "get_stock_price",
    description: "Get the current stock price for a ticker symbol. Use for real-time prices only.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Stock ticker like AAPL or MSFT" }
      },
      required: ["ticker"]
    }
  }
}];

// Step 1: Send initial request with tools
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages,
  tools,
  tool_choice: "auto"  // or "required" to force tool use
});

// Step 2: Check if model wants to call a tool
if (response.choices[0].finish_reason === "tool_calls") {
  const toolCalls = response.choices[0].message.tool_calls;
  
  // Step 3: Execute each tool call (potentially in parallel)
  const toolResults = await Promise.all(toolCalls.map(async (tc) => {
    const args = JSON.parse(tc.function.arguments);
    const result = await executeFunction(tc.function.name, args);
    return { toolCallId: tc.id, result };
  }));
  
  // Step 4: Append assistant message + tool results, continue conversation
  messages.push(response.choices[0].message);
  toolResults.forEach(({ toolCallId, result }) => {
    messages.push({
      role: "tool",
      tool_call_id: toolCallId,
      content: JSON.stringify(result)
    });
  });
  
  // Step 5: Final response generation
  const finalResponse = await client.chat.completions.create({ model: "gpt-4o", messages });
}
```

**`tool_choice` options:**
- `"auto"`: model decides whether to use tools (default)
- `"required"`: model must call at least one tool
- `{"type": "function", "function": {"name": "specific_tool"}}`: force specific tool

**Parallel tool calls:** When the model returns multiple `tool_calls`, execute them concurrently with `Promise.all()` — don't serialize unnecessarily.

---

## JSON Mode and Structured Outputs

### JSON Mode (Older)
```js
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Extract name and age from: John Doe, 28 years old. Respond in JSON." }],
  response_format: { type: "json_object" }
});
// Guaranteed valid JSON, but schema not enforced — model decides structure
JSON.parse(response.choices[0].message.content);
```

### Structured Outputs (Newer, Preferred)
```js
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages,
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "person_extraction",
      strict: true,
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" }
        },
        required: ["name", "age"],
        additionalProperties: false
      }
    }
  }
});
```

Structured outputs with `strict: true` guarantee the response matches the schema exactly — no extra fields, no missing fields. This eliminates defensive JSON parsing entirely.

---

## Vision API

```js
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Describe the bug in this screenshot." },
      {
        type: "image_url",
        image_url: {
          url: "data:image/jpeg;base64,{base64EncodedImage}",
          detail: "high"  // "low" for quick analysis, "high" for detailed
        }
      }
    ]
  }]
});
```

`detail: "high"` tiles the image into 512px squares, each costing 170 tokens. A 1024x1024 image at high detail costs ~765 tokens in image processing.

---

## Embeddings API

```js
const response = await client.embeddings.create({
  model: "text-embedding-3-small",  // 1536 dims, cheaper
  // model: "text-embedding-3-large", // 3072 dims, more accurate
  input: ["First text to embed", "Second text to embed"],  // Batch up to 2048
  encoding_format: "float"  // or "base64" for efficient transport
});

const embeddings = response.data.map(d => d.embedding);
// Each embedding is an array of floats (1536 for small, 3072 for large)
```

**Model comparison:**
- `text-embedding-3-small`: $0.02/1M tokens, 1536 dims — good for most RAG
- `text-embedding-3-large`: $0.13/1M tokens, 3072 dims — better for high-accuracy semantic search
- `ada-002`: legacy, inferior to both 3-series models at same price point

---

## Rate Limits and Retry Logic

OpenAI rate limits vary by tier (usage history determines tier):
- **RPM:** requests per minute (e.g., Tier 1: 500 RPM for GPT-4o)
- **TPM:** tokens per minute (e.g., Tier 1: 30K TPM for GPT-4o)
- **RPD:** requests per day

**Which errors to retry:**
- `429 Too Many Requests` → Yes, with exponential backoff + jitter
- `500 Internal Server Error` → Yes, up to 3 times
- `503 Service Unavailable` → Yes, up to 3 times
- `400 Bad Request` → No (malformed input, your bug)
- `401 Unauthorized` → No (invalid API key)
- `403 Forbidden` → No (rate limit on a specific capability or org policy)

**Exponential backoff with jitter:**
```js
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries || ![429, 500, 503].includes(err.status)) throw err;
      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 60000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

**Jitter is critical** — without it, all retry attempts in a distributed system fire simultaneously, creating a "thundering herd" that worsens the 429 situation.

---

## Token Counting Before Sending

The `tiktoken` library mirrors OpenAI's tokenizer exactly. In Node.js:

```js
// npm install @dqbd/tiktoken
const { encoding_for_model } = require("@dqbd/tiktoken");
const enc = encoding_for_model("gpt-4o");
const tokens = enc.encode("Hello, world!");
console.log(tokens.length); // exact token count
enc.free(); // Important: free WebAssembly memory
```

Always count tokens before sending large payloads to avoid `context_length_exceeded` errors mid-conversation.

---

## OpenAI SDK Initialization

```js
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,   // Optional: for org billing
  baseURL: "https://your-proxy.example.com/v1", // For Azure OpenAI or custom proxy
  timeout: 30000,       // Request timeout in ms
  maxRetries: 3,        // Built-in retry (but no jitter — roll your own for 429)
  defaultHeaders: { "x-custom-header": "value" }
});
```

Using `baseURL` override: run requests through a proxy for caching, logging, or to use Azure OpenAI Service (which has the same API surface).

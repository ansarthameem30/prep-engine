# Day 49 — GenAI Production Patterns

## Why Production GenAI Is Harder Than Production Software

Traditional software: if input A produces wrong output B, you can trace the deterministic code path and fix it. GenAI: the same input can produce different outputs on different runs, model behavior can shift with API updates, and "correct" output is often subjective. Production GenAI requires a fundamentally different approach to quality, monitoring, and deployment.

---

## Evaluation Frameworks

### LLM-as-Judge

The most scalable evaluation approach: use a strong model (GPT-4o) to evaluate a weaker model's output. Define a rubric and have the judge score each dimension.

```js
async function llmJudge(question, answer, context, criteria) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",  // Use the strongest available model as judge
    messages: [{
      role: "user",
      content: `Evaluate this AI response on a scale of 1-5 for each criterion.
Question: ${question}
Answer: ${answer}
Context: ${context}

Criteria:
${criteria.map(c => `- ${c.name}: ${c.description}`).join("\n")}

Return JSON: {"scores": {"criterion_name": score}, "overall": score, "reasoning": "brief explanation"}`
    }],
    response_format: { type: "json_object" },
    temperature: 0
  });
  return JSON.parse(response.choices[0].message.content);
}
```

**LLM-as-judge limitations:**
- Positional bias: judges favor first-presented answer when comparing two
- Verbosity bias: judges often prefer longer, more detailed answers
- Self-enhancing bias: GPT-4 might rate GPT-4 outputs higher
- Mitigate: use diverse judges, randomize order when comparing, calibrate with human-labeled examples

### RAGAS (RAG Assessment)

Four key metrics:
1. **Faithfulness** (most important): Does the answer contradict the retrieved context?
   - Method: decompose answer into individual claims, check each against context
   - Score: fraction of claims supported by context
2. **Answer Relevancy**: Does the answer address the question?
   - Method: embed answer, generate questions from answer, measure similarity to original question
3. **Context Precision**: Are retrieved chunks relevant to the question?
   - Method: LLM judges each chunk: relevant or not. Precision@K.
4. **Context Recall**: Was all necessary information retrieved?
   - Requires ground truth: fraction of ground truth statements covered by retrieved context

### G-Eval

Uses chain-of-thought scoring:
1. Provide the evaluation criteria
2. Ask the model to generate evaluation steps
3. Execute the steps to arrive at a score

More reliable than direct scoring because the model reasons about the rubric before scoring.

---

## Prompt Regression Testing

Every prompt change should run against a test suite before deployment:

```js
// Test suite structure
const TEST_CASES = [
  {
    id: "invoice-extraction-001",
    input: "Invoice #12345 from Acme Corp, $500 due Dec 15",
    expected: { invoice_number: "12345", amount: 500, due_date: "2024-12-15" },
    validate: (output, expected) => {
      return output.invoice_number === expected.invoice_number &&
             output.amount === expected.amount;
    }
  }
];

async function runRegressionTests(prompt, testCases) {
  const results = await Promise.all(testCases.map(async (tc) => {
    const response = await callWithPrompt(prompt, tc.input);
    const passed = tc.validate(response, tc.expected);
    return { id: tc.id, passed, response, expected: tc.expected };
  }));
  
  const passRate = results.filter(r => r.passed).length / results.length;
  return { passRate, results, passed: passRate >= 0.95 }; // 95% pass rate threshold
}
```

Integrate into CI/CD: fail the PR if pass rate drops below threshold. Store historical pass rates to detect gradual degradation.

---

## Observability for AI

### Langfuse (Open-Source, Self-Hostable)

```js
import Langfuse from "langfuse";

const langfuse = new Langfuse({ secretKey: process.env.LANGFUSE_SECRET });

async function tracedLLMCall(prompt, userId) {
  const trace = langfuse.trace({ userId, name: "chat-completion" });
  const span = trace.span({ name: "openai-call" });
  
  const response = await openai.chat.completions.create({ /* ... */ });
  
  span.end({
    output: response.choices[0].message.content,
    usage: response.usage,
    model: response.model,
  });
  
  return response;
}
```

### What to Log for Every LLM Call

```js
const LOG_SCHEMA = {
  request_id: uuid(),
  user_id: string,
  session_id: string,
  model: string,
  prompt_version: string,  // CRITICAL for regression analysis
  input_tokens: number,
  output_tokens: number,
  latency_ms: number,
  cost_cents: number,
  // Sampled quality metrics (10% of requests)
  faithfulness_score: number | null,
  user_feedback: "thumbs_up" | "thumbs_down" | null,
  // Error info
  error: string | null,
  retry_count: number,
};
```

---

## Cost Optimization Techniques

### 1. Prompt Compression
Before injecting long documents into context, compress them:
- Summarize with a fast model: "Summarize this 2000-token document in 200 tokens focusing on [topic]"
- LLMLingua: open-source prompt compression that removes low-information tokens
- Selective context: only inject the most relevant sentences (like retrieval but within a document)

### 2. Batch API
OpenAI Batch API: 50% cheaper, 24-hour turnaround. For non-real-time tasks:
- Nightly report generation
- Data classification at scale
- Offline evaluation pipelines

```js
const batch = await openai.batches.create({
  input_file_id: fileId,
  endpoint: "/v1/chat/completions",
  completion_window: "24h"
});
```

### 3. Response Caching
- Exact match: hash the full prompt, cache the response
- Semantic: embed the query, find similar cached query (Day 48 pattern)
- TTL strategy: 1 hour for volatile data, 24 hours for stable facts

### Cost Attribution Table

| Technique | Cost Reduction | Latency Impact | Effort |
|---|---|---|---|
| Route to mini model | 15-28x on routed queries | Better (faster model) | Low |
| Semantic cache | 20-50% (typical hit rate) | Near-zero (cache hit) | Medium |
| Batch API | 50% on eligible requests | +24h latency | Low |
| Prompt compression | 20-40% input token reduction | +50-200ms | Medium |
| Context truncation | 10-30% input reduction | None | Low |

---

## Safety and Content Moderation

```js
async function moderateInput(userMessage) {
  const moderation = await openai.moderations.create({
    input: userMessage
  });
  
  const result = moderation.results[0];
  if (result.flagged) {
    const flaggedCategories = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([cat]) => cat);
    
    throw new ModerationError(`Content policy violation: ${flaggedCategories.join(", ")}`);
  }
  
  return userMessage;
}

async function moderateOutput(response) {
  const moderation = await openai.moderations.create({ input: response });
  if (moderation.results[0].flagged) {
    return "I apologize, but I'm unable to provide that response. Please try rephrasing your request.";
  }
  return response;
}
```

### PII Removal Before Sending to LLM

```js
function removePII(text) {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]")
    .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, "[CARD_NUMBER]");
}
```

---

## Versioning and Deployment

### Canary Deployment for Prompts

```js
function getPromptVersion(userId, featureFlag) {
  // Route 5% of users to new prompt version
  const hash = crc32(userId) % 100;
  
  if (hash < 5 && featureFlag === "new_prompt_v2") {
    return { version: "v2", prompt: PROMPT_V2 };
  }
  return { version: "v1", prompt: PROMPT_V1 };
}
```

Track metrics per version: response quality, user satisfaction (thumbs up/down), latency, cost. Promote from 5% → 25% → 100% only when metrics are equal or better.

---

## Production Monitoring Metrics

| Metric | Alert Threshold | Action |
|---|---|---|
| Latency p95 | > 10 seconds | Investigate model load, enable streaming |
| Error rate | > 1% | Check for API key issues, rate limit exhaustion |
| Cost/day | > budget × 1.2 | Check for abuse, routing issues |
| Faithfulness score | < 3.5/5 average | Review prompt, retrieval quality |
| Cache hit rate | < 20% (if caching enabled) | Review threshold, warm up cache |
| Context precision | < 0.6 | Review chunking, embedding model |

### Drift Detection

Monitor weekly averages for: output length, semantic similarity between answer and expected, user feedback rate. If any metric shifts by >15% week-over-week without a deployment change, investigate model drift (OpenAI may have updated the model's weights) or data distribution shift.

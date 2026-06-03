# Day 41 — LLM Fundamentals

## Transformer Architecture: The Intuition

The Transformer (Vaswani et al., 2017) replaced recurrent networks with a pure attention mechanism, enabling full parallelization across the sequence. The core insight: instead of reading tokens one by one and passing a hidden state forward, every token attends to every other token simultaneously.

### Self-Attention: Which Words to Focus On

Given a sentence like "The bank by the river was steep," the word "bank" needs to figure out from context that it means the riverbank, not a financial institution. Self-attention computes, for each token, a weighted sum of all other tokens' representations.

The mechanism uses three learned projections per token:
- **Query (Q):** What am I looking for?
- **Key (K):** What do I advertise about myself?
- **Value (V):** What information do I carry?

Attention score between token i and token j = softmax(Q_i · K_j / sqrt(d_k)), then multiply by V_j. The scaling by sqrt(d_k) prevents vanishing gradients in high dimensions.

### Multi-Head Attention

Instead of one attention computation, multi-head attention runs H parallel attention operations with different learned Q/K/V projection matrices. This allows the model to simultaneously attend to different relationships — one head might track syntactic dependencies, another co-reference, another semantic similarity. Outputs are concatenated and projected back.

**Why better than RNNs:**
- RNN: O(n) sequential steps, can't parallelize — "The cat sat on the..." requires processing each token before the next.
- Transformer: O(1) sequential steps, full GPU parallelization across all n tokens at once.
- Cost: O(n²) attention matrix per layer — but hardware acceleration makes this practical for most sequences.

---

## Tokenization: Byte Pair Encoding (BPE)

Raw text must be converted to integers before passing to a neural network. Tokenization is not splitting on spaces — it's a learned compression algorithm.

### BPE Algorithm
1. Start with character-level vocabulary: every single character is a token.
2. Count the most frequent adjacent pair of tokens in the training corpus.
3. Merge that pair into a new token.
4. Repeat until vocabulary size (e.g., 50,257 for GPT-4) is reached.

**Example:** "unhappiness" tokenizes as `["un", "happi", "ness"]` because those subword units appear frequently across the training corpus. "happiness" is common enough to stay merged; "un" is a common prefix.

### Why It Matters for Developers
- **Pricing:** OpenAI charges per token, not per character. "GPT-4o" costs ~$5/1M input tokens. 1 token ≈ 4 characters in English, but code is often 1 token ≈ 2-3 characters.
- **Context limits:** A 128K context window means 128K tokens, roughly 96K words.
- **Non-English text:** Languages like Chinese/Japanese tokenize at ~1.5 characters/token — far more expensive per character.
- **Rule of thumb:** 1 token ≈ 4 characters, 100 tokens ≈ 75 words.

---

## Context Windows

The context window is the total token budget for a single inference call: input tokens + output tokens combined.

| Model | Context Window |
|---|---|
| GPT-3.5 (legacy) | 4K |
| GPT-4 (original) | 8K / 32K |
| GPT-4o | 128K |
| Claude 3.5 Sonnet | 200K |
| Gemini 1.5 Pro | 1M |

### Lost-in-the-Middle Problem
Research (Liu et al., 2023) demonstrated that LLMs perform best when relevant information is at the beginning or end of a long context — performance degrades on information buried in the middle. You can't just dump everything in and expect the model to find it.

**Why you can't just use huge context:**
1. Quadratic attention cost (O(n²)) — inference is slow and expensive at 100K+ tokens.
2. Model still makes mistakes on long contexts.
3. RAG retrieves only the relevant 2-5 chunks, which is cheaper and more reliable.

---

## Sampling Parameters

### Temperature
Controls the probability distribution sharpness at each token prediction:
- **0:** Greedy decoding — always pick the highest-probability token. Deterministic, repetitive.
- **0.2-0.4:** Mostly deterministic with slight variance — ideal for code generation, SQL, JSON extraction.
- **0.7:** Balanced — good for conversational AI.
- **1.0:** Sample proportionally to model's raw probabilities — creative writing.
- **>1.0:** Amplifies low-probability tokens — experimental/chaotic.

### Top-p (Nucleus Sampling)
Sort tokens by probability descending. Find the smallest set whose cumulative probability ≥ p. Sample only from this "nucleus." Top-p=0.9 means sample from tokens that together cover 90% of probability mass, discarding the long tail of unlikely tokens. Adapts dynamically — when the model is confident, the nucleus is small.

### Top-k
Sample only from the k most probable tokens at each step. Less adaptive than top-p but simpler. Top-k=50 means only consider the 50 highest-probability next tokens regardless of their cumulative probability.

**Typical production config for code:** `temperature: 0.1, top_p: 0.95` — nearly deterministic but allows minor variation.

---

## Hallucination: Root Cause and Mitigation

LLMs are trained with a next-token prediction objective: given tokens 1..n, predict token n+1. They learn statistical patterns, not factual truth. When asked about something rare or outside training data, they continue the statistical pattern — producing a plausible-sounding but false answer.

**Why they hallucinate confidently:** High confidence tokens are sampled first. A false claim that's linguistically plausible will be generated with high confidence before the model reaches a token where the falsehood becomes evident.

**Detection strategies:**
- Ask the model to cite sources — then verify those citations exist.
- Cross-check with external grounding (search API, database query).
- LLM-as-judge: a second model evaluates if the first model's answer is consistent with the provided context.

**Mitigation:**
- RAG: inject verified documents as context. The model's job becomes extraction, not recall.
- Structured output + validation: if the model claims a specific fact, parse it and validate against a DB.
- Self-consistency: sample 5 answers, if they disagree significantly, flag for human review.
- Refuse-if-uncertain: instruct model to say "I don't know" rather than guess.

---

## Model Families (Developer Perspective)

- **GPT-4o:** OpenAI's flagship multimodal model. Vision, audio, text. 128K context. Best for complex reasoning, code, tool use.
- **GPT-4o-mini:** 15x cheaper than GPT-4o. Surprisingly capable for classification, simple Q&A, routing.
- **o1 / o3:** OpenAI reasoning models. Internal chain-of-thought before responding. Excels at math, coding competitions, multi-step logic. Slow and expensive. Not streaming-friendly.
- **Claude 3.5 Sonnet:** Anthropic's flagship. 200K context. Strong at long-document analysis, following complex instructions, coding.
- **Claude 3.5 Haiku:** Fast + cheap Claude. Good for latency-sensitive applications.
- **Gemini 1.5 Pro:** Google's model. 1M token context — unique for processing entire codebases or long PDFs.

---

## Fine-tuning vs RAG vs Prompting

| Approach | Cost | Time to Deploy | Best For |
|---|---|---|---|
| Prompting | Cheapest | Minutes | 80% of use cases |
| RAG | Medium (infra) | Days | Knowledge bases, real-time data |
| Fine-tuning | Expensive (data + compute) | Weeks | Style/format adaptation, domain jargon |

**Decision tree:**
1. Does prompting work? → Use prompting. Most tasks do.
2. Does the model need external/proprietary knowledge? → Add RAG.
3. Does the model need to consistently behave differently (tone, format, domain)? → Fine-tune.
4. Fine-tune on top of RAG for best results in specialized domains.

---

## Embeddings

An embedding is a dense vector (e.g., 1536 floats) representing the semantic meaning of text. Trained via contrastive learning: similar sentences are pushed close together in vector space, dissimilar sentences are pushed apart. This is what enables semantic search: "automobile" and "car" have near-identical vectors, while "banana" is far from both.

---

## Cost Calculation

```
cost = (input_tokens × input_price_per_1k) + (output_tokens × output_price_per_1k)
```

**GPT-4o (June 2025 pricing):** $5/1M input, $15/1M output
**GPT-4o-mini:** $0.15/1M input, $0.60/1M output

**Example:** 1000 API calls with avg 500 input tokens + 200 output tokens:
- GPT-4o: (500K × $5/1M) + (200K × $15/1M) = $2.50 + $3.00 = **$5.50**
- GPT-4o-mini: (500K × $0.15/1M) + (200K × $0.60/1M) = $0.075 + $0.12 = **$0.195**

That's a 28x cost difference. For tasks where mini is sufficient, always use it.

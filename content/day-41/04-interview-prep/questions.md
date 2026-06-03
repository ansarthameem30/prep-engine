# Day 41 — LLM Fundamentals: Interview Q&A

---

## Q1: What does temperature control in an LLM, and when would you set it to 0 vs 1.0?

**A:** Temperature scales the logits (raw model outputs) before the softmax step, sharpening or flattening the probability distribution over next tokens. At temperature 0, the model always picks the highest-probability token (greedy decoding) — giving deterministic, reproducible outputs. This is ideal for code generation, SQL queries, JSON extraction, and any task where correctness matters more than creativity. At temperature 1.0, the model samples proportionally to raw probabilities, introducing natural variance. I'd use 0.7-0.8 for conversational AI and 1.0+ only for creative writing or brainstorming scenarios where diversity is valued. In production I default to 0.1-0.2 for structured outputs and 0.7 for chat.

---

## Q2: Explain the "lost-in-the-middle" problem with large context windows.

**A:** Research from Stanford (Liu et al., 2023) showed that when relevant information is placed in the middle of a long context window, LLM accuracy drops significantly compared to when the same information is near the beginning or end. The model's attention patterns favor recency and the initial framing. This means you can't assume that dumping a 50-page document into a 128K context window will work reliably — the model may miss critical facts buried in the middle. The practical fix is RAG with re-ranking: retrieve the most relevant chunks and place them near the top of the context, rather than relying on positional luck. This is also why chunking strategy and retrieval quality matter more than just having a large context window.

---

## Q3: Why do LLMs hallucinate, and what are your three primary mitigation strategies?

**A:** LLMs are trained with a next-token prediction objective — they learn to generate statistically plausible continuations, not to retrieve verified facts. When asked about rare, recent, or proprietary information, the model generates a linguistically plausible response because that's what it was rewarded for during training. It has no mechanism to distinguish "I know this" from "I'm pattern-matching to produce something plausible." My three mitigation strategies: (1) **RAG grounding** — inject verified source documents into the prompt so the model extracts rather than recalls; (2) **constrained generation** — use structured outputs and ask the model to cite its source passages, then validate those citations programmatically; (3) **LLM-as-judge** — use a second model call to verify faithfulness, checking whether the answer is actually supported by the provided context before returning it to the user.

---

## Q4: When would you choose fine-tuning over RAG, and when would you choose RAG over prompting?

**A:** I use prompting first — it's the cheapest and fastest to iterate. RAG is the right choice when the model needs access to knowledge that's either not in its training data (internal docs, recent events) or changes frequently. RAG doesn't require training and updates in real-time. Fine-tuning is appropriate when I need consistent behavioral changes — a model that reliably outputs in a specific format, uses company-specific jargon, or has a distinct persona baked in. Fine-tuning on style/format is more reliable than prompting for that. The hybrid approach — fine-tune for behavior + RAG for knowledge — is often the production winner. I never fine-tune just to add knowledge (that's what RAG is for), and I don't prompt-engineer when I need structural consistency (that's what fine-tuning is for).

---

## Q5: What is BPE tokenization and why does it matter for pricing and performance?

**A:** Byte Pair Encoding is a data compression algorithm applied to text. It starts with individual characters and iteratively merges the most frequent adjacent pairs until the desired vocabulary size is reached. "unhappiness" becomes ["un", "happi", "ness"] because those subword units appear frequently across the training corpus. This matters practically for two reasons: (1) **pricing** — every API call is billed per token, so more tokens = more cost. Non-English languages like Chinese tokenize at roughly 1.5 chars/token vs ~4 chars/token for English, making multilingual apps 2-3x more expensive per character; (2) **context limits** — a 128K context window holds 128K tokens, not 128K characters. Dense code uses more tokens per meaning unit than prose. I always estimate token counts before sending large payloads and truncate aggressively to avoid hitting context limits mid-response.

---

## Q6: Compare GPT-4o vs o1 from a developer integration perspective. When do you use each?

**A:** GPT-4o is the standard conversational model: fast, supports streaming, function calling, vision, cheap(ish), and excellent at instruction following. I use it for 90% of production features — chat, RAG, tool use, extraction. The o1/o3 series are "reasoning models" that perform an internal chain-of-thought before responding. You can't see that reasoning (though o3 supports some visibility), and they're significantly slower and more expensive. They don't support streaming in the same way. I use o1/o3 when solving hard multi-step problems: complex code debugging, math reasoning, architectural analysis where correctness matters more than latency. Practically: if my prompt already includes "think step by step" and works well, that's GPT-4o territory. If I'm hitting ceiling on accuracy for hard reasoning and can tolerate 20-30s latency, that's o1 territory.

---

## Q7: Explain the difference between top-k and top-p sampling. Which would you prefer in production?

**A:** Top-k sampling considers only the k most probable next tokens at each step, regardless of their actual probability values. If k=50, you always consider exactly 50 candidates. Top-p (nucleus sampling) selects the smallest set of tokens whose cumulative probability sum reaches p — so if one token has 95% probability and p=0.9, only that token is in the nucleus. Top-p is adaptive: when the model is confident, the nucleus is small; when uncertain, the nucleus is larger. In production I prefer top-p because it handles both high-confidence and ambiguous states gracefully. I typically use `top_p: 0.9` combined with `temperature: 0.3-0.7` depending on task. Setting both temperature and top-p effectively means "first scale probabilities by temperature, then apply nucleus sampling" — the order matters and most frameworks do temperature first.

---

## Q8: How would you calculate the cost of running 10,000 API calls with GPT-4o where each call has a 500-token prompt and a 200-token response?

**A:** GPT-4o pricing (as of 2025) is approximately $5/1M input tokens and $15/1M output tokens. For 10,000 calls: input tokens = 10,000 × 500 = 5M tokens → $5/1M × 5M = **$25**. Output tokens = 10,000 × 200 = 2M tokens → $15/1M × 2M = **$30**. Total = **$55 for 10,000 calls**. If I switched to GPT-4o-mini ($0.15/1M input, $0.60/1M output): input = 5M × $0.15/1M = $0.75, output = 2M × $0.60/1M = $1.20, total = **$1.95** — 28x cheaper. This math is why model routing matters in production: classify simple requests to mini, route complex ones to GPT-4o. A rule-based classifier that catches 70% of "simple" requests saves roughly $0.70 per dollar spent on the full model.

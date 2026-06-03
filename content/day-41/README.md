# Day 41 – LLM Fundamentals: Transformer Architecture & Core Concepts | DSA: Stock Trading Variants

> **Phase 5 – GenAI Engineering** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Transformer architecture, tokens, context windows, sampling parameters, hallucination causes |
| Hands-On | 00:40–01:10 | Build a token counter, compare temperature outputs, test context window behavior |
| DSA | 01:10–01:25 | Best Time to Buy/Sell Stock II & III (LeetCode #122, #123) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Explain attention mechanism conceptually (query, key, value)
- [ ] Differentiate tokens vs words and calculate token estimates
- [ ] Understand temperature, top-p, and top-k sampling with practical implications
- [ ] Explain why hallucination happens at a mechanical level
- [ ] Solve: Best Time to Buy/Sell Stock II & III
- [ ] Review 5 interview questions

---

## Concept: LLM Fundamentals

### What to Study
- **Transformer architecture:** Encoder-decoder vs decoder-only models, self-attention mechanism (Q/K/V matrices conceptually), positional encoding, why transformers replaced RNNs for sequence tasks
- **Tokenization:** Byte-pair encoding (BPE), why "tokenization" ≠ "words", multilingual token inflation, how to estimate tokens (~4 chars = 1 token in English), tiktoken library
- **Context windows:** Hard limits (e.g., GPT-4 128k, Claude 200k), what "lost-in-the-middle" means, cost implications of large contexts, how KV cache works at a high level
- **Sampling parameters:** Temperature (0 = deterministic, 2 = chaotic), top-p / nucleus sampling (cumulative probability cutoff), top-k (hard vocabulary limit), how they interact; when to use each
- **Model landscape:** GPT-4o vs Claude 3.5 vs Gemini 1.5 Pro — key capability and pricing differences; embedding models (text-embedding-3-small vs large) vs generative models
- **Fine-tuning vs RAG:** When to fine-tune (style, format, domain tone), when to RAG (dynamic knowledge, auditability), cost and maintenance tradeoffs

### Key Mental Models
- **Attention is "soft lookup":** Each token asks "which other tokens are relevant to me?" and gathers a weighted sum of their values — like a fuzzy database query
- **Hallucination is confident interpolation:** The model predicts the next token based on statistical patterns, not ground truth — it can't "know" it's wrong
- **Temperature scales uncertainty:** High temperature flattens the probability distribution; low temperature sharpens it — neither is always better

### Why This Matters in Interviews
GenAI interviews at product companies increasingly expect engineers to reason about LLM behavior, not just call APIs. Understanding tokenization helps you debug costs and context overflows. Knowing the sampling parameter tradeoffs lets you architect reliable pipelines — interviewers ask "why did your system hallucinate?" and expect a mechanical answer.

---

## DSA Focus: Dynamic Programming – Greedy & State Machine

- **Problem:** Best Time to Buy/Sell Stock II (LeetCode #122) + III (LeetCode #123)
- **Difficulty:** Medium / Hard
- **Pattern:** Greedy (unlimited transactions) → State machine DP (at most 2 transactions)
- **Time Target:** < 20 minutes (both combined)
- **Key Insight:** #122 — every upward slope is profit, just accumulate positive differences; #123 — track 4 states: after first buy, after first sell, after second buy, after second sell

---

## Today's 5 Interview Questions
1. How does the attention mechanism allow a model to understand context across a long sentence?
2. Why does a 100-word paragraph not always equal 100 tokens, and why does this matter for API costs?
3. When would you use temperature=0 vs temperature=0.7 in a production application?
4. Explain hallucination at the model mechanics level — why does it happen even on factual questions?
5. When should you fine-tune a model vs use RAG, and what are the cost/maintenance tradeoffs of each?

---

## Files
- `01-concept/` → Notes on transformer architecture, tokenization, sampling params, model comparison table
- `02-hands-on/` → Token counting script (tiktoken), temperature comparison demo, context window stress test
- `03-dsa/` → stock-variants.js — #122 greedy + #123 state machine DP with comments
- `04-interview-prep/` → llm-fundamentals-qa.md — 5 Q&As with detailed answers

---

## Success Criteria
- [ ] Can explain the attention mechanism (Q/K/V) without notes in under 2 minutes
- [ ] Can estimate token count for any given text and explain BPE
- [ ] Solved both stock problems in < 20 min with correct time/space complexity
- [ ] Confident on all 5 interview questions

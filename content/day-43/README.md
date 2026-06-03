# Day 43 – Prompt Engineering: System Design, CoT, ReAct & Structured Outputs | DSA: Edit Distance

> **Phase 5 – GenAI Engineering** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | System prompts, few-shot, chain-of-thought, ReAct, structured output prompting, prompt injection defense |
| Hands-On | 00:40–01:10 | Build a prompt library with versioning, A/B test two system prompt variants, implement injection defense |
| DSA | 01:10–01:25 | Edit Distance (LeetCode #72) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Write a production-quality system prompt using best practices
- [ ] Implement few-shot examples with role-consistent formatting
- [ ] Apply chain-of-thought and ReAct prompting with measurable output quality improvement
- [ ] Build a structured output prompt with JSON schema validation
- [ ] Solve: Edit Distance (#72)
- [ ] Review 5 interview questions

---

## Concept: Prompt Engineering

### What to Study
- **System prompt design:** Persona definition (role, expertise, tone), instruction layering (do this / don't do that), output format specification, constraint injection, persona vs instruction tradeoffs; how system prompt length affects cost and caching
- **Few-shot examples:** Placement (system vs user), how many examples (2–5 sweet spot), example quality vs quantity, negative examples, dynamic few-shot selection using embedding similarity
- **Chain-of-thought (CoT):** "Think step by step" effect, zero-shot CoT vs few-shot CoT, self-consistency sampling (majority vote across multiple CoT paths), when CoT hurts (simple tasks, creative tasks)
- **ReAct prompting:** Interleaved Thought → Action → Observation loop, how it enables agents to self-correct, format discipline (requires strict parsing), comparison to pure CoT
- **Structured output prompting:** Priming the model with JSON prefix, using JSON Schema in the prompt, `response_format` for guaranteed structure, Zod/Pydantic validation as safety net
- **Prompt injection defense:** Direct injection (user overwrites system prompt), indirect injection (malicious content in retrieved docs), defenses: delimiters (`<user_input>...</user_input>`), instruction hierarchy, input sanitization, output validation, "ignore all previous instructions" detection
- **Meta-prompting:** Using a model to generate/improve prompts, automated prompt optimization (DSPy concept), self-refinement loops
- **Prompt versioning:** Treating prompts as code (git-versioned), A/B testing with LLM-as-judge evaluation, regression test suite for prompt changes

### Key Mental Models
- **Prompts are programs:** A system prompt is executable specification — ambiguity in the prompt produces undefined behavior in the output, just like ambiguous code
- **Context position matters:** Instructions at the beginning AND end of a long prompt are followed better (primacy + recency effects); critical instructions buried in the middle get "lost"
- **Injection defense is input/output validation:** Treat user input like SQL parameters — never interpolate raw into your prompt without sanitization and delimiter isolation

### Why This Matters in Interviews
Prompt engineering is the interface layer between business requirements and model behavior. Interviewers building AI products test whether you can write reliable, secure, cost-efficient prompts — not just "clever" ones. Knowing CoT and ReAct demonstrates you understand how to unlock model reasoning, while injection defense shows production security awareness.

---

## DSA Focus: Dynamic Programming – Edit Distance (Levenshtein)

- **Problem:** Edit Distance (LeetCode #72)
- **Difficulty:** Hard
- **Pattern:** 2D DP — classic string alignment
- **Time Target:** < 20 minutes
- **Key Insight:** `dp[i][j]` = min edits to convert `word1[0..i]` to `word2[0..j]`; if characters match, carry diagonal; else take `min(replace, insert, delete) + 1`; base cases are full insertions/deletions from empty string

---

## Today's 5 Interview Questions
1. What makes a system prompt "production-quality"? Walk through the components you always include.
2. How does chain-of-thought prompting improve model accuracy, and when does it actually hurt performance?
3. Explain the ReAct pattern — what is the Thought/Action/Observation loop and why does it help with multi-step tasks?
4. How do you defend against prompt injection attacks in a RAG system where retrieved content is untrusted?
5. How would you A/B test two system prompt variants at scale — what metrics would you use to declare a winner?

---

## Files
- `01-concept/` → Notes on all prompt engineering techniques with worked examples for each
- `02-hands-on/` → prompt-library.js — versioned prompts, A/B comparison harness, injection defense middleware
- `03-dsa/` → edit-distance.js — 2D DP with full trace, space-optimized 1D version
- `04-interview-prep/` → prompt-engineering-qa.md — 5 Q&As with example prompts

---

## Success Criteria
- [ ] Can write a robust system prompt for a given product feature without notes
- [ ] Can explain CoT vs ReAct tradeoffs clearly with examples
- [ ] Solved Edit Distance with correct DP recurrence in < 20 min
- [ ] Confident on all 5 interview questions

# Day 47 — AI Agents + Tool Use: Interview Q&A

---

## Q1: Explain the ReAct loop. Why is the "Thought" step important?

**A:** ReAct (Reason + Act) is an agent pattern where the model explicitly alternates between reasoning (Thought) and action (Action → Observation) before reaching a final answer. Each Thought step analyzes the current state: what do I know, what do I need, what's the right next action? Each Action executes a tool and produces an Observation that feeds into the next Thought. The Thought step is critical for two reasons: (1) it prevents the model from jumping to tool calls without sufficient reasoning — studies show CoT-style reasoning before action significantly reduces errors in multi-step tasks; (2) it makes the agent's reasoning auditable — by logging Thought steps, engineers can diagnose exactly why an agent made a wrong decision, which is impossible when only tool calls are logged. In practice, modern function-calling models perform implicit reasoning internally even without explicit "Thought:" formatting. I add explicit Thought prompting only for complex multi-step workflows where I need the reasoning trace for debugging.

---

## Q2: How do you design good tools for an AI agent? What makes a tool description effective?

**A:** Tool design follows the principle of minimal, well-scoped interfaces with rich descriptions. The name should be `verb_noun` format (search_web, create_ticket, send_email) so the model can infer the action from the name alone. The description is the most important field — it's what the model uses to decide when to call the tool. A good description includes: what the tool does, when to use it, and critically, when NOT to use it. For example: "Search engineering documentation for team policies and procedures. Do NOT use for general coding questions or external information." Parameters should be minimal — each parameter is an opportunity for the model to generate invalid input. Use sensible types and add format hints in descriptions (e.g., "ISO 8601 date format"). Return values must be consistent JSON — mixing strings, nulls, and sometimes-throws destroys the model's ability to reason about tool results. Every tool should return `{success: true, data: {...}}` or `{success: false, error: "message"}`.

---

## Q3: What are the four types of memory in an AI agent, and when would you use each?

**A:** (1) **In-context memory (short-term):** the messages array in the current request. Contains the full conversation, tool results, and recent decisions. Limited by context window. Use for everything in the current session. (2) **External episodic memory:** store past conversations or events in a vector database. Retrieve semantically similar past episodes at the start of each new session ("Last time you asked about deployment, I told you..."). Use for personalization and continuity across sessions. (3) **External semantic memory:** structured knowledge about users, preferences, or entities in a relational database. "User Alice prefers TypeScript, works on the billing team, has admin access." Retrieved by structured query, not semantic search. Use for persistent facts and preferences. (4) **Procedural memory:** behavioral patterns baked into model weights via fine-tuning. Not retrievable or auditable as data. Use when you need extremely consistent behavioral patterns that prompting can't reliably achieve. Most production agents use in-context + external episodic/semantic. Fine-tuning for procedural memory is rare and expensive.

---

## Q4: Walk me through the multi-agent supervisor pattern. When does it make sense?

**A:** The supervisor pattern has an orchestrator agent that receives the user's task, classifies it, and delegates to a specialist agent. The specialist completes the subtask and returns the result, which the supervisor synthesizes into a final answer. Example: a supervisor receives "Research GraphQL and write a migration plan from REST." It routes "research GraphQL benefits" to the Research Agent and "write migration steps" to the Code Agent, then combines both results. When does it make sense: (1) when different subtasks require genuinely different behaviors (research needs high temperature + web search tools; code needs low temperature + code execution tools); (2) when a single context window is insufficient for a complex multi-part task; (3) when you want to run specialized agents in parallel (research + write + review simultaneously). When it doesn't make sense: for simple tasks where a single agent with multiple tools is sufficient — the overhead of supervisor routing, latency, and debugging complexity isn't worth it. I default to single-agent and graduate to multi-agent only when I hit clear limitations.

---

## Q5: What safety guardrails should every production AI agent have?

**A:** Five non-negotiable guardrails: (1) **Principle of least privilege** — only give the agent tools it needs for its specific scope; a customer service bot never needs database write access; (2) **Max iterations** — always set a hard limit (e.g., 10 iterations) to prevent infinite loops from a stuck agent; (3) **Cost budget per run** — calculate token cost after each LLM call, abort if the run exceeds $X (prevents runaway generation); (4) **Human-in-the-loop for destructive operations** — any action that's expensive, irreversible, or high-risk (email sends, database writes, payments) should pause for human approval; implement via checkpointer + interrupt; (5) **Input/output validation** — validate tool arguments before execution (check for SQL injection patterns, validate email formats, verify IDs exist) and validate outputs match expected schemas. Additionally: log every tool call with arguments and results for audit trails, rate limit tool calls to prevent abuse, and implement circuit breakers for external tools (if the weather API is down, fail gracefully).

---

## Q6: How do parallel tool calls work, and why should you use Promise.all()?

**A:** When the model decides to call multiple tools simultaneously (e.g., get weather in 3 cities at once), the response contains an array of `tool_calls` with multiple entries rather than a single call. You must execute all of them and return all results before the model can continue. Using `Promise.all()` for parallel execution is critical for performance: if each tool call takes 200ms, executing 3 sequentially takes 600ms, while `Promise.all()` takes ~200ms. Even if one tool call fails, you should still return the other results and handle the error gracefully. The implementation: `const results = await Promise.all(toolCalls.map(tc => executeTool(tc.function.name, JSON.parse(tc.function.arguments))))`. Then append the original assistant message (which contains the tool_calls array) and all tool result messages before making the next completion call. Never serialize tool executions unless one tool depends on the result of another — and if they do depend on each other, the model should be calling them sequentially, not in parallel.

---

## Q7: Compare the OpenAI Assistants API with the Chat Completions API for building agents. When do you use each?

**A:** The Assistants API provides managed state (Threads, Messages, Runs) with automatic conversation history management, built-in code interpreter and retrieval tools, and persistent file attachments. It's the right choice for consumer-facing chat applications where simplicity matters more than control — the API handles conversation storage, truncation, and tool execution management automatically. The Chat Completions API gives you full control: you manage the messages array, implement your own tool loop, control exactly what's in context, and can integrate with any external system. Use Chat Completions when: you need custom agent logic, want to integrate with your own vector database, need to implement custom retry/error handling, require streaming responses mid-agent-loop, or need sub-100ms latency (Assistants API has polling overhead). My production default is Chat Completions with a custom agent loop — the control is worth the extra 100-200 lines of code. I use the Assistants API for rapid prototyping or when building a simple customer-facing chatbot that needs file attachments.

---

## Q8: An agent is stuck in an infinite tool call loop. How do you diagnose and fix it?

**A:** Diagnosis: enable full logging of every iteration — log the model's response, tool calls made, tool results returned, and the resulting message array. The infinite loop usually stems from one of three causes: (1) the tool keeps returning an error the model doesn't know how to handle — it retries the same call repeatedly; (2) the tool result format is inconsistent or confusing, causing the model to keep requesting more information; (3) the system prompt doesn't give the model a clear "done" condition so it keeps looking for more to do. Fix strategy: (1) implement max iterations as a hard guard; (2) examine the tool result that preceded the loop — if it's an error, add better error messages that tell the model explicitly what to do when this error occurs ("This document does not exist. Do not retry with the same ID. Ask the user for clarification."); (3) add explicit "final answer" instructions to the system prompt ("When you have gathered enough information, provide the final answer without calling more tools"); (4) for tool errors, add a retry counter — after 2 failed attempts with the same tool, return a partial answer rather than looping.

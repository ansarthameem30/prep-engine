# Day 47 – AI Agents & Tool Use: ReAct Loop, Multi-Agent Patterns & Memory | DSA: Maximum Profit in Job Scheduling

> **Phase 5 – GenAI Engineering** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | ReAct agent loop, tool design, multi-agent patterns, memory types, safety and guardrails |
| Hands-On | 00:40–01:10 | Build a ReAct agent with 3 custom tools, tool validation, error handling, and iteration limit |
| DSA | 01:10–01:25 | Maximum Profit in Job Scheduling (LeetCode #1235) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Implement a full ReAct agent loop (thought → action → observation → repeat)
- [ ] Design and register 3 custom tools with proper JSON Schema descriptions
- [ ] Implement multi-agent supervisor pattern with task routing
- [ ] Add memory: in-context history + external memory with semantic retrieval
- [ ] Solve: Maximum Profit in Job Scheduling (#1235)
- [ ] Review 5 interview questions

---

## Concept: AI Agents & Tool Use

### What to Study
- **ReAct agent loop:** Thought (model reasons about next step), Action (model selects tool + arguments), Observation (tool result fed back), repeat until stop condition; why explicit Thought traces improve accuracy; stopping conditions (task complete, max iterations, error threshold); the loop implemented as a while loop calling the LLM repeatedly
- **Function calling for tool integration:** Defining tools as JSON Schema (`name`, `description`, `parameters`); the quality of the `description` field is critical — it is the only documentation the model sees; parameter types and `required` fields; returning structured results vs error messages
- **Building custom tools:** Tool as a typed function + schema pair; input validation (Zod/Pydantic before execution); error handling (never let tool exceptions bubble to the LLM as Python tracebacks — return structured error JSON); timeouts; idempotency for read vs write tools
- **Multi-agent patterns:**
  - **Supervisor pattern:** Orchestrator LLM routes to specialized sub-agents (code agent, search agent, data agent); supervisor sees only summaries of sub-agent outputs; parallel vs sequential sub-agent invocation
  - **Hierarchical agents:** Supervisor → Manager → Worker; each layer handles different complexity; reduces context size at each level
  - **Peer-to-peer / swarm:** Agents communicate directly; harder to debug; use for creative tasks with diverse perspectives
- **Memory types:**
  - **In-context memory:** Messages array in the current conversation; limited by context window; no persistence
  - **External / episodic memory:** Summaries or events stored in DB, retrieved with embeddings at the start of each turn; enables long-running agent sessions
  - **Semantic memory:** Facts, user preferences, world knowledge stored as embeddings; retrieved on demand; similar to RAG but agent-owned
  - **Procedural memory:** Prompt templates, tool definitions, few-shot examples — "how to do things"
- **Agent safety and guardrails:** Input validation (reject malicious tool calls), output validation (check for PII, toxic content, off-topic), iteration limits (prevent infinite loops), cost budgets (track token spend per session), human-in-the-loop checkpoints (require approval for write operations), sandboxing code execution (Docker, E2B)
- **Tool validation and error handling:** Schema validation before execution, retry with modified arguments on validation failure, graceful degradation (skip tool, inform user), audit logging of all tool calls
- **OpenAI Assistants API vs custom agent:** Assistants API: built-in thread management, code interpreter, file search — good for prototyping, limited customization; custom agent: full control, custom memory, custom tools, custom loop logic — required for production complex agents

### Key Mental Models
- **An agent is a loop, not a call:** The fundamental shift from LLM-as-API to LLM-as-agent is that the model drives multi-step execution — your job is to define the exit conditions and safety rails, not the step sequence
- **Tool descriptions are the API contract:** A poorly described tool will be misused or ignored; writing tool descriptions is as important as writing function signatures — be explicit about inputs, outputs, and when NOT to use the tool
- **Memory is the agent's working state:** In-context memory is RAM (fast, limited), external memory is disk (slow, unlimited) — agent architecture is about deciding what to keep in "RAM" vs what to offload

### Why This Matters in Interviews
AI agents are the current frontier of applied LLM engineering. Companies building autonomous workflows (customer support, coding assistants, data analysis) need engineers who can design reliable agent loops, choose appropriate memory architectures, and implement safety rails. The ability to discuss multi-agent patterns signals systems thinking beyond single-model prompting.

---

## DSA Focus: Dynamic Programming + Binary Search – Weighted Job Scheduling

- **Problem:** Maximum Profit in Job Scheduling (LeetCode #1235)
- **Difficulty:** Hard
- **Pattern:** DP with binary search — find latest non-overlapping job
- **Time Target:** < 20 minutes
- **Key Insight:** Sort jobs by end time; `dp[i]` = max profit considering first `i` jobs; for each job, binary search for the latest job that ends before current job starts; `dp[i] = max(dp[i-1], profit[i] + dp[lastNonConflict])`; use `bisect_right` on end times

---

## Today's 5 Interview Questions
1. Walk me through implementing a ReAct agent from scratch — what does the main loop look like in code?
2. How would you prevent an agent from entering an infinite loop or spending too many tokens on a single task?
3. Compare in-context memory vs external episodic memory for a long-running agent — when do you need external memory?
4. What's the difference between the OpenAI Assistants API and building a custom agent loop? When do you choose each?
5. Design the safety architecture for an agent that can execute SQL queries on a production database — what guardrails do you implement?

---

## Files
- `01-concept/` → Notes on ReAct loop, all memory types, multi-agent patterns with diagrams, safety checklist
- `02-hands-on/` → react-agent.js — custom ReAct agent with 3 tools (web search stub, calculator, memory), iteration limit, cost tracking
- `03-dsa/` → job-scheduling.js — DP + binary search with sorted jobs, trace output
- `04-interview-prep/` → agents-qa.md — 5 Q&As with architecture decision trees

---

## Success Criteria
- [ ] Can implement a ReAct agent loop from scratch without a framework
- [ ] Can design safety guardrails for a production agent with write access
- [ ] Solved Maximum Profit in Job Scheduling with DP + binary search in < 20 min
- [ ] Confident on all 5 interview questions

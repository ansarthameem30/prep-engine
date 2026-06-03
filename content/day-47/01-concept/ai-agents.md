# Day 47 — AI Agents + Tool Use

## What Is an AI Agent?

An AI agent is an LLM that operates in a loop: it reasons about a task, takes an action (calls a tool), observes the result, and repeats until it can produce a final answer. Unlike a single prompt-response cycle, an agent can dynamically decide which tools to call and in what sequence — adapting to intermediate results.

The key components:
1. **Reasoning:** The LLM decides what to do next based on the current state
2. **Actions:** Tool calls that affect the real world or retrieve information
3. **Observations:** Results from tool executions, fed back into context
4. **Memory:** State that persists across iterations

---

## The ReAct Loop

```
User Input
    ↓
[Thought] → What do I know? What do I need? What should I do?
    ↓
[Action] → tool_name(arguments)
    ↓
[Observation] → Tool result returned
    ↓
[Thought] → Based on observation, what's next?
    ↓
(repeat until)
    ↓
[Final Answer]
```

The "Thought" step is critical — it forces the model to plan before acting, dramatically reducing errors in multi-step reasoning. Even without explicit ReAct formatting, the internal reasoning mechanism of modern models performs this implicitly.

---

## Tool Design Principles

Well-designed tools are the difference between a reliable agent and a chaos engine.

### Naming Convention
Use `verb_noun` format: `search_web`, `get_weather`, `create_issue`, `delete_record`.

### Description: The Most Important Part
The model uses the description to decide when to call the tool. A bad description = wrong tool choices.

```js
// BAD: Vague, no boundary conditions
{
  name: "search",
  description: "Search for things"
}

// GOOD: Clear scope, clear when to use, clear when NOT to use
{
  name: "search_documentation",
  description: "Search the engineering documentation for technical policies and procedures. Use for questions about deployment, code review, or team processes. Do NOT use for general knowledge questions or coding help."
}
```

### Parameter Design
- Minimize parameters — each parameter is an opportunity for the model to make a mistake
- Use sensible defaults where possible
- Use string over enum when the model might encounter variants
- Include format hints: `"start_date": { "type": "string", "description": "ISO 8601 format, e.g. 2024-01-15" }`

### Return Format
Always return structured JSON with consistent error handling:

```js
// Good return format
{ "success": true, "data": {...} }
{ "success": false, "error": "Item not found", "code": "NOT_FOUND" }

// Bad: inconsistent
"OK"           // Sometimes string
null           // Sometimes null
throw Error()  // Sometimes throws — agent can't recover
```

---

## Complete Tool Call Implementation

```js
async function runAgentLoop(userQuery, tools, toolFunctions) {
  const messages = [
    { role: "system", content: "Use available tools to answer the question." },
    { role: "user", content: userQuery }
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 10; // Safety limit

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
      tool_choice: "auto"
    });

    const choice = response.choices[0];

    // Model is done reasoning
    if (choice.finish_reason === "stop") {
      return choice.message.content;
    }

    // Model wants to call tools
    if (choice.finish_reason === "tool_calls") {
      messages.push(choice.message);

      // Execute ALL tool calls in parallel
      const toolResults = await Promise.all(
        choice.message.tool_calls.map(async (tc) => {
          const args = JSON.parse(tc.function.arguments);
          const fn = toolFunctions[tc.function.name];
          
          if (!fn) {
            return { id: tc.id, result: { error: "Tool not found" } };
          }
          
          try {
            const result = await fn(args);
            return { id: tc.id, result };
          } catch (err) {
            return { id: tc.id, result: { error: err.message } };
          }
        })
      );

      // Append all tool results
      toolResults.forEach(({ id, result }) => {
        messages.push({
          role: "tool",
          tool_call_id: id,
          content: JSON.stringify(result)
        });
      });
    }
  }

  return "Max iterations reached without final answer.";
}
```

---

## Parallel Tool Calls

Modern models can request multiple tools simultaneously. When you see an array of `tool_calls` in the response, execute them all with `Promise.all()`:

```js
// Model might request: get_weather("NYC") AND get_weather("London") simultaneously
// Don't serialize — run in parallel
const results = await Promise.all(
  toolCalls.map(tc => executeFunction(tc.function.name, JSON.parse(tc.function.arguments)))
);
```

---

## Multi-Agent Patterns

### Single Agent (Most Common)
One LLM + multiple tools. Simple, debuggable, good for 90% of use cases.

### Supervisor Pattern
An orchestrator agent delegates subtasks to specialist agents:
```
Orchestrator → Router → [Research Agent] → results
                     → [Code Agent] → results
                     → [Analysis Agent] → results
           ← Synthesizes final answer from all results
```

### Hierarchical Pattern
Nested supervisors. Each team has a supervisor that manages a subset of specialized agents. Scales to complex workflows but adds latency.

### Swarm Pattern (OpenAI Swarm)
Agents hand off to each other based on context — no central orchestrator. Agent A detects it needs help from Agent B and passes it the conversation. Good for natural handoffs (customer service → billing → technical support).

---

## Memory Types

| Type | Where Stored | Duration | Use Case |
|---|---|---|---|
| In-context (short-term) | Messages array | Single session | Conversation history |
| External episodic | Vector DB | Persistent | "Last time you said..." |
| External semantic | Structured DB | Persistent | User preferences, facts |
| Procedural | Fine-tuned weights | Permanent | Behavior/style adaptation |

For most production agents:
- In-context for current session
- External DB for user preferences and long-term memory
- Vector search to retrieve relevant past interactions

---

## Agent Safety

### Principle of Least Privilege
Only give the agent tools it actually needs. A customer service agent doesn't need `delete_database_table`. Every extra tool is attack surface.

### Human-in-the-Loop for Destructive Actions
Actions that are expensive, irreversible, or risky should require human confirmation:
- Sending emails to many recipients
- Deleting or modifying production data
- Making financial transactions
- Running code in production

### Input/Output Guardrails
```js
// Input guardrail: check for prompt injection before sending to agent
function validateAgentInput(input) {
  const injectionPatterns = [/ignore.*instructions/i, /you are now/i];
  if (injectionPatterns.some(p => p.test(input))) {
    throw new Error("Potential prompt injection detected");
  }
  return input;
}

// Output guardrail: validate tool call before executing
function validateToolCall(toolName, args) {
  if (toolName === "delete_records") {
    if (!args.confirmed || args.confirmed !== true) {
      throw new Error("Deletion requires explicit confirmation");
    }
    if (!args.where_clause) {
      throw new Error("DELETE without WHERE clause not allowed");
    }
  }
}
```

### Max Iterations + Cost Budget
```js
const RUN_CONFIG = {
  maxIterations: 10,       // Never loop forever
  maxInputTokens: 100_000, // Per run budget
  maxCostCents: 50,        // $0.50 per run maximum
};
```

---

## OpenAI Assistants API

The Assistants API provides a managed stateful agent:
- **Thread:** conversation session, auto-managed message history
- **Message:** user input or assistant response in a Thread
- **Run:** execution of an Assistant on a Thread
- **Run Step:** individual LLM call or tool execution within a Run
- **Tool Output:** your code's response to a tool call

```js
// Create a run
const run = await openai.beta.threads.runs.create(threadId, {
  assistant_id: assistantId,
  instructions: "Focus on technical accuracy."
});

// Poll until complete (or use streaming)
while (run.status === "queued" || run.status === "in_progress") {
  await sleep(1000);
  run = await openai.beta.threads.runs.retrieve(threadId, run.id);
  
  if (run.status === "requires_action") {
    // Execute tool calls and submit outputs
    const toolOutputs = await executeAllTools(run.required_action.submit_tool_outputs.tool_calls);
    await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, { tool_outputs: toolOutputs });
  }
}
```

The Assistants API is convenient for consumer applications but less flexible for custom agent logic. For full control, use the Chat Completions API with your own agent loop.

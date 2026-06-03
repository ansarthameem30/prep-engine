/**
 * Day 46 — LangChain + LangGraph: Hands-On Exercises
 *
 * LangChain is primarily Python-based, so these exercises implement
 * the equivalent patterns in JavaScript using the OpenAI SDK directly —
 * showing what LangChain/LangGraph are actually doing under the hood.
 *
 * This gives you deeper understanding than using the framework blindly.
 *
 * Prerequisites: npm install openai
 * Set OPENAI_API_KEY in your environment
 */

const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: LCEL-style RAG Chain
// Implements: retriever | prompt | model | parser
// ─────────────────────────────────────────────────────────────────────────────

// Lightweight "Runnable" abstraction — mirrors LangChain's interface
class Runnable {
  constructor(fn) { this.fn = fn; }
  async invoke(input) { return this.fn(input); }
  pipe(next) {
    return new Runnable(async (input) => {
      const output = await this.fn(input);
      return next.invoke(output);
    });
  }
}

// Mock vector store retriever
const DOCS = [
  { id: 1, text: "The team uses GitHub Actions for CI/CD. All PRs require passing tests.", topic: "ci_cd" },
  { id: 2, text: "Code reviews must be completed within 24 hours. Use LGTM to approve.", topic: "reviews" },
  { id: 3, text: "On-call engineers respond to P1 incidents within 15 minutes.", topic: "incidents" },
  { id: 4, text: "Use semantic versioning for all packages. Tag releases in git.", topic: "versioning" },
];

function createRetriever(docs) {
  return new Runnable(async (query) => {
    // Simple keyword retrieval (in real LangChain: vector similarity)
    const queryLower = query.toLowerCase();
    return docs.filter((d) =>
      d.text.toLowerCase().includes(queryLower.split(" ")[0]) ||
      queryLower.includes(d.topic.replace("_", " "))
    ).slice(0, 2);
  });
}

function createPromptBuilder(template) {
  return new Runnable(async ({ query, docs }) => {
    const context = docs.map((d, i) => `[${i + 1}] ${d.text}`).join("\n");
    return template.replace("{context}", context).replace("{question}", query);
  });
}

function createLLMCaller(options = {}) {
  return new Runnable(async (prompt) => {
    const response = await client.chat.completions.create({
      model: options.model || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens || 200,
    });
    return response.choices[0].message.content;
  });
}

async function exercise1_LCELStyleRAG() {
  console.log("=== Exercise 1: LCEL-Style RAG Chain ===\n");

  const retriever = createRetriever(DOCS);

  // This step: combine query with retrieved docs → single object for prompt
  const contextBuilder = new Runnable(async (query) => {
    const docs = await retriever.invoke(query);
    return { query, docs };
  });

  const promptBuilder = createPromptBuilder(
    "Answer using only this context:\n{context}\n\nQuestion: {question}"
  );

  const llm = createLLMCaller({ temperature: 0.1 });

  // Chain: query → contextBuilder → promptBuilder → llm
  const ragChain = contextBuilder.pipe(promptBuilder).pipe(llm);

  const questions = ["How does code review work?", "What are the CI/CD tools?"];

  for (const q of questions) {
    console.log(`Q: ${q}`);
    const answer = await ragChain.invoke(q);
    console.log(`A: ${answer}\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: RunnableParallel — Summarize + Translate in Parallel
// Both chains run concurrently, results merged
// ─────────────────────────────────────────────────────────────────────────────

class RunnableParallel {
  constructor(branches) { this.branches = branches; }

  async invoke(input) {
    const entries = Object.entries(this.branches);
    // Execute all branches in parallel
    const results = await Promise.all(
      entries.map(([key, runnable]) => runnable.invoke(input).then((r) => [key, r]))
    );
    return Object.fromEntries(results);
  }
}

async function callLLM(prompt, maxTokens = 200) {
  const r = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: maxTokens,
  });
  return r.choices[0].message.content;
}

async function exercise2_parallelChains() {
  console.log("=== Exercise 2: RunnableParallel ===\n");

  const article = `
    Machine learning engineers are increasingly required to understand both
    model training pipelines and production deployment infrastructure.
    The role has evolved from pure research to a blend of data science,
    software engineering, and DevOps. Modern ML systems require continuous
    monitoring, A/B testing, and rapid iteration cycles.
  `.trim();

  const parallel = new RunnableParallel({
    summary: new Runnable(async (text) =>
      callLLM(`Summarize in one sentence: ${text}`, 80)
    ),
    spanish: new Runnable(async (text) =>
      callLLM(`Translate to Spanish: ${text}`, 200)
    ),
    keyTopics: new Runnable(async (text) =>
      callLLM(`List 3 key topics from this text as JSON array of strings: ${text}`, 80)
    ),
  });

  const startTime = Date.now();
  const result = await parallel.invoke(article);
  console.log(`Parallel execution: ${Date.now() - startTime}ms\n`);

  console.log("Summary:", result.summary);
  console.log("\nSpanish:", result.spanish);
  console.log("\nKey Topics:", result.keyTopics);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: LangGraph-Style ReAct Agent
// State machine: check → tool call → observe → repeat → final answer
// ─────────────────────────────────────────────────────────────────────────────

// Define agent state and nodes
function createAgentState(query) {
  return {
    query,
    messages: [{ role: "user", content: query }],
    toolResults: [],
    finalAnswer: null,
    iterations: 0,
  };
}

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_docs",
      description: "Search the engineering documentation",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Perform arithmetic calculations",
      parameters: {
        type: "object",
        properties: { expression: { type: "string" } },
        required: ["expression"],
      },
    },
  },
];

function executeTool(name, args) {
  if (name === "search_docs") {
    const results = DOCS.filter((d) =>
      d.text.toLowerCase().includes(args.query.toLowerCase().split(" ")[0])
    );
    return results.length > 0
      ? results.map((d) => d.text).join("\n")
      : "No relevant documentation found.";
  }
  if (name === "calculate") {
    if (!/^[0-9+\-*/(). ]+$/.test(args.expression)) return "Invalid expression";
    return String(Function(`"use strict"; return (${args.expression})`)());
  }
  return "Tool not found";
}

// Node: call the LLM with current state
async function agentNode(state) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant with access to tools. Use them to answer questions." },
      ...state.messages,
    ],
    tools: AGENT_TOOLS,
    tool_choice: "auto",
    max_tokens: 300,
  });

  return { ...state, lastResponse: response.choices[0] };
}

// Node: execute tool calls
async function toolNode(state) {
  const toolCalls = state.lastResponse.message.tool_calls;
  const results = [];

  for (const tc of toolCalls) {
    const args = JSON.parse(tc.function.arguments);
    const result = executeTool(tc.function.name, args);
    results.push({ id: tc.id, result });
  }

  const newMessages = [
    state.lastResponse.message,
    ...results.map(({ id, result }) => ({
      role: "tool",
      tool_call_id: id,
      content: result,
    })),
  ];

  return {
    ...state,
    messages: [...state.messages, ...newMessages],
    toolResults: [...state.toolResults, ...results],
    iterations: state.iterations + 1,
  };
}

// Routing function: should we continue or stop?
function shouldContinue(state) {
  if (state.iterations >= 5) return "end"; // Safety limit
  if (state.lastResponse.finish_reason === "tool_calls") return "tools";
  return "end";
}

async function exercise3_langGraphReAct() {
  console.log("\n=== Exercise 3: LangGraph-Style ReAct Agent ===\n");

  const query = "What are the code review policies and how long do reviews take?";
  console.log(`Query: "${query}"\n`);

  let state = createAgentState(query);

  // State machine loop — mimics LangGraph's cycle execution
  while (true) {
    state = await agentNode(state);
    const route = shouldContinue(state);

    if (route === "tools") {
      console.log(`[Iteration ${state.iterations + 1}] Model called tools:`);
      state.lastResponse.message.tool_calls.forEach((tc) =>
        console.log(`  → ${tc.function.name}(${tc.function.arguments})`)
      );
      state = await toolNode(state);
    } else {
      state.finalAnswer = state.lastResponse.message.content;
      break;
    }
  }

  console.log("\nFinal Answer:", state.finalAnswer);
  console.log(`[Completed in ${state.iterations} tool call(s)]`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: LangGraph Conversation Agent with Memory
// Persist last 10 turns in state, use as conversation history
// ─────────────────────────────────────────────────────────────────────────────

class ConversationAgent {
  constructor(maxHistory = 10) {
    this.state = {
      messages: [],
      summary: null,
    };
    this.maxHistory = maxHistory;
    this.systemPrompt = "You are a friendly software engineering mentor. Remember previous context in the conversation.";
  }

  // State management: keep last N turns, summarize older turns
  async manageHistory() {
    if (this.state.messages.length > this.maxHistory * 2) {
      const oldMessages = this.state.messages.slice(0, -this.maxHistory);
      const oldText = oldMessages.map((m) => `${m.role}: ${m.content}`).join("\n");

      const summaryResponse = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: `Summarize this conversation in 2-3 sentences:\n${oldText}` },
        ],
        max_tokens: 100,
        temperature: 0,
      });

      this.state.summary = summaryResponse.choices[0].message.content;
      this.state.messages = this.state.messages.slice(-this.maxHistory);
      console.log(`  [Memory: summarized ${oldMessages.length} messages]`);
    }
  }

  async chat(userMessage) {
    this.state.messages.push({ role: "user", content: userMessage });
    await this.manageHistory();

    const systemContent = this.state.summary
      ? `${this.systemPrompt}\n\nConversation summary so far: ${this.state.summary}`
      : this.systemPrompt;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        ...this.state.messages,
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0].message.content;
    this.state.messages.push({ role: "assistant", content: assistantMessage });

    return assistantMessage;
  }
}

async function exercise4_conversationWithMemory() {
  console.log("\n=== Exercise 4: Conversation Agent with Memory ===\n");

  const agent = new ConversationAgent(4); // Keep last 4 messages (2 turns)

  const turns = [
    "Hi! I'm learning about microservices.",
    "What's the difference between a service mesh and an API gateway?",
    "Can you give me a specific example with Kubernetes?",
    "How does this relate to what I was learning initially?",
  ];

  for (const message of turns) {
    console.log(`User: ${message}`);
    const response = await agent.chat(message);
    console.log(`Agent: ${response.substring(0, 120)}...`);
    console.log(`  [History: ${agent.state.messages.length} messages, Summary: ${agent.state.summary ? "yes" : "no"}]\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Human-in-the-Loop — Pause for Approval Before Action
// Simulates LangGraph's interrupt_before functionality
// ─────────────────────────────────────────────────────────────────────────────

class HumanInTheLoopAgent {
  constructor() {
    this.pendingAction = null;
    this.state = "idle";
  }

  // Agent proposes an action, then pauses
  async proposeAction(task) {
    console.log(`\nAgent analyzing task: "${task}"`);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an agent that proposes actions to complete tasks.
Respond with JSON: {"action": "description of what to do", "risk_level": "low/medium/high", "reversible": true/false}`,
        },
        { role: "user", content: task },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    this.pendingAction = JSON.parse(response.choices[0].message.content);
    this.state = "awaiting_approval";
    return this.pendingAction;
  }

  // Simulate human review
  async getHumanApproval(action) {
    // In production: send to UI, wait for webhook, etc.
    // Here we auto-approve low-risk and reject high-risk actions
    const approved = action.risk_level !== "high";
    console.log(`  [Human Review] Risk: ${action.risk_level} → ${approved ? "APPROVED" : "REJECTED"}`);
    return approved;
  }

  // Execute the approved action
  async executeAction(action) {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: `Execute this action and describe what you did: ${action.action}` },
      ],
      max_tokens: 100,
    });
    return response.choices[0].message.content;
  }

  async run(task) {
    const proposedAction = await this.proposeAction(task);
    console.log(`\nProposed action: ${JSON.stringify(proposedAction, null, 2)}`);

    // INTERRUPT: wait for human approval
    const approved = await this.getHumanApproval(proposedAction);

    if (approved) {
      this.state = "executing";
      const result = await this.executeAction(proposedAction);
      this.state = "complete";
      return { status: "completed", result };
    } else {
      this.state = "rejected";
      return { status: "rejected", reason: "Human rejected action due to high risk" };
    }
  }
}

async function exercise5_humanInTheLoop() {
  console.log("\n=== Exercise 5: Human-in-the-Loop ===\n");

  const agent = new HumanInTheLoopAgent();

  const tasks = [
    "Send a summary email to the team about the deployment",
    "Delete all records from the test_users table in production",
    "Update the README with the new API endpoints",
  ];

  for (const task of tasks) {
    console.log(`\nTask: "${task}"`);
    const result = await agent.run(task);
    console.log(`Result: ${JSON.stringify(result)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.log("Set OPENAI_API_KEY to run these exercises.");
    return;
  }

  await exercise1_LCELStyleRAG();
  await exercise2_parallelChains();
  await exercise3_langGraphReAct();
  await exercise4_conversationWithMemory();
  await exercise5_humanInTheLoop();
}

main().catch(console.error);

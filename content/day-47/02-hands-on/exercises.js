/**
 * Day 47 — AI Agents + Tool Use: Hands-On Exercises
 * Prerequisites: npm install openai
 * Set OPENAI_API_KEY in your environment
 */

const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Full ReAct Agent from Scratch
// Manual tool call loop with OpenAI function calling
// ─────────────────────────────────────────────────────────────────────────────

// Tool implementations
const TOOL_IMPLS = {
  search_docs: (args) => {
    const db = {
      "jwt": "JWT tokens contain header, payload, signature. Sign with HS256. Verify on each request.",
      "deploy": "Deployments run Tue-Thu 10am-3pm PST. Requires deploy ticket and approval.",
      "review": "Code reviews within 24 hours. Use LGTM to approve. Two approvals for hotfixes.",
      "react": "React hooks: useState for state, useEffect for side effects, useCallback to memoize functions.",
      "postgres": "Use transactions for atomicity. Index foreign keys. EXPLAIN ANALYZE for query optimization.",
    };
    const key = args.query.toLowerCase().split(" ").find((w) => db[w]);
    return key ? { result: db[key] } : { error: "No documentation found for: " + args.query };
  },

  calculate: (args) => {
    const expr = args.expression;
    if (!/^[0-9+\-*/(). ]+$/.test(expr)) return { error: "Invalid expression" };
    try {
      return { result: Function(`"use strict"; return (${expr})`)() };
    } catch {
      return { error: "Calculation failed" };
    }
  },

  get_current_date: () => {
    return { date: new Date().toISOString().split("T")[0], dayOfWeek: new Date().toLocaleDateString("en-US", { weekday: "long" }) };
  },
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_docs",
      description: "Search engineering documentation for team processes, policies, and technical guides. Use for questions about deployment, code review, JWT, React, or Postgres.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Search query (e.g., 'jwt', 'deploy', 'react')" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Perform arithmetic calculations. Use for math expressions.",
      parameters: {
        type: "object",
        properties: { expression: { type: "string", description: "Math expression e.g. '(150 * 1.08) + 50'" } },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_current_date",
      description: "Get the current date and day of week. Use when asked about today's date or scheduling.",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function runReActAgent(userQuery, verbose = true) {
  const messages = [
    {
      role: "system",
      content: "You are a helpful engineering assistant. Use tools to find accurate information. Think step by step.",
    },
    { role: "user", content: userQuery },
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 8;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 400,
    });

    const choice = response.choices[0];

    if (choice.finish_reason === "stop") {
      return { answer: choice.message.content, iterations };
    }

    if (choice.finish_reason === "tool_calls") {
      if (verbose) {
        console.log(`  [Iteration ${iterations}] Tool calls requested:`);
        choice.message.tool_calls.forEach((tc) =>
          console.log(`    → ${tc.function.name}(${tc.function.arguments})`)
        );
      }

      messages.push(choice.message);

      const toolResults = await Promise.all(
        choice.message.tool_calls.map(async (tc) => {
          const args = JSON.parse(tc.function.arguments);
          const fn = TOOL_IMPLS[tc.function.name];
          const result = fn ? fn(args) : { error: "Tool not found" };
          if (verbose) console.log(`    ← ${tc.function.name}: ${JSON.stringify(result)}`);
          return { id: tc.id, result };
        })
      );

      toolResults.forEach(({ id, result }) => {
        messages.push({ role: "tool", tool_call_id: id, content: JSON.stringify(result) });
      });
    }
  }

  return { answer: "Max iterations reached", iterations };
}

async function exercise1_reactAgent() {
  console.log("=== Exercise 1: Full ReAct Agent ===\n");

  const queries = [
    "What are the code review requirements and how long do they take?",
    "What is 15% of 3450 plus 200?",
    "Can I deploy today? What's the date?",
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    const { answer, iterations } = await runReActAgent(query, true);
    console.log(`Answer: ${answer}`);
    console.log(`Iterations: ${iterations}\n${"─".repeat(50)}\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Multi-Tool Agent
// Database query tool + calculation tool + web search simulation
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_DB = {
  employees: [
    { id: 1, name: "Alice Chen", salary: 120000, department: "Engineering", startDate: "2022-03-15" },
    { id: 2, name: "Bob Smith", salary: 95000, department: "Engineering", startDate: "2023-01-10" },
    { id: 3, name: "Carol White", salary: 140000, department: "Engineering", startDate: "2021-06-01" },
    { id: 4, name: "David Park", salary: 75000, department: "Marketing", startDate: "2023-07-20" },
  ],
};

const MULTI_TOOLS = [
  ...TOOLS,
  {
    type: "function",
    function: {
      name: "query_database",
      description: "Query the employee database. Can filter by department. Use when asked about employees, salaries, or teams.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name (employees)" },
          filter_department: { type: "string", description: "Filter by department name (optional)" },
          fields: { type: "array", items: { type: "string" }, description: "Fields to return" },
        },
        required: ["table"],
      },
    },
  },
];

const EXTENDED_TOOL_IMPLS = {
  ...TOOL_IMPLS,
  query_database: (args) => {
    let results = MOCK_DB[args.table] || [];
    if (args.filter_department) {
      results = results.filter((r) => r.department === args.filter_department);
    }
    if (args.fields) {
      results = results.map((r) => {
        const obj = {};
        args.fields.forEach((f) => { obj[f] = r[f]; });
        return obj;
      });
    }
    return { count: results.length, results };
  },
};

async function exercise2_multiToolAgent() {
  console.log("\n=== Exercise 2: Multi-Tool Agent ===\n");

  const query = "What is the total salary budget for the Engineering department, and how many engineers do we have?";
  console.log(`Query: "${query}"\n`);

  const messages = [
    { role: "system", content: "Answer questions using the available tools. Show your reasoning." },
    { role: "user", content: query },
  ];

  let iterations = 0;
  while (iterations < 6) {
    iterations++;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: MULTI_TOOLS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    if (choice.finish_reason === "stop") {
      console.log("Final Answer:", choice.message.content);
      break;
    }

    if (choice.finish_reason === "tool_calls") {
      console.log(`[Iteration ${iterations}]`);
      messages.push(choice.message);

      const results = await Promise.all(
        choice.message.tool_calls.map(async (tc) => {
          const args = JSON.parse(tc.function.arguments);
          const fn = EXTENDED_TOOL_IMPLS[tc.function.name];
          const result = fn ? fn(args) : { error: "Unknown tool" };
          console.log(`  ${tc.function.name}: ${JSON.stringify(result).substring(0, 100)}...`);
          return { id: tc.id, result };
        })
      );

      results.forEach(({ id, result }) => {
        messages.push({ role: "tool", tool_call_id: id, content: JSON.stringify(result) });
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Multi-Agent Supervisor
// Supervisor routes to "research agent" vs "code agent" based on task type
// ─────────────────────────────────────────────────────────────────────────────

async function researchAgent(task) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a research specialist. Provide detailed, factual information. Cite any sources when possible." },
      { role: "user", content: task },
    ],
    temperature: 0.2,
    max_tokens: 300,
  });
  return { agent: "research", result: response.choices[0].message.content };
}

async function codeAgent(task) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a code specialist. Provide working code examples with brief explanations. Always use TypeScript when possible." },
      { role: "user", content: task },
    ],
    temperature: 0.1,
    max_tokens: 400,
  });
  return { agent: "code", result: response.choices[0].message.content };
}

async function supervisorAgent(task) {
  // Supervisor classifies the task
  const classifyResponse = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: 'Classify this task as either "code" or "research". Reply with only one word.',
      },
      { role: "user", content: task },
    ],
    temperature: 0,
    max_tokens: 5,
  });

  const taskType = classifyResponse.choices[0].message.content.toLowerCase().trim();
  console.log(`  Supervisor → routing to: ${taskType} agent`);

  if (taskType === "code") {
    return codeAgent(task);
  } else {
    return researchAgent(task);
  }
}

async function exercise3_multiAgent() {
  console.log("\n=== Exercise 3: Multi-Agent Supervisor ===\n");

  const tasks = [
    "Explain what a distributed system is and the key challenges it presents.",
    "Write a TypeScript function that debounces an async function call.",
    "What are the main differences between SQL and NoSQL databases?",
    "Show me how to implement a binary search in JavaScript.",
  ];

  for (const task of tasks) {
    console.log(`Task: "${task.substring(0, 70)}"`);
    const { agent, result } = await supervisorAgent(task);
    console.log(`  Handled by: ${agent} agent`);
    console.log(`  Response: "${result.substring(0, 120)}..."\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Safety Guardrails
// Tool input validation + max iterations + cost budget per run
// ─────────────────────────────────────────────────────────────────────────────

class SafeAgent {
  constructor(config = {}) {
    this.maxIterations = config.maxIterations || 5;
    this.maxCostCents = config.maxCostCents || 10; // $0.10 budget
    this.currentCostCents = 0;
    this.iterations = 0;
    this.blockedTools = config.blockedTools || [];
    this.dangerousOperations = config.dangerousOperations || ["delete", "drop", "truncate"];
  }

  validateToolCall(toolName, args) {
    // Block restricted tools
    if (this.blockedTools.includes(toolName)) {
      throw new Error(`Tool "${toolName}" is not allowed in this context`);
    }

    // Check for dangerous SQL operations
    if (toolName === "execute_sql") {
      const sql = (args.query || "").toLowerCase();
      for (const op of this.dangerousOperations) {
        if (sql.includes(op)) {
          throw new Error(`Dangerous SQL operation "${op}" blocked`);
        }
      }
    }

    // Validate required parameters
    if (toolName === "send_email" && !args.recipient?.includes("@")) {
      throw new Error("Invalid email recipient");
    }

    return true;
  }

  trackCost(inputTokens, outputTokens) {
    // GPT-4o-mini: $0.15/1M input, $0.60/1M output
    const cost = (inputTokens / 1_000_000) * 15 + (outputTokens / 1_000_000) * 60; // In cents
    this.currentCostCents += cost;

    if (this.currentCostCents > this.maxCostCents) {
      throw new Error(`Budget exceeded: $${(this.currentCostCents / 100).toFixed(4)} > $${(this.maxCostCents / 100).toFixed(2)}`);
    }
  }

  checkIterationLimit() {
    this.iterations++;
    if (this.iterations > this.maxIterations) {
      throw new Error(`Max iterations (${this.maxIterations}) exceeded`);
    }
  }

  async run(query, tools, toolFunctions) {
    console.log(`  [SafeAgent] Budget: $${this.maxCostCents / 100}, Max iterations: ${this.maxIterations}`);
    const messages = [
      { role: "system", content: "Use tools to answer questions." },
      { role: "user", content: query },
    ];

    try {
      while (true) {
        this.checkIterationLimit();

        const response = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          tools: tools.length > 0 ? tools : undefined,
          max_tokens: 200,
        });

        this.trackCost(response.usage.prompt_tokens, response.usage.completion_tokens);

        const choice = response.choices[0];
        if (choice.finish_reason === "stop") {
          return { success: true, answer: choice.message.content, cost: this.currentCostCents };
        }

        if (choice.finish_reason === "tool_calls") {
          messages.push(choice.message);
          for (const tc of choice.message.tool_calls) {
            try {
              const args = JSON.parse(tc.function.arguments);
              this.validateToolCall(tc.function.name, args);
              const fn = toolFunctions[tc.function.name];
              const result = fn ? fn(args) : { error: "Tool not found" };
              messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
            } catch (validationError) {
              console.log(`  [SafeAgent] Tool blocked: ${validationError.message}`);
              messages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify({ error: validationError.message }),
              });
            }
          }
        }
      }
    } catch (safetyError) {
      return { success: false, error: safetyError.message, cost: this.currentCostCents };
    }
  }
}

async function exercise4_safetyGuardrails() {
  console.log("\n=== Exercise 4: Safety Guardrails ===\n");

  const safeAgent = new SafeAgent({
    maxIterations: 3,
    maxCostCents: 1,
    blockedTools: ["send_payment"],
    dangerousOperations: ["delete", "drop"],
  });

  const result = await safeAgent.run(
    "What are the JWT authentication policies?",
    TOOLS,
    TOOL_IMPLS
  );

  console.log("\nResult:", JSON.stringify(result, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Memory Agent
// Store conversation summaries, retrieve at start of session
// ─────────────────────────────────────────────────────────────────────────────

class MemoryAgent {
  constructor() {
    // Simulate external memory store (in production: use a DB)
    this.longTermMemory = new Map(); // userId → [{topic, summary, timestamp}]
  }

  async summarizeAndStore(userId, conversation) {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Extract key facts from this conversation as a JSON object with keys: main_topic, key_facts (array), user_preferences (object):\n${conversation}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 150,
    });

    const memory = {
      ...JSON.parse(response.choices[0].message.content),
      timestamp: new Date().toISOString(),
    };

    if (!this.longTermMemory.has(userId)) this.longTermMemory.set(userId, []);
    this.longTermMemory.get(userId).push(memory);
    return memory;
  }

  retrieveMemory(userId) {
    const memories = this.longTermMemory.get(userId) || [];
    if (memories.length === 0) return null;
    // Return 3 most recent memories
    return memories.slice(-3);
  }

  async chat(userId, userMessage) {
    const memories = this.retrieveMemory(userId);
    const memoryContext = memories
      ? `Previous session memories:\n${memories.map((m) => `- Topic: ${m.main_topic}, Facts: ${m.key_facts?.join(", ")}`).join("\n")}`
      : "No previous memories.";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant. Use the user's memory to personalize responses.\n${memoryContext}`,
        },
        { role: "user", content: userMessage },
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  }
}

async function exercise5_memoryAgent() {
  console.log("\n=== Exercise 5: Memory Agent ===\n");

  const agent = new MemoryAgent();
  const userId = "user-123";

  // Simulate session 1
  console.log("--- Session 1 ---");
  const conversation = "User: I prefer TypeScript over JavaScript. I'm working on a REST API with Express and PostgreSQL. User: My main concern is type safety in database queries.";
  const memory = await agent.summarizeAndStore(userId, conversation);
  console.log("Stored memory:", JSON.stringify(memory, null, 2));

  // Session 2: agent uses memory
  console.log("\n--- Session 2 (new session, uses memory) ---");
  const responses = [
    "What ORM should I use for my project?",
    "What are best practices for error handling?",
  ];

  for (const q of responses) {
    console.log(`User: ${q}`);
    const response = await agent.chat(userId, q);
    console.log(`Agent: ${response.substring(0, 150)}...\n`);
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

  await exercise1_reactAgent();
  await exercise2_multiToolAgent();
  await exercise3_multiAgent();
  await exercise4_safetyGuardrails();
  await exercise5_memoryAgent();
}

main().catch(console.error);

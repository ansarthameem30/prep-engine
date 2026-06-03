/**
 * Day 42 — OpenAI API Mastery: Hands-On Exercises
 * Prerequisites: npm install openai
 * Set OPENAI_API_KEY in your environment
 */

const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Chat with Conversation History Management
// Maintain last N messages within a token budget
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = "You are a helpful senior software engineering mentor.";
const MAX_HISTORY_TOKENS = 2000;

function estimateTokens(text) {
  return Math.ceil(text.length / 4); // ~4 chars per token
}

function buildMessagesWithBudget(history, userMessage) {
  const systemTokens = estimateTokens(SYSTEM_PROMPT) + 10;
  const userTokens = estimateTokens(userMessage) + 10;
  const reservedForResponse = 500;
  let budget = MAX_HISTORY_TOKENS - systemTokens - userTokens - reservedForResponse;

  // Fit as many recent history messages as possible (newest first)
  const fittedHistory = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(history[i].content) + 10;
    if (budget - msgTokens < 0) break;
    budget -= msgTokens;
    fittedHistory.unshift(history[i]); // Prepend to maintain order
  }

  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...fittedHistory,
    { role: "user", content: userMessage },
  ];
}

async function exercise1_chatWithHistory() {
  console.log("=== Exercise 1: Chat with History Management ===\n");

  const history = [];

  const turns = [
    "What is a closure in JavaScript?",
    "Can you show me an example with a counter?",
    "What's the difference between closure and a class?",
  ];

  for (const userMessage of turns) {
    const messages = buildMessagesWithBudget(history, userMessage);
    console.log(`User: ${userMessage}`);
    console.log(`  [Sending ${messages.length} messages, ~${messages.reduce((t,m) => t + estimateTokens(m.content), 0)} tokens]`);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 200,
      temperature: 0.3,
    });

    const assistantMessage = response.choices[0].message.content;
    console.log(`Assistant: ${assistantMessage.substring(0, 100)}...\n`);

    // Add to history for next turn
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: assistantMessage });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Streaming Completion with Real-Time Token Display
// ─────────────────────────────────────────────────────────────────────────────

async function exercise2_streaming() {
  console.log("=== Exercise 2: Streaming Completion ===\n");

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: "Explain how async/await works in JavaScript in 3 paragraphs.",
      },
    ],
    stream: true,
    max_tokens: 300,
  });

  let fullText = "";
  let tokenCount = 0;
  const startTime = Date.now();

  process.stdout.write("Response: ");

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      process.stdout.write(delta); // Real-time display
      fullText += delta;
      tokenCount++;
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`\n\n[Stream complete: ~${tokenCount} chunks in ${elapsed}ms]`);
  console.log(`[Approx tokens: ${estimateTokens(fullText)}]`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Function Calling — Weather + Calculator Tool Loop
// Multi-step tool use with parallel execution
// ─────────────────────────────────────────────────────────────────────────────

// Mock tool implementations
const MOCK_WEATHER = {
  London: { temp: 15, condition: "Cloudy" },
  NYC: { temp: 22, condition: "Sunny" },
  Tokyo: { temp: 28, condition: "Humid" },
};

function get_weather(city) {
  const data = MOCK_WEATHER[city] || { temp: 20, condition: "Unknown" };
  return { city, temperature: data.temp, condition: data.condition, unit: "Celsius" };
}

function calculate(expression) {
  // Safe evaluation: only allow numbers and basic operators
  if (!/^[0-9+\-*/(). ]+$/.test(expression)) {
    return { error: "Invalid expression" };
  }
  try {
    return { expression, result: Function(`"use strict"; return (${expression})`)() };
  } catch {
    return { error: "Calculation failed" };
  }
}

function executeToolCall(name, args) {
  const tools = { get_weather, calculate };
  if (!tools[name]) return { error: `Unknown tool: ${name}` };
  return tools[name](args.city || args.expression);
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather for a city. Use only for real-time weather queries.",
      parameters: {
        type: "object",
        properties: { city: { type: "string", description: "City name e.g. London, NYC" } },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Perform mathematical calculations. Use for any arithmetic.",
      parameters: {
        type: "object",
        properties: { expression: { type: "string", description: "Math expression like '(15 * 1.8) + 32'" } },
        required: ["expression"],
      },
    },
  },
];

async function exercise3_functionCalling() {
  console.log("\n=== Exercise 3: Function Calling ===\n");

  const messages = [
    {
      role: "user",
      content:
        "What's the weather in London and NYC? Also, what is 1337 * 42 + 100?",
    },
  ];

  let response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools: TOOLS,
    tool_choice: "auto",
  });

  // Tool call loop — repeat until model stops requesting tools
  while (response.choices[0].finish_reason === "tool_calls") {
    const toolCalls = response.choices[0].message.tool_calls;
    console.log(`Model requested ${toolCalls.length} tool call(s):`);
    toolCalls.forEach((tc) => console.log(`  → ${tc.function.name}(${tc.function.arguments})`));

    // Execute all tool calls in parallel
    const toolResults = await Promise.all(
      toolCalls.map(async (tc) => {
        const args = JSON.parse(tc.function.arguments);
        const result = executeToolCall(tc.function.name, args);
        return { id: tc.id, result };
      })
    );

    // Append assistant message (with tool_calls) and tool results
    messages.push(response.choices[0].message);
    toolResults.forEach(({ id, result }) => {
      messages.push({ role: "tool", tool_call_id: id, content: JSON.stringify(result) });
    });

    // Continue conversation
    response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: TOOLS,
    });
  }

  console.log("\nFinal answer:", response.choices[0].message.content);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Structured Output — Invoice Extraction
// Extract structured data from unstructured text using JSON schema
// ─────────────────────────────────────────────────────────────────────────────

async function exercise4_structuredOutput() {
  console.log("\n=== Exercise 4: Structured Output (Invoice Extraction) ===\n");

  const invoiceText = `
    INVOICE #INV-2024-0892
    From: TechCorp Solutions Ltd, 123 Silicon Ave, San Francisco CA
    To: Acme Corp, 456 Business Blvd, New York NY
    Date: November 15, 2024
    Due Date: December 15, 2024

    Items:
    - Cloud Infrastructure (Oct) .... $2,450.00
    - Developer Support (10 hrs) .... $1,500.00
    - Security Audit .... $800.00

    Subtotal: $4,750.00
    Tax (8.5%): $403.75
    TOTAL DUE: $5,153.75
  `;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: `Extract structured data from this invoice:\n${invoiceText}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "invoice",
        strict: true,
        schema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            date: { type: "string" },
            due_date: { type: "string" },
            vendor: {
              type: "object",
              properties: {
                name: { type: "string" },
                address: { type: "string" },
              },
              required: ["name", "address"],
              additionalProperties: false,
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  amount: { type: "number" },
                },
                required: ["description", "amount"],
                additionalProperties: false,
              },
            },
            subtotal: { type: "number" },
            tax: { type: "number" },
            total: { type: "number" },
          },
          required: ["invoice_number", "date", "due_date", "vendor", "items", "subtotal", "tax", "total"],
          additionalProperties: false,
        },
      },
    },
  });

  const extracted = JSON.parse(response.choices[0].message.content);
  console.log("Extracted invoice data:");
  console.log(JSON.stringify(extracted, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Batch Embeddings with Rate Limit Handling
// Embed 100 texts in batches of 20 with delay between batches
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate 100 sample texts
function generateSampleTexts(count) {
  const topics = [
    "machine learning",
    "web development",
    "cloud computing",
    "database design",
    "API design",
  ];
  return Array.from({ length: count }, (_, i) => {
    const topic = topics[i % topics.length];
    return `This is a sample text about ${topic} - item ${i + 1}. It covers best practices and modern approaches.`;
  });
}

async function batchEmbed(texts, batchSize = 20, delayMs = 200) {
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(`  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} (${batch.length} texts)...`);

    try {
      const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: batch,
      });

      allEmbeddings.push(...response.data.map((d) => d.embedding));

      // Polite delay to avoid rate limits
      if (i + batchSize < texts.length) {
        await sleep(delayMs);
      }
    } catch (err) {
      if (err.status === 429) {
        console.log("  Rate limited — waiting 10 seconds...");
        await sleep(10000);
        i -= batchSize; // Retry this batch
      } else {
        throw err;
      }
    }
  }

  return allEmbeddings;
}

async function exercise5_batchEmbeddings() {
  console.log("\n=== Exercise 5: Batch Embeddings ===\n");

  const texts = generateSampleTexts(20); // Use 20 for quick demo (100 for full test)
  console.log(`Embedding ${texts.length} texts in batches of 5...\n`);

  const embeddings = await batchEmbed(texts, 5, 100);

  console.log(`\nResults:`);
  console.log(`  Total embeddings: ${embeddings.length}`);
  console.log(`  Embedding dimensions: ${embeddings[0].length}`);

  // Quick similarity check between first and last
  function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
  }

  const sim01 = cosineSimilarity(embeddings[0], embeddings[1]);
  const sim04 = cosineSimilarity(embeddings[0], embeddings[4]);
  console.log(`\n  Similarity between text[0] and text[1] (same topic): ${sim01.toFixed(4)}`);
  console.log(`  Similarity between text[0] and text[4] (different topic): ${sim04.toFixed(4)}`);
  console.log(`  (Higher = more similar — same-topic pairs should score higher)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main runner
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.log("Set OPENAI_API_KEY to run these exercises.");
    return;
  }

  await exercise1_chatWithHistory();
  await exercise2_streaming();
  await exercise3_functionCalling();
  await exercise4_structuredOutput();
  await exercise5_batchEmbeddings();
}

main().catch(console.error);

/**
 * Day 41 — LLM Fundamentals: Hands-On Exercises
 * Prerequisites: npm install openai
 * Set OPENAI_API_KEY in your environment
 */

const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 1: Token Counting (Manual Approximation)
// Rule of thumb: 1 token ≈ 4 characters for English, ~75 words per 100 tokens
// ─────────────────────────────────────────────────────────────────────────────

function approximateTokenCount(text) {
  // Simple heuristic: 4 chars per token for English prose
  const charApproximation = Math.ceil(text.length / 4);

  // Word-based approximation: 100 tokens ≈ 75 words
  const words = text.trim().split(/\s+/).length;
  const wordApproximation = Math.ceil((words / 75) * 100);

  return {
    characters: text.length,
    words,
    charApproximation,
    wordApproximation,
    // Average of both for better accuracy
    estimate: Math.round((charApproximation + wordApproximation) / 2),
  };
}

function exercise1_tokenCounting() {
  console.log("=== Exercise 1: Token Counting ===\n");

  const samples = [
    "Hello, world!",
    "The quick brown fox jumps over the lazy dog.",
    "Explain the transformer architecture and how self-attention works in detail.",
    `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
    "你好世界", // Chinese — more tokens per character
    "Un-hap-pi-ness tokenization example showing subword units.",
  ];

  samples.forEach((text) => {
    const result = approximateTokenCount(text);
    console.log(`Text: "${text.substring(0, 50)}..."`);
    console.log(`  Chars: ${result.characters}, Words: ${result.words}`);
    console.log(`  Token estimate: ~${result.estimate}`);
    console.log(
      `  Rough cost at GPT-4o rate ($5/1M): $${((result.estimate / 1_000_000) * 5).toFixed(6)}\n`
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 2: Temperature Comparison
// Same prompt, different temperatures — observe variance in output
// ─────────────────────────────────────────────────────────────────────────────

async function exercise2_temperatureComparison() {
  console.log("=== Exercise 2: Temperature Comparison ===\n");

  const prompt =
    "Write a one-sentence product tagline for a coffee shop called 'Morning Brew'.";
  const temperatures = [0, 0.3, 0.7, 1.0];

  for (const temp of temperatures) {
    // Run twice at each temperature to show variance
    const results = [];
    for (let i = 0; i < 2; i++) {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: temp,
        max_tokens: 60,
      });
      results.push(response.choices[0].message.content.trim());
    }
    console.log(`Temperature ${temp}:`);
    console.log(`  Run 1: "${results[0]}"`);
    console.log(`  Run 2: "${results[1]}"`);
    console.log(
      `  Same? ${results[0] === results[1] ? "YES (deterministic)" : "NO (variance)"}\n`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 3: Context Window Management
// Truncate conversation history to stay within a token budget
// ─────────────────────────────────────────────────────────────────────────────

class ConversationManager {
  constructor(maxTokenBudget = 3000) {
    this.maxTokenBudget = maxTokenBudget;
    this.systemPrompt = "You are a helpful assistant.";
    this.messages = []; // Conversation history (without system)
  }

  // Estimate tokens for a message array
  estimateTokens(messages) {
    return messages.reduce((total, msg) => {
      // Each message has ~4 token overhead for role/formatting
      return total + approximateTokenCount(msg.content).estimate + 4;
    }, 0);
  }

  // Add a message and truncate history if needed
  addMessage(role, content) {
    this.messages.push({ role, content });
    this.truncateToFit();
  }

  // Keep system prompt + remove oldest user/assistant pairs until under budget
  truncateToFit() {
    const systemTokens = approximateTokenCount(this.systemPrompt).estimate + 4;
    const availableForHistory = this.maxTokenBudget - systemTokens - 500; // Reserve 500 for response

    while (
      this.estimateTokens(this.messages) > availableForHistory &&
      this.messages.length > 2
    ) {
      // Remove oldest pair (user + assistant message) to preserve context coherence
      this.messages.splice(0, 2);
      console.log("  [ConversationManager] Truncated oldest message pair");
    }
  }

  // Get the full messages array ready for API call
  getMessagesForAPI() {
    return [
      { role: "system", content: this.systemPrompt },
      ...this.messages,
    ];
  }

  getStats() {
    const totalTokens = this.estimateTokens(this.getMessagesForAPI());
    return {
      messageCount: this.messages.length,
      estimatedTokens: totalTokens,
      budgetUsed: `${((totalTokens / this.maxTokenBudget) * 100).toFixed(1)}%`,
    };
  }
}

function exercise3_contextManagement() {
  console.log("=== Exercise 3: Context Window Management ===\n");

  const manager = new ConversationManager(500); // Tight budget for demo

  // Simulate adding many messages
  const turns = [
    ["user", "What is machine learning?"],
    ["assistant", "Machine learning is a subset of AI where systems learn from data."],
    ["user", "Can you give me examples?"],
    ["assistant", "Sure! Image recognition, spam filtering, recommendation systems."],
    ["user", "How does deep learning differ?"],
    ["assistant", "Deep learning uses neural networks with many layers to learn hierarchical features."],
    ["user", "What about transformers?"],
    ["assistant", "Transformers use attention mechanisms instead of recurrence, enabling parallelization."],
  ];

  turns.forEach(([role, content]) => {
    manager.addMessage(role, content);
    const stats = manager.getStats();
    console.log(`After adding ${role} message:`);
    console.log(
      `  Messages: ${stats.messageCount}, Tokens: ~${stats.estimatedTokens}, Budget: ${stats.budgetUsed}`
    );
  });

  console.log("\nFinal messages array for API:");
  manager.getMessagesForAPI().forEach((m) => {
    console.log(`  [${m.role}]: "${m.content.substring(0, 60)}..."`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4: Cost Estimator
// Given a prompt + expected response length, estimate cost for different models
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_PRICING = {
  "gpt-4o": { input: 5.0, output: 15.0 }, // $ per 1M tokens
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "claude-3-5-sonnet": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku": { input: 0.8, output: 4.0 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
};

function estimateCost(promptText, expectedOutputWords, model) {
  const inputTokens = approximateTokenCount(promptText).estimate;
  const outputTokens = Math.ceil((expectedOutputWords / 75) * 100);

  const pricing = MODEL_PRICING[model];
  if (!pricing) throw new Error(`Unknown model: ${model}`);

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    model,
    inputTokens,
    outputTokens,
    inputCost: inputCost.toFixed(6),
    outputCost: outputCost.toFixed(6),
    totalCost: totalCost.toFixed(6),
    per1000Calls: (totalCost * 1000).toFixed(4),
  };
}

function exercise4_costEstimator() {
  console.log("=== Exercise 4: Cost Estimator ===\n");

  const prompt = `You are an expert software engineer.
Analyze the following code for bugs, performance issues, and security vulnerabilities.
Provide detailed recommendations for each issue found.

function processUserData(userData) {
  const query = "SELECT * FROM users WHERE id = " + userData.id;
  return db.execute(query);
}`;

  const expectedOutputWords = 200;

  console.log(`Prompt: "${prompt.substring(0, 80)}..."`);
  console.log(`Expected output: ~${expectedOutputWords} words\n`);

  Object.keys(MODEL_PRICING).forEach((model) => {
    const estimate = estimateCost(prompt, expectedOutputWords, model);
    console.log(`${model}:`);
    console.log(
      `  Input: ${estimate.inputTokens} tokens ($${estimate.inputCost})`
    );
    console.log(
      `  Output: ${estimate.outputTokens} tokens ($${estimate.outputCost})`
    );
    console.log(
      `  Total per call: $${estimate.totalCost} | Per 1K calls: $${estimate.per1000Calls}\n`
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise 5: Model Comparison
// Send same prompt to GPT-4o-mini and GPT-4o, compare quality and cost
// ─────────────────────────────────────────────────────────────────────────────

async function exercise5_modelComparison() {
  console.log("=== Exercise 5: Model Comparison ===\n");

  const prompt = `Explain what a closure is in JavaScript with a practical example.
  Keep it concise but complete.`;

  const models = ["gpt-4o-mini", "gpt-4o"];
  const results = {};

  for (const model of models) {
    const start = Date.now();
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });
    const latency = Date.now() - start;

    const usage = response.usage;
    const pricing = MODEL_PRICING[model];
    const cost =
      (usage.prompt_tokens / 1_000_000) * pricing.input +
      (usage.completion_tokens / 1_000_000) * pricing.output;

    results[model] = {
      content: response.choices[0].message.content,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      cost: cost.toFixed(6),
      latencyMs: latency,
    };
  }

  Object.entries(results).forEach(([model, result]) => {
    console.log(`\n${model.toUpperCase()}:`);
    console.log(`Latency: ${result.latencyMs}ms`);
    console.log(
      `Tokens: ${result.inputTokens} in / ${result.outputTokens} out`
    );
    console.log(`Cost: $${result.cost}`);
    console.log(`\nResponse:\n${result.content}`);
    console.log("\n" + "─".repeat(60));
  });

  const speedup =
    results["gpt-4o"].latencyMs / results["gpt-4o-mini"].latencyMs;
  const costRatio =
    parseFloat(results["gpt-4o"].cost) /
    parseFloat(results["gpt-4o-mini"].cost);
  console.log(`\nConclusion: GPT-4o-mini is ~${costRatio.toFixed(1)}x cheaper and ~${speedup.toFixed(1)}x faster`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main runner
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  // Synchronous exercises run first
  exercise1_tokenCounting();
  console.log("\n");
  exercise3_contextManagement();
  console.log("\n");
  exercise4_costEstimator();

  // API exercises (require OPENAI_API_KEY)
  if (process.env.OPENAI_API_KEY) {
    console.log("\n--- API Exercises ---\n");
    await exercise2_temperatureComparison();
    await exercise5_modelComparison();
  } else {
    console.log(
      "\n[SKIP] Set OPENAI_API_KEY to run exercises 2 and 5 (API calls)"
    );
  }
}

main().catch(console.error);

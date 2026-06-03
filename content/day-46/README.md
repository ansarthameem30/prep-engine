# Day 46 – LangChain & LangGraph: LCEL, Chains, Vectorstores & Stateful Workflows | DSA: Jump Game II

> **Phase 5 – GenAI Engineering** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | LCEL pipe operator, Runnable primitives, LangGraph nodes/edges/state, LangSmith tracing |
| Hands-On | 00:40–01:10 | Build a LangGraph workflow: multi-step RAG with conditional routing and state management |
| DSA | 01:10–01:25 | Jump Game II (LeetCode #45) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Build a multi-step LCEL chain using RunnableSequence and RunnableParallel
- [ ] Implement a LangGraph workflow with nodes, typed state, and conditional edges
- [ ] Integrate LangChain vectorstore with a retrieval chain
- [ ] Connect LangSmith for trace inspection and debugging
- [ ] Solve: Jump Game II (#45)
- [ ] Review 5 interview questions

---

## Concept: LangChain / LangGraph

### What to Study
- **LCEL (LangChain Expression Language):** The pipe operator `|` for composing runnables, `RunnableSequence` (explicit chain), `RunnableParallel` (fan-out, merge results), `RunnableBranch` (conditional routing), `RunnableLambda` (wrap any function), `RunnablePassthrough` (pass input unchanged, useful for injecting original query alongside retrieved context); `.invoke()`, `.stream()`, `.batch()` interface on all runnables
- **Chains:** `ChatPromptTemplate | ChatOpenAI | StrOutputParser` as the canonical pattern; `createRetrievalChain` (combines retriever + RAG prompt + LLM); `createStuffDocumentsChain` (formats retrieved docs into prompt); `createHistoryAwareRetriever` (rephrases queries using chat history)
- **Document loaders:** `PDFLoader`, `WebBaseLoader`, `CSVLoader`, `DirectoryLoader`; async loading patterns; metadata extraction and augmentation
- **Text splitters:** `RecursiveCharacterTextSplitter` (tries to split on \n\n, \n, space in order — default choice), `TokenTextSplitter` (tiktoken-based, precise token control), `SemanticChunker` (OpenAI embeddings-based split points); chunk size and overlap configuration
- **Vectorstores with LangChain:** `OpenAIEmbeddings`, `from_documents()`, `as_retriever()`, `similarity_search()`, `similarity_search_with_score()`; supported backends (Chroma, FAISS, pgvector, Pinecone); `search_type`: similarity, mmr, similarity_score_threshold
- **LangGraph:** Graph-based stateful workflow engine; define `StateGraph` with typed state schema (TypedDict); add nodes (Python functions that receive and return state); add edges (unconditional) and conditional edges (`add_conditional_edges` with router function); `END` sentinel; `compile()` then `.invoke()` / `.stream()`; checkpointers for persistence (SqliteSaver, AsyncSqliteSaver); human-in-the-loop with `interrupt_before`
- **When to use LangChain vs raw API:** LangChain wins for complex multi-step pipelines, existing ecosystem (100+ loaders, splitters, vectorstore integrations), rapid prototyping; raw API wins for simple single-call use cases, maximum control over request structure, minimizing dependency surface, production latency-sensitive paths
- **LangSmith:** Automatic tracing with `LANGCHAIN_TRACING_V2=true`; trace explorer (inputs/outputs/latencies per node); evaluation datasets and running evaluators; prompt playground; debugging LangGraph state transitions

### Key Mental Models
- **LCEL is a lazy computation graph:** A chain built with `|` is just a description of computation — nothing runs until `.invoke()` / `.stream()` is called; this enables parallelism, streaming, and batching to work transparently
- **LangGraph is a state machine with LLM transitions:** Each node is a function that reads from and writes to a shared typed state; edges define control flow; this unlocks cyclic workflows (loops, retry, human approval) that linear chains cannot express
- **LangSmith is your debugger:** When a multi-step LangGraph workflow produces wrong output, LangSmith traces let you inspect exactly which node produced incorrect state — without it, debugging is `console.log` archaeology

### Why This Matters in Interviews
LangChain and LangGraph are the dominant frameworks for production LLM applications. Knowing LCEL lets you compose complex pipelines declaratively. LangGraph is specifically asked about in senior AI engineer roles because it models the stateful agent workflows that power production chatbots and autonomous tools. LangSmith knowledge signals production readiness.

---

## DSA Focus: Greedy – Minimum Jumps

- **Problem:** Jump Game II (LeetCode #45)
- **Difficulty:** Medium
- **Pattern:** Greedy — BFS-level expansion
- **Time Target:** < 20 minutes
- **Key Insight:** At each "level" (current maximum reachable position), greedily choose the jump that extends farthest; count jumps as levels; `farthest = max(farthest, i + nums[i])` for each position; increment jumps when `i == currentEnd`; stop when `currentEnd >= n-1`

---

## Today's 5 Interview Questions
1. Explain LCEL's pipe operator — how does `RunnableParallel` work and when would you use it over a sequential chain?
2. What is LangGraph and how does it differ architecturally from a LangChain LCEL chain? When do you need a graph instead of a chain?
3. How do you implement a human-in-the-loop approval step in a LangGraph workflow?
4. When would you choose to use raw OpenAI API calls instead of LangChain? What are the production tradeoffs?
5. How does LangSmith help you debug a LangGraph workflow that's producing incorrect outputs?

---

## Files
- `01-concept/` → Notes on LCEL primitives, LangGraph state machine model, LangSmith integration guide
- `02-hands-on/` → langgraph-rag-workflow.py — LangGraph with typed state: retrieve → grade → rewrite query → generate → cite sources
- `03-dsa/` → jump-game-2.js — greedy BFS-level solution with step-by-step trace
- `04-interview-prep/` → langchain-qa.md — 5 Q&As with code snippets

---

## Success Criteria
- [ ] Can build a LangGraph workflow with conditional edges from memory
- [ ] Can explain when LCEL chains are insufficient and LangGraph is needed
- [ ] Solved Jump Game II with greedy approach in < 20 min
- [ ] Confident on all 5 interview questions

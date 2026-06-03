# Day 46 — LangChain + LangGraph

## LangChain: Why and When

LangChain is a framework for composing LLM-powered applications. Its core contribution is the **Runnable interface** and **LCEL (LangChain Expression Language)** — a declarative way to chain prompts, models, and output parsers with automatic streaming, batching, and tracing.

The honest take: for simple applications, raw OpenAI SDK is cleaner and faster. LangChain adds value when you need: multi-step chains with branching, built-in streaming + batching, tight LangSmith integration for tracing, and access to 300+ document loaders/vector store connectors.

---

## LCEL: The Pipe Operator

The `|` operator chains Runnables together, passing the output of each as input to the next:

```js
// Conceptual (JS pseudocode — LangChain is primarily Python, but the concept applies)
const chain = prompt | model | outputParser;
const result = await chain.invoke({ topic: "embeddings" });
```

Every Runnable implements four methods:
- `invoke(input)`: single call
- `batch([input1, input2])`: parallel batch
- `stream(input)`: streaming output
- `astream(input)`: async streaming

### Core Components

```python
# Python example (LangChain is Python-native)
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser

# Basic chain: prompt → model → parser
prompt = ChatPromptTemplate.from_template("Explain {topic} in one sentence.")
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = StrOutputParser()

chain = prompt | model | parser
result = chain.invoke({"topic": "transformers"})
```

### RunnableParallel: Execute in Parallel

```python
from langchain_core.runnables import RunnableParallel

# Run two chains in parallel, merge results
parallel_chain = RunnableParallel(
    summary=summarize_chain,
    translation=translate_chain
)
result = parallel_chain.invoke({"text": "..."})
# result = {"summary": "...", "translation": "..."}
```

### RunnableBranch: Conditional Routing

```python
from langchain_core.runnables import RunnableBranch

branch = RunnableBranch(
    (lambda x: "code" in x["question"].lower(), code_chain),
    (lambda x: "math" in x["question"].lower(), math_chain),
    general_chain  # Default fallback
)
```

### RunnableLambda: Wrap Any Function

```python
from langchain_core.runnables import RunnableLambda

def format_output(text): return f"Answer: {text}"
formatter = RunnableLambda(format_output)
chain = prompt | model | parser | formatter
```

---

## RAG Chain with LCEL

A complete RAG chain in LCEL:

```python
from langchain_community.vectorstores import Chroma
from langchain_core.runnables import RunnablePassthrough

vectorstore = Chroma(embedding_function=OpenAIEmbeddings())
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

rag_prompt = ChatPromptTemplate.from_template("""
Answer the question using only the context below.
Context: {context}
Question: {question}
""")

def format_docs(docs): return "\n\n".join(d.page_content for d in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt
    | model
    | StrOutputParser()
)

result = rag_chain.invoke("What is the deployment policy?")
```

---

## LangGraph: Stateful Workflows

LangGraph is the right tool when you need an agent with **state**, **loops**, and **conditional branching** — things LangChain's simple chain model can't handle. LangGraph is built on top of LangChain but is a separate graph execution framework.

### Core Concepts

**StateGraph:** A directed graph where nodes are Python functions and edges define transitions.

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

# 1. Define the state schema
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]  # Append-only reducer
    query: str
    search_results: list[str]
    answer: str | None

# 2. Define node functions (state in → state out)
def search_node(state: AgentState) -> dict:
    results = web_search(state["query"])
    return {"search_results": results}

def generate_node(state: AgentState) -> dict:
    answer = llm_generate(state["query"], state["search_results"])
    return {"answer": answer, "messages": [{"role": "assistant", "content": answer}]}

def should_search(state: AgentState) -> str:
    """Routing function: return the name of the next node"""
    if not state.get("search_results"):
        return "search"
    return "generate"

# 3. Build the graph
workflow = StateGraph(AgentState)
workflow.add_node("search", search_node)
workflow.add_node("generate", generate_node)
workflow.set_entry_point("router")

# 4. Add edges (conditional)
workflow.add_conditional_edges("router", should_search, {
    "search": "search",
    "generate": "generate"
})
workflow.add_edge("search", "generate")
workflow.add_edge("generate", END)

app = workflow.compile()
```

### Why LangGraph Allows Cycles

LangChain chains are DAGs (directed acyclic graphs) — no loops. LangGraph explicitly supports cycles, which is required for agent loops:

```
[Check tools needed] → [Execute tool] → [Check if done] → [Execute tool] → ...
                            ↑__________________|
```

### State Reducers

State updates aren't always "replace" — sometimes you want to append:

```python
# Replace: default behavior
class State(TypedDict):
    answer: str  # Each update replaces the previous value

# Append: useful for messages, history
class State(TypedDict):
    messages: Annotated[list, operator.add]  # Each update appends to the list
```

### Persistence with Checkpointers

LangGraph supports conversation history via checkpointers:

```python
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.memory import MemorySaver

# In-memory (for development)
memory = MemorySaver()
app = workflow.compile(checkpointer=memory)

# With thread_id for multi-session support
config = {"configurable": {"thread_id": "user-123-session-456"}}
result = app.invoke({"messages": [HumanMessage(content="Hello")]}, config=config)

# Subsequent calls with same thread_id continue the conversation
result2 = app.invoke({"messages": [HumanMessage(content="What did I just say?")]}, config=config)
```

### Human-in-the-Loop

LangGraph can pause execution and wait for human input:

```python
# Compile with interrupt points
app = workflow.compile(
    checkpointer=memory,
    interrupt_before=["execute_action"]  # Pause before this node
)

# Run until interrupt
result = app.invoke(initial_state, config)
# result.next == ["execute_action"] — paused here

# Human reviews, then resumes
app.invoke(None, config)  # Resume from checkpoint
```

---

## LangSmith: Observability

LangSmith provides full observability for LangChain/LangGraph applications:

```bash
# Enable tracing (environment variables)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls-...
LANGCHAIN_PROJECT=my-rag-app
```

Every `chain.invoke()` call is automatically traced: you can see the full prompt sent, the model response, every tool call, token counts, latency at each step, and any errors. This is invaluable for debugging — when a RAG application gives a wrong answer, you can inspect exactly which chunks were retrieved and what prompt was constructed.

**LangSmith features:**
- **Traces:** Full execution tree for every run
- **Datasets:** Build evaluation datasets from production traces
- **Evaluators:** Run automated evaluations against datasets
- **Prompt Hub:** Version-controlled prompts with A/B testing

---

## When to Use What

| Scenario | Use |
|---|---|
| Single OpenAI API call | Raw OpenAI SDK |
| Simple RAG (retrieve → generate) | LangChain LCEL |
| Complex multi-step pipeline | LangChain LCEL with RunnableParallel/Branch |
| Agent with tool use loop | LangGraph |
| Multi-agent coordination | LangGraph with multi-node graphs |
| Conversation with memory | LangGraph with checkpointer |
| Human-in-the-loop workflows | LangGraph with interrupt |
| Maximum performance, no framework overhead | Raw OpenAI SDK + custom orchestration |

LangChain's value proposition: you save 2-3 days of plumbing code per project at the cost of framework overhead. LangGraph's value proposition: managing stateful agent state across loops is genuinely hard to do correctly from scratch — LangGraph handles it well.

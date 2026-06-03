# Day 60 — Final Readiness Quiz (Self-Assessment)

## Instructions
Answer each question in 1-2 lines without looking at notes.
Then rate yourself: **Green** (nailed it) / **Yellow** (answered but uncertain) / **Red** (couldn't answer).
Red answers = spend 15 minutes reviewing that topic today.

---

## JavaScript (Q1-6)

**Q1**: What is the output of `Promise.resolve().then(() => console.log('A')); setTimeout(() => console.log('B'), 0); console.log('C');`?
**Answer**: `C` then `A` then `B`. Synchronous first, then microtask (Promise), then macrotask (setTimeout).
**Rating**: ___

**Q2**: What does `typeof null` return and why?
**Answer**: `"object"`. Historical bug — null's bit pattern (all zeros) was misidentified as an object type.
**Rating**: ___

**Q3**: What's the difference between `debounce` and `throttle`?
**Answer**: Debounce delays execution until N ms of inactivity. Throttle limits execution to at most once per N ms.
**Rating**: ___

**Q4**: What is closure and give one practical use?
**Answer**: A function retaining access to its outer scope's variables after the outer function returns. Use: module pattern for private state, memoization, factory functions.
**Rating**: ___

**Q5**: How does `bind` differ from `call` and `apply`?
**Answer**: `bind` returns a new function with `this` bound (doesn't invoke). `call` and `apply` invoke immediately with `this` set. `call` takes args as comma-separated, `apply` as array.
**Rating**: ___

**Q6**: What is prototype pollution and how do you prevent it?
**Answer**: Writing properties onto `Object.prototype` so all objects inherit them. Prevent: validate JSON keys, use `Object.create(null)` for pure dictionaries, don't use lodash.merge on untrusted input.
**Rating**: ___

---

## React (Q7-11)

**Q7**: Why can't you use hooks inside conditions?
**Answer**: React stores hook state in an ordered array. Conditional hooks change the call order between renders, making React read the wrong state slot.
**Rating**: ___

**Q8**: What does `React.memo` do and when does it fail to prevent re-renders?
**Answer**: Prevents re-renders if props haven't changed (shallow comparison). Fails when props include inline objects, arrays, or functions created in the parent's render — they're new references every render.
**Rating**: ___

**Q9**: When would you use `useReducer` over `useState`?
**Answer**: Complex state with multiple related values, logic where next state depends on previous, or when you want to colocate state transition logic for testability.
**Rating**: ___

**Q10**: Explain the difference between `useEffect` and `useLayoutEffect`.
**Answer**: `useEffect` runs after paint (async, doesn't block UI). `useLayoutEffect` runs synchronously after DOM mutations but before paint — prevents visual flicker for DOM measurement use cases.
**Rating**: ___

**Q11**: What is a controlled component?
**Answer**: A component where React state is the single source of truth for the input's value. `<input value={state} onChange={setState} />`. State drives the UI, events update state.
**Rating**: ___

---

## Node.js (Q12-14)

**Q12**: What are the Node.js event loop phases in order?
**Answer**: Timers → Pending callbacks → Idle/Prepare → Poll → Check (setImmediate) → Close callbacks. Microtasks (Promises, nextTick) run between every phase.
**Rating**: ___

**Q13**: What is the N+1 problem and how do you solve it?
**Answer**: Fetching N parents then making 1 query per parent for related data = N+1 total queries. Fix: JOIN, batch IN query, DataLoader pattern, or ORM eager loading.
**Rating**: ___

**Q14**: How do you detect a memory leak in a Node.js service?
**Answer**: Monitor `heapUsed` growth over time via metrics. Take heap snapshots in Chrome DevTools (with `--inspect`) at intervals, compare "objects allocated between snapshots". Use `clinic heapdump`.
**Rating**: ___

---

## SQL / Database (Q15-17)

**Q15**: Write a SQL query to find the top 3 employees by salary in each department.
**Answer**:
```sql
SELECT * FROM (
  SELECT *, RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS r FROM employees
) t WHERE r <= 3;
```
**Rating**: ___

**Q16**: What is a covering index?
**Answer**: An index containing all columns needed to satisfy a query — the DB answers entirely from the index without touching the table (Index Only Scan in PostgreSQL).
**Rating**: ___

**Q17**: Why use Cassandra over PostgreSQL for messages at WhatsApp scale?
**Answer**: 1.16M writes/sec — Cassandra's LSM-tree (write-optimized) handles this. Horizontal scaling by adding nodes. Access pattern (always by conversation_id) is a perfect fit for partition keys.
**Rating**: ___

---

## System Design (Q18-21)

**Q18**: What is consistent hashing and why is it used?
**Answer**: Places nodes and keys on a ring. A key maps to the nearest node clockwise. Adding/removing a node only remaps ~1/N of keys (vs simple modulo where all keys potentially remap).
**Rating**: ___

**Q19**: What is a circuit breaker? Describe its 3 states.
**Answer**: Prevents cascading failures. Closed (normal), Open (fail fast, no network call), Half-Open (single test request to check recovery). Transitions: threshold failures → Open; success in Half-Open → Closed.
**Rating**: ___

**Q20**: What are the 7 steps of a system design interview?
**Answer**: 1-Requirements, 2-Estimation, 3-High-Level Architecture, 4-Data Model, 5-API Design, 6-Detailed Design deep-dive, 7-Scale and Bottlenecks.
**Rating**: ___

**Q21**: Explain the difference between horizontal and vertical scaling.
**Answer**: Vertical: bigger machine (more CPU/RAM). Has a ceiling, single point of failure. Horizontal: more machines. Scales indefinitely, requires stateless design and load balancing.
**Rating**: ___

---

## AWS / DevOps (Q22-24)

**Q22**: What are the three pillars of observability?
**Answer**: Logs (structured events), Metrics (counters, gauges, histograms — time series), Traces (distributed request paths across services).
**Rating**: ___

**Q23**: Explain blue-green deployment and its trade-offs.
**Answer**: Two identical production environments. Switch traffic from Blue (current) to Green (new). Instant rollback by switching back. Trade-off: requires double the infrastructure cost.
**Rating**: ___

**Q24**: What is IAM least-privilege and why does it matter?
**Answer**: Grant only the exact permissions needed, nothing more. A compromised service with minimal permissions limits the blast radius of a breach. An overprivileged Lambda could delete your entire S3 bucket.
**Rating**: ___

---

## Security (Q25-27)

**Q25**: What is SSRF and how do you defend against it?
**Answer**: Server-Side Request Forgery — attacker tricks your server into making requests to internal services. Defense: validate URLs against an allowlist/blocklist of private IP ranges, block metadata endpoints (169.254.169.254).
**Rating**: ___

**Q26**: Where should JWTs be stored and why?
**Answer**: Access token: in-memory (JS variable) — not in localStorage (XSS can steal it). Refresh token: httpOnly, Secure, SameSite=Strict cookie — JS cannot read it, preventing XSS theft.
**Rating**: ___

**Q27**: What is the difference between CSRF and XSS?
**Answer**: XSS: attacker injects malicious script into your page that runs in users' browsers. CSRF: attacker's page tricks a user's browser into making requests to your site using the user's cookies.
**Rating**: ___

---

## GenAI (Q28-30)

**Q28**: Explain RAG in one sentence. What problem does it solve?
**Answer**: RAG retrieves relevant documents from a knowledge base and includes them in the prompt so the LLM generates answers grounded in specific, up-to-date data instead of training data alone.
**Rating**: ___

**Q29**: What metric tells you if your RAG pipeline is hallucinating?
**Answer**: Answer Faithfulness (RAGAS) — measures whether the generated answer is supported by the retrieved context. Low faithfulness = the LLM is making things up beyond the context.
**Rating**: ___

**Q30**: How do you reduce LLM API costs at scale?
**Answer**: Model tiering (cheap models for simple tasks), prompt caching (same system prompt reused), semantic caching (cache responses by query similarity), RAG to reduce context size, batch API for async work.
**Rating**: ___

---

## Count Your Score

| Rating | Count | What to Do |
|---|---|---|
| Green | ___ | No action needed. |
| Yellow | ___ | Read your notes for those topics once more. |
| Red | ___ | 15-minute focused review of each topic. Do this TODAY. |

---

## Emergency Review Sections

**If Red on Event Loop**: Questions 1, 12 — Review Day 1 and Day 13 notes on Node.js event loop phases and microtask vs macrotask.

**If Red on React hooks**: Questions 7, 8, 9, 10 — Review Day 56 concept file and hooks deep-dive.

**If Red on SQL window functions**: Question 15 — Review Day 57 SQL section with RANK/PARTITION BY examples.

**If Red on System Design**: Questions 18-21 — Review the 7-step framework in Day 58 concept file. Practice verbally.

**If Red on Security**: Questions 25-27 — Review Day 53 OWASP section and CSRF vs XSS distinction.

**If Red on GenAI**: Questions 28-30 — Review Day 59 concept file on RAG evaluation and cost optimization.

---

## Final Message

You just completed 60 days of intensive, structured preparation covering:

- **JavaScript**: internals, patterns, async, performance
- **React**: architecture, hooks, performance, state management
- **Node.js**: event loop, streams, clustering, profiling
- **Databases**: SQL window functions, indexing, MongoDB aggregation, distributed patterns
- **System Design**: estimation, caching, sharding, messaging, real-world designs
- **Security**: OWASP Top 10, authentication, secrets management
- **AWS**: EC2, Lambda, RDS, deployment, cost optimization
- **CI/CD**: GitHub Actions, Docker, deployment strategies, rollback
- **GenAI**: RAG pipelines, agents, evaluation, cost optimization
- **DSA**: 100+ problems across all categories, from easy warmups to hard divide-and-conquer

The fundamentals are in your head. The patterns are in your muscle memory. The behavioral stories are ready.

You have covered more ground in 60 days than most engineers cover in a year of scattered reading.

When the interviewer asks a question tomorrow, you will recognize the pattern, state your approach, code it up, and explain your reasoning — because you've done it dozens of times in the last 60 days.

**This is your moment. You are prepared. Go build the career you've been working toward.**

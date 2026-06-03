# Day 52 — Performance Optimization: Interview Q&A

---

## Q1: What are Core Web Vitals? What does each measure and what are the thresholds?

**Answer:**
Core Web Vitals are Google's three metrics that directly influence search ranking:

**LCP (Largest Contentful Paint)**: Time for the largest visible element to render. Target: < 2.5s. Poor: > 4s. This is typically a hero image, h1 heading, or video poster. To improve: preload the LCP resource (`<link rel="preload">`), avoid lazy-loading it, use SSR to send HTML immediately, optimize image size and format.

**INP (Interaction to Next Paint)**: Time from user interaction (click, keypress, tap) to the browser painting the response. Replaced FID in March 2024. Target: < 200ms. Poor: > 500ms. To improve: reduce long tasks (> 50ms), break up synchronous JS, use Web Workers for computation.

**CLS (Cumulative Layout Shift)**: Measures visual instability — elements moving after initial render. Target: < 0.1. Poor: > 0.25. To improve: set explicit `width`/`height` on images and iframes, use `aspect-ratio` CSS, never inject content above existing content after load.

**Interview tip**: Mention that you measure these with Chrome DevTools Lighthouse, PageSpeed Insights, and field data from CrUX (Chrome User Experience Report). Lab data (Lighthouse) and field data can differ significantly.

---

## Q2: Explain the N+1 query problem. Give a concrete example and solution.

**Answer:**
The N+1 problem occurs when fetching N parent records triggers N additional queries for related data — one query per parent instead of one batched query.

**Concrete example**:
```js
// BAD: 1 query for 100 posts + 100 queries for authors = 101 queries
const posts = await db.query('SELECT * FROM posts LIMIT 100');
for (const post of posts) {
  post.author = await db.query('SELECT * FROM users WHERE id = ?', [post.author_id]);
}
```

**Solutions by context**:
1. **SQL JOIN**: `SELECT posts.*, users.name FROM posts JOIN users ON posts.author_id = users.id` — 1 query total
2. **Batched IN query**: `SELECT * FROM users WHERE id IN (1,2,3,...,100)` then map results — 2 queries
3. **DataLoader** (GraphQL/microservices): collect all `.load(userId)` calls in a tick, batch into one query. Result: N `.load()` calls → 1 database query
4. **ORM eager loading**: Sequelize `include: [{model: User}]`, Prisma `include: {author: true}` — ORM generates the JOIN for you

The DataLoader approach is particularly important for GraphQL where resolvers run independently per field and would cause N+1 without batching.

---

## Q3: What is DataLoader? How does it implement batching and caching?

**Answer:**
DataLoader (originally by Facebook for GraphQL) solves the N+1 problem in resolver-based systems.

**Batching mechanism**:
1. You call `loader.load(key)` — this is synchronous and returns a Promise
2. DataLoader adds the key to an internal queue but doesn't fetch yet
3. DataLoader schedules a dispatch using `Promise.resolve().then()` — runs at the end of the current microtask queue (after all synchronous code and resolver calls for this request)
4. When the dispatch fires, all keys collected so far are passed to your `batchFn(keys[])` as a single array
5. Your batch function fetches all records in one query and returns results in the same order as keys
6. Promises from step 1 resolve with their respective values

**Caching mechanism**:
- DataLoader maintains a per-request cache (Map from key → Promise)
- If you call `.load(key)` twice with the same key in the same request, you get back the same Promise
- This deduplicates identical loads within a request
- Cache is **not** shared across requests (no global cache) — each request instantiation creates a new DataLoader

**Key constraint**: The batch function must return values in the **exact same order** as the input keys array, and must return the same number of values. This is what allows DataLoader to correlate results back to individual promises.

---

## Q4: How do you diagnose and fix event loop lag in a Node.js production service?

**Answer:**
**Detecting event loop lag**:
1. **Measurement**: Set a 10ms interval, measure actual vs expected interval. The difference is the lag.
2. **clinic doctor**: `clinic doctor -- node server.js` — automatically identifies event loop blocked patterns
3. **`performance.eventLoopUtilization()`** (Node.js 12.19+): returns `{ idle, active, utilization }`. High utilization (> 0.8) under low traffic indicates a problem.
4. **APM agents**: Datadog, New Relic automatically measure event loop lag and alert on spikes

**Common causes and fixes**:
- **Synchronous heavy computation** (parsing large JSON, crypto, compression): Move to a Worker Thread (`worker_threads`) or separate process
- **Blocking filesystem operations**: Use async versions (`fs.readFile` not `fs.readFileSync`). Never use sync fs in request handlers.
- **Long DB queries blocking the connection pool**: All callbacks are dequeued from the event loop — if pool is exhausted, callbacks queue up. Fix: increase pool size, add read replicas, optimize slow queries
- **Large garbage collection pauses**: Increase heap size (`--max-old-space-size`), reduce allocation rate, use `--expose-gc` to force GC and measure pause time

**Profiling workflow**: `clinic flame -- node server.js` → generate load with `autocannon` → examine flamegraph to find the hottest functions.

---

## Q5: Explain the difference between average, p95, and p99 latency. Why do percentiles matter more?

**Answer:**
**Average latency** is the sum of all request latencies divided by the count. The problem: a small number of extremely slow requests dramatically distort the average.

Example: 1000 requests — 990 take 10ms, 10 take 5000ms.
- Average: (990×10 + 10×5000) / 1000 = **60ms** — sounds acceptable
- P99: the 990th request in sorted order is **5000ms** — 1% of users wait 5 seconds

**Percentiles**:
- P50 (median): 50% of requests are faster than this
- P95: 95% of requests are faster than this — "typical slow user"
- P99: 99% of requests are faster than this — "worst tail"
- P99.9: 99.9% — "SLA tail", important for high-traffic services (at 1M req/min, p99.9 still affects 1000 req/min)

**Why percentiles matter**:
- At 100K req/day: P99 = 1000 users/day seeing slow responses
- Average hides this completely
- SLOs should always be defined in percentiles: "P99 < 500ms for 99.9% of the rolling 7-day window"

**In Prometheus**: use `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` to get P99.

---

## Q6: What is tree shaking? Why doesn't it work with CommonJS?

**Answer:**
Tree shaking is dead code elimination at bundle time. The bundler (Webpack, Rollup, esbuild) statically analyzes which exports are imported and removes unused code.

**Why it only works with ESModules**:
- ESModules: `import` and `export` are **static** — import paths must be string literals, known at parse time. Bundlers can build a dependency graph at build time.
- CommonJS: `require()` is **dynamic** — `require(process.env.ADAPTER)` — the import path can be a runtime value. The bundler can't know what's used.

**Practical example**:
```js
// ESM - tree-shakeable: only 'add' is bundled, 'subtract' is removed
import { add } from './math.js';

// CJS - NOT tree-shakeable: bundler includes the entire module
const { add } = require('./math');
```

**To enable tree shaking**:
1. Use ESM in your code
2. Set `"sideEffects": false` in `package.json` for libraries with no side effects (or list specific files with side effects like CSS imports)
3. Use `lodash-es` instead of `lodash` — the ES module version is tree-shakeable
4. Use Rollup or esbuild (better tree shaking than Webpack 4; Webpack 5 improved significantly)

---

## Q7: Describe APM (Application Performance Monitoring). What is an SLO and error budget?

**Answer:**
**APM** instruments your running application to collect telemetry: response times, error rates, throughput, trace data, slow queries. Unlike logs (text describing events), APM provides structured time-series metrics and distributed traces.

**SLI** (Service Level Indicator): The measurement. "The fraction of requests served in < 200ms."

**SLO** (Service Level Objective): The target. "99.5% of requests must complete in < 200ms, measured over a rolling 28-day window."

**SLA** (Service Level Agreement): The contract. "If availability falls below 99.5%, customers receive 10% service credits." SLA is a business agreement; SLO is the technical target you set internally (stricter than SLA to give buffer).

**Error Budget**: The allowed amount of unreliability.
- 99.9% availability over 30 days = 43.8 minutes of allowed downtime
- If you've burned 40 minutes already with 10 days left, you should freeze risky deployments
- Error budget aligns engineering teams: reliability is not a separate team's concern

**Prometheus alerting on SLO breach**:
```yaml
# Alert when error rate exceeds 0.5% (SLO threshold)
- alert: SLOBreached
  expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.005
```

---

## Q8: What is the PRPL pattern and how does it relate to performance?

**Answer:**
PRPL is a performance pattern for progressive web apps:

**Push (Preload)**: Proactively send critical resources before they're discovered. Use `<link rel="preload">` for fonts, LCP images, critical CSS. Use `<link rel="modulepreload">` for ES modules. HTTP/2 server push was the original mechanism but was deprecated — proactive preloading via Link headers and resource hints is the practical implementation now.

**Render**: Render the initial route as quickly as possible. This means either server-side rendering the shell/initial content, or using the app shell architecture where the skeleton renders immediately and content streams in.

**Pre-cache**: Use a Service Worker to cache resources needed for other routes during idle time (after initial load). This makes subsequent navigations near-instant.

**Lazy-load**: Load code for non-initial routes on demand. `React.lazy()`, dynamic `import()`, Next.js `next/dynamic` — only download code when the user actually navigates to that route.

**Why it matters**: On mobile devices with 3G connections and low-end CPUs, this pattern can reduce time-to-interactive by 50%+. The combination of fast initial render + offline capability + fast subsequent navigations is what separates PWAs from regular web apps.

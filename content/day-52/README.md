# Day 52 – Performance Deep Dive: Core Web Vitals, Node.js Profiling & Query Optimization | DSA: Regular Expression Matching

> **Phase 6 – Final Sprint + Mock Interviews** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Core Web Vitals, critical render path, service workers, Node.js profiling, N+1 problem, APM tools |
| Hands-On | 00:40–01:10 | Audit a React app's bundle, fix N+1 with DataLoader, profile an Express endpoint with 0x |
| DSA | 01:10–01:25 | Regular Expression Matching (LeetCode #10) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Measure and improve LCP, INP, and CLS for a sample React app
- [ ] Implement the PRPL pattern with code splitting and route-based lazy loading
- [ ] Solve the N+1 query problem using DataLoader batching
- [ ] Profile a Node.js endpoint and identify async bottlenecks with clinic.js
- [ ] Solve: Regular Expression Matching (#10)
- [ ] Review 5 interview questions

---

## Concept: Performance Deep Dive

### What to Study
- **Core Web Vitals:**
  - **LCP (Largest Contentful Paint):** Measures loading performance; target < 2.5s; common culprits: unoptimized hero images, render-blocking resources, slow TTFB; fixes: image preload hints (`<link rel="preload">`), CDN, image format optimization (WebP/AVIF), srcset, `priority` prop in Next.js Image
  - **INP (Interaction to Next Paint, replaced FID):** Measures responsiveness to input; target < 200ms; culprits: long tasks on main thread, heavy event handlers, layout thrashing; fixes: `scheduler.postTask()`, `requestIdleCallback`, debouncing, moving work to Web Workers
  - **CLS (Cumulative Layout Shift):** Measures visual stability; target < 0.1; culprits: images without dimensions, dynamically injected content, FOUT (flash of unstyled text); fixes: explicit width/height, `aspect-ratio`, `font-display: swap` with size-adjust
- **Critical render path optimization:** Minimize render-blocking CSS (inline critical CSS, defer non-critical), eliminate render-blocking JS (defer/async), reduce HTML size, font subsetting, remove unused CSS (PurgeCSS)
- **PRPL pattern:** Push (preload critical resources), Render (render initial route), Pre-cache (cache remaining assets with service worker), Lazy-load (load other routes on demand); implemented with React.lazy + Suspense + Workbox
- **Service workers:** Cache-first vs network-first vs stale-while-revalidate strategies; Workbox for configuration; background sync; push notifications; offline support; cache versioning and cleanup
- **HTTP/2 vs HTTP/3:** HTTP/2: multiplexing (multiple requests over single TCP connection, no head-of-line blocking at HTTP layer), server push (deprecated), header compression (HPACK); HTTP/3: QUIC protocol (UDP-based, eliminates TCP head-of-line blocking), faster connection establishment (0-RTT), better performance on lossy networks; checking support with `curl -I --http3`
- **Bundle splitting:** Route-based splitting (React.lazy + Suspense), component-level splitting (dynamic import), vendor chunk splitting (separate node_modules), chunk naming strategy; analyzing bundles with `webpack-bundle-analyzer` or Vite's `rollup-plugin-visualizer`
- **Node.js profiling:**
  - **clinic.js:** `clinic doctor` (identifies bottleneck type: CPU, I/O, async), `clinic flame` (flame graphs for CPU profiling), `clinic bubbleprof` (async profiling, identify async bottlenecks)
  - **0x:** Single-command flame graph generation; `0x -- node server.js`; reading flame graphs (wide plateaus = hot functions)
  - **Built-in profiler:** `node --prof` + `node --prof-process`; `--inspect` + Chrome DevTools
- **Async bottlenecks in Node.js:** Event loop blocking (sync operations in async path), `Promise.all` for parallelism, avoiding sequential awaits when independent, stream processing for large datasets, `setImmediate` / `process.nextTick` implications
- **Connection pooling:** `pg` pool config (`max: 10`, `idleTimeoutMillis`, `connectionTimeoutMillis`); Mongoose connection pool; why connection per request kills performance; pool exhaustion symptoms
- **N+1 query problem:** Loading 100 users then making 100 individual queries for their profiles; detected in logs (repeated similar queries), `EXPLAIN ANALYZE`, query count monitoring; fix: SQL JOIN, or DataLoader for GraphQL (batch + cache within a request)
- **DataLoader:** Facebook's batching utility; collects keys in a tick, calls batch function once, returns per-key results; per-request instantiation (for correct caching scope); works for REST APIs too (not just GraphQL)
- **Database query optimization:** `EXPLAIN ANALYZE`, index selection, covering indexes, avoiding `SELECT *`, pagination with keyset (cursor) vs offset, connection pool sizing, read replicas for heavy reads
- **APM tools:** New Relic (full-stack tracing, browser monitoring, infrastructure), Datadog APM (distributed tracing, log correlation, ML-based anomaly detection), Elastic APM (open source option); key metrics: Apdex score, p99 latency, error rate, throughput

### Key Mental Models
- **Performance is user experience in numbers:** LCP is "how fast does the user see content," INP is "how fast does the app respond to the user," CLS is "does the page jump around" — optimize the metric that matches your users' pain
- **N+1 is a loop disguised as code:** It looks innocent — `users.map(u => getProfile(u.id))` — but it serializes N network/DB round trips; the fix is always some form of batching or JOIN
- **Flame graphs read upward:** The bottom is entry point, the top is where time is spent; wide flat tops = hot code; tall narrow columns = deep call stacks

### Why This Matters in Interviews
Performance questions test your ability to diagnose and fix real production problems. Interviewers show you a slow app and ask you to fix it — knowing Core Web Vitals, N+1, and flame graph reading turns "I'd profile it" into a specific, credible answer. APM tools signal production experience.

---

## DSA Focus: Dynamic Programming – String Pattern Matching (Hard)

- **Problem:** Regular Expression Matching (LeetCode #10)
- **Difficulty:** Hard
- **Pattern:** 2D DP — string matching with wildcard
- **Time Target:** < 20 minutes
- **Key Insight:** `dp[i][j]` = does `s[0..i-1]` match `p[0..j-1]`; if `p[j-1] == '*'`, it can match zero chars (`dp[i][j-2]`) or one more char of same type (`dp[i-1][j]` if `s[i-1]` matches `p[j-2]`); if `p[j-1] == '.'` or exact char match, `dp[i][j] = dp[i-1][j-1]`; initialize `dp[0][0] = true` and handle `*` consuming empty string in first row

---

## Today's 5 Interview Questions
1. What is INP and how does it differ from the old FID metric? Name three common causes of high INP and how you'd fix them.
2. Walk me through diagnosing and fixing an N+1 query problem in a GraphQL API using DataLoader — what does the batching mechanism look like?
3. How would you use clinic.js to diagnose why a Node.js endpoint is slow? What different tools does the clinic suite provide?
4. Explain the PRPL pattern — what does each letter stand for and how do you implement it in a React application?
5. Compare HTTP/2 and HTTP/3 — what problem does each solve, and when does HTTP/3 provide meaningful performance gains?

---

## Files
- `01-concept/` → Notes on Core Web Vitals targets + fix strategies, PRPL pattern, Node.js profiling workflow, N+1 + DataLoader
- `02-hands-on/` → performance-lab.js — Express server with intentional N+1, DataLoader fix, mock bundle analyzer output, Core Web Vitals measurement script
- `03-dsa/` → regex-matching.js — 2D DP with full state table trace and edge case walkthrough
- `04-interview-prep/` → performance-qa.md — 5 Q&As with "before/after" code examples

---

## Success Criteria
- [ ] Can name LCP/INP/CLS targets and give 3 fixes for each from memory
- [ ] Can implement DataLoader batching from scratch for any N+1 scenario
- [ ] Solved Regular Expression Matching with correct DP recurrence in < 20 min
- [ ] Confident on all 5 interview questions

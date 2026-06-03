# Day 52 — Performance Optimization Deep Dive

## Frontend Performance: Core Web Vitals

Google's Core Web Vitals are the three metrics that directly affect search ranking. You must know these cold.

**LCP — Largest Contentful Paint (target: < 2.5s)**
Measures when the largest visible element (hero image, heading, video poster) finishes rendering. LCP > 4s = poor.
Optimizations:
- Preload the hero image: `<link rel="preload" as="image" href="/hero.webp">`
- Server-side render the above-the-fold content — LCP can't be fast if content requires JS to display
- Image optimization: serve WebP/AVIF, correct `sizes` attribute, avoid unnecessary `srcset` fetches
- Reduce Time to First Byte (TTFB) with CDN edge caching, faster server response
- Font loading: `font-display: optional` or `font-display: swap` to avoid FOIT blocking LCP

**INP — Interaction to Next Paint (target: < 200ms)**
Replaced FID (First Input Delay) in March 2024. Measures total time from user interaction to the browser displaying the next frame. Unlike FID which measured only input delay, INP measures the full processing + rendering time.
Optimizations:
- Break up long tasks (> 50ms): use `scheduler.yield()` or `setTimeout(0)` to give the browser a chance to render
- Move heavy computation to Web Workers — off the main thread entirely
- Avoid synchronous forced layout (read then write DOM, not interleaved)
- Reduce event handler work: defer non-critical updates with `requestAnimationFrame`

**CLS — Cumulative Layout Shift (target: < 0.1)**
Measures visual instability — elements jumping around as the page loads.
Common culprits and fixes:
- Images without explicit `width`/`height`: the browser doesn't know how much space to reserve. Always set dimensions or use `aspect-ratio` CSS.
- Ads and embeds: reserve space with a placeholder of fixed height
- Fonts: use `font-display: swap` and `size-adjust` to minimize FOUT layout shift
- Dynamically injected content: never inject banners/cookies above existing content

---

## Critical Rendering Path

Understanding the CRP is essential for knowing why optimizations work:

1. **HTML parsing** → builds DOM (blocked by synchronous `<script>` tags — use `defer` or `async`)
2. **CSS loading** → builds CSSOM (render-blocking — CSS must be fully parsed before first paint)
3. **DOM + CSSOM** → Render Tree (only visible nodes)
4. **Layout** (Reflow): calculate exact positions and sizes
5. **Paint**: rasterize pixels
6. **Composite**: GPU combines layers

**Key optimizations from understanding CRP**:
- Put CSS in `<head>` (render-blocking, but needed early)
- Put scripts at end of `<body>` or use `defer` (avoids DOM blocking)
- Avoid triggering layout thrashing: reading layout properties (getBoundingClientRect, offsetWidth) forces reflow — batch reads before writes

---

## PRPL Pattern

Coined by Google for Progressive Web Apps:
- **Push** (or Preload): critical resources for initial route using `<link rel="preload">`
- **Render**: initial route first — SSR or pre-render the shell
- **Pre-cache**: remaining routes using Service Worker
- **Lazy-load**: non-critical routes on demand via dynamic imports

---

## Bundle Optimization

**Tree shaking**: Dead code elimination. Only works with ESModules (static `import`/`export`). CommonJS (`require`) cannot be tree-shaken because require paths can be dynamic.
- Use `sideEffects: false` in `package.json` to help Webpack tree-shake libraries

**Code splitting**:
- Route-based: each route gets its own chunk — users only download code for routes they visit
  - React: `React.lazy(() => import('./Dashboard'))` + `Suspense`
  - Next.js: automatic per-page splitting
- Component-based: split below-the-fold heavy components
- `import()` dynamic import: load a module on demand

**Bundle analysis**: `npx webpack-bundle-analyzer stats.json` or `npx source-map-explorer dist/*.js` to see what's taking space. Common culprits: moment.js (use date-fns instead), lodash (use lodash-es + tree shaking), large icon libraries.

---

## Image Optimization

- **Format**: WebP is 25-35% smaller than JPEG/PNG. AVIF is 40-50% smaller but slower to encode. Use `<picture>` with AVIF fallback to WebP fallback to JPEG.
- **Responsive images**: `srcset` with `w` descriptors + `sizes` attribute. Browser picks the right image for the screen.
- **Lazy loading**: `<img loading="lazy">` — browser-native, no JS needed. Only use on below-the-fold images. Never use on LCP image.
- **next/image**: Handles all of this automatically — format conversion, responsive sizes, lazy loading, blur placeholder, layout shift prevention.

---

## HTTP/2 and HTTP/3

**HTTP/2**:
- Multiplexing: multiple requests over a single TCP connection — no head-of-line blocking at HTTP level
- Header compression (HPACK): repeated headers (like Cookie) sent once
- Binary framing: more efficient than HTTP/1.1 text
- Server push: deprecated in practice (browsers prefetch better)

**HTTP/3 (QUIC)**:
- Built on UDP instead of TCP — eliminates TCP handshake latency (0-RTT reconnects)
- Eliminates TCP head-of-line blocking at transport level (HTTP/2 multiplexing still had TCP-level blocking)
- Better for lossy networks (mobile) — one dropped packet doesn't block all streams
- Adoption: 25%+ of web traffic as of 2024

---

## Service Workers: Cache Strategies

- **Cache First**: return from cache if available, else network. Best for versioned static assets (CSS, JS with hashes).
- **Network First**: try network, fall back to cache if offline. Best for API data where freshness matters.
- **Stale While Revalidate**: return cache immediately (fast), then update cache from network in background. Best for non-critical updates where slight staleness is acceptable (user avatars, non-critical config).

---

## Backend Performance: Node.js Profiling

**clinic.js** — the definitive Node.js diagnostic suite:
- `clinic doctor`: detects common issues (event loop lag, memory leaks, CPU hotspots) with recommendations
- `clinic flame`: flamegraph showing which functions consume the most CPU
- `clinic bubbleprof`: shows how time is spent — async operations, I/O wait, CPU

**Event loop lag measurement**:
```js
const { performance } = require('perf_hooks');
const obs = new PerformanceObserver(items => {
  items.getEntries().forEach(entry => console.log('Event loop delay:', entry.duration, 'ms'));
});
// Or: performance.eventLoopUtilization() — ratio of time event loop is active vs idle
```

A healthy event loop should have < 10ms lag. If you see 100ms+, a synchronous operation or long I/O callback is blocking it.

---

## N+1 Query Problem and DataLoader

The N+1 problem: fetching a list of N items, then making one separate query per item for related data.

```js
// BAD: 1 query for posts + N queries for each author
const posts = await db.query('SELECT * FROM posts LIMIT 100');
for (const post of posts) {
  post.author = await db.query('SELECT * FROM users WHERE id = $1', [post.user_id]);
}
// Total: 101 queries
```

**Fix with JOIN** (SQL): `SELECT posts.*, users.name FROM posts JOIN users ON posts.user_id = users.id`

**DataLoader pattern** (for GraphQL resolvers, or cross-service calls):
- Collects all keys requested during the current tick via a queue
- On the next tick, fires one batched query: `WHERE id IN (1, 2, 3, ..., 100)`
- Caches results within the same request — duplicate key loads return the cached value
- Result: 100 individual `.load(userId)` calls → 1 batched database query

---

## Application Performance Monitoring (APM)

**What APM gives you that logs don't**:
- Distributed traces spanning all services
- Automatic anomaly detection (p99 latency spike)
- Apdex score — user satisfaction index
- Database query performance (slow query detection)
- Error rate trends

**Key insight: percentiles > averages**. If average response time is 50ms but p99 is 2000ms, the average hides the fact that 1% of users get a terrible experience. At 1M req/day, that's 10,000 users experiencing 2s responses.

**SLI/SLO/SLA hierarchy**:
- SLI (Service Level Indicator): what you measure — e.g., "request latency"
- SLO (Service Level Objective): your target — e.g., "p99 latency < 500ms for 99.9% of rolling 30-day window"
- SLA (Service Level Agreement): contractual commitment — SLO with consequences for breach (credits, penalties)
- **Error budget**: if SLO is 99.9% uptime, you have 43 minutes/month of allowed downtime. If you're burning the budget fast, slow down feature releases.

**Prometheus + Grafana**: industry standard open-source APM stack. Prometheus scrapes `/metrics` endpoints, Grafana visualizes, Alertmanager fires alerts on SLO breaches.

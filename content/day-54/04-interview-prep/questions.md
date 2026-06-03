# Day 54 — Full-Stack Integration Patterns: Interview Q&A

---

## Q1: What is tRPC and when would you use it over REST?

**Answer:**
tRPC is a TypeScript library that lets you define backend procedures and call them from the frontend with full type safety — without writing API clients, schemas, or code generators.

**How it works**: You define a router on the server. The router's types are exported. The frontend imports the router type (not the implementation — just the type). The tRPC client provides a proxy object that lets you call procedures like regular async functions. TypeScript infers input and output types end-to-end.

**Key advantages over REST**:
- **Zero-overhead type safety**: rename a backend field → TypeScript immediately shows all broken frontend usages
- **No boilerplate**: no manual types, no OpenAPI spec, no generated clients
- **Automatic validation**: input validation via Zod schemas, validated both at runtime and compile time
- **React Query integration**: `trpc.getUser.useQuery()` automatically gives you loading, error, caching states

**When to prefer tRPC**:
- Full-stack TypeScript monorepo (Next.js + shared types)
- Internal APIs — you control both client and server
- Teams that value type safety and want to eliminate runtime type errors

**When to prefer REST**:
- Public APIs consumed by third parties or non-TypeScript clients
- Microservices where services are in different repos/languages
- When you need standard HTTP semantics (caching, CDN, HTTP verbs)
- OpenAPI tooling required (API docs, Postman collections, contract testing)

**Interview tip**: tRPC and REST are not mutually exclusive. A common pattern: tRPC for the Next.js frontend ↔ BFF communication, REST/gRPC between microservices.

---

## Q2: What are the trade-offs between monorepos and polyrepos?

**Answer:**
**Monorepo (single repository for all packages)**:

Advantages:
- **Atomic changes**: rename a shared utility → all apps updated in one PR, one commit
- **Unified tooling**: one ESLint config, one TypeScript config, one CI pipeline
- **Easy code sharing**: `import { Button } from '@company/ui'` without publishing npm packages
- **Cross-project refactoring**: IDE can find all usages across apps

Disadvantages:
- **CI performance**: the entire repo's tests can run on every PR (mitigated with Turborepo affected-only runs)
- **Git clone size**: cloning brings everything, including apps you don't work on
- **Team autonomy**: one broken merge blocks everyone if CI is not isolated per app
- **Build complexity**: sophisticated tooling (Turborepo, Nx, pnpm workspaces) required

**Polyrepo (one repo per service)**:

Advantages:
- Complete team autonomy — teams can choose their own tools and release cadence
- Smaller repos — faster clone, simpler CI

Disadvantages:
- Shared code must be published as npm packages — versioning overhead
- Cross-repo changes require multiple PRs, coordination, and sequenced releases
- Duplicate tooling configuration across repos

**When to use each**:
- Monorepo: same team owns frontend + backend, shared component libraries, TypeScript-first, < 50 services
- Polyrepo: genuinely autonomous teams with different release cadences, polyglot (different languages), 100+ services

---

## Q3: Explain feature flags. How do you safely roll out a new feature?

**Answer:**
Feature flags (feature toggles) decouple deployment from release. You deploy new code behind a flag (off by default). Then you turn it on gradually, monitoring for issues.

**Anatomy of a safe rollout**:
1. **Deploy with flag off (0%)**: new code is in production but unreachable. No risk.
2. **Enable for internal users (canary)**: dogfood the feature with your own team. Catch obvious bugs.
3. **Gradual rollout (5% → 25% → 50% → 100%)**: increment with monitoring. Watch error rates, latency, business metrics (conversion rate, etc.) after each step.
4. **Full release (100%)**: feature is on for everyone.
5. **Cleanup**: remove the flag and dead code within 1-2 sprints (flag debt accumulates quickly).

**Critical implementation rule**: Check the flag on **both** frontend AND backend.
- Frontend-only: a user can bypass the feature gate by calling the API directly (Postman, curl, modified request)
- Backend-only: the UI might render buttons/features that the API doesn't support yet — race conditions

**Percentage rollout** must be deterministic per user: `hash(userId) % 100 < rolloutPercentage`. This ensures the same user always gets the same experience (not random per request), which is essential for consistent UX.

---

## Q4: When would you use WebSockets vs Server-Sent Events?

**Answer:**

**Use WebSockets when**:
- You need **bidirectional communication** — both client and server send messages
- Real-time collaboration (Google Docs-style: user edits trigger immediate updates to other users)
- Chat applications (messages flow in both directions simultaneously)
- Multiplayer games (client sends moves, server broadcasts game state)
- Low-latency bidirectional data (trading platforms, IoT telemetry)

**Use SSE when**:
- You need **server → client only** communication
- Live notifications (new messages, order status updates, deployment progress)
- Real-time dashboards where the client just reads data
- The browser can initiate actions via normal HTTP requests (fetch/XHR) and only needs to receive updates

**Practical SSE advantages**:
- Standard HTTP — works through proxies and load balancers that might not support WebSocket upgrades
- HTTP/2: SSE is multiplexed with other HTTP/2 requests on the same connection
- Automatic reconnection built into `EventSource` browser API
- Load balancers can handle SSE as regular HTTP connections

**Load balancing consideration**: WebSockets create persistent connections. With horizontal scaling, you need **sticky sessions** (pin a user to the same server) or a **pub/sub layer** (Redis Pub/Sub, Kafka) so any server instance can broadcast to any connected client.

---

## Q5: What is the three-pillars observability model? How do you implement it in Node.js?

**Answer:**
The three pillars: **Logs**, **Metrics**, **Traces**.

**Logs** (structured JSON, not plain text):
```js
// pino (fastest Node.js logger)
const logger = pino({ level: 'info' });
logger.info({ userId: 42, orderId: 'ord_123', duration: 45 }, 'Order created');
// Outputs: {"level":"info","userId":42,"orderId":"ord_123","duration":45,"msg":"Order created"}
```
Always include a `correlationId` in every log line so you can filter all logs for one request. Log to stdout — log aggregators (Fluentd, Loki, CloudWatch) collect and index them.

**Metrics** (Prometheus):
```js
const { Counter, Histogram } = require('prom-client');
const requests = new Counter({ name: 'http_requests_total', labelNames: ['method', 'status'] });
const latency = new Histogram({ name: 'http_latency_seconds', buckets: [0.01, 0.05, 0.1, 0.5, 1] });
// On each request: requests.inc({ method: 'GET', status: 200 }); latency.observe(duration);
// Expose: GET /metrics → Prometheus scrapes this endpoint every 15s
```

**Traces** (OpenTelemetry):
```js
const sdk = new opentelemetry.NodeSDK({ traceExporter: new JaegerExporter() });
sdk.start(); // auto-instruments express, http, pg, redis
// Propagates trace-id automatically across services via HTTP headers
```

**Sentry for errors** (frontend + backend):
- Automatically captures unhandled exceptions with full stack trace, request context, user info
- Source maps for minified frontend JS — Sentry deobfuscates the stack trace
- Release tracking: compare error rate before/after each deployment

The three pillars together give you the ability to: detect that something is wrong (metrics → alert), understand what happened (logs → debugging), understand where it happened (traces → distributed path).

---

## Q6: What is the BFF (Backend for Frontend) pattern?

**Answer:**
BFF is a dedicated backend service for each specific frontend client (web, mobile, smart TV). Instead of having one general-purpose API that all clients share, each client type gets its own tailored API.

**Problem it solves**:
- Mobile client needs a response with only 5 fields to minimize bandwidth
- Web client needs 20 fields and aggregated data from 3 services
- A single API either over-fetches (mobile gets 20 fields) or under-fetches (web makes 3 round trips)

**BFF responsibilities**:
- Aggregate calls to multiple downstream services into one response
- Transform data to exactly what the UI needs (UI-specific shapes, computed fields)
- Handle client-specific authentication flows
- Implement client-specific rate limiting and caching

**Example**:
```
Mobile BFF:  GET /api/home → aggregates user + recent-orders + recommendations → returns 5 fields
Web BFF:     GET /api/home → returns full 20-field response with nested data
```

**When NOT to use BFF**: Small teams where the coordination cost of maintaining separate backends outweighs the benefit. Consider GraphQL instead — clients query exactly what they need from one API.

---

## Q7: How do consumer-driven contract tests with Pact work?

**Answer:**
Traditional integration tests: you write tests against the provider, checking that the API returns what the provider decides. If the provider removes a field, the test passes (it still returns valid data), but the consumer breaks.

**Consumer-driven contract testing** flips this: the consumer defines what it needs, and the provider must satisfy the consumer's contract.

**Pact workflow**:
1. **Consumer writes tests**: "When I call `GET /users/1`, I expect to receive `{ id: number, name: string, email: string }`"
2. **Pact generates a contract file**: a JSON file describing the expected interactions
3. **Contract published** to a Pact Broker (hosted service or self-hosted)
4. **Provider runs verification**: "Can our actual API satisfy the contract in the Pact Broker?"
5. **CI gates**: provider's CI fails if it can't satisfy any consumer's contract — prevents breaking deployments

**Benefit**: A backend developer cannot remove `email` from the User endpoint without immediately seeing which consumers depend on it. The contract is automatically enforced in CI.

**vs API integration tests**: Contract tests don't require the full stack to be running. The consumer-side tests mock the provider (record interactions). The provider verification runs the real API against the recorded contract. Fast, isolated, and catches breaking changes earlier than end-to-end tests.

---

## Q8: What is the difference between `pnpm`, `npm`, and `yarn` workspaces?

**Answer:**
All three support workspaces (monorepo with multiple packages in one repo), but differ significantly in how they manage `node_modules`.

**npm workspaces** (npm 7+): Hoists all packages to the root `node_modules`. Simple, standard. Hoisting can cause phantom dependencies (Package A can import Package B even if A doesn't declare B as a dependency, because B was hoisted).

**Yarn workspaces (classic/v1)**: Similar hoisting to npm. Yarn Berry (v2+) uses Plug'n'Play (PnP) — no `node_modules` at all, packages stored in a zip cache, `.pnp.cjs` maps imports to cache locations. Zero-installs: commit the cache, no install step needed.

**pnpm workspaces**: Most different from npm/yarn. Uses a global content-addressable store — each package version is stored once globally, and `node_modules` are populated with hardlinks/symlinks. No phantom dependencies by default (strict mode prevents using non-declared packages). 2-5x less disk space than npm. Fast installs due to parallelism and cache reuse.

**For monorepos**: pnpm workspaces + Turborepo is the most popular modern combination. pnpm handles packages, Turborepo handles task orchestration and caching.

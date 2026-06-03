# Day 54 — Full-Stack Integration Patterns

## End-to-End Type Safety

Type safety across the full stack is one of the most impactful improvements a TypeScript team can make. Without it, a backend developer renames a field and every frontend usage silently breaks at runtime.

**tRPC**: TypeScript RPC that shares types between client and server with zero overhead. You define a router on the server using TypeScript, and the client gets full type inference — including input types, output types, and error types — without writing a single API client by hand.

```ts
// server: router.ts
export const appRouter = createTRPCRouter({
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.user.findUnique({ where: { id: input.id } });
    }),
});
export type AppRouter = typeof appRouter;

// client: component.tsx
const { data: user } = trpc.getUser.useQuery({ id: '123' });
// user is typed as User | null — no manually written types, no codegen step
```

tRPC is ideal for monorepos where client and server are in the same project. The type information flows directly — if you change the output shape on the server, TypeScript immediately shows you all the client-side usages that break.

**Zod schemas**: Define your data shapes once, use everywhere.
- On the server: validate incoming request body
- As TypeScript types: `z.infer<typeof UserSchema>` generates the type
- On the client: validate form inputs, parse API responses
- Shared package: `packages/schemas` exports Zod schemas used by both frontend and backend

**OpenAPI + codegen**: For REST APIs (especially public-facing or polyglot), generate TypeScript clients from the OpenAPI spec using tools like `openapi-typescript` or `swagger-codegen`. Less ergonomic than tRPC but works across language boundaries.

---

## Monorepo Patterns

Monorepos colocate multiple packages (frontend app, backend app, shared libraries) in one git repository. This enables atomic commits across packages, easier refactoring, and shared tooling.

**Turborepo**:
- Task graph: define that `build` depends on `test`, and tests depend on `lint`. Turborepo runs tasks in the correct dependency order.
- **Remote caching**: Hash each task's inputs (source files + dependencies). If inputs haven't changed, replay the cached output instead of re-running. In CI, this can turn a 10-minute build into seconds.
- Affected commands: only run tasks for packages affected by a change
- Configuration: `turbo.json` defines the pipeline

**Nx**:
- More opinionated: generators for creating new libraries/apps following conventions
- Affected graph: visualize dependencies between packages
- First-class support for many frameworks (Next.js, Nest.js, React)
- Better for larger teams that need enforced structure

**pnpm workspaces**:
- Disk efficiency: packages are stored once globally, symlinked into `node_modules` — doesn't duplicate `react` 10 times
- Strict isolation: `node_modules` hoisting is more controlled than npm/yarn, preventing phantom dependencies

**Standard package layout**:
```
apps/
  web/        (Next.js frontend)
  api/        (Express/Fastify backend)
packages/
  ui/         (shared React components)
  shared/     (types, constants, utilities)
  config/     (ESLint, TypeScript, Jest configs)
  schemas/    (Zod schemas shared between apps)
```

---

## API Contracts and Versioning

Without versioning discipline, API changes break clients. Without contract testing, you discover breaking changes in production.

**Semantic versioning for APIs**:
- **MAJOR** (breaking): remove an endpoint, remove a required field, change a field type
- **MINOR** (additive): add a new optional field, add a new endpoint
- **PATCH**: bug fixes that don't change the contract

**Backward-compatible changes** (safe, no version bump needed):
- Add new optional fields to responses
- Add new optional query parameters
- Add new endpoints

**Breaking changes** (require MAJOR version bump or deprecation period):
- Remove or rename fields
- Change field types
- Remove endpoints
- Change authentication scheme

**Consumer-Driven Contract Testing with Pact**:
1. Frontend (consumer) writes tests that describe what it expects from the API: "I expect `GET /users/1` to return `{ id, name, email }`"
2. Pact generates a contract file from these tests
3. Backend (provider) runs the contract against its actual implementation: does it return those fields?
4. If a backend developer removes `email`, the Pact contract test fails before deployment

This catches breaking changes automatically, before they reach production.

---

## Feature Flags for Full-Stack

Feature flags decouple deployment from release. You deploy code that's behind a flag (off), then enable it gradually for specific users.

**LaunchDarkly pattern**:
```js
// Backend: reject if feature is off for this user
app.get('/api/new-pricing', async (req, res) => {
  const enabled = await ld.variation('new-pricing', { key: req.user.id }, false);
  if (!enabled) return res.status(404).end();
  // ...
});

// Frontend: show/hide UI element
function PricingPage() {
  const newPricing = useFlag('new-pricing');
  return newPricing ? <NewPricingUI /> : <OldPricingUI />;
}
```

**Critical rule**: Check the flag on BOTH frontend AND backend. If you only check frontend, a user can directly call the API and bypass the flag. If you only check backend, you might render UI for a feature the API doesn't support.

**Gradual rollout strategy**:
1. 0%: off for everyone — deploy code
2. 5%: internal users only — QA the feature in production
3. 25%: gradual rollout — monitor error rates and metrics
4. 100%: full release — clean up the flag and dead code within 1 sprint

---

## Real-Time Features: WebSocket vs SSE

**WebSockets**:
- Bidirectional: both client and server can initiate messages
- Full-duplex: simultaneous send and receive
- Protocol: `ws://` or `wss://`, upgraded from HTTP
- Use for: chat applications, multiplayer games, collaborative editing (Google Docs-style), live trading dashboards
- Libraries: `ws` (Node.js), `Socket.io` (adds rooms, fallbacks, reconnection)

**Server-Sent Events (SSE)**:
- Unidirectional: only server → client
- Standard HTTP: works with `EventSource` API in browsers
- HTTP/2 friendly: multiplexed with other requests, no protocol upgrade
- Auto-reconnect: browser reconnects automatically with `Last-Event-ID`
- Use for: live notifications, activity feeds, real-time dashboards, deployment status

**Decision matrix**:
- Chat/gaming/collaboration → WebSocket (need bidirectional)
- Notifications/live feeds/status updates → SSE (simpler, HTTP/2 native)
- Long polling: fallback only, use when WebSockets blocked by proxies

**Socket.io rooms** — broadcast to subset of connections:
```js
socket.join(`order:${orderId}`);              // join a room
io.to(`order:${orderId}`).emit('status', payload); // broadcast to room
```

---

## Observability Stack

Observability is the ability to understand your system's internal state from external outputs. The three pillars:

**Logs**: Structured JSON logs (not plain text — machines can't parse plain text efficiently).
```js
// Good:
logger.info({ userId, orderId, duration: 42 }, 'Order processed');
// Bad:
console.log(`Order ${orderId} processed for user ${userId} in 42ms`);
```
Use `pino` (fastest Node.js logger) or `winston`. Log levels: error, warn, info, debug. Always include `correlationId` (trace ID) in every log line.

**Metrics**: Counters, gauges, histograms. Prometheus scrapes `/metrics` from your service.
```js
const httpRequests = new Counter({ name: 'http_requests_total', labelNames: ['method', 'status'] });
const requestDuration = new Histogram({ name: 'http_request_duration_seconds', buckets: [0.01, 0.05, 0.1, 0.5, 1] });
```
Grafana visualizes these metrics with dashboards and alerts.

**Traces**: OpenTelemetry instruments your application, creating spans for each operation. Exported to Jaeger or Tempo. Shows the full path of a request through all services.

**Error tracking**: Sentry captures exceptions with full stack traces, request context, user information. For frontend: also captures source maps to deobfuscate minified JS.

**BFF (Backend for Frontend)**: A dedicated API layer for each client type. The mobile BFF aggregates 5 API calls into 1 response optimized for mobile bandwidth. The web BFF returns more detailed data for desktop. Avoids over-fetching (mobile doesn't need all fields) and under-fetching (web doesn't want 5 round trips).

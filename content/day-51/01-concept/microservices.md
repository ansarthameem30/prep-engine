# Day 51 — Microservices Architecture

## The Decision Matrix: Monolith vs Microservices

Before adopting microservices, every senior engineer must understand the single most common mistake in software architecture: **choosing microservices before you need them**. The default should be a monolith. Here is when to break that default:

**Prefer a Monolith when:**
- Team size is under 10 developers — coordination overhead of microservices kills productivity
- Product is early-stage — domain boundaries are unclear, you will refactor repeatedly
- Domain is simple — a single bounded context fits cleanly in one codebase
- Operational complexity is low — you don't have a DevOps team to manage 12 services

**Move to Microservices when:**
- Teams need to deploy independently without coordination
- Different services have vastly different scaling requirements (user reads vs payment processing)
- Different parts of the system need different tech stacks
- Domain boundaries are clear and stable — they won't shift every quarter
- You have the operational maturity to handle the costs

**The real costs of microservices** (rarely discussed honestly):
- **Network latency**: every service call is a remote call that can fail
- **Distributed transactions**: no simple ACID guarantee across services
- **Operational complexity**: 10 services = 10 deployment pipelines, 10 sets of logs, 10 health endpoints
- **Debugging difficulty**: a single request touches 5 services — which one failed?

---

## Domain-Driven Design (DDD) Basics

DDD provides the vocabulary and patterns for carving a monolith into services.

**Bounded Context**: A boundary within which a particular model applies. "Order" means something different in the Ordering context (cart items, total) vs the Shipping context (delivery address, tracking number). These are two different models — never merge them.

**Ubiquitous Language**: Every concept in code and conversation uses the same word as domain experts. If the business calls it "fulfillment," your code uses `fulfillment`, not `orderProcessing`.

**Aggregate Roots**: The single entry point for a cluster of domain objects. An `Order` aggregate contains `OrderLine` items. You always load/save the whole `Order` — you never reach directly into `OrderLine` from outside.

**Context Mapping**: How bounded contexts relate. An upstream "Customer" context feeds into a downstream "Order" context. Patterns: Shared Kernel (shared code), Customer-Supplier, Conformist, Anti-Corruption Layer (translate between models).

---

## Service Decomposition Strategies

1. **By Domain**: User Service, Order Service, Payment Service, Notification Service — natural fit when domain is clear
2. **By Capability**: Authentication Service, Search Service, Recommendation Service — technical capabilities shared across domains
3. **By Volatility**: Group things that change together; separate things that change independently. Pricing logic changes weekly; user profile rarely changes — keep them separate

---

## API Gateway Pattern

The API Gateway is the single entry point for all clients. It handles:
- **Routing**: `/users/*` → User Service, `/orders/*` → Order Service
- **Authentication**: Verify JWT once at the gateway instead of every service
- **Rate limiting**: Throttle by IP/user before requests hit services
- **SSL termination**: TLS handled at the edge, services communicate over HTTP internally
- **Response aggregation**: Combine responses from multiple services into one

**Tools**: Kong (feature-rich, Lua plugins), AWS API Gateway (serverless, pay-per-call), Nginx (lightweight reverse proxy + rate limiting via lua-resty-limit-req).

---

## Service Communication

### Synchronous (REST, gRPC)
Use when: you need a real-time response, simple request-reply semantics.
Cost: caller is **coupled through availability** — if the downstream is down, you fail.

**gRPC** improves on REST:
- Protocol Buffers: binary format, smaller payload, strongly typed schema
- Streaming: client streaming, server streaming, bidirectional streaming
- Lower overhead: ~5-10x smaller than JSON REST for same data
- Use for: inter-service calls where both sides are internal, high throughput

### Asynchronous (Events, Kafka)
Use when: you don't need an immediate response, or the operation is a side effect.
Benefits: **temporal decoupling** — publisher doesn't care if consumer is down, eventual consistency is acceptable.
Cost: harder to debug, eventual consistency means UI can lag, message ordering must be handled.

**Kafka** key concepts: topics, partitions, consumer groups, offset, at-least-once delivery. For exactly-once: idempotent consumers (check if event already processed).

---

## Service Discovery

**Client-side discovery**: Service registers itself in a registry (Consul, Eureka). Client queries registry to get instances, then load balances itself. More control, more client complexity.

**Server-side discovery**: Client calls load balancer. Load balancer queries registry and routes. Simpler for clients, requires infrastructure component (AWS ALB, Kubernetes Service).

**Kubernetes DNS-based**: Every Service gets a DNS name: `user-service.production.svc.cluster.local`. Kubernetes handles registration automatically. This is the standard modern approach.

---

## Circuit Breaker Pattern

Prevents **cascading failures**. When Service A calls Service B and B is slow/down:
- Without circuit breaker: A's threads pile up waiting → A runs out of threads → A's callers fail → full cascade
- With circuit breaker: after 5 consecutive failures, open the circuit → fail fast with a fallback → retry after 30s

**States**:
- **Closed** (normal): requests pass through, failures counted
- **Open** (failing): all requests fail immediately, no network call made
- **Half-Open** (testing recovery): one trial request allowed — if it succeeds, close; if it fails, re-open

**Node.js**: `opossum` library provides this. Threshold: 50% failure rate over 10 requests → open. Timeout: 10s in half-open.

---

## Distributed Tracing with OpenTelemetry

A single user request touches User Service → Order Service → Payment Service → Notification Service. Without tracing, you have 4 separate log files with no correlation.

**OpenTelemetry**: A `trace_id` (UUID) is generated at the entry point and propagated via HTTP headers (`traceparent: 00-{traceId}-{spanId}-01`). Each service creates child spans. All spans are sent to **Jaeger** or **Zipkin** where you visualize the full request timeline.

**What it reveals**: P99 latency per service, which service is the bottleneck, exactly which database query is slow.

---

## Strangler Fig Pattern

Don't rewrite the monolith all at once — you will fail. Instead:
1. Put a proxy/router in front of the monolith
2. Extract one service (e.g., User Service) and route `/users/*` to it
3. All other traffic still goes to the monolith
4. Repeat until the monolith is empty (strangled)

Named after the strangler fig tree that grows around its host and eventually replaces it.

---

## Data Isolation & Distributed Transactions

**Rule**: Each service owns its own database. No service reads another service's tables directly. This enables independent deployment and scaling.

**The problem**: A single business operation (place order → deduct inventory → charge payment) must span 3 services. Traditional 2-Phase Commit (2PC) is too slow and creates distributed locking.

**Saga Pattern** instead:
- **Choreography**: each service emits events, next service reacts. Loosely coupled but hard to track.
- **Orchestration**: a Saga Orchestrator sends commands and waits for responses. Easier to reason about, single point of coordination.
- **Compensating transactions**: if Payment fails, emit `PaymentFailed` → Order Service listens and cancels the order.

---

## 12-Factor App Principles

The definitive checklist for production-ready services: single codebase per service, explicit dependency declaration (`package.json`), config in environment variables (not code), treat backing services (DB, Redis) as attached resources, separate build/release/run stages, stateless processes, export services via port binding, scale by adding processes, maximize disposability (fast startup/shutdown), keep dev/prod environments identical, treat logs as streams (stdout/stderr), run admin tasks as one-off processes.

Following all 12 factors makes your service portable, scalable, and deployable on any platform.

# Day 51 — Microservices Architecture: Interview Q&A

---

## Q1: When should you choose microservices over a monolith? What are the costs?

**Answer:**
Choose microservices when: teams need independent deployment without coordination, different parts of the system need different scaling characteristics (e.g., read-heavy User Service vs compute-heavy Recommendation Service), different services need different tech stacks, or domain boundaries are clear and stable.

**Stick with a monolith when**: team is under 10 developers, product is early-stage with unclear domain boundaries, or you lack the operational maturity to run distributed systems.

**Real costs of microservices** (be honest about these in interviews — it signals maturity):
- Network latency: every cross-service call adds 1-50ms and can fail
- Distributed transactions: no ACID across services — you need Sagas
- Operational overhead: each service needs its own CI/CD, logging, health checks, secrets management
- Debugging: a request spanning 5 services is hard to trace without distributed tracing infrastructure

**The rule of thumb**: Martin Fowler's "MonolithFirst" — start with a monolith, extract services only when a specific scaling or autonomy pain justifies it.

---

## Q2: Explain the Circuit Breaker pattern. Why does it prevent cascading failures?

**Answer:**
When Service A depends on Service B, and B becomes slow or unavailable, A's thread pool fills up with threads waiting for B to respond. This causes A itself to fail, propagating the failure upstream. This is a cascading failure.

The circuit breaker sits between A and B:
- **Closed state** (healthy): all calls pass through, failures counted
- **Open state** (tripped): after threshold failures (e.g., 5 failures in 10 requests), the circuit opens. Calls to B fail immediately with a fallback — no network call made. This frees A's threads.
- **Half-open state** (recovery test): after a timeout (e.g., 30s), one trial request is allowed. If it succeeds, circuit closes; if it fails, re-opens.

**Why it prevents cascades**: Fast-fail immediately instead of waiting for a slow timeout on every request. A's thread pool doesn't fill up. A remains available to serve its own callers.

**Production usage**: Netflix Hystrix (now deprecated), Resilience4j (Java), `opossum` (Node.js). Also natively supported in Kubernetes via Istio service mesh.

---

## Q3: Compare client-side vs server-side service discovery. Which does Kubernetes use?

**Answer:**
**Client-side discovery**: The service registers itself with a service registry (Consul, Eureka). When Service A wants to call Service B, A queries the registry directly, gets the list of B instances, and load-balances the call itself. More control for the client, but every service must include discovery client logic.

**Server-side discovery**: The client calls a load balancer (or router). The load balancer queries the registry and forwards the request. Clients are simpler — they just call a fixed DNS name. Infrastructure handles the routing (AWS ALB, Kubernetes Service).

**Kubernetes uses server-side DNS-based discovery**:
- Each Kubernetes Service gets a cluster-internal DNS name: `servicename.namespace.svc.cluster.local`
- The kube-proxy routes requests to healthy pods
- Services register/deregister automatically as pods start and stop
- Clients just call `http://user-service` — no discovery client needed

This is why Kubernetes has largely made client-side discovery (Consul on k8s) unnecessary.

---

## Q4: What is distributed tracing and how does OpenTelemetry work?

**Answer:**
In a microservices system, a single user request triggers calls across multiple services. Each service has its own logs, but there's no way to correlate them to a single request without distributed tracing.

**OpenTelemetry** (OTel) provides:
1. **Trace ID**: A UUID generated at the entry point (API Gateway) and propagated via HTTP headers (`traceparent: 00-{traceId}-{spanId}-01`)
2. **Spans**: Each service creates a span (start time, end time, attributes, events). Spans form a tree with parent-child relationships
3. **Exporters**: Spans are sent to a backend (Jaeger, Zipkin, AWS X-Ray) via OTLP protocol
4. **Visualization**: Jaeger shows the full request timeline — which service was called, in what order, how long each took

**What it reveals that logs alone cannot**:
- The exact path a request took through 8 services
- Which service added 200ms of latency
- Where an error actually originated vs where it was reported

**Setup in Node.js**: `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node` — auto-instruments Express, HTTP, pg, redis with minimal configuration.

---

## Q5: Explain the Strangler Fig pattern. When would you use it?

**Answer:**
The Strangler Fig pattern is a migration strategy for incrementally replacing a monolith with microservices without a big-bang rewrite.

**Steps**:
1. Deploy a router/proxy (Nginx, API Gateway) in front of the monolith
2. Implement a new service for one domain (e.g., User Service)
3. Configure the router to send `/users/*` traffic to the new service, everything else to the monolith
4. Gradually migrate more domains
5. When the monolith handles zero traffic, decommission it

**Why it works**: No "version freeze" on the monolith while rebuilding. The monolith keeps running in production throughout. Teams can migrate one service at a time.

**Risks**: The router becomes a critical single point of failure. You still need data migration (copy user data from monolith DB to User Service DB). Duplicate logic exists temporarily in both systems.

**Real-world example**: Amazon.com migrated from a monolith to microservices using this pattern over 10+ years starting around 2000.

---

## Q6: What is the N+1 problem in the context of microservices? How do you solve it?

**Answer:**
In a microservices context, the N+1 problem manifests as: to display a list of 100 orders with their associated user names, your Orders Service makes 1 call to get orders, then 100 individual calls to User Service — one per order. Total: 101 network calls instead of 2.

**Solutions**:
1. **DataLoader pattern**: Batch N individual requests into 1 batched request. Within a single request lifecycle, collect all user IDs (e.g., during a tick), then call `GET /users?ids=1,2,3,...100` in one request. Facebook's DataLoader does this with deferred resolution.
2. **GraphQL with DataLoader**: This is why GraphQL often uses DataLoader — resolvers run per field and would cause N+1 without batching.
3. **Composite queries**: Have the Orders Service accept an include parameter: `GET /orders?include=user` — let it fetch user data via a batch call to User Service internally.
4. **Denormalization**: Store the user's name directly in the order record. Stale data risk, but eliminates the join entirely.

---

## Q7: How do you handle distributed transactions across microservices? What is the Saga pattern?

**Answer:**
Traditional 2-Phase Commit (2PC) doesn't work well for microservices: it requires all participants to be available simultaneously, creates distributed locks, and fails poorly. Modern systems use the **Saga pattern** instead.

A Saga is a sequence of local transactions, each publishing an event/message that triggers the next step. If any step fails, compensating transactions roll back the previous steps.

**Two implementations**:

**Choreography-based Saga**: Each service listens for events and decides what to do.
- Order placed → `OrderCreated` event → Inventory Service decrements stock → `StockReserved` event → Payment Service charges card → `PaymentProcessed` event → Order Service marks order complete.
- If payment fails: `PaymentFailed` event → Inventory Service releases stock → Order Service marks order cancelled.
- Pro: no central coordinator. Con: hard to track flow, circular event dependencies.

**Orchestration-based Saga**: A Saga Orchestrator sends commands and awaits responses.
- Easier to track: the orchestrator knows the full state.
- Easier to add error handling and compensating transactions in one place.
- Con: the orchestrator is a single point of failure; must be made resilient.

---

## Q8: What is gRPC and when would you use it over REST?

**Answer:**
gRPC is a high-performance RPC framework that uses **Protocol Buffers** (protobuf) for serialization instead of JSON.

**Advantages over REST**:
- **Strongly typed**: `.proto` files define the schema; both client and server generate code from the same schema — no mismatched field names
- **Smaller payload**: protobuf binary is 3-10x smaller than equivalent JSON
- **Streaming**: native support for server streaming, client streaming, and bidirectional streaming
- **Lower latency**: less CPU for serialization/deserialization, HTTP/2 multiplexing, binary framing

**When to use gRPC**:
- Inter-service communication where both sides are internal and in your control
- High-throughput services (telemetry, analytics pipelines)
- Services that need streaming (live data feeds, bidirectional communication)
- Polyglot environments — gRPC generates clients in Go, Java, Python, Node.js from the same `.proto`

**When to stick with REST**:
- Public-facing APIs (browsers natively speak REST, gRPC needs grpc-web proxy for browser clients)
- When clients are third parties who need a stable, human-readable API
- Simpler services where JSON readability and curl-ability matter more than performance

**Interview tip**: gRPC is the right answer for synchronous inter-service communication in a microservices system. REST is for external APIs.

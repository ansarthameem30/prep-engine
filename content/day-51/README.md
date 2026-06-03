# Day 51 – Microservices Architecture: Decomposition, Communication & Resilience Patterns | DSA: Median of Two Sorted Arrays

> **Phase 6 – Final Sprint + Mock Interviews** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Monolith vs microservices, service decomposition, API gateway, service discovery, circuit breaker, distributed tracing |
| Hands-On | 00:40–01:10 | Build an API gateway with service routing, circuit breaker pattern, and OpenTelemetry tracing |
| DSA | 01:10–01:25 | Median of Two Sorted Arrays (LeetCode #4) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Articulate the decision criteria for microservices vs monolith with real tradeoffs
- [ ] Apply domain-driven design to decompose a monolith into bounded contexts
- [ ] Implement a circuit breaker pattern with half-open state
- [ ] Set up OpenTelemetry distributed tracing across two services
- [ ] Solve: Median of Two Sorted Arrays (#4)
- [ ] Review 5 interview questions

---

## Concept: Microservices Architecture

### What to Study
- **Monolith vs microservices decision criteria:**
  - When monolith wins: small team (<10 engineers), early product (requirements change fast), low operational maturity, shared domain logic, latency-sensitive tight coupling
  - When microservices win: independent scaling requirements, multiple teams on different deployment cycles, regulatory isolation (PCI scope reduction), polyglot technology needs, fault isolation requirements
  - The spectrum: modular monolith → mini-services → microservices; start monolith, extract on pain
- **Service decomposition patterns:**
  - **Domain-Driven Design (DDD):** Identify bounded contexts (cohesive domain models with clear boundaries); ubiquitous language within context; context mapping (shared kernel, customer-supplier, anti-corruption layer)
  - **By business capability:** Each service owns a business capability end-to-end (Order Service, Inventory Service, Payment Service)
  - **By subdomain:** Core (competitive advantage — invest here), supporting (necessary but not differentiating — buy/outsource), generic (commodity — use SaaS)
  - Decomposition anti-patterns: nanoservices (too granular), distributed monolith (services tightly coupled through shared DB)
- **API gateway pattern:** Single entry point for clients; concerns: routing, authentication/authorization (JWT validation), rate limiting, SSL termination, request/response transformation, load balancing, API composition; tools: Kong, AWS API Gateway, nginx + custom middleware; BFF (Backend For Frontend) variant
- **Service discovery:**
  - **Client-side:** Service registers with registry (Consul); client queries registry, load balances itself (Eureka + Ribbon)
  - **Server-side:** Load balancer queries registry; client just calls load balancer; simpler client
  - **Kubernetes DNS:** Each Service gets a DNS name (`service-name.namespace.svc.cluster.local`); kube-proxy handles routing; preferred in K8s environments
- **Inter-service communication:**
  - **Sync (REST/gRPC):** Simple, request-response; creates temporal coupling (both services must be up); gRPC (HTTP/2, protobuf, streaming, strongly typed contracts) vs REST (JSON, flexible, more tooling)
  - **Async (events/messages):** Decoupled in time; producer doesn't wait for consumer; Kafka (event streaming, replay, consumer groups) vs RabbitMQ (message queue, complex routing, acknowledgment); event-driven architecture tradeoffs (eventual consistency, harder debugging)
  - **Saga pattern:** Distributed transactions across services using choreography (events) or orchestration (central saga orchestrator)
- **Circuit breaker pattern (resilience4j / Polly concept):**
  - States: Closed (normal, requests pass through) → Open (threshold exceeded, requests fail fast) → Half-Open (probe requests, decide to close or re-open)
  - Configuration: failure threshold (e.g., 50% over 60s), wait duration in Open state, probe count in Half-Open
  - Fallback strategies: cached response, default value, redirect to degraded service
- **Distributed tracing (OpenTelemetry):** Trace ID propagated across service boundaries via HTTP headers (`traceparent`); spans represent operations within a service; OTel SDK auto-instruments HTTP/DB calls; export to Jaeger, Zipkin, Datadog, Honeycomb; trace sampling (head-based vs tail-based)
- **Strangler fig pattern:** Incrementally migrate from monolith to microservices by routing new feature traffic to new service while old monolith handles legacy traffic; use API gateway for routing; gradually expand new service surface; no big bang migration

### Key Mental Models
- **A microservice is a deployment boundary, not just a small service:** The value is independent deployability and team autonomy — if services deploy together, you have a distributed monolith, not microservices
- **Async communication is the only way to achieve true decoupling:** Sync REST between services creates hidden coupling — if Service B is down, Service A fails; async messaging allows Service A to continue and Service B to catch up
- **Circuit breaker is the insurance policy:** Systems fail; the circuit breaker prevents cascading failure by failing fast and allowing downstream services to recover without being overwhelmed by retries

### Why This Matters in Interviews
Microservices architecture is a standard senior engineering interview topic. System design rounds at scale-up companies assume you can decompose a domain, justify sync vs async communication choices, and know resilience patterns. Circuit breaker and distributed tracing are differentiating answers that move you from "knows microservices" to "has built and debugged them."

---

## DSA Focus: Binary Search – Divide and Conquer on Sorted Arrays

- **Problem:** Median of Two Sorted Arrays (LeetCode #4)
- **Difficulty:** Hard
- **Pattern:** Binary search on partition — O(log(min(m,n)))
- **Time Target:** < 20 minutes
- **Key Insight:** Binary search on the smaller array to find partition point where `maxLeft1 <= minRight2 && maxLeft2 <= minRight1`; the median is computed from the 4 boundary elements; handle edge cases (empty left/right partitions with ±Infinity sentinels)

---

## Today's 5 Interview Questions
1. Your monolith is getting hard to scale — walk me through how you decide whether to extract a microservice and where you'd start.
2. Compare gRPC and REST for inter-service communication — when do you choose each?
3. Explain the circuit breaker pattern — what are the three states, what triggers transitions between them, and what's the fallback strategy?
4. How does distributed tracing work across microservices — what is a trace ID, how is it propagated, and where do you export traces?
5. What is the strangler fig pattern and why is it safer than a big-bang monolith-to-microservices migration?

---

## Files
- `01-concept/` → Notes on DDD bounded contexts, sync vs async communication comparison table, circuit breaker state machine, OTel architecture
- `02-hands-on/` → api-gateway-circuit-breaker.js — Express API gateway with route config, circuit breaker middleware (state machine), OTel tracing
- `03-dsa/` → median-two-sorted-arrays.js — binary search on partition with full edge case handling
- `04-interview-prep/` → microservices-architecture-qa.md — 5 Q&As with decision frameworks

---

## Success Criteria
- [ ] Can explain microservices vs monolith decision with 3 concrete criteria per side
- [ ] Can implement a circuit breaker state machine from memory
- [ ] Solved Median of Two Sorted Arrays with O(log n) binary search in < 20 min
- [ ] Confident on all 5 interview questions

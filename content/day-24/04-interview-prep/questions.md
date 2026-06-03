# Day 24 — REST API Design: Interview Q&A

---

**Q1. What is the difference between PUT and PATCH, and when should each be used?**

`PUT` is a **full replace** — send the complete representation of the resource. Fields not included in the body are cleared. It is idempotent: calling `PUT /users/1 {name: "Alice"}` twice produces the same result (email gets wiped both times). `PATCH` is a **partial update** — only the fields you send are changed. It's more network-efficient (no need to fetch and resend the whole resource), but you need a clear semantics for how the server applies the patch (JSON Merge Patch RFC 7396 or JSON Patch RFC 6902). In practice: use PATCH for most update operations. Use PUT when clients naturally hold the whole resource and want to replace it atomically. Never PUT just to update one field — that's what PATCH is for.

---

**Q2. When would you use cursor-based pagination over offset pagination?**

Offset pagination (`LIMIT 20 OFFSET 200`) requires the database to scan and discard 200 rows to start at row 201 — performance degrades as pages go deeper. Worse, if an item is deleted between page 1 and page 2, all items shift, causing duplicates or skips. Cursor-based pagination uses a stable position marker (typically the last seen ID or timestamp): `WHERE id > :last_seen_id LIMIT 20`. This uses an index range scan (O(log n) to find the start), delivers consistent performance regardless of depth, and never has gaps on deletion. Use cursor pagination for any feed, timeline, or large dataset. The tradeoff: you can't jump to page 50 directly, and total count requires a separate COUNT query. For admin interfaces with random page access, offset pagination may still be appropriate.

---

**Q3. What status code would you return for each scenario: missing authentication, valid token but unauthorized, entity already exists, validation failed?**

Authentication missing or token invalid → **401 Unauthorized** (misleadingly named — it means "not authenticated"). Valid authentication but lacking permission → **403 Forbidden** (authenticated, but not allowed). Entity already exists (duplicate email, duplicate slug) → **409 Conflict** — the request cannot be completed because of a conflict with the current state of the resource. Syntactically valid JSON that fails semantic validation (invalid email format, negative quantity) → **422 Unprocessable Entity** — the server understands the content type and syntax but couldn't process the semantic content. The 422 vs 400 distinction: 400 is for malformed requests (invalid JSON, wrong Content-Type), 422 is for structurally valid but semantically invalid data.

---

**Q4. What are the tradeoffs between the three API versioning strategies?**

**URI path** (`/v1/users`) is operationally simple — routing at the load balancer/proxy level, caching works perfectly (URL includes version), and it's crystal clear in logs. Downside: violates REST purists (URI should identify resource, not version). **Query parameter** (`?version=1`) keeps URIs clean but is easy to miss and harder to route at proxy level. **Accept header** (`Accept: application/vnd.myapi.v2+json`) is most "correct" per REST — the URL identifies the resource, the header describes the representation. But it's impossible to test by pasting a URL, CDN caching requires proper Vary headers, and most developers find it confusing. For internal APIs and most public APIs, URI versioning is the pragmatic choice. Accept header versioning is used by GitHub and some hypertext-focused APIs.

---

**Q5. How would you design the idempotency key system for a payment API?**

The client generates a UUID v4 and sends it as `Idempotency-Key` header. The server uses `{method}:{path}:{key}` as a Redis key. On first request: store `"IN_FLIGHT"` immediately to prevent concurrent duplicate requests (race condition protection), then process the payment, then overwrite with `{status, responseBody}` and a 24-hour TTL. On subsequent requests with the same key: return the stored response with `Idempotent-Replayed: true` header — **no re-processing**. Edge cases: reject keys that don't match UUID format, reject reuse of a key with a different request body (the key is tied to the original operation), and handle the crash case (if the process dies between "IN_FLIGHT" and storing the result, the key expires and the client can retry). Stripe's implementation uses database-level unique constraints on idempotency keys for stronger guarantees.

---

**Q6. What is the RFC 7807 Problem Details format and why should you use it for error responses?**

RFC 7807 defines a standard JSON structure for HTTP error responses: `type` (URI identifying the error type), `title` (human-readable summary), `status` (HTTP status code), `detail` (human-readable explanation), `instance` (URI for this specific occurrence). Standardization enables: clients can write generic error handling code that works across multiple APIs, API gateways can parse errors consistently, monitoring tools can categorize errors by `type` without string parsing. The main alternative — ad-hoc error objects like `{error: "string"}` — forces every client to know each API's specific error structure. Extensions are allowed: add `errors: [{field, message}]` for validation details, `traceId` for correlation. Even if you don't follow RFC 7807 exactly, use a **consistent** error envelope across your entire API.

---

**Q7. How do sparse fieldsets work and what is their purpose?**

`?fields=id,name,email` instructs the server to return only the specified fields. Purpose: reduce response payload size (especially for mobile clients on slow connections), reduce serialization overhead, and explicitly document what data the client actually needs. Implementation: parse the `fields` query param, pass the field whitelist to the ORM/query, and strip non-requested fields from the response. In SQL: `SELECT id, name, email FROM users` (avoid `SELECT *`). In MongoDB: use projection `{ id: 1, name: 1, email: 1 }`. The server should validate field names against an allowlist to prevent information leakage. JSON:API spec formalizes sparse fieldsets with `?fields[users]=id,name`. The main challenge is related resources: `?fields=name,author.email` requires selectively projecting joined/embedded data.

---

**Q8. Explain HATEOAS: what it is, how it works, and when to skip it.**

HATEOAS (Hypermedia As The Engine Of Application State) means API responses include links describing available actions, so clients discover the API dynamically rather than hardcoding URLs. A response for `GET /orders/123` might include: `"_links": { "self": "/orders/123", "cancel": "/orders/123/cancel", "payment": "/orders/123/payment" }` — the client knows it can cancel or view payment by following these links, without knowing the URL structure upfront. The benefit: the server can change URL structure without breaking clients. In practice, HATEOAS adds significant implementation complexity and most API clients are built by developers who read the docs anyway — they don't programmatically discover links at runtime. Skip HATEOAS for most internal and partner APIs. Consider it for truly public hypermedia APIs where clients must remain stable across server URL changes, or when building API browsers/explorers. HAL, JSON:API, and Siren are standardized formats if you do implement it.

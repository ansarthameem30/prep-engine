# Day 24 – REST API Design: Conventions, Versioning & OpenAPI | DSA: Dynamic Programming

> **Phase 3 – Node.js + MySQL + MongoDB** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | URL conventions, HTTP semantics, status codes, versioning, pagination, OpenAPI |
| Hands-On | 00:40–01:10 | Design and document a complete REST API with swagger-jsdoc |
| DSA | 01:10–01:25 | Coin Change (#322) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Explain REST URL naming conventions and HTTP method semantics
- [ ] Compare cursor-based vs offset-based pagination trade-offs
- [ ] Implement versioning strategies and document an API with OpenAPI 3.0
- [ ] Solve: Coin Change (#322) using bottom-up DP
- [ ] Review 5 interview questions for API design

---

## Concept: REST API Design

### What to Study
- **URL conventions:** Use nouns not verbs (`/users` not `/getUsers`), plural resource names, nested resources for relationships (`/users/:id/orders`), kebab-case for multi-word (`/blog-posts`); actions that don't fit CRUD use sub-resources (`POST /orders/:id/cancel`)
- **HTTP method semantics:** GET (safe + idempotent), POST (not idempotent, creates), PUT (idempotent, full replace), PATCH (partial update), DELETE (idempotent); 200 vs 201 vs 204 distinctions; 400 (bad request), 401 (unauthenticated), 403 (unauthorized), 404 (not found), 409 (conflict), 422 (validation), 429 (rate limit), 500 (server error)
- **Versioning strategies:** URI path (`/v1/users`) — simple, cacheable, breaks bookmarks; Header-based (`Accept: application/vnd.api+json;version=1`) — cleaner URLs, harder to test; Query param (`?version=1`) — least preferred; URI versioning is the industry default
- **Pagination:** Offset-based (`?page=2&limit=20`) — simple but slow on large offsets, inconsistent with concurrent inserts; Cursor-based (`?after=cursor_id&limit=20`) — O(1) regardless of position, stable under writes, no "skip 10000 rows" problem — prefer cursor for feeds/infinite scroll
- **OpenAPI 3.0:** YAML/JSON spec with paths, components, schemas, security definitions; `swagger-jsdoc` generates from JSDoc comments; `swagger-ui-express` serves interactive docs

### Key Mental Models
- REST is not a protocol, it's architectural constraints — statelessness, uniform interface, and resource identification via URI. A "RESTful" API is one that uses HTTP semantics correctly, not just one that uses JSON
- Cursor pagination is like reading a book with a bookmark — you always know exactly where you are regardless of how many pages were added before your bookmark
- API versioning is a contract — once you publish v1, breaking changes require v2; additive changes (new optional fields) are non-breaking and safe

### Why This Matters in Interviews
API design is a core senior skill. Interviewers probe whether you know the difference between a resource and an action, why PUT must be idempotent, and how pagination affects database performance at scale. OpenAPI/Swagger knowledge signals you've worked on teams where API documentation is a deliverable.

---

## DSA Focus: Dynamic Programming – Coin Change

- **Problem:** Coin Change (LeetCode #322)
- **Difficulty:** Medium
- **Pattern:** 1D DP – Unbounded Knapsack variant
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Build `dp[i]` = min coins to make amount `i`; initialize to `Infinity`, set `dp[0] = 0`, then for each amount from 1 to target, try every coin: `dp[i] = min(dp[i], dp[i - coin] + 1)` — the "unbounded" part is that each coin can be reused

---

## Today's 5 Interview Questions (Flash Review)
1. Why should REST API URLs use nouns instead of verbs?
2. What is the practical difference between PUT and PATCH, and when does it matter?
3. When would you choose cursor-based pagination over offset-based pagination?
4. What are the trade-offs between URI versioning and header-based versioning?
5. Why does a 401 response not mean "you don't have permission" — what does it actually mean?

---

## Files in This Folder
- `01-concept/` → Read: REST API design best practices, OpenAPI 3.0 spec, Stripe/GitHub API as reference implementations
- `02-hands-on/` → Code: api-design.js (Express app with versioned routes, cursor pagination, OpenAPI annotations)
- `03-dsa/` → DSA: coin-change.js (bottom-up DP, space O(amount), trace through example)
- `04-interview-prep/` → Full Q&A: 5 questions with detailed answers on REST API design principles

---

## Success Criteria
- [ ] Can design a RESTful API for a given resource with correct URLs, methods, and status codes from memory
- [ ] Solved Coin Change in < 20 minutes with bottom-up DP
- [ ] Confident answering all 5 interview questions
- [ ] Bonus: Add HATEOAS links to your API responses and explain why they're rarely used in practice

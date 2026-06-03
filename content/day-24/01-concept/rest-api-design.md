# REST API Design Best Practices

## URL Design: Nouns, Not Verbs

URLs identify resources (things), not actions (verbs). HTTP methods supply the verb.

```
BAD:  POST /getUser, GET /createPost, DELETE /removeComment
GOOD: GET /users/:id, POST /posts, DELETE /comments/:id
```

**Plural resource names**: `/users`, `/products`, `/orders` — always plural for consistency.

**Nested resources** — express containment, but limit to 2 levels:
```
GET /users/:userId/orders            ← user's orders (level 2 — fine)
GET /users/:userId/orders/:orderId   ← specific order of a user (level 2 — fine)
GET /users/:userId/orders/:orderId/items/:itemId  ← too deep — use flat: GET /order-items/:itemId
```

Beyond 2 levels, URLs become unwieldy and coupling is too tight. For deeply nested resources, use a flat URL with query params: `GET /order-items?orderId=123`.

---

## HTTP Method Semantics

| Method | Semantics | Idempotent? | Safe? | Body? |
|--------|-----------|-------------|-------|-------|
| GET | Retrieve resource | Yes | Yes | No |
| POST | Create resource | No | No | Yes |
| PUT | Replace entire resource | Yes | No | Yes |
| PATCH | Partial update | No* | No | Yes |
| DELETE | Remove resource | Yes | No | No |

**PUT vs PATCH**: `PUT /users/1` replaces the entire user object — fields not sent are cleared. `PATCH /users/1` applies a partial update — only sent fields change. If you send `PUT { name: "Alice" }`, the email is wiped. If you send `PATCH { name: "Alice" }`, only name changes. PATCH is not technically required to be idempotent (JSON Patch operations can increment), but most REST APIs implement it as idempotent.

**Idempotency**: Calling the same operation multiple times produces the same result. GET, PUT, DELETE are idempotent. POST is not (creates a new resource each time).

---

## HTTP Status Codes

**2xx Success:**
- `200 OK` — successful GET, PUT, PATCH
- `201 Created` — successful POST; include `Location` header pointing to new resource
- `204 No Content` — successful DELETE or PATCH with no response body

**3xx Redirection:**
- `301 Moved Permanently` — resource permanently moved (cacheable redirect)
- `302 Found` — temporary redirect (not cached)
- `304 Not Modified` — ETag/Last-Modified match; client uses cached copy

**4xx Client Errors:**
- `400 Bad Request` — malformed request syntax, invalid JSON
- `401 Unauthorized` — not authenticated (missing/invalid token) — name is misleading
- `403 Forbidden` — authenticated but not authorized for this resource
- `404 Not Found` — resource doesn't exist (or don't reveal it exists if 403 is better)
- `409 Conflict` — state conflict (duplicate email, optimistic locking conflict)
- `410 Gone` — resource permanently deleted (use instead of 404 when you know it existed)
- `422 Unprocessable Entity` — valid JSON/format but fails semantic validation
- `429 Too Many Requests` — rate limit exceeded; include `Retry-After` header

**5xx Server Errors:**
- `500 Internal Server Error` — generic server error; should include a correlation ID
- `502 Bad Gateway` — upstream service returned an invalid response
- `503 Service Unavailable` — server is temporarily unavailable (deploy, maintenance)
- `504 Gateway Timeout` — upstream service timed out

---

## API Versioning

**URI Path versioning** (`/api/v1/users`):
- Pros: explicit, highly visible, cacheable, easy to route at proxy level
- Cons: technically violates REST (URI should identify the resource, not the version)
- **Best choice for most teams** — operationally simple

**Query parameter** (`/users?version=1`):
- Pros: optional, non-breaking default
- Cons: not in URL path, harder to route at proxy/CDN level

**Accept header** (`Accept: application/vnd.myapi.v2+json`):
- Pros: most "correct" per REST spec
- Cons: harder to test (can't just paste URL), CDN cache keying requires Vary header

**Recommendation**: Use URI path versioning for public APIs. Never version by changing resource URLs (/v2/users) — version the entire API (mount v1 and v2 routers separately). Maintain N and N-1 versions simultaneously with a deprecation timeline.

---

## Pagination

**Offset/Limit** (`?offset=40&limit=20`):
- Simple to implement with SQL `LIMIT`/`OFFSET`
- **Cons**: inconsistent — a deleted item shifts all subsequent pages; expensive for deep pages (SQL must scan all previous rows); no way to know total count without a COUNT query

**Cursor-Based** (`?cursor=<opaque_token>&limit=20`):
- Cursor encodes the position in the result set (e.g., last seen ID, or a base64-encoded composite)
- **Pros**: stable regardless of inserts/deletes; consistent performance regardless of page number
- **Cons**: can't jump to arbitrary pages; cursor must be opaque to clients

**Keyset Pagination** (`?after_id=100&limit=20`):
- Specific type of cursor: uses indexed columns directly (`WHERE id > 100 LIMIT 20`)
- Extremely fast — uses index range scan, not a full offset scan
- **The right choice** for any table with > 10,000 rows

```javascript
// Keyset pagination example
app.get('/posts', async (req, res) => {
  const { after, limit = 20 } = req.query;
  const where = after ? { id: { $gt: after } } : {};
  const posts = await Post.find(where).sort({ id: 1 }).limit(parseInt(limit) + 1);

  const hasMore = posts.length > limit;
  const items = posts.slice(0, limit);

  res.json({
    data: items,
    pagination: {
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    }
  });
});
```

---

## Filtering, Sorting, Sparse Fieldsets

```
# Filtering
GET /products?status=active&category=electronics&minPrice=100&maxPrice=500

# Sorting (prefix - = descending)
GET /products?sort=-createdAt,name

# Sparse fieldsets — return only requested fields
GET /users?fields=id,name,email

# Combined
GET /orders?status=shipped&sort=-updatedAt&limit=20&after=abc123
```

Filtering implementation in Express:
```javascript
function buildMongoFilter(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }
  return filter;
}
```

---

## Error Response Format: RFC 7807 Problem Details

```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request body is invalid",
  "instance": "/orders/123",
  "errors": [
    { "field": "email", "message": "Must be a valid email address" },
    { "field": "quantity", "message": "Must be a positive integer" }
  ]
}
```

Consistent error format enables client-side error handling without string parsing. The `type` URI provides a machine-readable error type; `instance` identifies the specific request. Include a `traceId` for correlation with server logs.

---

## Idempotency Keys

For POST requests that should not be duplicated (payments, emails, order creation):

```
POST /payments
Idempotency-Key: client-generated-uuid-v4
Content-Type: application/json

{ "amount": 100, "currency": "USD" }
```

Server behavior:
1. Check if Idempotency-Key exists in Redis
2. If not: process the payment, store `(key → response)` in Redis with TTL
3. If yes: return the stored response without re-processing

This allows clients to safely retry on network failure without double-charging. Stripe, PayPal, and most payment APIs require idempotency keys.

```javascript
async function idempotencyMiddleware(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!key) return next();

  const cached = await redis.get(`idempotency:${key}`);
  if (cached) {
    const { status, body } = JSON.parse(cached);
    return res.status(status).json(body);
  }

  // Intercept the response to cache it
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    redis.setex(`idempotency:${key}`, 86400, JSON.stringify({ status: res.statusCode, body }));
    return originalJson(body);
  };

  next();
}
```

---

## OpenAPI / Swagger 3.0

The spec defines the API contract that both documentation and client SDK generation derive from:

```yaml
openapi: 3.0.3
info:
  title: Blog API
  version: 1.0.0
paths:
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
        '404':
          description: User not found
components:
  schemas:
    User:
      type: object
      required: [id, email, name]
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
        name: { type: string }
```

Use `swagger-jsdoc` to generate the spec from JSDoc comments, and `swagger-ui-express` to serve interactive documentation. OpenAPI specs also drive mock server generation (Prism), contract testing, and type-safe client generation (openapi-typescript).

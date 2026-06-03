# Day 23 — Express.js Advanced Patterns: Interview Q&A

---

**Q1. How does Express middleware execution order work, and what determines when an error middleware is called?**

Middleware executes in the order it's registered — top to bottom in the file. `app.use()` without a path prefix runs for every request; router-level middleware runs only for routes mounted on that router; route-specific middleware only runs for that particular route. An error middleware is triggered by calling `next(err)` with any truthy argument. Express identifies error middleware by **arity** — a function with exactly 4 parameters `(err, req, res, next)`. If you accidentally omit a parameter, Express treats it as regular middleware and it's never called with errors. Error middleware must be registered **after all routes** — registering it first means routes are never reached.

---

**Q2. Why doesn't Express 4 catch errors from async route handlers by default, and what are the solutions?**

Express 4's routing layer wraps each middleware in a try-catch, but that catch only catches **synchronous** throws. An async function that rejects returns a rejected Promise — and Express 4 has no mechanism to detect that. The Promise rejection goes to Node's global `unhandledRejection` event, not to Express's error middleware. Solutions: (1) Use the `asyncHandler` wrapper — `(fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)` — wraps each handler to forward rejections to `next`. (2) Install `express-async-errors` which monkey-patches Express's layer to automatically call `next(err)` on rejected async handlers. (3) Upgrade to Express 5 (RC), which handles async errors natively. In production, always combine with a global `unhandledRejection` handler that logs and gracefully shuts down.

---

**Q3. How does rate limiting work in a distributed Node.js deployment (multiple instances)?**

In-memory rate limiters (like a `Map` in the process) only see requests that hit that specific instance. With 4 PM2 workers or 10 Kubernetes pods, each has an independent counter — a client can bypass a 100 req/min limit by sending 100 requests to each of 10 pods. The solution is a **shared external store**, typically Redis. Use a sorted set (`ZADD key timestamp score=timestamp`, then `ZREMRANGEBYSCORE` to remove old entries, then `ZCARD` for current count) as an atomic sliding-window counter. Lua scripts in Redis atomically check-and-increment in a single round-trip. `express-rate-limit` with `rate-limit-redis` provides this. For very high throughput, Upstash Rate Limit uses Redis pipelines to minimize latency, and token bucket/sliding window algorithms are implemented server-side.

---

**Q4. What does each Helmet.js header protect against, and which one did Helmet recently disable by default?**

`X-Frame-Options: DENY/SAMEORIGIN` — prevents clickjacking by blocking embedding in iframes. `Content-Security-Policy` — mitigates XSS by whitelisting allowed script/style/image sources. `Strict-Transport-Security` — forces HTTPS for a configured duration, preventing downgrade attacks. `X-Content-Type-Options: nosniff` — prevents browsers from MIME-sniffing responses away from the declared Content-Type (prevents serving a JS file as text/html). `Referrer-Policy: no-referrer` — prevents leaking the current URL to external services via the Referer header. `Cross-Origin-Opener-Policy` — isolates the browsing context for Spectre/Meltdown protection. The one helmet **disabled** is `X-XSS-Protection: 1; mode=block` — the old browser XSS filter had its own vulnerabilities and is deprecated in modern browsers. Helmet now sets it to `0` (disabled). CSP is the correct XSS mitigation today.

---

**Q5. What is the `asyncHandler` pattern and how do you implement it without any library?**

```javascript
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

It's a higher-order function that takes an async route handler, returns an Express-compatible middleware signature, and ensures any thrown error or rejected promise is caught and passed to `next(err)`. The key insight is `Promise.resolve(fn(...))` — even if `fn` is synchronous and throws, `Promise.resolve` in a `.then` chain would catch it (though the direct `.catch` handles async rejection). In practice, this is four lines. At scale (100+ routes), a decorator or auto-wrapping approach is cleaner, but the pattern is important to understand because it shows how Promise rejection and Express's error system interact.

---

**Q6. How would you implement request validation in Express, and why is Zod better than express-validator?**

Both work, but `zod` provides **TypeScript-first schema definitions** that double as both runtime validation AND compile-time type inference — one schema generates the validation logic AND the TypeScript type for the parsed data. `express-validator` is Express-specific and has verbose chaining syntax; Zod schemas are plain objects usable anywhere (frontend, tests, worker threads). The middleware pattern: define a schema with `z.object({ body: z.object({...}), params: ..., query: ... })`, call `schema.safeParse({ body: req.body, ... })`, and on failure return 422 with structured error details. On success, replace `req.body` with the parsed/coerced data (Zod automatically coerces string → number for query params). For API validation at scale, Zod's `.superRefine()` supports async cross-field validation (e.g., check that username isn't taken during validation itself).

---

**Q7. Explain the difference between `app.use()` and `router.use()` and when you'd use each.**

`app.use()` registers middleware on the main Express application — it applies to all requests that reach the app. `router.use()` registers middleware on a specific Router instance, which is then mounted on the app at a path prefix. Router middleware only runs for requests matched by that router's prefix. The architectural benefit: `Router` is a composable sub-application. You can export a `Router` from `routes/users.js`, `routes/products.js`, and mount them at different paths — each router's middleware (auth, validation) only applies to its own routes. This prevents a middleware registered in the users router from accidentally affecting the products router. In large applications, route files should always use `Router` instances, never `app.use()` directly. Router instances can also be nested — a `router.use('/admin', adminRouter)` creates a sub-namespace.

---

**Q8. How does `express-rate-limit`'s `keyGenerator` function affect rate limiting behavior, and what's the right strategy for authenticated vs unauthenticated APIs?**

The `keyGenerator` determines what constitutes a "client" for rate limiting purposes. For unauthenticated endpoints, use `req.ip` (or `req.headers['x-forwarded-for']` behind a proxy, with `trust proxy` set). For authenticated endpoints, use `req.user.id` — IP-based limiting fails for corporate networks (entire company appears as one IP) and is bypassable with VPNs. A typical strategy: unauthenticated routes use IP-based limits with generous allowances (handle brute force), authenticated routes use user-ID-based limits that are tighter per-user. For billing/payment endpoints, use idempotency keys instead of rate limiting. For APIs serving mobile apps, consider device fingerprinting as the key. Never use IP as the sole limit for authenticated APIs — a single corporate user behind NAT might share an IP with 500 colleagues.

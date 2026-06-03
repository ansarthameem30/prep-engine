# Day 29 — Authentication + Security: Interview Q&A

---

**Q1. Explain the structure of a JWT and how signature verification works.**

A JWT is three base64url-encoded JSON objects concatenated with dots: `header.payload.signature`. The header specifies the algorithm (`"alg": "HS256"`). The payload contains claims: `sub` (subject/user ID), `exp` (expiration), `iat` (issued at), `jti` (unique token ID). The signature for HS256 is `HMAC_SHA256(base64url(header) + "." + base64url(payload), secret)`. Verification: recompute the signature from the header and payload using your secret, then compare with the token's signature using a timing-safe comparison (`crypto.timingSafeEqual`). If they match, the payload is authentic and unmodified. The payload is NOT encrypted — it's just base64url encoded, readable by anyone. Never put sensitive data (passwords, PII beyond user ID) in a JWT payload.

---

**Q2. What is the `alg: none` JWT attack and how do you prevent it?**

Some early JWT libraries checked the `alg` field in the header and executed the specified algorithm. If an attacker changes the header to `{"alg": "none"}` and strips the signature, a naive library accepts any payload with an empty signature as valid. The attacker can put any user ID in the `sub` claim and impersonate any user. Prevention: in your JWT library configuration, explicitly specify the EXPECTED algorithm. Never accept what the token claims its algorithm is. With `jsonwebtoken`: `jwt.verify(token, secret, { algorithms: ['HS256'] })` — the second argument enforces the algorithm whitelist. Modern libraries default to rejecting `none`, but explicit allowlisting is defense in depth.

---

**Q3. What is refresh token rotation and why does it provide better security than long-lived JWTs?**

A long-lived access token (e.g., 30-day expiry) cannot be revoked if stolen — the attacker uses it for 30 days. The solution: short-lived access tokens (15 minutes) + long-lived refresh tokens (7 days, stored in DB). When the access token expires, the client uses the refresh token to get a new pair. Rotation means each use of a refresh token issues a new refresh token and invalidates the old one. If an attacker steals a refresh token and uses it, the legitimate user's next refresh attempt will use a "used" token — the server detects reuse and invalidates the entire session (token family). The attacker's stolen token also stops working. This provides near-real-time revocation without requiring a database lookup on every API request (the access token is still stateless for 15 minutes).

---

**Q4. When would you use HS256 vs RS256 for JWT signing?**

**HS256** (symmetric): the same secret signs and verifies. Use for monolithic applications or when only one service issues AND verifies tokens. Simpler to set up. Security risk: every service that verifies tokens must know the secret — if any service is compromised, all tokens can be forged. **RS256** (asymmetric): private key signs, public key verifies. Use for microservices architectures where an auth service issues tokens and many other services verify them. Each service only needs the public key, which can be safely distributed or published at a JWKS endpoint (`/.well-known/jwks.json`). A compromised API service can't forge tokens because it doesn't have the private key. Also enables third-party token verification (e.g., letting AWS verify your tokens). For any system with multiple services or external token consumers, use RS256.

---

**Q5. Explain the OAuth 2.0 Authorization Code flow with PKCE.**

PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks in public clients (SPAs, mobile apps). Flow: (1) Client generates a random `code_verifier` (43-128 chars). (2) Client computes `code_challenge = BASE64URL(SHA256(code_verifier))`. (3) Client redirects user to auth server with `code_challenge` in the authorization URL. (4) User authenticates; auth server issues an `authorization_code` and redirects to callback URL. (5) Client exchanges the code for tokens, including the original `code_verifier`. (6) Auth server verifies: `SHA256(code_verifier) === code_challenge` (stored from step 3). Only the original client that created the `code_verifier` can exchange the code — an intercepted `authorization_code` is useless without it. PKCE is now required for all public clients per OAuth 2.1.

---

**Q6. What is CSRF and how does `SameSite` cookie attribute prevent it?**

CSRF exploits the browser's automatic cookie behavior: when a user visits `evil.com`, the attacker's page can trigger a request to `bank.com/transfer` — the browser automatically sends the user's `bank.com` cookies. The bank sees a valid authenticated request. `SameSite=Strict`: cookies are only sent when the request originates from the same site. Completely prevents CSRF but breaks flows where users follow links from email/external sites (the cookies won't be sent, user appears logged out). `SameSite=Lax` (modern default): cookies are sent for same-site requests AND top-level GET navigations (clicking links). Blocks CSRF for state-changing requests (POST/PUT/DELETE from cross-site) while allowing normal navigation. `SameSite=None; Secure`: cross-site, requires HTTPS. For most apps, `SameSite=Lax` on auth cookies provides CSRF protection with good UX.

---

**Q7. How do you securely store JWTs on the client side?**

The two options: **localStorage** and **httpOnly cookies**. localStorage is accessible to JavaScript — any XSS vulnerability can steal all tokens stored there. If your app has even one XSS hole (and all apps do eventually), stored tokens are compromised. **httpOnly cookies** are inaccessible to JavaScript — the `httpOnly` flag prevents `document.cookie` access. XSS cannot steal them. Combined with `SameSite=Strict/Lax`, CSRF is also mitigated. The tradeoff: httpOnly cookies work for browser-to-server communication but not for native mobile apps or server-to-server. For SPAs, use httpOnly cookies with `Secure; SameSite=Lax`. For mobile apps, use secure device keystores (iOS Keychain, Android Keystore) — never plaintext storage. Never store refresh tokens in localStorage — they're long-lived and the highest-value target.

---

**Q8. What is the difference between authentication and authorization, and how do you implement both in Express?**

**Authentication** verifies identity — "who are you?" (validate JWT, check password). **Authorization** verifies permission — "are you allowed to do this?" (check user roles, resource ownership). In Express: authentication middleware runs first (validate the JWT, attach `req.user`), then authorization middleware checks if that user has permission for the specific resource/action. Example: `authMiddleware` verifies the JWT and sets `req.user = { id, roles }`. Then `requireRole('admin')` checks `req.user.roles.includes('admin')`. For resource ownership: `requireOwnership` checks `req.params.userId === req.user.id`. These are separate middleware functions for composability — a route can require authentication but not a specific role. Common mistakes: confusing 401 (not authenticated) with 403 (not authorized), and checking authorization in business logic instead of middleware (hard to audit and test).

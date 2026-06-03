# Authentication + Security Deep Dive

## JWT Structure: header.payload.signature

A JWT is three base64url-encoded JSON objects separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MTcwMDAwMDAwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Header**: `{ "alg": "HS256", "typ": "JWT" }` — declares the signing algorithm.

**Payload**: `{ "sub": "user-123", "exp": 1700000000, "iat": 1699999000, "jti": "uuid" }` — the claims.

**Signature**: `HMAC_SHA256(base64url(header) + "." + base64url(payload), secret)`

### Standard Claims
- `sub` (subject): the user ID
- `exp` (expiration): Unix timestamp when token expires — MUST be validated
- `iat` (issued at): when the token was created
- `nbf` (not before): token is invalid before this time
- `jti` (JWT ID): unique identifier for this token — used for revocation

### HS256 vs RS256

**HS256** (HMAC-SHA256): symmetric — same secret used to sign AND verify. Simple, fast. The server that signs is the server that verifies. Problematic for microservices: every service needs the secret.

**RS256** (RSA-SHA256): asymmetric — private key signs, public key verifies. Auth service holds the private key, all other services verify with the public key (which can be public). Supports **JWKS** (JSON Web Key Sets) — services fetch the public key from a discovery URL. Use RS256 for any architecture with multiple services or third-party token verification.

---

## JWT Vulnerabilities

**`alg: none` attack**: Early JWT libraries accepted `"alg": "none"` with no signature. An attacker strips the signature and changes the payload. Mitigation: never accept `none` algorithm; explicitly verify the algorithm matches your expected algorithm in code.

**Secret brute force**: Short or predictable HS256 secrets can be brute-forced offline (no server interaction needed — the signature is computed locally). Mitigation: use 256+ bit random secrets (not passwords or DB connection strings).

**Token leakage**: JWTs in URL query params are logged in server logs, browser history, and referer headers. In localStorage, they're accessible to XSS. Mitigation: store in `httpOnly` cookies (inaccessible to JavaScript), use short expiration times.

---

## Refresh Token Rotation

Short-lived access tokens (15 minutes) + long-lived refresh tokens (7 days) with rotation:

```
Login → Issue access_token (15min) + refresh_token (7 days, stored in DB)

When access_token expires:
Client → POST /auth/refresh { refresh_token }
Server:
  1. Validate refresh_token signature and expiry
  2. Check refresh_token is in DB (not revoked)
  3. Issue new access_token + new refresh_token (rotate!)
  4. Invalidate old refresh_token in DB
  5. Return both tokens

Reuse detection:
  If old refresh_token is presented again after rotation:
  → Someone stole and used the token before the legitimate user
  → Invalidate the ENTIRE token family (all refresh tokens for this session)
  → Force re-login
```

**Token families**: When a user logs in, create a `family_id`. All refresh tokens in that session belong to the same family. On reuse detection, invalidate all tokens with that `family_id`.

---

## Session Cookies vs JWT

| | Session Cookies | JWT |
|--|-----------------|-----|
| State | Server-side (DB/Redis) | Stateless (all in token) |
| Revocation | Instant (delete session) | Difficult (wait for exp) |
| Horizontal scaling | Requires shared session store | Works natively |
| Bandwidth | Session ID only (small) | Full payload every request |
| Server memory | Session data in store | No server state |

Use **session cookies** for: monolithic apps, when you need instant revocation (logout immediately effective), when you have a session store already (Redis).

Use **JWT** for: microservices (stateless verification at each service), mobile APIs, third-party access (OAuth), when reducing database round-trips matters.

---

## OAuth 2.0 Flows

### Authorization Code + PKCE (Web + Mobile)

```
1. User clicks "Login with Google"
2. App redirects to: https://accounts.google.com/oauth/authorize?
      response_type=code&client_id=...&redirect_uri=...&scope=openid email
      &code_challenge=<hash_of_verifier>&code_challenge_method=S256
3. User authenticates with Google
4. Google redirects to: https://yourapp.com/callback?code=AUTH_CODE
5. App exchanges: POST /token
      { code: AUTH_CODE, code_verifier: ORIGINAL_VERIFIER, ... }
6. Google returns: access_token + refresh_token + id_token (OIDC)
```

**PKCE** (Proof Key for Code Exchange): prevents authorization code interception attacks. Client generates a random `code_verifier`, sends its SHA256 hash (`code_challenge`) in step 2, sends the original verifier in step 5 — only the legitimate client can exchange the code.

### Client Credentials (Server-to-Server)

No user involvement. Service A authenticates directly to the authorization server with its `client_id` + `client_secret` to get an access token. Used for machine-to-machine API calls.

### Why Implicit Flow Is Deprecated

Implicit flow returned the access token directly in the URL fragment — accessible to JavaScript and logged in browser history/server logs. PKCE solves the same problem (single-page apps) without exposing the token in the URL. All modern OAuth 2.1 guidance deprecates implicit flow.

---

## bcrypt: Password Hashing

Never use MD5, SHA1, or even SHA256 for password hashing — they're designed to be FAST. An attacker with a leaked hash database can try billions of guesses per second.

bcrypt is designed to be SLOW and to stay slow as hardware improves (adjust the cost factor):

```javascript
const bcrypt = require('bcrypt');

// Hash (during registration)
const saltRounds = 12; // cost factor — each +1 doubles work time
// Target: ~100-300ms per hash (slow enough to resist brute force, fast enough for UX)
const hash = await bcrypt.hash(plainPassword, saltRounds);

// Verify (during login)
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

**Cost factor selection**: benchmark on production hardware. Cost 10 ≈ 60ms, cost 12 ≈ 250ms, cost 14 ≈ 1000ms. Target 100-300ms. Too slow = bad UX; too fast = vulnerable to brute force.

**Alternatives**: Argon2 (PHC winner, memory-hard, better than bcrypt against GPU attacks), scrypt (also memory-hard). For new systems, use Argon2id.

---

## CORS

Cross-Origin Resource Sharing: browser security mechanism preventing cross-origin requests unless the server explicitly allows them.

**Preflight requests**: For non-simple requests (PUT, DELETE, or with custom headers), the browser sends `OPTIONS` first:
```
OPTIONS /api/users
Origin: https://frontend.example.com
Access-Control-Request-Method: DELETE
```

Server must respond:
```
Access-Control-Allow-Origin: https://frontend.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

**Why you can't use `*` with credentials**: `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` is rejected by browsers. You must specify the exact origin. The browser enforces this to prevent CSRF via cookies.

---

## CSRF and SameSite Cookies

**Cross-Site Request Forgery**: attacker's page makes a request to your API using the victim's cookies. Cookies are sent automatically to the domain regardless of where the request originates.

**SameSite attribute**:
- `SameSite=Strict`: cookies only sent for same-site requests. Breaks some OAuth flows.
- `SameSite=Lax` (default in modern browsers): cookies sent for same-site requests AND top-level navigations (GET links). Protects against CSRF for most cases.
- `SameSite=None; Secure`: cookies sent cross-site (for embedded iframes, third-party widgets). Requires HTTPS.

**Double-submit cookie pattern**: server sets a CSRF token in a cookie AND expects the same value in a header/form field. An attacker can't read the cookie value (cross-origin cookie access is blocked), so they can't set the header.

---

## SQL Injection Prevention

```javascript
// VULNERABLE: string concatenation
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
// Attacker sends: ' OR '1'='1

// SAFE: parameterized queries (always use these)
const user = await db.query('SELECT * FROM users WHERE email = ?', [email]);

// With mysql2:
const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

// With Sequelize/TypeORM ORM: safe by default
const user = await User.findOne({ where: { email } }); // parameterized internally
```

---

## Secrets Management

**Never in code**: secrets in source code get committed, leaked, shared with contractors.
**Minimum**: environment variables (`process.env.DB_PASSWORD`) — better than code, but still appear in process lists and aren't rotated.
**Better**: AWS Secrets Manager, HashiCorp Vault, Azure Key Vault — secrets are fetched at startup or on-demand, can be rotated without redeployment, access is audited.

```javascript
// AWS Secrets Manager pattern
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const client = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretName) {
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
  return JSON.parse(response.SecretString);
}

// At startup:
const dbCredentials = await getSecret('prod/myapp/database');
const pool = mysql.createPool({ password: dbCredentials.password });
```

# Day 53 — Security Mastery

## OWASP Top 10 — The Security Canon for Web Developers

Every senior developer is expected to know the OWASP Top 10 and be able to give a concrete example of each. Here they are with Node.js/React context.

### 1. Broken Access Control
The most prevalent OWASP category. Your authentication confirms who you are; authorization (access control) confirms what you can do.

**IDOR (Insecure Direct Object Reference)**: The classic vulnerability.
```js
// VULNERABLE: user can change the ID to access other users' data
app.get('/api/orders/:orderId', async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  res.json(order); // No check: does this order belong to req.user?
});

// FIXED:
app.get('/api/orders/:orderId', async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, userId: req.user.id });
  if (!order) return res.status(404).json({ error: 'Not found' }); // Same error for not found AND unauthorized
  res.json(order);
});
```
**Horizontal privilege escalation**: User A accesses User B's data. Same role, wrong data. Fix: always filter by the authenticated user's ID.
**Vertical privilege escalation**: Regular user accesses admin endpoint. Fix: role-based middleware.

### 2. Cryptographic Failures
- **Passwords in plaintext**: Unacceptable. Use bcrypt (cost factor 10-12) or argon2. Never MD5 or SHA1 for passwords.
- **Unencrypted PII in database**: Encrypt with AES-256-GCM. Store the encryption key separately (in Secrets Manager, not `.env`).
- **HTTP instead of HTTPS**: Enforce HTTPS with HSTS header. Redirect all HTTP to HTTPS.
- **Weak random number generation**: Never use `Math.random()` for tokens. Use `crypto.randomBytes(32).toString('hex')`.

### 3. Injection
**SQL Injection**: Never concatenate user input into SQL queries.
```js
// VULNERABLE:
const users = await db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);
// email: ' OR '1'='1' -- → returns all users

// FIXED (parameterized query):
const users = await db.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
```
**NoSQL Injection (MongoDB)**:
```js
// VULNERABLE: if body is { "username": { "$gt": "" }, "password": { "$gt": "" } }
// This bypasses authentication — finds any user where password > ""
const user = await User.findOne({ username: req.body.username, password: req.body.password });

// FIXED: validate/sanitize input, use typed schema
const { username, password } = req.body;
if (typeof username !== 'string' || typeof password !== 'string') return res.status(400).end();
```
**Command Injection**: Never pass user input to `child_process.exec()`. Use `execFile()` with argument arrays.

### 4. Insecure Design
Security must be designed in, not bolted on. Examples of insecure design:
- No rate limiting on login endpoint → brute force attack
- No account lockout after N failed attempts → credential stuffing
- Password reset via security questions (guessable) instead of time-limited token
- No CAPTCHA on registration → bot account creation

### 5. Security Misconfiguration
- `NODE_ENV=development` in production: stack traces sent to client
- Default credentials: `admin/admin` on MongoDB, Redis without password
- Verbose error messages: `User with email x@y.com not found` — tells attacker which accounts exist
- Exposed debug endpoints in production
- Fix: `NODE_ENV=production`, use a generic error message for auth failures, remove debug routes

### 6. Vulnerable and Outdated Components
- `npm audit` identifies known vulnerabilities in dependencies
- Dependabot: GitHub integration that auto-creates PRs for vulnerable dependency updates
- Pin major versions, regularly update minors/patches
- Example: `lodash < 4.17.21` had prototype pollution vulnerability

### 7. Identification and Authentication Failures
- Weak passwords allowed
- No MFA/2FA option
- Session fixation: attacker sets a known session ID, victim logs in, attacker uses that session
  - Fix: call `req.session.regenerate()` after successful login
- JWTs with `alg: none` accepted (never trust client-provided algorithm)
- Short-lived tokens + refresh token rotation

### 8. Software and Data Integrity Failures
- Using packages from untrusted registries
- CI/CD pipeline with write access to production without audit trail
- npm packages without signature verification
- Unsigned commits to main branch
- Fix: use `npm ci` (lockfile verification), enable package provenance, protect main branch

### 9. Security Logging and Monitoring Failures
- Not logging failed login attempts → attacker can brute-force without detection
- Not alerting on spikes in 4xx/5xx errors
- Storing sensitive data (passwords, tokens) in logs
- Fix: structured logging with all security events (login success/fail, access denied), SIEM integration, log retention policy

### 10. Server-Side Request Forgery (SSRF)
An attacker tricks your server into making HTTP requests to internal services.
```js
// VULNERABLE: user supplies a URL, server fetches it
app.post('/fetch-preview', async (req, res) => {
  const { url } = req.body;
  const response = await fetch(url); // attacker sends url: http://169.254.169.254/latest/meta-data/
  // This fetches AWS instance metadata — IAM credentials, private IPs, secrets
});

// FIXED: allowlist or block internal ranges
const { isPrivateIP } = require('./utils');
app.post('/fetch-preview', async (req, res) => {
  const parsed = new URL(req.body.url);
  if (isPrivateIP(parsed.hostname)) return res.status(400).json({ error: 'URL not allowed' });
  const response = await fetch(req.body.url);
});
```

---

## Content Security Policy (CSP)

CSP is an HTTP response header that tells browsers which resources are allowed to load. It's your last line of defense against XSS — even if an attacker injects a script, CSP prevents it from running.

**Key directives**:
- `default-src 'self'`: fallback for all resource types, only load from same origin
- `script-src 'self' 'nonce-{randomNonce}'`: only scripts from same origin or with matching nonce
- `style-src 'self' 'unsafe-inline'`: allow inline styles (weaker, but often necessary)
- `img-src 'self' data: https://cdn.example.com`
- `connect-src 'self' https://api.example.com`: restrict XHR/fetch/WebSocket targets
- `frame-ancestors 'none'`: prevent clickjacking (replaces X-Frame-Options)

**Nonce-based CSP** (most secure for inline scripts):
```js
// Generate a new nonce per request
const nonce = crypto.randomBytes(16).toString('base64');
res.setHeader('Content-Security-Policy', `script-src 'nonce-${nonce}'`);
// In HTML template: <script nonce="${nonce}">...</script>
```

**Report-Only mode**: `Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report`
Test without blocking. Collect violations. Then enforce.

---

## HTTPS/TLS Essentials

**TLS 1.3 vs 1.2**:
- TLS 1.3: 1-RTT handshake (vs 2-RTT for 1.2), 0-RTT resumption, removed weak cipher suites (no RSA key exchange, no RC4, no SHA-1), mandatory Perfect Forward Secrecy
- TLS 1.2: still widely supported, still secure with proper configuration (disable RC4, 3DES)

**Certificate types**:
- DV (Domain Validated): automated ACME (Let's Encrypt) — verifies domain control
- OV (Organization Validated): verifies organization identity — shows org name in cert
- EV (Extended Validation): highest assurance, requires legal entity verification

**HSTS (HTTP Strict Transport Security)**:
`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
Browser refuses HTTP connections to this domain for the duration. Prevents SSL stripping attacks. Preload list: browsers ship with domains that must always use HTTPS.

**Perfect Forward Secrecy**: If an attacker records encrypted traffic today and later compromises the server's private key, they cannot decrypt past traffic. ECDHE (Elliptic Curve Diffie-Hellman Ephemeral) generates a new session key per connection that is never stored.

---

## Secrets Management: The Right Way

**Never** commit secrets to code. Not even in `.env` files checked into git — git history is forever, and CI logs often echo environment variables.

**AWS Secrets Manager**:
- Store secret once, reference by ARN
- IAM policy controls which Lambda/EC2/ECS can read which secret
- Automatic rotation: Lambda rotates DB passwords on a schedule, no code change needed
- SDK: `await client.getSecretValue({ SecretId: 'prod/myapp/db' })`

**HashiCorp Vault**:
- Dynamic secrets: instead of static DB password, Vault creates a temporary DB user with an expiring password — each service gets unique credentials, auto-deleted after TTL
- Audit log: every secret read is logged
- Self-hosted alternative to AWS Secrets Manager

**GitHub Secrets scanning**: automatically scans push events for patterns matching known secret formats (AWS keys, Stripe keys, Google API keys). Blocks the push or sends alerts.

---

## API Security Patterns

**API Keys**: Hash before storing (SHA-256) — never store plaintext. Pass in `Authorization: ApiKey sk_...` header, not query params (query params appear in server logs, browser history, referrer headers).

**Mutual TLS (mTLS)**: Both client and server present certificates. Used for inter-service authentication in zero-trust architectures. Service Mesh (Istio) handles mTLS automatically between pods.

**HMAC Request Signing**: Client signs request payload + timestamp with a shared secret. Server recomputes signature and compares. Timestamp prevents replay attacks. AWS Signature V4 uses this pattern.

**JWT security checklist**:
- Validate `alg` header — never accept `alg: none`
- Validate `iss`, `aud`, `exp` claims
- Use short expiry (15 min) + refresh token rotation
- Store in httpOnly cookie (not localStorage) to prevent XSS theft

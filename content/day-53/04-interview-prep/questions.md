# Day 53 — Security Mastery: Interview Q&A

---

## Q1: What is the difference between authentication and authorization? Give a concrete IDOR example.

**Answer:**
**Authentication**: Verifying identity — "Who are you?" Implemented via JWT, sessions, OAuth.
**Authorization**: Verifying permissions — "What are you allowed to do?" Implemented via RBAC, ABAC, ownership checks.

A system can authenticate you correctly but still have authorization vulnerabilities.

**IDOR (Insecure Direct Object Reference) example**:
An API endpoint `GET /api/invoices/1234` returns invoice 1234 after checking that the user is authenticated. But it never checks whether invoice 1234 belongs to the authenticated user. Alice (userId: 5) can change `1234` to `1235` in the request and read Bob's invoice.

**Fix**: Always add ownership filter:
```js
Invoice.findOne({ id: req.params.id, userId: req.user.id })
```
Use the same generic 404 response for both "not found" and "not yours" to avoid revealing which records exist (information leakage).

**Horizontal vs vertical escalation**:
- Horizontal: User A accessing User B's data (same role, wrong data) — IDOR
- Vertical: Regular user accessing admin functions — missing role check

---

## Q2: Walk me through the top 3 OWASP vulnerabilities with a Node.js code example.

**Answer:**

**1. SQL/NoSQL Injection**
```js
// VULNERABLE SQL:
db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);
// Attack: email = "'; DROP TABLE users; --"

// FIXED:
db.query('SELECT * FROM users WHERE email = $1', [req.body.email]);

// VULNERABLE NoSQL (MongoDB):
User.findOne({ username: body.username, password: body.password });
// Attack: password = { "$gt": "" } → matches everything

// FIXED: validate types before querying
if (typeof body.password !== 'string') return res.status(400).end();
```

**2. Broken Access Control** (covered in Q1 above)

**3. Security Misconfiguration**
```js
// VULNERABLE: stack traces leaked to client
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack }); // exposes file paths, versions, logic
});

// FIXED: generic message in production
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## Q3: What is Content Security Policy and how does it mitigate XSS?

**Answer:**
CSP is an HTTP response header that tells the browser which resources (scripts, styles, images, connections) are allowed to load and execute. Even if an attacker successfully injects a malicious script tag via XSS, the browser refuses to execute it if the script doesn't come from an allowed source.

**How it works**:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{randomNonce}'; object-src 'none'
```
- `default-src 'self'`: only load from same origin by default
- `script-src 'nonce-abc123'`: only execute scripts that have the matching `nonce` attribute
- An attacker injecting `<script>alert(1)</script>` won't have the nonce, so it won't execute

**Nonce approach** (most secure):
```js
// Server generates a new random nonce per request
const nonce = crypto.randomBytes(16).toString('base64');
// HTML: <script nonce="${nonce}">legitimate code</script>
// Injected: <script>malicious()</script> — no nonce, browser blocks it
```

**Progressive deployment**: Start with `Content-Security-Policy-Report-Only` header + `report-uri`. Collect violations without blocking anything. Fix legitimate violations. Then switch to enforcing mode.

**Limitations**: CSP doesn't prevent all XSS (e.g., DOM-based XSS with trusted inputs), but it dramatically reduces exploitability.

---

## Q4: How should you store secrets? What is wrong with using .env files?

**Answer:**
`.env` files have serious problems:
1. **Git history**: If `.env` is committed even once (and later added to `.gitignore`), it exists forever in git history
2. **CI/CD logs**: Build systems often echo environment variables in logs
3. **Developer machines**: `.env` on dev machines can be compromised if the machine is lost/stolen
4. **Rotation**: Rotating a secret means updating the file on every server — no central control

**Correct approaches by environment**:

**Development**: `.env.local` (gitignored) is acceptable for dev-only, non-sensitive secrets. Use fake/local-only credentials.

**Production**:
- **AWS Secrets Manager**: Secrets stored in AWS, accessed via IAM role. Lambda/ECS reads them at startup. Supports automatic rotation (Lambda rotates DB password on schedule, injects new password, zero downtime).
- **HashiCorp Vault**: Dynamic secrets — instead of a stored DB password, Vault creates a new DB user with a 1-hour expiry specifically for your service. Each service gets unique credentials.
- **Kubernetes Secrets + external-secrets-operator**: Sync from Vault/AWS Secrets Manager into k8s secrets, mounted as environment variables. Never stored in code or git.

**Scanning**: `trufflesecurity/trufflehog` scans git history for leaked secrets. GitHub secret scanning does this automatically. Run in CI pipeline to catch accidents.

---

## Q5: Explain SSRF. How would you defend against it?

**Answer:**
SSRF (Server-Side Request Forgery): An attacker tricks the server into making HTTP requests to internal services.

**Attack scenario**: A "link preview" feature fetches a URL supplied by the user.
```
POST /preview { "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/ec2-role" }
```
The AWS instance metadata service responds with IAM credentials for the EC2 instance. The attacker now has temporary AWS credentials with whatever permissions the EC2 role has.

**Defense layers**:
1. **Allowlist**: Only allow fetching from approved external domains. Reject everything else.
2. **Block private IP ranges**: Reject requests to `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`, `127.x.x.x`, `169.254.x.x`
3. **Block metadata endpoints**: Explicitly block `169.254.169.254` (AWS/Azure), `metadata.google.internal` (GCP)
4. **Scheme restriction**: Only allow `http://` and `https://`, never `file://`, `gopher://`, `dict://`
5. **DNS rebinding protection**: Resolve the hostname once, check the IP, use that same IP for the request (prevents DNS rebinding where hostname resolves to private IP after your check)
6. **AWS IMDSv2**: Require a token header for instance metadata — SSRF requests won't have it

---

## Q6: What is the difference between CORS and CSRF? How do you defend against each?

**Answer:**
Completely different attacks, often confused.

**CORS (Cross-Origin Resource Sharing)**: A browser security mechanism that **restricts** which origins can make requests to your API. Implemented via HTTP headers (`Access-Control-Allow-Origin`). The threat model: malicious website reads your API response.

**CSRF (Cross-Site Request Forgery)**: An attack where a malicious website **sends a forged request** to your API using the victim's existing cookies. The browser automatically sends cookies for the target domain. The attacker doesn't need to read the response — just trigger the action.

Example CSRF attack:
```html
<!-- Attacker's website: -->
<img src="https://bank.com/transfer?to=attacker&amount=1000" />
<!-- If user is logged into bank.com, cookies are sent, transfer executes -->
```

**CORS defense**: Set strict `Access-Control-Allow-Origin` — only your trusted domains. Do NOT use `*` for APIs with credentials.

**CSRF defenses**:
1. **SameSite cookie attribute**: `SameSite=Strict` or `SameSite=Lax` prevents cookies from being sent with cross-site requests. Modern browsers support this — most effective defense.
2. **CSRF tokens**: A random token embedded in forms and verified server-side. Attacker can't read the token from another origin (same-origin policy).
3. **Double submit cookie**: Send CSRF token as both cookie and request header. Cross-site requests can't set custom headers.
4. **Custom request headers**: APIs only accept requests with `X-Requested-With: XMLHttpRequest` or similar. Browsers won't send custom headers in cross-site simple requests.

---

## Q7: What are the security implications of JWTs stored in localStorage vs httpOnly cookies?

**Answer:**

**localStorage**:
- **XSS vulnerability**: Any JavaScript on your page can read `localStorage`. If an attacker injects a script via XSS, they steal all tokens.
- Pro: Accessible by frontend code, easy to use with API authorization headers
- Con: XSS on any page on your domain = token theft = session hijacking

**httpOnly cookie**:
- `HttpOnly` flag: JavaScript cannot read this cookie — completely invisible to `document.cookie`
- Even a successful XSS attack cannot steal an httpOnly cookie
- Con: Vulnerable to CSRF (mitigated with SameSite attribute)
- Pro: Browser handles sending automatically, can't be read by JS

**Recommendation for production**:
- Store access tokens in httpOnly, Secure, SameSite=Strict cookies
- Use short-lived access tokens (15 min) + refresh token rotation
- If you must use localStorage (e.g., mobile apps, cross-domain), mitigate XSS rigorously

**Interview tip**: Don't just say "use httpOnly" — explain WHY (XSS can read localStorage) and the CSRF trade-off (mitigated with SameSite=Strict, CSRF tokens, or custom headers for API calls).

---

## Q8: What is mTLS and when would you use it?

**Answer:**
Standard TLS: The client verifies the server's certificate. The server has no cryptographic proof of who the client is.

**Mutual TLS (mTLS)**: Both the client AND server present and verify certificates. The server refuses connections from clients without a valid certificate signed by the server's trusted CA.

**Use cases**:
1. **Service-to-service authentication** in microservices: Instead of passing API keys or JWTs between internal services, each service has a certificate. The receiving service verifies the certificate — no shared secrets, no token management.
2. **Zero-trust networks**: Every service verifies every connection, even within the same VPC. Prevents lateral movement after a perimeter breach.
3. **Client authentication** for highly sensitive APIs (financial institutions, government systems).

**In practice**:
- **Istio service mesh**: Automatically provisions mTLS between all pods in a Kubernetes cluster with zero code changes. Certificates are short-lived (24h) and auto-rotated.
- **HashiCorp Vault PKI**: Issues short-lived TLS certificates for services on demand.

**vs API Keys**: mTLS is stronger than API keys because private keys never leave the service (only the certificate/public key is shared), and keys are rotated automatically. API keys are static secrets that can be stolen from config files.

# Day 53 – Security Mastery: OWASP Top 10, CSP, Secrets Management & API Security | DSA: Serialize and Deserialize Binary Tree

> **Phase 6 – Final Sprint + Mock Interviews** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | OWASP Top 10 with Node.js/React examples, CSP headers, SRI, secrets management, API security, pen testing awareness |
| Hands-On | 00:40–01:10 | Audit an Express app for OWASP vulnerabilities, implement CSP headers, migrate secrets to env + Vault pattern |
| DSA | 01:10–01:25 | Serialize and Deserialize Binary Tree (LeetCode #297) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Map all OWASP Top 10 vulnerabilities to Node.js/React concrete examples and fixes
- [ ] Implement a restrictive Content Security Policy and explain each directive
- [ ] Design a secrets management workflow using environment variables + HashiCorp Vault pattern
- [ ] Audit an Express API for broken authentication and IDOR vulnerabilities
- [ ] Solve: Serialize and Deserialize Binary Tree (#297)
- [ ] Review 5 interview questions

---

## Concept: Security Mastery

### What to Study
- **OWASP Top 10 with Node.js/React examples:**
  1. **A01 Broken Access Control:** Missing authorization checks; IDOR (accessing `/api/users/123` when you're user 456); horizontal privilege escalation; fixes: server-side authorization on every request, resource ownership checks, `can(user, 'read', resource)` pattern
  2. **A02 Cryptographic Failures:** Storing passwords in plaintext or MD5; transmitting PII over HTTP; using weak keys; fixes: bcrypt/argon2 for passwords, TLS everywhere, AES-256-GCM for sensitive data at rest
  3. **A03 Injection:** SQL injection (`"SELECT * FROM users WHERE id = " + req.params.id`), NoSQL injection, command injection, LDAP injection; fixes: parameterized queries (`db.query('SELECT * FROM users WHERE id = $1', [id])`), ORM with escaping, input validation
  4. **A04 Insecure Design:** Missing rate limiting on auth endpoints, no account lockout, predictable resource IDs; design-level issue — not fixable by patching
  5. **A05 Security Misconfiguration:** Default credentials, verbose error messages exposing stack traces, debug mode in production, permissive CORS (`*`), missing security headers; fix: helmet.js defaults, environment-specific config, error sanitization
  6. **A06 Vulnerable & Outdated Components:** Using lodash with known prototype pollution vuln, old express with unpatched CVEs; fix: `npm audit`, Dependabot/Snyk, lock files, regular updates
  7. **A07 Identification & Authentication Failures:** Weak JWTs (alg:none attack), no expiration, missing MFA, session fixation; fixes: RS256 JWT, short expiry + refresh tokens, MFA for sensitive actions, session regeneration after login
  8. **A08 Software & Data Integrity Failures:** CI/CD pipeline compromise (supply chain attack), auto-updating npm packages without lock files; fix: lock files, SRI for CDN scripts, signed releases, protected CI/CD
  9. **A09 Security Logging & Monitoring Failures:** No logging of auth failures, no alerting on anomalies, no audit trail; fix: structured security event logging, SIEM integration, alerting on 10+ failed logins
  10. **A10 SSRF (Server-Side Request Forgery):** User-controlled URL fetched by server (e.g., avatar URL import), internal AWS metadata endpoint accessed; fix: allowlist of permitted domains, block private IP ranges (RFC 1918), firewall egress
- **Content Security Policy (CSP):** `Content-Security-Policy` header controls what resources the browser can load; key directives: `default-src 'self'`, `script-src 'self' 'nonce-{random}'` (nonces for inline scripts), `style-src 'self' https://fonts.googleapis.com`, `img-src 'self' data: https:`, `connect-src 'self' https://api.company.com`, `frame-ancestors 'none'` (clickjacking protection), `report-uri /csp-violations`; `Content-Security-Policy-Report-Only` for testing; the `unsafe-inline` trap
- **Subresource Integrity (SRI):** `integrity="sha384-..."` attribute on `<script>` and `<link>` for CDN resources; browser refuses to execute if hash doesn't match; generated via `openssl dgst -sha384 -binary`
- **Secrets management:**
  - Never hardcode secrets — even in `.env` committed to git; use `.gitignore` + CI/CD secret injection
  - **AWS Secrets Manager:** Centralized secret storage, automatic rotation, IAM-based access, SDK integration
  - **HashiCorp Vault:** Open source, dynamic secrets (generate short-lived DB credentials per request), many auth methods, audit log; Vault Agent for secret injection
  - **Pattern:** App reads secrets at startup from Secrets Manager/Vault, caches in memory, rotates on schedule
- **HTTPS/TLS:** Certificate chain validation, HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`), TLS 1.2 minimum (disable 1.0, 1.1), cipher suite selection, OCSP stapling
- **Certificate pinning:** Embedding expected server certificate hash in the client (mobile/native apps); protection against MitM with rogue CA; risky for web (browsers can't pin); best practice: pin backup certificates, have rotation plan
- **API security (keys vs OAuth):**
  - API keys: simple, no expiry by default, leaked keys = full access until revoked; use for server-to-server, M2M
  - OAuth 2.0 / OIDC: scoped, short-lived access tokens, refresh tokens, supports user delegation; required for user-facing access
  - API key best practices: hash keys before storing (SHA-256), prefix for identification (`sk_live_...`), per-key scopes and rate limits, audit log of key usage
- **Penetration testing awareness:** OWASP ZAP and Burp Suite for web app scanning; reconnaissance phases; understanding CVE scores; responsible disclosure; bug bounty programs; penetration testing ≠ vulnerability scanning

### Key Mental Models
- **Authorization must be server-side, always:** Hiding a button in React is UX — any motivated attacker can call the API directly; the server must re-check permissions on every sensitive request
- **Injection happens when code and data share the same channel:** SQL injection, command injection, XSS — all occur because user data is interpreted as code; the fix is always to separate code from data (parameterized queries, output encoding, CSP)
- **Secrets are credentials, not config:** A database URL with password is a credential — store it like you store passwords, not like you store port numbers

### Why This Matters in Interviews
Security is tested in both technical and behavioral interview rounds. "How do you prevent SQL injection?" is asked at all levels. Senior engineers are expected to know OWASP Top 10, design CSP for a production app, and architect secrets management. Security misconfiguration and broken access control are the most common vulnerabilities found in real apps — knowing these cold makes you credible.

---

## DSA Focus: Tree – Serialization/Deserialization (Hard)

- **Problem:** Serialize and Deserialize Binary Tree (LeetCode #297)
- **Difficulty:** Hard
- **Pattern:** BFS or DFS serialization with null markers
- **Time Target:** < 20 minutes
- **Key Insight:** BFS: serialize using a queue, encode null children as `"null"`, join with comma; deserialize by splitting string, use queue to reconstruct level by level; handle root null case; DFS preorder also works — serialize left then right recursively

---

## Today's 5 Interview Questions
1. Walk me through OWASP A01 Broken Access Control — give a Node.js example of IDOR and show exactly how you fix it in code.
2. What is a Content Security Policy? Walk through the key directives you'd set for a React SPA with an external API and Google Fonts.
3. How do you manage secrets across development, staging, and production environments — what's your full workflow from local dev to Kubernetes?
4. What is SSRF, give a Node.js example of a vulnerable endpoint, and explain how you prevent it.
5. Compare API keys vs OAuth 2.0 for securing your REST API — when do you use each, and what are the security implications of each?

---

## Files
- `01-concept/` → Notes on OWASP Top 10 with Node.js code examples for each, CSP directive reference, secrets rotation workflow
- `02-hands-on/` → security-audit.js — Express app with 5 intentional vulnerabilities + fixes, helmet.js CSP config, secrets manager pattern
- `03-dsa/` → serialize-deserialize-tree.js — BFS and DFS approaches, both serialize and deserialize functions
- `04-interview-prep/` → security-qa.md — 5 Q&As with vulnerable code examples and secure rewrites

---

## Success Criteria
- [ ] Can name all OWASP Top 10 with a Node.js example for each from memory
- [ ] Can write a production CSP header and explain every directive
- [ ] Solved Serialize/Deserialize Binary Tree with both BFS and DFS approaches in < 20 min
- [ ] Confident on all 5 interview questions

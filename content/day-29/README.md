# Day 29 – Auth & Security: JWT, OAuth 2.0, PKCE, CORS & CSRF | DSA: Backtracking

> **Phase 3 – Node.js + MySQL + MongoDB** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | JWT internals, refresh token rotation, OAuth 2.0 flows, CORS deep dive, CSRF, SQL injection |
| Hands-On | 00:40–01:10 | Implement full JWT auth with refresh rotation + CORS config + helmet setup |
| DSA | 01:10–01:25 | Subsets (#78) + Permutations (#46) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Explain JWT structure (header/payload/signature) and attack vectors
- [ ] Implement refresh token rotation with family invalidation
- [ ] Understand OAuth 2.0 authorization code flow with PKCE
- [ ] Solve: Subsets (#78) and Permutations (#46) using backtracking
- [ ] Review 5 security interview questions

---

## Concept: Auth & Security Deep Dive

### What to Study
- **JWT structure:** `base64url(header).base64url(payload).signature` — header has `alg` and `typ`; payload has claims (`sub`, `iat`, `exp`, `jti`); signature is `HMAC-SHA256(header + "." + payload, secret)` or RSA/ECDSA — JWT is signed not encrypted; anyone can read the payload, so never put sensitive data in it
- **JWT vs session cookies:** JWT = stateless (server stores no state, scales horizontally, but can't invalidate before expiry); sessions = stateful (server must store session, easy to invalidate, works with traditional infrastructure); JWT access tokens short-lived (15 min), refresh tokens long-lived (7-30 days) stored in HttpOnly cookie
- **Refresh token rotation + family invalidation:** Issue new refresh token on each use; store token family ID — if a reused refresh token is detected, invalidate the entire family (all sessions for that user/device); prevents token theft via replay attack
- **OAuth 2.0 flows:** Authorization Code + PKCE (for public clients — SPAs, mobile): client generates `code_verifier` and `code_challenge=SHA256(verifier)`, auth server stores challenge, exchanges code + verifier for token — PKCE prevents authorization code interception; Client Credentials (server-to-server, no user); Implicit flow deprecated
- **CORS deep dive:** Browser enforces same-origin policy; CORS headers sent by SERVER; preflight OPTIONS for non-simple requests; `Access-Control-Allow-Origin: *` disables credentials; `Access-Control-Allow-Credentials: true` requires explicit origin (not wildcard); `Access-Control-Allow-Headers/Methods` for preflight response
- **CSRF protection:** Cookies sent automatically by browser — attacker tricks browser into making authenticated request; defenses: SameSite=Strict/Lax cookies (modern, preferred), CSRF token (hidden form field or header), double-submit cookie pattern; SameSite=Lax blocks cross-site POST/PUT/DELETE
- **SQL injection prevention:** Parameterized queries / prepared statements (`?` placeholders) — never string-concatenate user input into SQL; ORM parameter binding; input validation as defense-in-depth (not primary defense); principle of least privilege on DB user

### Key Mental Models
- JWT is a bearer token — whoever has it can use it; the signature proves it wasn't tampered with, but the server can't revoke it before expiry without a blocklist (which adds statefulness)
- OAuth 2.0 is a delegation protocol, not an authentication protocol — it answers "can this app access this user's data?" not "who is this user?" — that's what OpenID Connect (OIDC) adds with the ID token
- CORS is a browser security feature, not a server security feature — a non-browser client (curl, server) ignores CORS headers entirely

### Why This Matters in Interviews
Security is tested heavily at senior level because security bugs cause real damage. Interviewers ask JWT internals (can you explain the attack if you use `alg: none`?), OAuth flows (PKCE vs implicit), and CORS misconfigurations. Knowing CSRF defenses and SQL injection prevention signals production security awareness.

---

## DSA Focus: Backtracking – Subsets & Permutations

- **Problem:** Subsets (LeetCode #78) + Permutations (LeetCode #46)
- **Difficulty:** Medium
- **Pattern:** Backtracking — build state, recurse, undo
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Subsets: at each index, choose to include or skip the element — 2^n subsets total; Permutations: at each step, place each unused element, track used with a boolean array or by swapping in place — both follow the same backtrack template: add to state, recurse, remove from state

---

## Today's 5 Interview Questions (Flash Review)
1. What is the security risk of using a long-lived JWT access token, and how do refresh tokens mitigate it?
2. What is PKCE and why was it introduced for public OAuth clients?
3. Explain the SameSite cookie attribute — what does Lax protect against that None does not?
4. Why does `Access-Control-Allow-Origin: *` prevent you from using cookies in cross-origin requests?
5. What is the difference between authentication and authorization, and how do JWT claims relate to each?

---

## Files in This Folder
- `01-concept/` → Read: JWT.io debugger, OAuth 2.0 RFC 6749, PKCE RFC 7636, OWASP CORS cheat sheet, OWASP CSRF cheat sheet
- `02-hands-on/` → Code: auth-server.js (JWT issue + refresh rotation + family invalidation), cors-config.js, csrf-protection.js
- `03-dsa/` → DSA: subsets.js (backtracking), permutations.js (backtracking with swap)
- `04-interview-prep/` → Full Q&A: 5 security questions with detailed technical answers

---

## Success Criteria
- [ ] Can explain JWT structure and the `alg: none` attack vector without notes
- [ ] Solved both backtracking problems in < 20 minutes
- [ ] Confident answering all 5 security interview questions
- [ ] Bonus: Implement a JWT blocklist using Redis to allow early revocation without statefulness everywhere

/**
 * Day 53 — Security Mastery: Hands-On Exercises
 * Topics: IDOR defense, NoSQL injection, SSRF defense, CSP builder, JWT rotation
 */

// ─────────────────────────────────────────────────────────────
// Exercise 1: IDOR Vulnerability Demo + Ownership Check Middleware
// ─────────────────────────────────────────────────────────────

// Simulated data store
const orders = new Map([
  ['ord_1', { id: 'ord_1', userId: 'user_alice', total: 99.99 }],
  ['ord_2', { id: 'ord_2', userId: 'user_bob',   total: 149.50 }],
  ['ord_3', { id: 'ord_3', userId: 'user_alice', total: 25.00 }],
]);

/**
 * VULNERABLE: No ownership check
 * User Bob can fetch ord_1 (Alice's order) by changing the ID in the URL
 */
function vulnerableGetOrder(req) {
  const order = orders.get(req.params.orderId);
  if (!order) return { status: 404, body: { error: 'Not found' } };
  return { status: 200, body: order }; // Returns ANY order — security hole!
}

/**
 * FIXED: Ownership check middleware
 * Returns same 404 for both "not found" AND "not yours" — avoids info leakage
 */
function requireOrderOwnership(req, res, next) {
  const order = orders.get(req.params.orderId);
  // Deliberately same error for not-found and unauthorized — don't reveal which
  if (!order || order.userId !== req.user.id) {
    return res?.status(404).json({ error: 'Order not found' })
      || console.log('[IDOR Defense] Blocked — order not found or not owned by user');
  }
  req.order = order; // attach to request for handler use
  next?.();
}

// Demo
function demoIDOR() {
  console.log('=== IDOR Vulnerability Demo ===');

  // Vulnerable: Bob fetches Alice's order
  const bobAsAlice = { params: { orderId: 'ord_1' }, user: { id: 'user_bob' } };
  const vulnResult = vulnerableGetOrder(bobAsAlice);
  console.log('VULNERABLE — Bob reads Alice\'s order:', vulnResult);

  // Fixed: Bob is blocked
  const fixedReq = { params: { orderId: 'ord_1' }, user: { id: 'user_bob' } };
  let nextCalled = false;
  requireOrderOwnership(fixedReq, null, () => { nextCalled = true; });
  console.log('FIXED — next called (should be false):', nextCalled);

  // Fixed: Alice can access her own order
  const aliceReq = { params: { orderId: 'ord_1' }, user: { id: 'user_alice' } };
  let aliceNext = false;
  requireOrderOwnership(aliceReq, null, () => { aliceNext = true; });
  console.log('FIXED — Alice accesses her own order (should be true):', aliceNext, aliceReq.order);
}

// ─────────────────────────────────────────────────────────────
// Exercise 2: NoSQL Injection — MongoDB Operator Injection + Fix
// ─────────────────────────────────────────────────────────────

/**
 * MongoDB operator injection: attacker sends JSON object instead of string.
 * { "username": "admin", "password": { "$gt": "" } }
 * MongoDB interprets this as: WHERE username = 'admin' AND password > ""
 * → matches ANY document where password is not empty → bypasses auth!
 */
function vulnerableLogin(body) {
  // Simulated: User.findOne(body) in MongoDB
  const { username, password } = body;
  console.log('\n[NoSQL Injection] Query:', JSON.stringify({ username, password }));

  // Simulate what MongoDB would do with operator injection
  if (typeof password === 'object' && password.$gt !== undefined) {
    console.log('[NoSQL Injection] ATTACK SUCCEEDED — operator injection bypassed auth!');
    return { user: { id: 1, username: 'admin', role: 'admin' } };
  }
  if (username === 'admin' && password === 'secret123') {
    return { user: { id: 1, username: 'admin' } };
  }
  return null;
}

function secureLogin(body) {
  const { username, password } = body;

  // Validate: both must be plain strings
  if (typeof username !== 'string' || typeof password !== 'string') {
    console.log('[Secure Login] Rejected — non-string credentials');
    return { error: 'Invalid credentials format', status: 400 };
  }

  // Sanitize: reject strings that look like operators (defense in depth)
  if (username.startsWith('$') || password.startsWith('$')) {
    console.log('[Secure Login] Rejected — operator in credentials');
    return { error: 'Invalid credentials', status: 400 };
  }

  // In a real app: use Mongoose with schema validation (schema enforces String type)
  // Mongoose would strip operator keys automatically if schema field is String type
  if (username === 'admin' && password === 'secret123') {
    return { user: { id: 1, username: 'admin' } };
  }
  return { error: 'Invalid credentials', status: 401 };
}

function demoNoSQLInjection() {
  console.log('\n=== NoSQL Injection Demo ===');

  // Attack payload
  const attackPayload = { username: 'admin', password: { $gt: '' } };

  console.log('Vulnerable login with attack payload:');
  vulnerableLogin(attackPayload);

  console.log('Secure login with attack payload:');
  secureLogin(attackPayload);

  console.log('Secure login with valid credentials:');
  const result = secureLogin({ username: 'admin', password: 'secret123' });
  console.log('Login result:', result);
}

// ─────────────────────────────────────────────────────────────
// Exercise 3: SSRF Defense — Block Private IP Ranges
// ─────────────────────────────────────────────────────────────
const PRIVATE_IP_RANGES = [
  /^10\.\d+\.\d+\.\d+$/,              // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // 172.16.0.0/12
  /^192\.168\.\d+\.\d+$/,             // 192.168.0.0/16
  /^127\.\d+\.\d+\.\d+$/,             // Loopback
  /^169\.254\.\d+\.\d+$/,             // Link-local / AWS metadata (169.254.169.254)
  /^0\.\d+\.\d+\.\d+$/,               // "This" network
  /^::1$/,                             // IPv6 loopback
  /^fc00:/i,                           // IPv6 unique local
  /^fe80:/i,                           // IPv6 link-local
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',                   // AWS/GCP metadata service
  'instance-data',
];

function isPrivateOrBlocked(hostname) {
  if (BLOCKED_HOSTNAMES.includes(hostname.toLowerCase())) return true;
  return PRIVATE_IP_RANGES.some(pattern => pattern.test(hostname));
}

/**
 * SSRF-safe HTTP client middleware.
 * Before making an outbound request, validate the destination URL.
 */
async function safeHttpRequest(urlString, options = {}) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL');
  }

  // Only allow HTTP/HTTPS schemes
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Blocked: URL scheme "${parsed.protocol}" not allowed`);
  }

  // Check hostname against blocked list
  if (isPrivateOrBlocked(parsed.hostname)) {
    throw new Error(`Blocked: requests to "${parsed.hostname}" are not permitted (SSRF protection)`);
  }

  console.log(`[SSRF Guard] Allowing request to: ${parsed.hostname}`);
  // In production: return fetch(urlString, options);
  return { ok: true, status: 200, body: `Simulated response from ${parsed.hostname}` };
}

async function demoSSRF() {
  console.log('\n=== SSRF Defense Demo ===');

  const urls = [
    'https://example.com/data',           // allowed
    'http://169.254.169.254/latest/meta-data/', // blocked (AWS metadata)
    'http://localhost:5432',              // blocked (localhost)
    'http://192.168.1.100/admin',         // blocked (private IP)
    'http://metadata.google.internal',    // blocked (GCP metadata)
    'https://api.github.com/users',       // allowed
  ];

  for (const url of urls) {
    try {
      const result = await safeHttpRequest(url);
      console.log(`  ALLOWED: ${url}`);
    } catch (err) {
      console.log(`  BLOCKED: ${url} — ${err.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Exercise 4: CSP Header Builder
// ─────────────────────────────────────────────────────────────
const crypto = { randomBytes: (n) => Buffer.from(Math.random().toString(36).repeat(n)).slice(0, n) };

function buildCSPHeader(config = {}) {
  const {
    defaultSrc    = ["'self'"],
    scriptSrc     = ["'self'"],
    styleSrc      = ["'self'", "'unsafe-inline'"],
    imgSrc        = ["'self'", 'data:'],
    connectSrc    = ["'self'"],
    fontSrc       = ["'self'"],
    objectSrc     = ["'none'"],
    frameSrc      = ["'none'"],
    frameAncestors = ["'none'"],
    upgradeInsecureRequests = true,
    reportUri     = null,
    nonce         = null,        // Include nonce in script-src if provided
    reportOnly    = false,
  } = config;

  const directives = [];

  const addNonce = (src) => nonce ? [...src, `'nonce-${nonce}'`] : src;

  if (defaultSrc.length)     directives.push(`default-src ${defaultSrc.join(' ')}`);
  if (scriptSrc.length)      directives.push(`script-src ${addNonce(scriptSrc).join(' ')}`);
  if (styleSrc.length)       directives.push(`style-src ${styleSrc.join(' ')}`);
  if (imgSrc.length)         directives.push(`img-src ${imgSrc.join(' ')}`);
  if (connectSrc.length)     directives.push(`connect-src ${connectSrc.join(' ')}`);
  if (fontSrc.length)        directives.push(`font-src ${fontSrc.join(' ')}`);
  if (objectSrc.length)      directives.push(`object-src ${objectSrc.join(' ')}`);
  if (frameSrc.length)       directives.push(`frame-src ${frameSrc.join(' ')}`);
  if (frameAncestors.length) directives.push(`frame-ancestors ${frameAncestors.join(' ')}`);
  if (upgradeInsecureRequests) directives.push('upgrade-insecure-requests');
  if (reportUri)             directives.push(`report-uri ${reportUri}`);

  const headerName = reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';

  return {
    headerName,
    headerValue: directives.join('; '),
    nonce,
  };
}

// CSP middleware for Express
function cspMiddleware(options = {}) {
  return (req, res, next) => {
    const nonce = Buffer.from(Math.random().toString(36).slice(2, 18)).toString('base64');
    req.cspNonce = nonce;

    const { headerName, headerValue } = buildCSPHeader({
      ...options,
      nonce,
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.example.com'],
    });

    res.setHeader(headerName, headerValue);
    next?.();
  };
}

function demoCSP() {
  console.log('\n=== CSP Header Builder ===');

  // Production CSP
  const { headerName, headerValue } = buildCSPHeader({
    scriptSrc: ["'self'"],
    connectSrc: ["'self'", 'https://api.myapp.com'],
    imgSrc: ["'self'", 'data:', 'https://cdn.myapp.com'],
    nonce: 'abc123xyz',
    reportUri: '/csp-report',
    upgradeInsecureRequests: true,
  });
  console.log(`${headerName}:`);
  console.log(headerValue);

  // Report-only mode for testing
  const reportOnly = buildCSPHeader({
    scriptSrc: ["'self'"],
    reportOnly: true,
    reportUri: '/csp-violations',
  });
  console.log(`\n${reportOnly.headerName}:`);
  console.log(reportOnly.headerValue);
}

// ─────────────────────────────────────────────────────────────
// Exercise 5: JWT Secret Rotation with Grace Period
// ─────────────────────────────────────────────────────────────
/**
 * During key rotation, we want:
 * 1. New tokens signed with new secret
 * 2. Old tokens (signed with old secret) still valid during grace period
 * 3. Automatic cleanup after grace period expires
 */

// Simulated JWT — in production use 'jsonwebtoken' package
function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function sign(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const sig = base64url(`${secret}-${header}.${body}`); // simplified HMAC simulation
  return `${header}.${body}.${sig}`;
}
function verify(token, secret) {
  const [header, body, sig] = token.split('.');
  const expected = base64url(`${secret}-${header}.${body}`);
  if (sig !== expected) throw new Error('Invalid signature');
  return JSON.parse(Buffer.from(body, 'base64').toString());
}

class JWTKeyManager {
  constructor() {
    this.secrets = new Map(); // secretId → { secret, createdAt, expiresAt }
    this.currentSecretId = null;
  }

  addSecret(id, secret, ttlMs = 24 * 60 * 60 * 1000) {
    this.secrets.set(id, {
      secret,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    });
    this.currentSecretId = id;
    console.log(`[JWTKeyManager] Added secret: ${id}, expires in ${ttlMs / 1000}s`);
  }

  signToken(payload) {
    const current = this.secrets.get(this.currentSecretId);
    if (!current) throw new Error('No active signing secret');
    const tokenPayload = { ...payload, kid: this.currentSecretId, exp: Math.floor(Date.now() / 1000) + 900 };
    return sign(tokenPayload, current.secret);
  }

  verifyToken(token) {
    // Try to extract the key ID from the token without full verification first
    const [, body] = token.split('.');
    let payload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64').toString());
    } catch {
      throw new Error('Malformed token');
    }

    const { kid } = payload;
    if (kid) {
      // Preferred: use the key ID to look up the right secret
      const secretEntry = this.secrets.get(kid);
      if (!secretEntry) throw new Error(`Unknown key ID: ${kid}`);
      if (Date.now() > secretEntry.expiresAt) throw new Error(`Secret ${kid} has expired`);
      return verify(token, secretEntry.secret);
    }

    // Fallback: try all non-expired secrets (legacy tokens without kid)
    for (const [id, entry] of this.secrets) {
      if (Date.now() > entry.expiresAt) continue;
      try {
        return verify(token, entry.secret);
      } catch { /* try next */ }
    }

    throw new Error('Token verification failed with all active secrets');
  }

  rotate(newId, newSecret, gracePeriodMs = 3600000) {
    console.log(`[JWTKeyManager] Rotating: keeping old secrets for ${gracePeriodMs / 1000}s grace period`);
    // Reduce TTL of old secrets to grace period
    for (const [id, entry] of this.secrets) {
      if (id !== newId) {
        entry.expiresAt = Date.now() + gracePeriodMs;
        console.log(`[JWTKeyManager] Secret ${id} will expire at ${new Date(entry.expiresAt).toISOString()}`);
      }
    }
    this.addSecret(newId, newSecret, 24 * 60 * 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    for (const [id, entry] of this.secrets) {
      if (now > entry.expiresAt && id !== this.currentSecretId) {
        this.secrets.delete(id);
        console.log(`[JWTKeyManager] Removed expired secret: ${id}`);
      }
    }
  }
}

function demoJWTRotation() {
  console.log('\n=== JWT Secret Rotation ===');

  const manager = new JWTKeyManager();
  manager.addSecret('key-v1', 'secret-key-v1-abc');

  // Issue token with v1 key
  const token = manager.signToken({ userId: 42, role: 'user' });
  console.log('Token issued:', token.slice(0, 40) + '...');

  // Verify it works
  const payload = manager.verifyToken(token);
  console.log('Token verified, payload:', payload);

  // Rotate to v2 key — v1 still valid for grace period
  manager.rotate('key-v2', 'secret-key-v2-xyz', 100); // 100ms grace for demo

  // Old token still valid during grace period
  try {
    const oldPayload = manager.verifyToken(token);
    console.log('Old token still valid during grace period:', oldPayload.kid);
  } catch (err) {
    console.log('Old token rejected:', err.message);
  }

  // New tokens use new key
  const newToken = manager.signToken({ userId: 99, role: 'admin' });
  const newPayload = manager.verifyToken(newToken);
  console.log('New token uses:', newPayload.kid);
}

// ─────────────────────────────────────────────────────────────
// Run All
// ─────────────────────────────────────────────────────────────
async function main() {
  demoIDOR();
  demoNoSQLInjection();
  await demoSSRF();
  demoCSP();
  demoJWTRotation();
}

main().catch(console.error);

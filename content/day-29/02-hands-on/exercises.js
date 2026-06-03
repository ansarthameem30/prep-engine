/**
 * Day 29 — Authentication + Security Deep Dive
 * Hands-on Exercises
 *
 * Note: Uses only Node.js built-in crypto module (no external libraries for JWT/bcrypt)
 * In production, use jsonwebtoken + bcrypt/argon2 packages.
 */

const crypto = require('crypto');

// ─────────────────────────────────────────────
// Exercise 1: Complete Auth System — Register + Login + Protected Route
// ─────────────────────────────────────────────

function exercise1_authSystem() {
  console.log('=== Exercise 1: Complete Auth System ===\n');

  // ── Simulated bcrypt using PBKDF2 (same concept: slow key derivation) ──
  function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    // PBKDF2: 100000 iterations, 64 byte output, SHA-512 — similar to bcrypt cost factor
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const attempt = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
    // timingSafeEqual prevents timing attacks (all comparisons take same time)
  }

  // ── JWT implementation using Node crypto ──
  const JWT_SECRET = crypto.randomBytes(32).toString('hex');

  function b64url(obj) {
    return Buffer.from(JSON.stringify(obj)).toString('base64url');
  }

  function issueToken(userId, expiresInSeconds = 900) {
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      jti: crypto.randomUUID()
    });
    const data = `${header}.${payload}`;
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    return `${data}.${sig}`;
  }

  function verifyToken(token) {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token structure');

    const [header, payload, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      throw new Error('Invalid signature');
    }

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (claims.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return claims;
  }

  // ── In-memory user store ──
  const users = new Map(); // email → { id, email, passwordHash }

  // Register
  function register(email, password) {
    if (users.has(email)) throw new Error('Email already registered');
    const user = { id: crypto.randomUUID(), email, passwordHash: hashPassword(password) };
    users.set(email, user);
    console.log(`Registered user: ${email}`);
    return user.id;
  }

  // Login
  function login(email, password) {
    const user = users.get(email);
    if (!user) throw new Error('Invalid credentials');
    if (!verifyPassword(password, user.passwordHash)) throw new Error('Invalid credentials');
    const token = issueToken(user.id);
    console.log(`Login successful for: ${email}`);
    return token;
  }

  // Auth middleware simulation
  function requireAuth(token) {
    const claims = verifyToken(token);
    const user = [...users.values()].find(u => u.id === claims.sub);
    if (!user) throw new Error('User not found');
    return user;
  }

  // Test the flow
  register('alice@example.com', 'SecureP@ss123');
  const token = login('alice@example.com', 'SecureP@ss123');
  console.log('Token (first 50 chars):', token.slice(0, 50) + '...');

  const user = requireAuth(token);
  console.log('Protected route accessed by:', user.email);

  // Test wrong password
  try {
    login('alice@example.com', 'wrongpassword');
  } catch (e) {
    console.log('Wrong password rejected:', e.message);
  }

  // Test tampered token
  try {
    const tampered = token.slice(0, -5) + 'XXXXX'; // modify signature
    requireAuth(tampered);
  } catch (e) {
    console.log('Tampered token rejected:', e.message);
  }
}

exercise1_authSystem();


// ─────────────────────────────────────────────
// Exercise 2: Refresh Token Rotation with Family-based Invalidation
// ─────────────────────────────────────────────

function exercise2_refreshTokenRotation() {
  console.log('\n=== Exercise 2: Refresh Token Rotation ===\n');

  // Token store: Map<refreshToken, { userId, familyId, used: bool, expiresAt }>
  const tokenStore = new Map();

  function issueTokenPair(userId, familyId = crypto.randomUUID()) {
    const accessToken = `AT:${crypto.randomBytes(16).toString('hex')}`;
    const refreshToken = `RT:${crypto.randomBytes(32).toString('hex')}`;

    tokenStore.set(refreshToken, {
      userId,
      familyId,
      used: false,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log(`  Issued access_token: ${accessToken.slice(0, 20)}...`);
    console.log(`  Issued refresh_token (family: ${familyId.slice(0, 8)}...): ${refreshToken.slice(0, 20)}...`);
    return { accessToken, refreshToken, familyId };
  }

  function refreshTokens(oldRefreshToken) {
    const stored = tokenStore.get(oldRefreshToken);

    if (!stored) throw new Error('Refresh token not found — please log in again');
    if (stored.expiresAt < Date.now()) throw new Error('Refresh token expired — please log in again');

    if (stored.used) {
      // REUSE DETECTED — token theft!
      // Invalidate the ENTIRE family (all sessions derived from this login)
      console.log('  ⚠ REUSE DETECTED! Invalidating entire token family:', stored.familyId);
      for (const [token, data] of tokenStore.entries()) {
        if (data.familyId === stored.familyId) {
          tokenStore.delete(token);
        }
      }
      throw new Error('Refresh token reuse detected — security breach! All sessions invalidated');
    }

    // Mark old token as used (not deleted yet — kept for reuse detection)
    stored.used = true;

    // Issue new token pair in the SAME family
    return issueTokenPair(stored.userId, stored.familyId);
  }

  // Simulate a normal session
  console.log('1. Login:');
  const { refreshToken: rt1, familyId } = issueTokenPair('user-abc');

  console.log('\n2. Normal token refresh:');
  const { refreshToken: rt2 } = refreshTokens(rt1);

  console.log('\n3. Another normal refresh:');
  const { refreshToken: rt3 } = refreshTokens(rt2);

  console.log('\n4. Token theft simulation — attacker uses the OLD token (rt1):');
  try {
    refreshTokens(rt1); // rt1 was already used
  } catch (e) {
    console.log('  Security response:', e.message);
  }

  console.log('\n5. Legitimate user also loses access (entire family invalidated):');
  try {
    refreshTokens(rt3); // rt3 is also invalidated due to family invalidation
  } catch (e) {
    console.log('  Legitimate refresh also fails:', e.message);
    console.log('  User must re-login (acceptable security tradeoff)');
  }
}

exercise2_refreshTokenRotation();


// ─────────────────────────────────────────────
// Exercise 3: CORS Middleware from Scratch
// ─────────────────────────────────────────────

function exercise3_corsMiddleware() {
  console.log('\n=== Exercise 3: CORS Middleware ===\n');

  function createCorsMiddleware({
    allowedOrigins = [],
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Request-Id'],
    credentials = true,
    maxAge = 86400 // 24 hours — how long browsers cache preflight response
  } = {}) {

    return function cors(req, res, next) {
      const origin = req.headers.origin;

      // Check if origin is allowed
      const isAllowed = allowedOrigins.includes(origin) ||
                        allowedOrigins.includes('*');

      if (!isAllowed && origin) {
        // Unknown origin — don't set CORS headers (browser will block it)
        console.log(`  CORS blocked: origin ${origin} not in allowlist`);
        return next();
      }

      // Set CORS headers
      if (origin) {
        // Must be specific origin when credentials=true (can't use *)
        res.headers['Access-Control-Allow-Origin'] = origin;
        if (credentials) res.headers['Access-Control-Allow-Credentials'] = 'true';
      }

      // Handle preflight request (OPTIONS)
      if (req.method === 'OPTIONS') {
        res.headers['Access-Control-Allow-Methods'] = allowedMethods.join(', ');
        res.headers['Access-Control-Allow-Headers'] = allowedHeaders.join(', ');
        res.headers['Access-Control-Max-Age'] = String(maxAge);
        res.statusCode = 204; // No Content
        console.log(`  Preflight responded for ${origin}`);
        return; // Don't call next for OPTIONS
      }

      // For non-preflight requests, also expose which headers clients can read
      res.headers['Access-Control-Expose-Headers'] = 'X-Request-Id, X-RateLimit-Remaining';

      next();
    };
  }

  // Test the middleware
  const cors = createCorsMiddleware({
    allowedOrigins: ['https://frontend.example.com', 'http://localhost:3000']
  });

  function testCors(method, origin) {
    const req = { method, headers: { origin } };
    const res = { headers: {}, statusCode: 200 };
    let nextCalled = false;
    cors(req, res, () => { nextCalled = true; });
    console.log(`  ${method} from ${origin}: status=${res.statusCode}, allowed=${!!res.headers['Access-Control-Allow-Origin']}, next=${nextCalled}`);
  }

  testCors('GET', 'https://frontend.example.com');      // allowed
  testCors('OPTIONS', 'https://frontend.example.com');  // preflight
  testCors('GET', 'https://evil.attacker.com');         // blocked
  testCors('POST', 'http://localhost:3000');             // allowed (dev)
}

exercise3_corsMiddleware();


// ─────────────────────────────────────────────
// Exercise 4: SQL Injection — Vulnerable vs Parameterized
// ─────────────────────────────────────────────

function exercise4_sqlInjection() {
  console.log('\n=== Exercise 4: SQL Injection Demo ===\n');

  // Simulate query builder (shows what SQL gets executed)
  function buildVulnerableQuery(email) {
    return `SELECT * FROM users WHERE email = '${email}'`;
  }

  function buildSafeQuery(email) {
    return {
      sql: 'SELECT * FROM users WHERE email = ?',
      params: [email],
      safe: true
    };
  }

  // Normal input
  const normalEmail = 'alice@example.com';
  console.log('Normal input:');
  console.log('  Vulnerable:', buildVulnerableQuery(normalEmail));
  console.log('  Safe:', JSON.stringify(buildSafeQuery(normalEmail)));

  // SQL injection payload
  const injectionPayload = "' OR '1'='1'; --";
  console.log('\nSQL Injection payload:', injectionPayload);
  console.log('  Vulnerable:', buildVulnerableQuery(injectionPayload));
  // → SELECT * FROM users WHERE email = '' OR '1'='1'; --'
  // This returns ALL users!

  const safe = buildSafeQuery(injectionPayload);
  console.log('  Safe SQL:', safe.sql);
  console.log('  Safe params:', safe.params);
  // The payload is treated as a literal string, not SQL

  // Second order injection (more subtle)
  const secondOrder = "admin'--";
  console.log('\nSecond-order injection (username stored, later used in dynamic SQL):');
  console.log('  Stored: "admin\'--"');
  console.log('  Later vulnerable query: SELECT * FROM users WHERE username =', `'${secondOrder}'`);
  console.log('  → Becomes: SELECT * FROM users WHERE username = \'admin\'--\'');
  console.log('  Mitigation: parameterize ALL queries, even when data "came from our own DB"');
}

exercise4_sqlInjection();


// ─────────────────────────────────────────────
// Exercise 5: RS256 JWT using Node.js crypto
// ─────────────────────────────────────────────

function exercise5_rs256JWT() {
  console.log('\n=== Exercise 5: RS256 JWT (Public/Private Key) ===\n');

  // Generate RSA key pair (in production, generate once and store securely)
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  console.log('Generated RSA-2048 key pair');
  console.log('Public key (first 50 chars):', publicKey.slice(0, 50) + '...');

  function b64url(obj) {
    return Buffer.from(JSON.stringify(obj)).toString('base64url');
  }

  // Sign with PRIVATE key
  function signRS256JWT(payload, privKey) {
    const header = b64url({ alg: 'RS256', typ: 'JWT' });
    const body = b64url({ ...payload, iat: Math.floor(Date.now() / 1000) });
    const message = `${header}.${body}`;

    const signer = crypto.createSign('SHA256');
    signer.update(message);
    const signature = signer.sign(privKey, 'base64url');

    return `${message}.${signature}`;
  }

  // Verify with PUBLIC key (only the public key is needed for verification)
  function verifyRS256JWT(token, pubKey) {
    const [header, payload, sig] = token.split('.');
    if (!header || !payload || !sig) throw new Error('Invalid token');

    const message = `${header}.${payload}`;
    const verifier = crypto.createVerify('SHA256');
    verifier.update(message);

    const isValid = verifier.verify(pubKey, sig, 'base64url');
    if (!isValid) throw new Error('Signature verification failed');

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return claims;
  }

  // Test
  const token = signRS256JWT({
    sub: 'user-456',
    email: 'bob@example.com',
    roles: ['user', 'editor'],
    exp: Math.floor(Date.now() / 1000) + 900
  }, privateKey);

  console.log('\nSigned token (first 80 chars):', token.slice(0, 80) + '...');

  // Verify with PUBLIC key only (auth service signs, API services verify)
  const claims = verifyRS256JWT(token, publicKey);
  console.log('\nVerified claims:', JSON.stringify(claims, null, 2));

  // Demonstrate: can verify with public key, CANNOT forge without private key
  try {
    const tampered = token.slice(0, token.lastIndexOf('.')) + '.FakeSignature';
    verifyRS256JWT(tampered, publicKey);
  } catch (e) {
    console.log('\nTampered token rejected:', e.message);
  }

  console.log('\nKey insight for microservices:');
  console.log('  Auth service: holds PRIVATE key (kept secret)');
  console.log('  All other services: use PUBLIC key (can be shared, even published at /.well-known/jwks.json)');
  console.log('  No shared secret needed — any service can verify without trusting every other service');
}

exercise5_rs256JWT();

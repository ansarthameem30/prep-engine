/**
 * Day 24 — REST API Design Best Practices
 * Hands-on Exercises
 */

// ─────────────────────────────────────────────
// Exercise 1: Blog API URL Design Documentation
// ─────────────────────────────────────────────

/**
 * Design URL structure for a blog API.
 * Resources: posts, comments, users, tags
 *
 * Design decisions documented inline.
 */
const BLOG_API_DESIGN = {
  baseUrl: '/api/v1',

  resources: {
    users: {
      endpoints: [
        'GET    /users              — list users (paginated)',
        'POST   /users              — register new user',
        'GET    /users/:id          — get user profile',
        'PATCH  /users/:id          — partial update (own profile only)',
        'DELETE /users/:id          — deactivate account (soft delete)',
        'GET    /users/:id/posts    — all posts by a user (max nesting level 2)',
      ],
      decision: 'User posts are accessible at /users/:id/posts because the relationship ' +
                'is "posts authored by user" — it is a containment relationship. ' +
                'We do NOT nest further: /users/:id/posts/:postId/comments is too deep; ' +
                'use /posts/:postId/comments instead.'
    },

    posts: {
      endpoints: [
        'GET    /posts                   — list posts (filterable by status, tag, authorId)',
        'POST   /posts                   — create post (auth required)',
        'GET    /posts/:id               — get single post with author info',
        'PUT    /posts/:id               — full replace (admin/author only)',
        'PATCH  /posts/:id               — partial update (status, content)',
        'DELETE /posts/:id               — soft delete (sets deleted_at)',
        'GET    /posts/:postId/comments  — comments on a post (nested resource)',
        'POST   /posts/:postId/comments  — add comment to post',
        'POST   /posts/:postId/tags      — associate tags with post',
        'DELETE /posts/:postId/tags/:tagId — remove a tag from post',
      ],
      decision: 'POST /posts returns 201 + Location: /posts/:newId header. ' +
                'GET /posts?fields=id,title,author.name supports sparse fieldsets. ' +
                'POST /posts/:postId/tags uses a many-to-many sub-resource pattern. ' +
                'Comments are nested under posts (max 2 levels) because they are ' +
                'semantically part of the post context.'
    },

    comments: {
      endpoints: [
        'GET    /comments/:id  — get single comment directly (for deep linking)',
        'PATCH  /comments/:id  — edit own comment',
        'DELETE /comments/:id  — soft delete comment',
      ],
      decision: 'Comments can also be accessed directly at /comments/:id for editing/deletion ' +
                'to avoid the verbose /posts/:postId/comments/:commentId pattern in client code.'
    },

    tags: {
      endpoints: [
        'GET    /tags           — list all tags',
        'POST   /tags           — create tag (admin only)',
        'GET    /tags/:slug     — get tag + posts with this tag',
        'DELETE /tags/:id       — delete tag (admin only)',
      ],
      decision: 'Tags use :slug (human-readable) for GET to enable /tags/javascript type URLs. ' +
                'Tags use :id for DELETE to avoid ambiguity if slug changes.'
    }
  },

  queryParams: {
    filtering: '?status=published&authorId=123&tag=javascript',
    sorting:   '?sort=-publishedAt,title   (- prefix = descending)',
    pagination: '?cursor=base64token&limit=20',
    fields:    '?fields=id,title,author.name,publishedAt',
    include:   '?include=author,tags   (eager load related resources)',
  }
};

console.log('=== Exercise 1: Blog API URL Design ===');
Object.entries(BLOG_API_DESIGN.resources).forEach(([resource, config]) => {
  console.log(`\n[${resource.toUpperCase()}]`);
  config.endpoints.forEach(e => console.log('  ', e));
  console.log('  Decision:', config.decision.slice(0, 100) + '...');
});


// ─────────────────────────────────────────────
// Exercise 2: Cursor-Based Pagination
// ─────────────────────────────────────────────

function exercise2_cursorPagination() {
  console.log('\n=== Exercise 2: Cursor-Based Pagination ===');

  // Simulated database (sorted by id asc)
  const DB = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    title: `Post ${i + 1}`,
    createdAt: new Date(Date.now() - (100 - i) * 86400000).toISOString()
  }));

  /**
   * Encode cursor: base64 encode the last item's ID + timestamp
   * Opaque to clients — they just pass it back as-is
   */
  function encodeCursor(item) {
    return Buffer.from(JSON.stringify({ id: item.id, ts: item.createdAt })).toString('base64');
  }

  function decodeCursor(cursor) {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }

  /**
   * Paginate using cursor (keyset-style, by id)
   * Equivalent SQL: SELECT * FROM posts WHERE id > :cursor_id ORDER BY id LIMIT :limit+1
   */
  function getPosts({ cursor, limit = 5 }) {
    const decoded = cursor ? decodeCursor(cursor) : null;

    let items = decoded
      ? DB.filter(p => p.id > decoded.id)
      : DB;

    // Fetch one extra to determine hasMore
    const slice = items.slice(0, limit + 1);
    const hasMore = slice.length > limit;
    const data = slice.slice(0, limit);

    return {
      data,
      pagination: {
        hasMore,
        count: data.length,
        nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null,
        prevCursor: decoded ? encodeCursor(DB[0]) : null, // simplified
      }
    };
  }

  // Simulate paginating through posts
  let cursor = null;
  let page = 1;

  do {
    const result = getPosts({ cursor, limit: 10 });
    console.log(`Page ${page}: IDs ${result.data[0].id}..${result.data[result.data.length - 1].id}, hasMore=${result.pagination.hasMore}`);
    cursor = result.pagination.nextCursor;
    page++;
  } while (cursor && page <= 3); // show first 3 pages

  console.log('Cursor is opaque (base64):', cursor?.slice(0, 30) + '...');
}

exercise2_cursorPagination();


// ─────────────────────────────────────────────
// Exercise 3: Generic Filtering + Sorting Middleware
// ─────────────────────────────────────────────

function exercise3_filterSortMiddleware() {
  console.log('\n=== Exercise 3: Filtering + Sorting Middleware ===');

  /**
   * Parses query params into a structured filter/sort/pagination config.
   * Protects against injection by whitelisting allowed fields.
   */
  function createQueryMiddleware({ allowedFilters = [], allowedSorts = [] } = {}) {
    return function queryMiddleware(req, res, next) {
      const { sort, limit = 20, cursor, fields, ...filterParams } = req.query;

      // Parse filters
      const filters = {};
      for (const [key, value] of Object.entries(filterParams)) {
        if (!allowedFilters.includes(key)) continue; // ignore unknown filter params

        // Handle range syntax: minPrice → { price: { $gte: value } }
        if (key.startsWith('min')) {
          const field = key[3].toLowerCase() + key.slice(4);
          filters[field] = { ...filters[field], $gte: Number(value) };
        } else if (key.startsWith('max')) {
          const field = key[3].toLowerCase() + key.slice(4);
          filters[field] = { ...filters[field], $lte: Number(value) };
        } else {
          filters[key] = value;
        }
      }

      // Parse sort: ?sort=-createdAt,name → [{ field: 'createdAt', dir: -1 }, { field: 'name', dir: 1 }]
      const sortFields = sort ? sort.split(',').map(s => {
        const desc = s.startsWith('-');
        const field = desc ? s.slice(1) : s;
        if (!allowedSorts.includes(field)) return null;
        return { field, dir: desc ? -1 : 1 };
      }).filter(Boolean) : [];

      // Parse sparse fieldsets
      const selectedFields = fields ? fields.split(',').map(f => f.trim()) : null;

      req.queryConfig = {
        filters,
        sort: sortFields,
        limit: Math.min(parseInt(limit) || 20, 100), // cap at 100
        cursor: cursor || null,
        fields: selectedFields,
      };

      next();
    };
  }

  // Test it
  const mockReq = {
    query: {
      status: 'active',
      minPrice: '100',
      maxPrice: '500',
      category: 'electronics',
      unknownField: 'hacker', // should be filtered out
      sort: '-createdAt,name',
      limit: '15',
      fields: 'id,name,price'
    }
  };
  const mockRes = {};

  createQueryMiddleware({
    allowedFilters: ['status', 'category', 'minPrice', 'maxPrice'],
    allowedSorts: ['createdAt', 'name', 'price'],
  })(mockReq, mockRes, () => {
    console.log('Parsed queryConfig:');
    console.log(JSON.stringify(mockReq.queryConfig, null, 2));
    // unknownField should NOT appear in filters
  });
}

exercise3_filterSortMiddleware();


// ─────────────────────────────────────────────
// Exercise 4: OpenAPI Spec Snippet (YAML in template literal)
// ─────────────────────────────────────────────

function exercise4_openAPISpec() {
  console.log('\n=== Exercise 4: OpenAPI Spec Snippet ===');

  const spec = `
openapi: 3.0.3
info:
  title: Blog API
  version: 1.0.0
  description: Senior-level REST API demonstrating OpenAPI 3.0 spec

paths:
  /posts:
    get:
      summary: List posts
      operationId: listPosts
      tags: [posts]
      parameters:
        - name: cursor
          in: query
          schema: { type: string }
          description: Opaque pagination cursor from previous response
        - name: limit
          in: query
          schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
        - name: sort
          in: query
          schema: { type: string, example: "-createdAt,title" }
          description: Comma-separated fields, prefix - for descending
        - name: status
          in: query
          schema: { type: string, enum: [draft, published, archived] }
      responses:
        '200':
          description: Paginated list of posts
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items: { $ref: '#/components/schemas/Post' }
                  pagination:
                    $ref: '#/components/schemas/CursorPagination'
    post:
      summary: Create post
      operationId: createPost
      tags: [posts]
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreatePostInput' }
      responses:
        '201':
          description: Post created
          headers:
            Location:
              schema: { type: string }
              description: URL of the created post
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Post' }
        '422':
          $ref: '#/components/responses/ValidationError'

  /posts/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string, format: uuid }
    get:
      summary: Get post by ID
      operationId: getPost
      tags: [posts]
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Post' }
        '404':
          $ref: '#/components/responses/NotFound'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Post:
      type: object
      required: [id, title, status, authorId, createdAt]
      properties:
        id: { type: string, format: uuid }
        title: { type: string, maxLength: 200 }
        content: { type: string }
        status: { type: string, enum: [draft, published, archived] }
        authorId: { type: string, format: uuid }
        tags: { type: array, items: { type: string } }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    CreatePostInput:
      type: object
      required: [title, content]
      properties:
        title: { type: string, minLength: 1, maxLength: 200 }
        content: { type: string, minLength: 1 }
        tags: { type: array, items: { type: string } }
        status: { type: string, enum: [draft, published], default: draft }

    CursorPagination:
      type: object
      properties:
        hasMore: { type: boolean }
        nextCursor: { type: string, nullable: true }
        count: { type: integer }

  responses:
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              type: { type: string }
              title: { type: string }
              status: { type: integer, example: 404 }
    ValidationError:
      description: Validation failed (RFC 7807)
      content:
        application/json:
          schema:
            type: object
            properties:
              type: { type: string }
              title: { type: string }
              status: { type: integer, example: 422 }
              errors:
                type: array
                items:
                  type: object
                  properties:
                    field: { type: string }
                    message: { type: string }
`;

  console.log('OpenAPI 3.0 spec generated (lines):', spec.trim().split('\n').length);
  console.log('Spec preview (first 10 lines):');
  spec.trim().split('\n').slice(0, 10).forEach(l => console.log(' ', l));
}

exercise4_openAPISpec();


// ─────────────────────────────────────────────
// Exercise 5: Idempotency Key Middleware
// ─────────────────────────────────────────────

function exercise5_idempotencyMiddleware() {
  console.log('\n=== Exercise 5: Idempotency Key Middleware ===');

  // Simulated Redis store (in production, use ioredis)
  const idempotencyStore = new Map();

  async function idempotencyMiddleware(req, res, next) {
    // Only apply to mutating requests
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();

    const key = req.headers['idempotency-key'];
    if (!key) return next(); // Idempotency key is optional

    // Validate key format (must be UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(key)) {
      return res.status(400).json({ error: 'Invalid Idempotency-Key format, must be UUID v4' });
    }

    const storeKey = `${req.method}:${req.path}:${key}`;

    // Check for in-flight request (prevent concurrent duplicate requests)
    if (idempotencyStore.get(storeKey) === 'IN_FLIGHT') {
      return res.status(409).json({ error: 'Request with this idempotency key is already being processed' });
    }

    // Check for cached response
    const cached = idempotencyStore.get(storeKey);
    if (cached && cached !== 'IN_FLIGHT') {
      res.set('Idempotent-Replayed', 'true');
      return res.status(cached.status).json(cached.body);
    }

    // Mark as in-flight
    idempotencyStore.set(storeKey, 'IN_FLIGHT');

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      idempotencyStore.set(storeKey, {
        status: res.statusCode,
        body,
        createdAt: new Date().toISOString()
      });
      // In production: redis.setex(storeKey, 86400, JSON.stringify(...))
      return originalJson(body);
    };

    next();
  }

  // Simulate requests
  async function simulatePayment(idempotencyKey, attempt) {
    const req = {
      method: 'POST',
      path: '/payments',
      headers: { 'idempotency-key': idempotencyKey }
    };

    const responses = [];
    const res = {
      statusCode: 200,
      headers: {},
      set(k, v) { this.headers[k] = v; },
      status(code) { this.statusCode = code; return this; },
      json(body) {
        responses.push({ status: this.statusCode, body, replayed: this.headers['Idempotent-Replayed'] });
        return this;
      }
    };

    await idempotencyMiddleware(req, res, () => {
      // Simulate handler: process payment
      res.status(201).json({ transactionId: 'txn_abc123', amount: 100 });
    });

    console.log(`Attempt ${attempt} (key: ${idempotencyKey.slice(0, 8)}...): status=${responses[0]?.status}, replayed=${responses[0]?.replayed || 'false'}`);
  }

  const key = '550e8400-e29b-41d4-a716-446655440000';
  simulatePayment(key, 1); // CREATES payment
  simulatePayment(key, 2); // REPLAYS cached response — no double charge
  simulatePayment(key, 3); // REPLAYS cached response again
}

exercise5_idempotencyMiddleware();

/**
 * Day 28 — Database Design + Schema Patterns
 * Hands-on Exercises
 */

// ─────────────────────────────────────────────
// Exercise 1: E-commerce Schema Design
// ─────────────────────────────────────────────

/**
 * Design decisions for an e-commerce platform.
 * Show both SQL DDL and the rationale.
 */
function exercise1_ecommerceSchema() {
  console.log('=== Exercise 1: E-commerce Schema Design ===\n');

  const sqlSchema = `
-- ─── Users ───────────────────────────────────────────
-- Decision: Store billing/shipping addresses in a separate table
-- Rationale: users can have multiple addresses; embedding in users table
--   would require multiple columns (billing_addr, shipping_addr1, etc.)
--   or JSON — both are bad for querying

CREATE TABLE users (
    id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    email      VARCHAR(255) NOT NULL,
    name       VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,       -- soft delete: NULL = active
    UNIQUE KEY uq_email (email),
    KEY idx_deleted_at (deleted_at) -- for "WHERE deleted_at IS NULL" queries
);

CREATE TABLE addresses (
    id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED NOT NULL,
    type       ENUM('billing', 'shipping') NOT NULL,
    street     VARCHAR(255),
    city       VARCHAR(100),
    country    CHAR(2),
    is_default BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ─── Products ─────────────────────────────────────────
-- Decision: Separate products and product_variants
-- Rationale: A "T-shirt" is one product with variants (S/M/L, red/blue).
--   Inventory tracked at variant level, not product level.
--   Category tree: self-referencing for arbitrary depth.

CREATE TABLE categories (
    id        INT PRIMARY KEY AUTO_INCREMENT,
    name      VARCHAR(100) NOT NULL,
    parent_id INT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE products (
    id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    category_id  INT NOT NULL,
    name         VARCHAR(200) NOT NULL,
    description  TEXT,
    base_price   DECIMAL(10,2) NOT NULL,
    status       ENUM('active','draft','discontinued') DEFAULT 'draft',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE product_variants (
    id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    sku        VARCHAR(50) NOT NULL,
    attributes JSON NOT NULL,       -- {"color": "red", "size": "M"}
    price      DECIMAL(10,2),       -- NULL = use product.base_price
    stock      INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_sku (sku),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ─── Orders ────────────────────────────────────────────
-- Decision: Store a snapshot of the price at time of purchase
-- Rationale: product prices change; order history must reflect what was
--   actually charged. Do NOT reference live product price.
-- Decision: order_items.unit_price is NOT a FK to any price table.

CREATE TABLE orders (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    status          ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
    shipping_addr   JSON NOT NULL,              -- snapshot of address at purchase time
    subtotal        DECIMAL(10,2) NOT NULL,
    tax             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total           DECIMAL(10,2) NOT NULL,
    idempotency_key VARCHAR(36) NULL,           -- for payment retry safety
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_idempotency (idempotency_key),
    KEY idx_user_status (user_id, status),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id    BIGINT UNSIGNED NOT NULL,
    variant_id  BIGINT UNSIGNED NOT NULL,
    sku_snapshot VARCHAR(50) NOT NULL,          -- snapshot of SKU at purchase time
    name_snapshot VARCHAR(200) NOT NULL,        -- snapshot of product name
    unit_price  DECIMAL(10,2) NOT NULL,         -- price at time of purchase (snapshot)
    quantity    INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

-- ─── Reviews ───────────────────────────────────────────
-- Decision: users can only review products they've purchased (enforced in app)
-- Decision: one review per user per product (unique constraint)
CREATE TABLE reviews (
    id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    product_id  BIGINT UNSIGNED NOT NULL,
    user_id     BIGINT UNSIGNED NOT NULL,
    rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body        TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_product (user_id, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
  `;

  console.log('Key design decisions:');
  console.log('1. Users → Addresses: 1:N (users can have multiple addresses)');
  console.log('2. Products → Variants: 1:N (track inventory per variant)');
  console.log('3. Orders snapshot price: denormalized for historical accuracy');
  console.log('4. Idempotency key on orders: payment safety');
  console.log('5. Soft delete on users: deleted_at NULL = active');
  console.log('\nSQL DDL preview (first 400 chars):');
  console.log(sqlSchema.slice(0, 400) + '...');
}

exercise1_ecommerceSchema();


// ─────────────────────────────────────────────
// Exercise 2: Normalize to 3NF step by step
// ─────────────────────────────────────────────

function exercise2_normalizationSteps() {
  console.log('\n=== Exercise 2: 3NF Normalization ===\n');

  console.log('Starting: Denormalized orders table');
  console.log('─'.repeat(80));
  console.log('ORDERS_FLAT:');
  console.log('  order_id | order_date | customer_id | customer_name | customer_email |');
  console.log('  product_id | product_name | product_category | quantity | unit_price |');
  console.log('  category_manager_name');
  console.log('─'.repeat(80));

  console.log('\nStep 1: Apply 1NF');
  console.log('  Problem: Each row has one product. But what if an order has 3 products?');
  console.log('  Fix: We already have one product per row (atomic). But:');
  console.log('  - The composite key is (order_id, product_id)');
  console.log('  - This is a flat structure with no repeating groups. ✓ 1NF satisfied');

  console.log('\nStep 2: Apply 2NF — Remove partial dependencies');
  console.log('  Composite PK: (order_id, product_id)');
  console.log('  Partial dependencies (depend on only part of PK):');
  console.log('    - customer_name, customer_email → depend only on customer_id (NOT product_id)');
  console.log('    - product_name, product_category → depend only on product_id (NOT order_id)');
  console.log('    - order_date → depends only on order_id (NOT product_id)');
  console.log('  Fix: Split into:');
  console.log('    CUSTOMERS(customer_id PK, customer_name, customer_email)');
  console.log('    PRODUCTS(product_id PK, product_name, product_category)');
  console.log('    ORDERS(order_id PK, order_date, customer_id FK)');
  console.log('    ORDER_ITEMS(order_id FK, product_id FK, quantity, unit_price) ← composite PK');

  console.log('\nStep 3: Apply 3NF — Remove transitive dependencies');
  console.log('  Transitive dependency: non-key depends on another non-key');
  console.log('  In PRODUCTS: product_category → category_manager_name');
  console.log('    product_category is not a key, but category_manager_name depends on it');
  console.log('    This means: changing a category manager requires updating EVERY product row');
  console.log('  Fix: Extract categories:');
  console.log('    CATEGORIES(category_id PK, category_name, manager_name)');
  console.log('    PRODUCTS(product_id PK, product_name, category_id FK)');

  console.log('\nFinal 3NF Schema:');
  console.log('  CUSTOMERS(id, name, email)');
  console.log('  CATEGORIES(id, name, manager_name)');
  console.log('  PRODUCTS(id, name, category_id FK)');
  console.log('  ORDERS(id, date, customer_id FK)');
  console.log('  ORDER_ITEMS(order_id FK, product_id FK, quantity, unit_price)');
  console.log('\nBenefit: Update category manager in ONE place instead of thousands of product rows');
}

exercise2_normalizationSteps();


// ─────────────────────────────────────────────
// Exercise 3: MongoDB Blog Schema — Embed vs Reference
// ─────────────────────────────────────────────

function exercise3_mongoSchemas() {
  console.log('\n=== Exercise 3: MongoDB Embed vs Reference ===\n');

  const embeddedSchema = {
    description: 'Embedded comments — good for posts with few comments',
    advantages: ['Single read for post + comments', 'Atomic updates', 'No JOIN'],
    disadvantages: ['16MB document limit', 'Can\'t query comments independently', 'Update one comment = rewrite entire doc'],
    document: {
      _id: 'post-001',
      title: 'Understanding MongoDB Schema Design',
      content: '...',
      authorId: 'user-abc',
      tags: ['mongodb', 'schema'],
      createdAt: new Date('2024-01-15'),
      comments: [
        { _id: 'c1', userId: 'user-xyz', text: 'Great post!', createdAt: new Date() },
        { _id: 'c2', userId: 'user-def', text: 'Very helpful', createdAt: new Date() }
      ],
      commentCount: 2   // pre-computed for display; update with $inc
    }
  };

  const referencedSchema = {
    description: 'Referenced comments — good for posts with many comments',
    advantages: ['No size limit on comments', 'Comments queryable independently', 'Smaller post documents'],
    disadvantages: ['Two queries to get post + comments', '$lookup needed for joins'],
    postDocument: {
      _id: 'post-001',
      title: 'Understanding MongoDB Schema Design',
      content: '...',
      authorId: 'user-abc',
      tags: ['mongodb', 'schema'],
      createdAt: new Date('2024-01-15'),
      commentCount: 2   // pre-computed counter — avoids COUNT query
    },
    commentDocument: {
      _id: 'c1',
      postId: 'post-001',   // reference to parent
      userId: 'user-xyz',
      text: 'Great post!',
      createdAt: new Date()
    }
  };

  console.log('EMBEDDED APPROACH:');
  console.log('  Advantages:', embeddedSchema.advantages.join(', '));
  console.log('  Disadvantages:', embeddedSchema.disadvantages.join(', '));
  console.log('  Post doc:', JSON.stringify(embeddedSchema.document, null, 2).slice(0, 300));

  console.log('\nREFERENCED APPROACH:');
  console.log('  Advantages:', referencedSchema.advantages.join(', '));
  console.log('  Disadvantages:', referencedSchema.disadvantages.join(', '));
  console.log('  Post doc:', JSON.stringify(referencedSchema.postDocument, null, 2));

  console.log('\nDECISION RULE:');
  console.log('  Embed if: accessed together, < ~100 child docs, child has no independent existence');
  console.log('  Reference if: large/unbounded array, child queried independently, shared between parents');
}

exercise3_mongoSchemas();


// ─────────────────────────────────────────────
// Exercise 4: Soft Delete + Audit Log in Express/Mongoose
// ─────────────────────────────────────────────

function exercise4_softDeleteAuditLog() {
  console.log('\n=== Exercise 4: Soft Delete + Audit Log Pattern ===\n');

  // Mongoose schema with soft delete plugin
  const mongoosePattern = `
  // models/User.js
  const mongoose = require('mongoose');

  const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: String,
    createdAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },   // null = active
  });

  // Global filter: exclude soft-deleted documents by default
  userSchema.pre(/^find/, function() {
    if (!this.getOptions().includeDeleted) {
      this.where({ deletedAt: null });
    }
  });

  // Soft delete method
  userSchema.methods.softDelete = async function(deletedBy) {
    this.deletedAt = new Date();
    await this.save();

    // Create audit log entry
    await AuditLog.create({
      entityType: 'User',
      entityId: this._id,
      action: 'deleted',
      performedBy: deletedBy,
      before: { email: this.email, name: this.name, deletedAt: null },
      after:  { deletedAt: this.deletedAt }
    });
  };

  // Restore method
  userSchema.methods.restore = async function(restoredBy) {
    const was = this.deletedAt;
    this.deletedAt = null;
    await this.save();
    await AuditLog.create({
      entityType: 'User', entityId: this._id, action: 'restored',
      performedBy: restoredBy,
      before: { deletedAt: was }, after: { deletedAt: null }
    });
  };

  // AuditLog schema
  const auditLogSchema = new mongoose.Schema({
    entityType: { type: String, required: true },   // 'User', 'Order', etc.
    entityId:   { type: mongoose.Schema.Types.Mixed, required: true },
    action:     { type: String, enum: ['created', 'updated', 'deleted', 'restored'] },
    performedBy: mongoose.Schema.Types.ObjectId,    // user who made the change
    before:     mongoose.Schema.Types.Mixed,        // before snapshot
    after:      mongoose.Schema.Types.Mixed,        // after snapshot
    ipAddress:  String,
    createdAt:  { type: Date, default: Date.now }
  }, { capped: { size: 100 * 1024 * 1024 } }); // 100MB capped collection
  `;

  console.log('Soft Delete + Audit Log implementation:');
  console.log(mongoosePattern.trim().slice(0, 600) + '...');

  // Demonstrate the soft delete pattern in pure JS
  class SoftDeletableModel {
    constructor(data) { Object.assign(this, data); this.deletedAt = null; }
    softDelete(by) {
      this.deletedAt = new Date();
      console.log(`  [AUDIT] ${this.name} deleted by ${by} at ${this.deletedAt.toISOString()}`);
    }
    restore(by) {
      const was = this.deletedAt;
      this.deletedAt = null;
      console.log(`  [AUDIT] ${this.name} restored by ${by} (was deleted at ${was?.toISOString()})`);
    }
    get isActive() { return this.deletedAt === null; }
  }

  const user = new SoftDeletableModel({ id: 1, name: 'Alice', email: 'alice@example.com' });
  console.log('\nDemo:');
  console.log('Active:', user.isActive);  // true
  user.softDelete('admin-bob');
  console.log('Active after delete:', user.isActive);  // false
  user.restore('admin-carol');
  console.log('Active after restore:', user.isActive); // true
}

exercise4_softDeleteAuditLog();


// ─────────────────────────────────────────────
// Exercise 5: Zero-downtime Schema Migration Script
// ─────────────────────────────────────────────

function exercise5_schemaMigration() {
  console.log('\n=== Exercise 5: Zero-Downtime Schema Migration ===\n');

  console.log('Scenario: Add index to users.email on a table with 10M rows');
  console.log('Bad approach: ALTER TABLE users ADD INDEX (email)');
  console.log('  → Locks the table for 30-60 minutes');
  console.log('  → All writes blocked → 500 errors for users\n');

  const migrationSteps = `
  // Step 1: Create index with ALGORITHM=INPLACE, LOCK=NONE (MySQL 8 online DDL)
  // This builds the index without blocking reads or writes.
  // It takes longer but the table stays fully available.
  // Rollback: just DROP INDEX if needed

  // migration: 001_add_email_index.js
  module.exports = {
    up: async (queryInterface) => {
      // ALGORITHM=INPLACE: build index without full table copy
      // LOCK=NONE: allow concurrent DML (reads and writes) during index build
      await queryInterface.sequelize.query(
        'ALTER TABLE users ADD INDEX idx_email (email) ALGORITHM=INPLACE, LOCK=NONE'
      );
    },
    down: async (queryInterface) => {
      await queryInterface.sequelize.query('DROP INDEX idx_email ON users');
    }
  };

  // ─── Scenario 2: Rename a column (breaking change) ───────────────────
  // Cannot just ALTER TABLE RENAME COLUMN — old code still reads 'phone_number',
  // new code wants 'phone'. Zero-downtime requires 4 migrations:

  // Migration 1 (expand): add new column alongside old
  ALTER TABLE users ADD COLUMN phone VARCHAR(20);

  // Migration 2 (backfill): copy data from old to new column
  // Run in batches to avoid long-running transaction:
  UPDATE users SET phone = phone_number WHERE phone IS NULL LIMIT 1000;
  // Repeat until all rows backfilled

  // Code change: dual-read (read 'phone' first, fall back to 'phone_number')
  // Deploy code that WRITES to both columns

  // Migration 3 (switch): deploy code that only reads/writes 'phone'

  // Migration 4 (contract): drop old column
  ALTER TABLE users DROP COLUMN phone_number;
  `;

  console.log('Zero-downtime strategy:');
  console.log(migrationSteps.trim().slice(0, 600) + '...');

  console.log('\nKey principles:');
  console.log('1. Add index → use ALGORITHM=INPLACE, LOCK=NONE (online DDL)');
  console.log('2. Add column → safe (existing code ignores new column)');
  console.log('3. Rename/remove column → expand-contract pattern (4 steps)');
  console.log('4. Always test migration time on production-size data in staging first');
  console.log('5. Have a rollback plan for every migration');
}

exercise5_schemaMigration();

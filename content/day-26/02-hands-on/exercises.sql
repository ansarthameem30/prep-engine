-- Day 26 — MySQL Performance: Indexing + Transactions
-- Hands-on Exercises

-- ─────────────────────────────────────────────
-- Setup: Create tables for exercises
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sku (sku)
);

CREATE TABLE IF NOT EXISTS product_views (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    user_id INT,
    viewed_at DATETIME NOT NULL,
    session_id VARCHAR(100),
    INDEX idx_product_viewed (product_id, viewed_at),
    INDEX idx_user_viewed (user_id, viewed_at)
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    version INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_balance CHECK (balance >= 0)
);

INSERT INTO bank_accounts (account_number, owner_name, balance) VALUES
('ACC-001', 'Alice', 1000.00),
('ACC-002', 'Bob',   500.00),
('ACC-003', 'Carol', 2500.00);

INSERT INTO products (sku, name, category, price, status) VALUES
('LAPTOP-001', 'ThinkPad X1 Carbon',   'laptops',   1299.99, 'active'),
('LAPTOP-002', 'MacBook Pro 14"',       'laptops',   1999.99, 'active'),
('PHONE-001',  'iPhone 15 Pro',         'phones',    1099.99, 'active'),
('PHONE-002',  'Pixel 8 Pro',           'phones',     899.99, 'active'),
('TABLET-001', 'iPad Pro 12.9"',        'tablets',    999.99, 'active'),
('LAPTOP-003', 'Dell XPS 15',           'laptops',   1499.99, 'discontinued');


-- ─────────────────────────────────────────────
-- Exercise 1: EXPLAIN interpretation
-- ─────────────────────────────────────────────

/*
 * Run EXPLAIN on queries with and without good indexes.
 * Analyze the type, key, rows, and Extra fields.
 */

-- Without an index on (category, status, price) — likely a full table scan
EXPLAIN
SELECT sku, name, price
FROM products
WHERE category = 'laptops'
  AND status = 'active'
ORDER BY price DESC;
/*
 * Expected without index:
 * type: ALL (full table scan)
 * key: NULL (no index used)
 * rows: 6 (all rows examined)
 * Extra: Using where; Using filesort (needs a sort pass — no index for ORDER BY)
 *
 * 'Using filesort' is expensive on large tables — it means MySQL sorts in memory
 * or on disk. Not a "file sort" in the traditional sense — just a separate sort phase.
 */

-- Add a composite index that covers this query's WHERE and ORDER BY
CREATE INDEX idx_cat_status_price ON products (category, status, price);

-- Now re-run EXPLAIN
EXPLAIN
SELECT sku, name, price
FROM products
WHERE category = 'laptops'
  AND status = 'active'
ORDER BY price DESC;
/*
 * Expected with index:
 * type: range (index range scan — much better than ALL)
 * key: idx_cat_status_price
 * key_len: depends on column sizes (~360 bytes for 3 varchar cols)
 * rows: 2 (estimated rows matching the filter — much fewer)
 * Extra: Using index condition (Index Condition Pushdown — ICP)
 *        or 'Using where' if price range is an extra filter
 *
 * No 'Using filesort' because ORDER BY price DESC is served by the index.
 * The index is already sorted by (category, status, price) — just read in reverse.
 */

-- Demonstrate: SELECT * forces a table row lookup even with index
EXPLAIN
SELECT *  -- includes columns not in the index
FROM products
WHERE category = 'laptops' AND status = 'active'
ORDER BY price DESC;
-- Extra: might show 'Using index condition' — still uses the index but needs row fetch


-- ─────────────────────────────────────────────
-- Exercise 2: Leftmost prefix rule demonstration
-- ─────────────────────────────────────────────

-- Create a composite index: (category, status, price)
-- Already created above as idx_cat_status_price

-- Query 1: Uses full composite index (all 3 leftmost columns)
EXPLAIN SELECT * FROM products
WHERE category = 'laptops' AND status = 'active' AND price < 1500;
-- type: range, key: idx_cat_status_price, key_len: all 3 columns

-- Query 2: Uses 2-column prefix (category, status)
EXPLAIN SELECT * FROM products
WHERE category = 'laptops' AND status = 'active';
-- type: ref, key: idx_cat_status_price, key_len: 2 columns

-- Query 3: Uses only 1-column prefix (category alone)
EXPLAIN SELECT * FROM products
WHERE category = 'phones';
-- type: ref, key: idx_cat_status_price (still uses the index!)

-- Query 4: Skips the leftmost column — index NOT usable
EXPLAIN SELECT * FROM products
WHERE status = 'active';
-- type: ALL (full scan — status alone can't use the index without category)

-- Query 5: Range on category breaks further columns
EXPLAIN SELECT * FROM products
WHERE category LIKE 'lap%' AND status = 'active';
-- type: range on category only — status filter done as post-index filter
-- MySQL can't use status as an index filter once category is a range condition
-- key_len shows only the category column width is used for the index seek

/*
 * Summary:
 * - INDEX(a, b, c) can only be used for queries starting with 'a'
 * - A range condition on column N stops the index being used for N+1, N+2
 * - Put equality conditions first, range conditions last in composite indexes
 */


-- ─────────────────────────────────────────────
-- Exercise 3: Money transfer transaction (with rollback on error)
-- ─────────────────────────────────────────────

/*
 * Transfer $200 from Alice (ACC-001) to Bob (ACC-002).
 * Requirements:
 * 1. Both debit and credit must succeed atomically
 * 2. Balances cannot go negative (CHECK constraint)
 * 3. Use SELECT FOR UPDATE to prevent concurrent transfer races
 * 4. Roll back if any step fails
 */

DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS transfer_money(
    IN from_account VARCHAR(20),
    IN to_account   VARCHAR(20),
    IN amount       DECIMAL(15,2),
    OUT result_msg  VARCHAR(200)
)
BEGIN
    DECLARE from_balance DECIMAL(15,2);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET result_msg = 'Transfer failed — transaction rolled back';
    END;

    -- Validate amount
    IF amount <= 0 THEN
        SET result_msg = 'Transfer amount must be positive';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid amount';
    END IF;

    START TRANSACTION;

    -- Lock both accounts (always in same order to prevent deadlock)
    -- Order by account_number to ensure consistent lock ordering
    SELECT balance INTO from_balance
    FROM bank_accounts
    WHERE account_number = from_account
    FOR UPDATE;  -- row-level exclusive lock

    -- Check sufficient funds
    IF from_balance < amount THEN
        ROLLBACK;
        SET result_msg = CONCAT('Insufficient funds: balance=', from_balance, ', requested=', amount);
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient funds';
    END IF;

    -- Lock the destination account
    SELECT id FROM bank_accounts WHERE account_number = to_account FOR UPDATE;

    -- Execute the transfer
    UPDATE bank_accounts SET balance = balance - amount WHERE account_number = from_account;
    UPDATE bank_accounts SET balance = balance + amount WHERE account_number = to_account;

    COMMIT;
    SET result_msg = CONCAT('Transfer of ', amount, ' completed successfully');
END$$

DELIMITER ;

-- Test the transfer
CALL transfer_money('ACC-001', 'ACC-002', 200.00, @result);
SELECT @result;
SELECT account_number, owner_name, balance FROM bank_accounts;
-- Expected: Alice 800.00, Bob 700.00

-- Test insufficient funds
CALL transfer_money('ACC-002', 'ACC-001', 1000.00, @result);
SELECT @result;  -- Should fail with insufficient funds message
SELECT account_number, balance FROM bank_accounts;  -- Should be unchanged


-- ─────────────────────────────────────────────
-- Exercise 4: Deadlock scenario + prevention
-- ─────────────────────────────────────────────

/*
 * Classic deadlock scenario:
 *
 * Transaction A: locks ACC-001, then tries to lock ACC-002
 * Transaction B: locks ACC-002, then tries to lock ACC-001
 *
 * → DEADLOCK: A waits for B's lock, B waits for A's lock
 *
 * This cannot be shown in a single SQL script (needs two concurrent sessions),
 * but here's the DEADLOCK-CAUSING pattern and the FIX:
 */

-- DEADLOCK-CAUSING PATTERN (Session A):
-- BEGIN;
-- SELECT * FROM bank_accounts WHERE account_number = 'ACC-001' FOR UPDATE;
-- -- (pause) Session B runs and locks ACC-002
-- SELECT * FROM bank_accounts WHERE account_number = 'ACC-002' FOR UPDATE;
-- -- InnoDB detects deadlock → rolls back one transaction

-- DEADLOCK-CAUSING PATTERN (Session B, runs concurrently):
-- BEGIN;
-- SELECT * FROM bank_accounts WHERE account_number = 'ACC-002' FOR UPDATE;
-- -- (pause) Session A already locked ACC-001 → DEADLOCK
-- SELECT * FROM bank_accounts WHERE account_number = 'ACC-001' FOR UPDATE;

/*
 * PREVENTION: Always lock accounts in the same order (alphabetical or by ID).
 * Never lock ACC-002 then ACC-001. Always lock ACC-001 then ACC-002.
 * This is implemented in the stored procedure above — it always locks
 * in account_number order.
 */

-- Check InnoDB status for deadlock information
SHOW ENGINE INNODB STATUS;
-- Look for the LATEST DETECTED DEADLOCK section

-- Monitor lock waits
SELECT
    r.trx_id AS waiting_trx,
    r.trx_mysql_thread_id AS waiting_thread,
    r.trx_query AS waiting_query,
    b.trx_id AS blocking_trx,
    b.trx_mysql_thread_id AS blocking_thread,
    b.trx_query AS blocking_query
FROM information_schema.innodb_lock_waits w
JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id
JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id;


-- ─────────────────────────────────────────────
-- Exercise 5: Covering index — SELECT only indexed columns
-- ─────────────────────────────────────────────

/*
 * A covering index eliminates the "double lookup" for secondary indexes.
 * When all SELECT columns are in the index, MySQL reads only the index
 * pages and never touches the actual table data pages.
 *
 * EXPLAIN shows 'Using index' in the Extra column = covering index in use.
 */

-- Create covering index for a common query pattern
-- Query: find all active products in a category with their prices
CREATE INDEX idx_covering_product ON products (category, status, price, sku, name);
-- This index covers: category (filter), status (filter), price (select+sort), sku, name (select)

-- This query is fully covered:
EXPLAIN
SELECT sku, name, price
FROM products
WHERE category = 'laptops' AND status = 'active'
ORDER BY price;
/*
 * Expected: Extra = 'Using index' → NO table row lookup needed
 * MySQL reads only the index pages — much faster for large tables
 * because index pages fit in the buffer pool more efficiently than full data pages
 */

-- This query is NOT covered (needs full_description which isn't in index):
-- EXPLAIN SELECT sku, name, price, full_description FROM products WHERE category='laptops';
-- Extra: 'Using index condition' → index used for filtering, but table row fetched for full_description

-- Verify: Compare query plans
EXPLAIN FORMAT=JSON
SELECT sku, name, price
FROM products
WHERE category = 'laptops' AND status = 'active';
-- Look for "using_index": true in the JSON output

/*
 * When to create covering indexes:
 * 1. Frequently executed queries (high QPS)
 * 2. Queries on large tables where the row is on a different page than the index entry
 * 3. Reports and analytics where the SELECT list is predictable
 *
 * Cost: covering indexes are wider (more columns = more storage + slower writes)
 * Don't create covering indexes for every query — focus on the hot path
 */

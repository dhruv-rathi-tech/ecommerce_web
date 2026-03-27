-- ============================================================
-- E-COMMERCE DATABASE SETUP
-- Run this file in MySQL Workbench or TablePlus to set up DB
-- ============================================================

CREATE DATABASE IF NOT EXISTS ecommerce;
USE ecommerce;

-- ── USERS ──────────────────────────────────────────────────
CREATE TABLE users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(100) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         ENUM('customer', 'admin') DEFAULT 'customer',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── CATEGORIES ─────────────────────────────────────────────
-- parent_id is NULL for top-level categories
-- parent_id points to another category for subcategories
-- Example: Electronics (parent) → Mobiles (child)
CREATE TABLE categories (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  parent_id    INT DEFAULT NULL,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ── PRODUCTS ───────────────────────────────────────────────
CREATE TABLE products (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2) NOT NULL,
  stock        INT NOT NULL DEFAULT 0,
  image_url    VARCHAR(500),
  category_id  INT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ── CART ───────────────────────────────────────────────────
CREATE TABLE cart (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  product_id   INT NOT NULL,
  quantity     INT NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ── ORDERS ─────────────────────────────────────────────────
CREATE TABLE orders (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  total           DECIMAL(10,2) NOT NULL,
  status          ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
  payment_status  ENUM('unpaid','paid','refunded') DEFAULT 'unpaid',
  razorpay_order_id   VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── ORDER ITEMS ────────────────────────────────────────────
CREATE TABLE order_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT NOT NULL,
  product_id  INT NOT NULL,
  quantity    INT NOT NULL,
  price       DECIMAL(10,2) NOT NULL,  -- price at time of purchase
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ── SAMPLE DATA ────────────────────────────────────────────
-- Categories
INSERT INTO categories (name, parent_id) VALUES
  ('Electronics', NULL),
  ('Fashion', NULL),
  ('Mobiles', 1),        -- subcategory of Electronics
  ('Laptops', 1),        -- subcategory of Electronics
  ('Men''s Clothing', 2), -- subcategory of Fashion
  ('Women''s Clothing', 2);

-- Products
INSERT INTO products (name, description, price, stock, category_id) VALUES
  ('iPhone 14', 'Apple smartphone 128GB', 79999.00, 50, 3),
  ('Samsung Galaxy S23', 'Android flagship phone', 69999.00, 40, 3),
  ('Dell Inspiron 15', 'Core i5 laptop 8GB RAM', 55000.00, 20, 4),
  ('Men''s T-Shirt', 'Cotton round neck', 499.00, 100, 5),
  ('Women''s Kurti', 'Floral print cotton', 799.00, 80, 6);

-- Admin user (password: password)
INSERT INTO users (name, email, password, role) VALUES
  ('Admin', 'admin@shop.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
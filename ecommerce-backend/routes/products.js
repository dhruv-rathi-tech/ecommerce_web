// routes/products.js — Product Management
// Anyone can VIEW products
// Only ADMINS can create, update, or delete

const express = require('express');
const db      = require('../db');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

const router = express.Router();


// ── GET ALL PRODUCTS ───────────────────────────────────────
// GET /products
// Optional query params: ?search=phone  ?category=3
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;

    let query = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by search keyword
    if (search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Filter by category ID
    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }

    query += ' ORDER BY p.created_at DESC';

    const [products] = await db.query(query, params);
    res.json(products);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── GET SINGLE PRODUCT ─────────────────────────────────────
// GET /products/:id
router.get('/:id', async (req, res) => {
  try {
    const [products] = await db.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json(products[0]);

  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── ADD PRODUCT (admin only) ───────────────────────────────
// POST /products
// Body: { name, description, price, stock, image_url, category_id }
router.post('/', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { name, description, price, stock, image_url, category_id } = req.body;

    if (!name || !price || stock === undefined) {
      return res.status(400).json({ error: 'Name, price, and stock are required.' });
    }

    const [result] = await db.query(
      `INSERT INTO products (name, description, price, stock, image_url, category_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, price, stock, image_url, category_id]
    );

    res.status(201).json({
      message: 'Product added!',
      productId: result.insertId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── UPDATE PRODUCT (admin only) ────────────────────────────
// PUT /products/:id
// Body: any fields you want to update
router.put('/:id', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { name, description, price, stock, image_url, category_id } = req.body;

    await db.query(
      `UPDATE products
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           price = COALESCE(?, price),
           stock = COALESCE(?, stock),
           image_url = COALESCE(?, image_url),
           category_id = COALESCE(?, category_id)
       WHERE id = ?`,
      [name, description, price, stock, image_url, category_id, req.params.id]
    );

    res.json({ message: 'Product updated!' });

  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── DELETE PRODUCT (admin only) ────────────────────────────
// DELETE /products/:id
router.delete('/:id', isLoggedIn, isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


module.exports = router;
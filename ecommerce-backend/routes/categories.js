// routes/categories.js — Categories & Subcategories
// Only admins can create/delete categories
// Anyone can view categories

const express = require('express');
const db      = require('../db');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

const router = express.Router();


// ── GET ALL CATEGORIES (with subcategories nested inside) ──
// GET /categories
// Returns a tree like: Electronics → [Mobiles, Laptops]
router.get('/', async (req, res) => {
  try {
    const [all] = await db.query('SELECT * FROM categories');

    // Separate parent categories and subcategories
    const parents = all.filter(c => c.parent_id === null);
    const children = all.filter(c => c.parent_id !== null);

    // Attach subcategories to their parent
    const result = parents.map(parent => ({
      ...parent,
      subcategories: children.filter(c => c.parent_id === parent.id)
    }));

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── GET PRODUCTS IN A CATEGORY ─────────────────────────────
// GET /categories/:id/products
router.get('/:id/products', async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Get the category first
    const [cats] = await db.query(
      'SELECT * FROM categories WHERE id = ?', [categoryId]
    );
    if (cats.length === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    // If this is a parent category, also include products from subcategories
    const [subcats] = await db.query(
      'SELECT id FROM categories WHERE parent_id = ?', [categoryId]
    );

    const allCategoryIds = [categoryId, ...subcats.map(s => s.id)];

    // Get all products in these category IDs
    const placeholders = allCategoryIds.map(() => '?').join(',');
    const [products] = await db.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.category_id IN (${placeholders})`,
      allCategoryIds
    );

    res.json({ category: cats[0], products });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── CREATE CATEGORY (admin only) ───────────────────────────
// POST /categories
// Body: { name, parent_id }  ← parent_id is optional
router.post('/', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    // If parent_id is given, make sure that parent exists
    if (parent_id) {
      const [parent] = await db.query(
        'SELECT id FROM categories WHERE id = ?', [parent_id]
      );
      if (parent.length === 0) {
        return res.status(400).json({ error: 'Parent category not found.' });
      }
    }

    const [result] = await db.query(
      'INSERT INTO categories (name, parent_id) VALUES (?, ?)',
      [name, parent_id || null]
    );

    res.status(201).json({
      message: 'Category created!',
      categoryId: result.insertId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── DELETE CATEGORY (admin only) ───────────────────────────
// DELETE /categories/:id
router.delete('/:id', isLoggedIn, isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


module.exports = router;
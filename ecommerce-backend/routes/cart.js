// routes/cart.js — Cart Management
// All cart actions require being logged in

const express = require('express');
const db      = require('../db');
const { isLoggedIn } = require('../middleware/auth');

const router = express.Router();


// ── VIEW CART ──────────────────────────────────────────────
// GET /cart
router.get('/', isLoggedIn, async (req, res) => {
  try {
    const [items] = await db.query(
      `SELECT
         cart.id AS cart_item_id,
         cart.quantity,
         products.id AS product_id,
         products.name,
         products.price,
         products.image_url,
         products.stock,
         (cart.quantity * products.price) AS subtotal
       FROM cart
       JOIN products ON cart.product_id = products.id
       WHERE cart.user_id = ?`,
      [req.user.userId]
    );

    // Calculate total
    const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

    res.json({ items, total: total.toFixed(2) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── ADD TO CART ────────────────────────────────────────────
// POST /cart/add
// Body: { product_id, quantity }
router.post('/add', isLoggedIn, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const userId = req.user.userId;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    // Check if product exists and has enough stock
    const [products] = await db.query(
      'SELECT * FROM products WHERE id = ?', [product_id]
    );
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    if (products[0].stock < quantity) {
      return res.status(400).json({ error: 'Not enough stock available.' });
    }

    // Check if this product is already in user's cart
    const [existing] = await db.query(
      'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    if (existing.length > 0) {
      // Update quantity if already in cart
      await db.query(
        'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
        [quantity, userId, product_id]
      );
    } else {
      // Add new cart item
      await db.query(
        'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, product_id, quantity]
      );
    }

    res.json({ message: 'Added to cart!' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── UPDATE QUANTITY ────────────────────────────────────────
// PUT /cart/update
// Body: { cart_item_id, quantity }
router.put('/update', isLoggedIn, async (req, res) => {
  try {
    const { cart_item_id, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1.' });
    }

    await db.query(
      'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
      [quantity, cart_item_id, req.user.userId]
    );

    res.json({ message: 'Cart updated!' });

  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── REMOVE ITEM FROM CART ──────────────────────────────────
// DELETE /cart/remove/:cart_item_id
router.delete('/remove/:cart_item_id', isLoggedIn, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM cart WHERE id = ? AND user_id = ?',
      [req.params.cart_item_id, req.user.userId]
    );

    res.json({ message: 'Item removed from cart.' });

  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── CLEAR ENTIRE CART ──────────────────────────────────────
// DELETE /cart/clear
router.delete('/clear', isLoggedIn, async (req, res) => {
  try {
    await db.query('DELETE FROM cart WHERE user_id = ?', [req.user.userId]);
    res.json({ message: 'Cart cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


module.exports = router;
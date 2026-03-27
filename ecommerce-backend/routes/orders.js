// routes/orders.js — Order Management
// Supports: checkout from cart, buy now (single product)
// Stock is only reduced AFTER payment is verified

const express   = require('express');
const db        = require('../db');
const Razorpay  = require('razorpay');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

const router = express.Router();

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


// ── CHECKOUT FROM CART ─────────────────────────────────────
// POST /orders/checkout
// Creates an order from all items in the user's cart
router.post('/checkout', isLoggedIn, async (req, res) => {
  const userId = req.user.userId;

  try {
    // 1. Get cart items
    const [cartItems] = await db.query(
      `SELECT cart.quantity, products.id AS product_id,
              products.name, products.price, products.stock
       FROM cart
       JOIN products ON cart.product_id = products.id
       WHERE cart.user_id = ?`,
      [userId]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    // 2. Check stock for all items before placing order
    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        return res.status(400).json({
          error: `"${item.name}" only has ${item.stock} items in stock.`
        });
      }
    }

    // 3. Calculate total
    const total = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );

    // 4. Create the order with pending status (payment not done yet)
    const [orderResult] = await db.query(
      'INSERT INTO orders (user_id, total, status, payment_status) VALUES (?, ?, ?, ?)',
      [userId, total, 'pending', 'unpaid']
    );
    const orderId = orderResult.insertId;

    // 5. Save each product as an order item (no stock reduction yet)
    for (const item of cartItems) {
      await db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );
    }

    // 6. Clear the cart
    await db.query('DELETE FROM cart WHERE user_id = ?', [userId]);

    res.status(201).json({
      message:  'Order placed! Proceed to payment.',
      orderId,
      total:    total.toFixed(2)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── BUY NOW (single product, skip cart) ───────────────────
// POST /orders/buy-now
// Body: { product_id, quantity }
router.post('/buy-now', isLoggedIn, async (req, res) => {
  const userId = req.user.userId;
  const { product_id, quantity = 1 } = req.body;

  try {
    // 1. Check product exists
    const [products] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const product = products[0];

    // 2. Check stock
    if (product.stock < quantity) {
      return res.status(400).json({
        error: `Only ${product.stock} items in stock.`
      });
    }

    const total = product.price * quantity;

    // 3. Create order with pending status (payment not done yet)
    const [orderResult] = await db.query(
      'INSERT INTO orders (user_id, total, status, payment_status) VALUES (?, ?, ?, ?)',
      [userId, total, 'pending', 'unpaid']
    );
    const orderId = orderResult.insertId;

    // 4. Save order item (no stock reduction yet)
    await db.query(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
      [orderId, product_id, quantity, product.price]
    );

    res.status(201).json({
      message:  'Order created! Proceed to payment.',
      orderId,
      total:    total.toFixed(2)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── CANCEL ORDER ───────────────────────────────────────────
// POST /orders/:id/cancel
// User can cancel within 24 hours of placing the order
// Stock is restored and refund is initiated if already paid
router.post('/:id/cancel', isLoggedIn, async (req, res) => {
  const userId  = req.user.userId;
  const orderId = req.params.id;

  try {
    // 1. Fetch the order
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orders[0];

    // 2. Check if already cancelled or delivered/shipped
    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Order is already cancelled.' });
    }
    if (order.status === 'delivered') {
      return res.status(400).json({ error: 'Delivered orders cannot be cancelled.' });
    }
    if (order.status === 'shipped') {
      return res.status(400).json({ error: 'Order has already been shipped and cannot be cancelled.' });
    }

    // 3. Check 24-hour cancellation window
    const orderTime   = new Date(order.created_at).getTime();
    const hoursPassed = (Date.now() - orderTime) / (1000 * 60 * 60);

    if (hoursPassed > 24) {
      return res.status(400).json({
        error: 'Cancellation window has passed. Orders can only be cancelled within 24 hours.'
      });
    }

    // 4. If paid, initiate Razorpay refund
    let refundMessage = '';
    if (order.payment_status === 'paid' && order.razorpay_payment_id) {
      try {
        await razorpay.payments.refund(order.razorpay_payment_id, {
          amount: Math.round(order.total * 100), // amount in paise
        });
        refundMessage = ' Refund has been initiated and will reflect in 5-7 business days.';
      } catch (refundErr) {
        console.error('Refund failed:', refundErr);
        return res.status(500).json({
          error: 'Could not process refund. Please contact support.'
        });
      }
    }

    // 5. Restore stock (only if payment was made, meaning stock was already reduced)
    if (order.payment_status === 'paid') {
      const [items] = await db.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [orderId]
      );

      for (const item of items) {
        await db.query(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
    }

    // 6. Mark order as cancelled
    await db.query(
      `UPDATE orders SET status = 'cancelled', payment_status = ? WHERE id = ?`,
      [order.payment_status === 'paid' ? 'refund_initiated' : 'unpaid', orderId]
    );

    res.json({ message: `Order cancelled successfully.${refundMessage}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── GET MY ORDERS ──────────────────────────────────────────
// GET /orders/my
// Only returns PAID orders (unpaid orders are handled at checkout)
router.get('/my', isLoggedIn, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*,
         JSON_ARRAYAGG(
           JSON_OBJECT(
             'product_id', oi.product_id,
             'name',       p.name,
             'quantity',   oi.quantity,
             'price',      oi.price
           )
         ) AS items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p     ON oi.product_id = p.id
       WHERE o.user_id = ?
         AND o.payment_status != 'unpaid'
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.userId]
    );

    res.json(orders);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── GET SINGLE ORDER ───────────────────────────────────────
// GET /orders/:id
router.get('/:id', isLoggedIn, async (req, res) => {
  try {
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const [items] = await db.query(
      `SELECT oi.*, p.name, p.image_url
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );

    res.json({ order: orders[0], items });

  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── UPDATE ORDER STATUS (admin only) ──────────────────────
// PUT /orders/:id/status
// Body: { status }
router.put('/:id/status', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    res.json({ message: `Order status updated to "${status}".` });

  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


// ── ALL ORDERS (admin only) ────────────────────────────────
// GET /orders/admin/all
router.get('/admin/all', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, u.name AS customer_name, u.email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


module.exports = router;
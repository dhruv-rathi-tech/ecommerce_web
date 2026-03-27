// routes/payments.js — Razorpay Payment Integration
//
// HOW PAYMENTS WORK (2 steps):
// Step 1: /payments/create → creates a Razorpay order, returns payment details
// Step 2: /payments/verify → after user pays, verify it succeeded + reduce stock

const express = require('express');
const crypto  = require('crypto'); // built into Node, no install needed
const db      = require('../db');
const { isLoggedIn } = require('../middleware/auth');

const router = express.Router();

// Set up Razorpay (make sure you have razorpay installed: npm install razorpay)
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


// ── STEP 1: CREATE PAYMENT ─────────────────────────────────
// POST /payments/create
// Body: { order_id }   ← the order you placed via /orders/checkout or /orders/buy-now
//
// This creates a Razorpay payment session.
// Send the response back to your frontend to open the Razorpay payment popup.
router.post('/create', isLoggedIn, async (req, res) => {
  try {
    const { order_id } = req.body;

    // Make sure the order belongs to this user
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [order_id, req.user.userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orders[0];

    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'This order is already paid.' });
    }

    // Create a Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount:   Math.round(order.total * 100), // Razorpay uses paise (1 INR = 100 paise)
      currency: 'INR',
      receipt:  `order_${order_id}`,
    });

    // Save the Razorpay order ID in our DB
    await db.query(
      'UPDATE orders SET razorpay_order_id = ? WHERE id = ?',
      [razorpayOrder.id, order_id]
    );

    // Send this back to the frontend
    res.json({
      razorpay_order_id: razorpayOrder.id,
      amount:            razorpayOrder.amount,
      currency:          razorpayOrder.currency,
      key_id:            process.env.RAZORPAY_KEY_ID,
      order_id:          order_id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create payment.' });
  }
});


// ── STEP 2: VERIFY PAYMENT ─────────────────────────────────
// POST /payments/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id }
//
// After user pays, Razorpay sends these 3 values back to your frontend.
// Your frontend then sends them here to confirm the payment is real.
router.post('/verify', isLoggedIn, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id
    } = req.body;

    // ── IMPORTANT: Signature Verification ─────────────────
    // This confirms that the payment came from Razorpay
    // and was not faked by someone
    const body              = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Possible fraud.' });
    }

    // ── Payment is real! Update order status ──────────────
    await db.query(
      `UPDATE orders
       SET payment_status      = 'paid',
           status              = 'confirmed',
           razorpay_payment_id = ?
       WHERE id = ? AND user_id = ?`,
      [razorpay_payment_id, order_id, req.user.userId]
    );

    // ── NOW reduce stock (only after confirmed payment) ───
    const [items] = await db.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [order_id]
    );

    for (const item of items) {
      await db.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    res.json({ message: 'Payment successful! Your order is confirmed.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment verification error.' });
  }
});


// ── GET PAYMENT STATUS ─────────────────────────────────────
// GET /payments/status/:order_id
router.get('/status/:order_id', isLoggedIn, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT id, total, status, payment_status, razorpay_payment_id, created_at
       FROM orders WHERE id = ? AND user_id = ?`,
      [req.params.order_id, req.user.userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json(orders[0]);

  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});


module.exports = router;
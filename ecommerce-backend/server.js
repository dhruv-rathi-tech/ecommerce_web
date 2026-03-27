require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

// ── MIDDLEWARE ─────────────────────────────────────────────
app.use(express.json());
app.use(require('cors')());
app.use(express.static(__dirname)); // ← must be first

// ── ROUTES ─────────────────────────────────────────────────
app.use('/auth',       require('./routes/auth'));
app.use('/categories', require('./routes/categories'));
app.use('/products',   require('./routes/products'));
app.use('/cart',       require('./routes/cart'));
app.use('/orders',     require('./routes/orders'));
app.use('/payments',   require('./routes/payments'));

// ── HEALTH CHECK ───────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({ message: '🛒 E-Commerce API is running!' });
});

// ── 404 HANDLER ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
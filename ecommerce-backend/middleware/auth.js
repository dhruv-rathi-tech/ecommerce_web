// middleware/auth.js
// These functions protect routes so only logged-in users
// (or admins) can access them

const jwt = require('jsonwebtoken');

// ── Checks if user is logged in ────────────────────────────
function isLoggedIn(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Token should come as: "Bearer eyJhbGci..."
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Please log in first.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attaches { userId, role } to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

// ── Checks if user is an admin ─────────────────────────────
function isAdmin(req, res, next) {
  // isLoggedIn must run before isAdmin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
}

module.exports = { isLoggedIn, isAdmin };
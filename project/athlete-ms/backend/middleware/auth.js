// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Middleware — verifies the JWT from:
 *   1. Authorization: Bearer <token>   header
 *   2. x-auth-token                    header (legacy support)
 */
const authMiddleware = (req, res, next) => {
  let token =
    (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') ||
    req.headers['x-auth-token'];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token — authorisation denied.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Token has expired — please log in again.'
      : 'Invalid token.';
    return res.status(401).json({ success: false, message: msg });
  }
};

/**
 * Optional: role-based guard factory
 * Usage: router.get('/admin', authMiddleware, requireRole('admin'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  }
  next();
};

module.exports = { authMiddleware, requireRole };

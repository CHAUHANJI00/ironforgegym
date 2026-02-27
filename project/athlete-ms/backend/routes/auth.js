// backend/routes/auth.js
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { TOKEN_COOKIE, CSRF_COOKIE, getCookieOptions, getCsrfCookieOptions, issueSessionCookies } = require('../utils/security');

const router = express.Router();

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// ─────────────────────────────────────────────
//  POST /api/auth/signup
// ─────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required.').isLength({ min: 2, max: 120 }),
    body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('password')
      .isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters.')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
      .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
    body('role')
      .optional()
      .isIn(['athlete', 'coach']).withMessage('Role must be athlete or coach.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { full_name, email, password, role = 'athlete' } = req.body;
    let conn;

    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [existing] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existing.length > 0) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }

      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(password, salt);

      const [result] = await conn.query(
        'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [full_name, email, password_hash, role]
      );
      const userId = result.insertId;

      if (role === 'athlete') {
        await conn.query('INSERT INTO athlete_profiles (user_id) VALUES (?)', [userId]);
        await conn.query('INSERT INTO training_details (user_id) VALUES (?)', [userId]);
      }

      await conn.commit();

      const token = signToken({ id: userId, email, role });
      const csrfToken = issueSessionCookies(res, token);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        token: process.env.NODE_ENV === 'production' ? undefined : token,
        csrfToken,
        user: { id: userId, full_name, email, role },
      });
    } catch (err) {
      await conn.rollback();
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }
      console.error('Signup error:', err);
      return res.status(500).json({ success: false, message: 'Server error during signup.' });
    } finally {
      if (conn) conn.release();
    }
  }
);

// ─────────────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const [rows] = await pool.query(
        'SELECT id, full_name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      if (rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      const user = rows[0];

      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'Account is deactivated.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      const token = signToken({ id: user.id, email: user.email, role: user.role });
      const csrfToken = issueSessionCookies(res, token);

      return res.json({
        success: true,
        message: 'Login successful.',
        token: process.env.NODE_ENV === 'production' ? undefined : token,
        csrfToken,
        user: {
          id:        user.id,
          full_name: user.full_name,
          email:     user.email,
          role:      user.role,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
  }
);

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let csrfToken = req.cookies?.[CSRF_COOKIE];
    if (!csrfToken) {
      const token = req.cookies?.[TOKEN_COOKIE];
      if (token) csrfToken = issueSessionCookies(res, token);
    }

    return res.json({ success: true, user: rows[0], csrfToken: csrfToken || null });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post(
  '/change-password',
  authMiddleware,
  [
    body('current_password').notEmpty().withMessage('Current password required.'),
    body('new_password')
      .isLength({ min: 8, max: 72 }).withMessage('New password must be 8-72 characters.')
      .matches(/[A-Z]/).withMessage('Must contain uppercase.')
      .matches(/[0-9]/).withMessage('Must contain a number.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const isMatch = await bcrypt.compare(req.body.current_password, rows[0].password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
      const salt     = await bcrypt.genSalt(12);
      const newHash  = await bcrypt.hash(req.body.new_password, salt);
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);
      return res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
      console.error('Change-password error:', err);
      return res.status(500).json({ success: false, message: 'Server error.' });
    }
  }
);

router.post('/logout', (req, res) => {
  res.clearCookie(TOKEN_COOKIE, getCookieOptions());
  res.clearCookie(CSRF_COOKIE, getCsrfCookieOptions());
  return res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;

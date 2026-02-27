// backend/routes/auth.js
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool     = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const TOKEN_COOKIE = 'ams_token';

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

// ─────────────────────────────────────────────
//  POST /api/auth/signup
// ─────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required.').isLength({ max: 120 }),
    body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
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

    try {
      // Check duplicate
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }

      // Hash password
      const salt          = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(password, salt);

      // Insert user
      const [result] = await pool.query(
        'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [full_name, email, password_hash, role]
      );
      const userId = result.insertId;

      // Create empty profile row for athlete
      if (role === 'athlete') {
        await pool.query('INSERT IGNORE INTO athlete_profiles (user_id) VALUES (?)', [userId]);
        await pool.query('INSERT IGNORE INTO training_details (user_id) VALUES (?)', [userId]);
      }

      // Issue token
      const token = jwt.sign(
        { id: userId, email, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.cookie(TOKEN_COOKIE, token, getCookieOptions());

      return res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        token,
        user: { id: userId, full_name, email, role },
      });
    } catch (err) {
      console.error('Signup error:', err);
      return res.status(500).json({ success: false, message: 'Server error during signup.' });
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
        'SELECT id, full_name, email, password_hash, role, is_active FROM users WHERE email = ?',
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

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.cookie(TOKEN_COOKIE, token, getCookieOptions());

      return res.json({
        success: true,
        message: 'Login successful.',
        token,
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

// ─────────────────────────────────────────────
//  GET /api/auth/me   (protected)
// ─────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
//  POST /api/auth/change-password  (protected)
// ─────────────────────────────────────────────
router.post(
  '/change-password',
  authMiddleware,
  [
    body('current_password').notEmpty().withMessage('Current password required.'),
    body('new_password')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Must contain uppercase.')
      .matches(/[0-9]/).withMessage('Must contain a number.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
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


// ─────────────────────────────────────────────
//  POST /api/auth/logout
// ─────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie(TOKEN_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;

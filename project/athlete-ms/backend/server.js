// backend/server.js
require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const authRoutes    = require('./routes/auth');
const athleteRoutes = require('./routes/athlete');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
//  CORS
// ─────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',   // VS Code Live Server
    'http://127.0.0.1:5500',
  ],
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true,
}));

// ─────────────────────────────────────────────
//  Body parsers
// ─────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─────────────────────────────────────────────
//  Rate limiting
// ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      20,
  message:  { success: false, message: 'Too many requests — try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use('/api/auth', authLimiter);

// ─────────────────────────────────────────────
//  Routes
// ─────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/athlete', athleteRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Iron Forge API is running 🔥', ts: new Date().toISOString() });
});

// Serve static frontend (production)
app.use(express.static(path.join(__dirname, '../frontend')));
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  });
}

// ─────────────────────────────────────────────
//  Global error handler
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`\n🔥  Iron Forge API running on http://localhost:${PORT}`);
  console.log(`📋  Health: http://localhost:${PORT}/api/health\n`);
  console.log(`🌐  Frontend served from ../frontend — open http://localhost:${PORT}/login.html or /signup.html`);
});

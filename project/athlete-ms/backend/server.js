// backend/server.js
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path         = require('path');

const { checkDbHealth, getDbHealth } = require('./config/db');
const authRoutes = require('./routes/auth');
const athleteRoutes = require('./routes/athlete');
const csrfMiddleware = require('./middleware/csrf');

const PORT = process.env.PORT || 5000;

function validateEnv() {
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and be at least 32 characters.');
  }
}

function getAllowedOrigins() {
  const defaults = ['http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'];
  const fromEnv = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return new Set([...defaults, ...fromEnv]);
}

function createApp() {
  validateEnv();

  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-csrf-token'],
    credentials: true,
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(csrfMiddleware);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many requests — try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const writeLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 120,
    message: { success: false, message: 'Too many write requests — slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/athlete', writeLimiter, athleteRoutes);

  app.get('/api/health', async (req, res) => {
    await checkDbHealth();
    const db = getDbHealth();
    return res.status(db.healthy ? 200 : 503).json({
      success: db.healthy,
      message: db.healthy ? 'Iron Forge API is running 🔥' : 'API running, DB unavailable',
      db,
      ts: new Date().toISOString(),
    });
  });

  app.use(express.static(path.join(__dirname, '../frontend')));
  if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
    });
  }

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message || err);
    res.status(err.status || 500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : (err.message || 'Internal server error.'),
    });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`\n🔥  Iron Forge API running on http://localhost:${PORT}`);
    console.log(`📋  Health: http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = { createApp };

// backend/routes/athlete.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const pool    = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// ──────────────────────────────────────────────────────────
//  Helper: sanitise + build SET clause for dynamic updates
// ──────────────────────────────────────────────────────────

const profileValidation = [
  body('full_name').optional().trim().isLength({ min: 1, max: 120 }),
  body('date_of_birth').optional({ values: 'falsy' }).isISO8601().withMessage('date_of_birth must be a valid date.'),
  body('gender').optional({ values: 'falsy' }).isIn(['male', 'female', 'non_binary', 'prefer_not_to_say']),
  body('nationality').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('state').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('country').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('bio').optional({ values: 'falsy' }).trim().isLength({ max: 4000 }),
  body('profile_photo').optional({ values: 'falsy' }).isURL().withMessage('profile_photo must be a valid URL.'),
  body('height_cm').optional({ values: 'falsy' }).isFloat({ min: 100, max: 250 }),
  body('weight_kg').optional({ values: 'falsy' }).isFloat({ min: 30, max: 300 }),
  body('blood_group').optional({ values: 'falsy' }).isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  body('dominant_hand').optional({ values: 'falsy' }).isIn(['left', 'right', 'ambidextrous']),
  body('sport_category').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('sport_discipline').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('playing_level').optional({ values: 'falsy' }).isIn(['beginner', 'amateur', 'semi_pro', 'professional', 'elite']),
  body('team_club').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('coach_name').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('years_experience').optional({ values: 'falsy' }).isInt({ min: 0, max: 100 }),
  body('membership_plan').optional({ values: 'falsy' }).isIn(['iron_starter', 'iron_forge', 'iron_elite']),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
  body('emergency_contact_name').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('emergency_contact_phone').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
  body('social_instagram').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('social_twitter').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('social_linkedin').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('website').optional({ values: 'falsy' }).isURL().withMessage('website must be a valid URL.'),
];

const trainingValidation = [
  body('training_days').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('session_duration').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('preferred_time').optional({ values: 'falsy' }).isIn(['morning', 'afternoon', 'evening', 'night']),
  body('current_program').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
  body('training_goals').optional({ values: 'falsy' }).trim().isLength({ max: 4000 }),
  body('diet_type').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('supplements').optional({ values: 'falsy' }).trim().isLength({ max: 4000 }),
  body('injuries_history').optional({ values: 'falsy' }).trim().isLength({ max: 4000 }),
  body('recovery_methods').optional({ values: 'falsy' }).trim().isLength({ max: 4000 }),
];

const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer.'),
];

function buildSetClause(allowed, body) {
  const fields = [];
  const values = [];
  allowed.forEach(key => {
    if (body[key] !== undefined) {
      fields.push(`\`${key}\` = ?`);
      values.push(body[key] === '' ? null : body[key]);
    }
  });
  return { fields, values };
}

// ──────────────────────────────────────────────────────────
//  GET /api/athlete/profile
// ──────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;

    // Core user info
    const [users] = await pool.query(
      'SELECT id, full_name, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    // Athlete profile
    const [profiles] = await pool.query(
      'SELECT * FROM athlete_profiles WHERE user_id = ?',
      [userId]
    );

    // Achievements
    const [achievements] = await pool.query(
      'SELECT * FROM achievements WHERE user_id = ? ORDER BY award_date DESC',
      [userId]
    );

    // Performance stats
    const [stats] = await pool.query(
      'SELECT * FROM performance_stats WHERE user_id = ? ORDER BY recorded_date DESC',
      [userId]
    );

    // Training details
    const [training] = await pool.query(
      'SELECT * FROM training_details WHERE user_id = ?',
      [userId]
    );

    return res.json({
      success: true,
      data: {
        user:         users[0]       || {},
        profile:      profiles[0]    || {},
        achievements: achievements   || [],
        stats:        stats          || [],
        training:     training[0]    || {},
      },
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

// ──────────────────────────────────────────────────────────
//  PUT /api/athlete/profile
// ──────────────────────────────────────────────────────────
router.put('/profile', profileValidation, async (req, res) => {
  const allowedProfile = [
    'date_of_birth', 'gender', 'nationality', 'city', 'state', 'country', 'bio', 'profile_photo',
    'height_cm', 'weight_kg', 'blood_group', 'dominant_hand',
    'sport_category', 'sport_discipline', 'playing_level', 'team_club',
    'coach_name', 'years_experience', 'membership_plan',
    'phone', 'emergency_contact_name', 'emergency_contact_phone',
    'social_instagram', 'social_twitter', 'social_linkedin', 'website',
  ];

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const userId = req.user.id;

    // Update user name if provided
    if (req.body.full_name) {
      await pool.query('UPDATE users SET full_name = ? WHERE id = ?', [req.body.full_name, userId]);
    }

    // Upsert athlete profile
    const { fields, values } = buildSetClause(allowedProfile, req.body);
    if (fields.length > 0) {
      // Try update first, insert if no row
      const [existing] = await pool.query('SELECT id FROM athlete_profiles WHERE user_id = ?', [userId]);
      if (existing.length > 0) {
        await pool.query(
          `UPDATE athlete_profiles SET ${fields.join(', ')} WHERE user_id = ?`,
          [...values, userId]
        );
      } else {
        const cols = allowedProfile.filter(k => req.body[k] !== undefined);
        const vals = cols.map(k => req.body[k] === '' ? null : req.body[k]);
        await pool.query(
          `INSERT INTO athlete_profiles (user_id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`,
          [userId, ...vals]
        );
      }
    }

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// ──────────────────────────────────────────────────────────
//  PUT /api/athlete/training
// ──────────────────────────────────────────────────────────
router.put('/training', trainingValidation, async (req, res) => {
  const allowed = [
    'training_days', 'session_duration', 'preferred_time', 'current_program',
    'training_goals', 'diet_type', 'supplements', 'injuries_history', 'recovery_methods',
  ];

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const userId = req.user.id;
    const { fields, values } = buildSetClause(allowed, req.body);
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }
    const [existing] = await pool.query('SELECT id FROM training_details WHERE user_id = ?', [userId]);
    if (existing.length > 0) {
      await pool.query(
        `UPDATE training_details SET ${fields.join(', ')} WHERE user_id = ?`,
        [...values, userId]
      );
    } else {
      const cols = allowed.filter(k => req.body[k] !== undefined);
      const vals = cols.map(k => req.body[k] === '' ? null : req.body[k]);
      await pool.query(
        `INSERT INTO training_details (user_id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`,
        [userId, ...vals]
      );
    }
    return res.json({ success: true, message: 'Training details updated.' });
  } catch (err) {
    console.error('Training update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update training details.' });
  }
});

// ──────────────────────────────────────────────────────────
//  POST /api/athlete/achievements
// ──────────────────────────────────────────────────────────
router.post(
  '/achievements',
  [
    body('title').trim().notEmpty().withMessage('Achievement title is required.'),
    body('award_date').optional().isDate(),
    body('level').optional().isIn(['local', 'state', 'national', 'international']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const { title, description, event_name, position, award_date, level } = req.body;
      const [result] = await pool.query(
        `INSERT INTO achievements (user_id, title, description, event_name, position, award_date, level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, title, description || null, event_name || null, position || null, award_date || null, level || null]
      );
      return res.status(201).json({ success: true, message: 'Achievement added.', id: result.insertId });
    } catch (err) {
      console.error('Achievement add error:', err);
      return res.status(500).json({ success: false, message: 'Failed to add achievement.' });
    }
  }
);

// ──────────────────────────────────────────────────────────
//  DELETE /api/athlete/achievements/:id
// ──────────────────────────────────────────────────────────
router.delete('/achievements/:id', idParamValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const [result] = await pool.query(
      'DELETE FROM achievements WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Achievement not found.' });
    }
    return res.json({ success: true, message: 'Achievement deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete achievement.' });
  }
});

// ──────────────────────────────────────────────────────────
//  POST /api/athlete/stats
// ──────────────────────────────────────────────────────────
router.post(
  '/stats',
  [
    body('stat_name').trim().notEmpty().withMessage('Stat name is required.'),
    body('stat_value').trim().notEmpty().withMessage('Stat value is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    try {
      const { stat_name, stat_value, unit, recorded_date, notes } = req.body;
      const [result] = await pool.query(
        `INSERT INTO performance_stats (user_id, stat_name, stat_value, unit, recorded_date, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, stat_name, stat_value, unit || null, recorded_date || null, notes || null]
      );
      return res.status(201).json({ success: true, message: 'Stat added.', id: result.insertId });
    } catch (err) {
      console.error('Stat add error:', err);
      return res.status(500).json({ success: false, message: 'Failed to add stat.' });
    }
  }
);

// ──────────────────────────────────────────────────────────
//  GET /api/athlete/stats/series
// ──────────────────────────────────────────────────────────
router.get('/stats/series', async (req, res) => {
  try {
    const [stats] = await pool.query(
      `SELECT id, stat_name, stat_value, unit, recorded_date, notes
       FROM performance_stats
       WHERE user_id = ?
       ORDER BY stat_name ASC, recorded_date ASC, id ASC`,
      [req.user.id]
    );

    const byMetric = new Map();
    for (const row of stats) {
      const metric = row.stat_name;
      if (!byMetric.has(metric)) {
        byMetric.set(metric, {
          metric,
          unit: row.unit || null,
          points: [],
          latest: null,
          personal_best: null,
        });
      }

      const bucket = byMetric.get(metric);
      if (!bucket.unit && row.unit) bucket.unit = row.unit;

      const numericValue = Number.parseFloat(row.stat_value);
      const isNumeric = Number.isFinite(numericValue);
      const point = {
        id: row.id,
        recorded_date: row.recorded_date,
        stat_value: row.stat_value,
        numeric_value: isNumeric ? numericValue : null,
        is_numeric: isNumeric,
        unit: row.unit || bucket.unit,
        notes: row.notes,
      };
      bucket.points.push(point);

      if (!bucket.latest || new Date(row.recorded_date || 0) >= new Date(bucket.latest.recorded_date || 0)) {
        bucket.latest = point;
      }
      if (isNumeric && (!bucket.personal_best || numericValue > bucket.personal_best.numeric_value)) {
        bucket.personal_best = point;
      }
    }

    const series = Array.from(byMetric.values()).map(metricBucket => ({
      metric: metricBucket.metric,
      unit: metricBucket.unit,
      latest: metricBucket.latest,
      personal_best: metricBucket.personal_best,
      points: metricBucket.points,
    }));

    return res.json({
      success: true,
      data: {
        metrics: series.map(s => s.metric),
        series,
      },
    });
  } catch (err) {
    console.error('Stats series fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats series.' });
  }
});

// ──────────────────────────────────────────────────────────
//  DELETE /api/athlete/stats/:id
// ──────────────────────────────────────────────────────────
router.delete('/stats/:id', idParamValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const [result] = await pool.query(
      'DELETE FROM performance_stats WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Stat not found.' });
    }
    return res.json({ success: true, message: 'Stat deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete stat.' });
  }
});

module.exports = router;

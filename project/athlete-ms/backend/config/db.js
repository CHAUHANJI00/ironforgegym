const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'athlete_management',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  charset:            'utf8mb4',
});

let dbHealthy = false;
let lastDbError = null;

async function checkDbHealth() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    dbHealthy = true;
    lastDbError = null;
  } catch (err) {
    dbHealthy = false;
    lastDbError = err.message;
    console.error('❌  MySQL connection check failed:', err.message);
  }
  return dbHealthy;
}

// Initial check without hard-crashing process.
checkDbHealth();

module.exports = {
  pool,
  checkDbHealth,
  getDbHealth: () => ({ healthy: dbHealthy, error: lastDbError }),
};

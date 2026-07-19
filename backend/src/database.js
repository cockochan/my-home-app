const { Pool } = require('pg');

let pool = null;

function createPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
    });
  }

  return pool;
}

async function initializeDatabase() {
  const dbPool = createPool();
  if (!dbPool) {
    return false;
  }

  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS app_status (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.query(`
      INSERT INTO app_status (name, value)
      SELECT 'backend', 'online'
      WHERE NOT EXISTS (SELECT 1 FROM app_status WHERE name = 'backend')
    `);

    return true;
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    return false;
  }
}

async function getDatabaseStatus() {
  const dbPool = createPool();
  if (!dbPool) {
    return { status: 'not-configured' };
  }

  try {
    const result = await dbPool.query('SELECT NOW() AS now');
    return {
      status: 'connected',
      currentTime: result.rows[0].now
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

async function getAppStatusRows() {
  const dbPool = createPool();
  if (!dbPool) {
    return [];
  }

  try {
    const result = await dbPool.query('SELECT name, value, created_at FROM app_status ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    console.error('Failed to fetch app status rows:', error.message);
    return [];
  }
}

module.exports = {
  createPool,
  initializeDatabase,
  getDatabaseStatus,
  getAppStatusRows
};

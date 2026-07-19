const test = require('node:test');
const assert = require('node:assert/strict');

const { initializeDatabase, getDatabaseStatus } = require('./database');

test('initializeDatabase returns false when DATABASE_URL is not set', async () => {
  delete process.env.DATABASE_URL;
  const initialized = await initializeDatabase();
  assert.equal(initialized, false);
});

test('getDatabaseStatus reports not-configured without DATABASE_URL', async () => {
  delete process.env.DATABASE_URL;
  const status = await getDatabaseStatus();
  assert.equal(status.status, 'not-configured');
});

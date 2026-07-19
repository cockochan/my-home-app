const express = require('express');
const cors = require('cors');
const { initializeDatabase, getDatabaseStatus, getAppStatusRows } = require('./database');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', async (req, res) => {
  const database = await getDatabaseStatus();
  res.json({ status: 'ok', service: 'backend', port, database });
});

// Simple API endpoint
app.get('/api', async (req, res) => {
  const database = await getDatabaseStatus();
  const rows = await getAppStatusRows();
  res.json({
    message: 'Hello from the backend API!',
    database,
    rows,
    summary: {
      rowCount: rows.length,
      connected: database.status === 'connected'
    }
  });
});

async function startServer() {
  await initializeDatabase();
  app.listen(port, '0.0.0.0', () => {
    console.log(`Backend server running at http://0.0.0.0:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, getDatabaseStatus };
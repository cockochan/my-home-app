const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initializeDatabase, getDatabaseStatus, getAppStatusRows, createPool } = require('./database');

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

// Authentication routes
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const dbPool = createPool();
  
  try {
    const result = await dbPool.query(`
      SELECT * FROM users WHERE email = $1
    `, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  const dbPool = createPool();
  
  try {
    // Check if user already exists
    const existingResult = await dbPool.query(`
      SELECT * FROM users WHERE email = $1
    `, [email]);
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email already taken' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    await dbPool.query(`
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
    `, [email, hashedPassword]);
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
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

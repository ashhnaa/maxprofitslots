const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Basic Server Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Sports Turf Profit Optimizer backend is running'
  });
});

// Database Health Check Route
app.get('/api/db/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() AS current_time, 1 AS ok');
    res.status(200).json({
      status: 'ok',
      message: 'PostgreSQL connection successful',
      details: {
        timestamp: result.rows[0].current_time
      }
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'PostgreSQL connection failed',
      error: error.message
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

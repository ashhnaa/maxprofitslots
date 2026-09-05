const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');
const db      = require('./config/database');

const app = express();
const PORT          = process.env.PORT         || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors({
  origin:         CLIENT_ORIGIN,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ─── System Health Routes (untouched) ────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status:  'ok',
    message: 'Sports Turf Profit Optimizer backend is running',
  });
});

app.get('/api/db/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() AS current_time, 1 AS ok');
    res.status(200).json({
      status:  'ok',
      message: 'PostgreSQL connection successful',
      details: { timestamp: result.rows[0].current_time },
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    res.status(500).json({
      status:  'error',
      message: 'PostgreSQL connection failed',
      error:   error.message,
    });
  }
});

// ─── Booking Data Provider Routes ────────────────────────────────
// All /api/booking/* routes go through the provider abstraction layer.
const bookingRouter = require('./routes/booking');
app.use('/api/booking', bookingRouter);

// ─── Off-Peak Analytics Layer Routes ──────────────────────────────
// All /api/analytics/* routes analyze historical booking data.
const analyticsRouter = require('./routes/analytics');
app.use('/api/analytics', analyticsRouter);

// ─── Demand Prediction & Profit Optimization Routes ───────────────
// POST /api/optimization/evaluate
const optimizationRouter = require('./routes/optimization');
app.use('/api/optimization', optimizationRouter);

// ─── AI Profit Optimization Agent Routes ──────────────────────────
// POST /api/agent/optimize
const agentRouter = require('./routes/agent');
app.use('/api/agent', agentRouter);

// ─── Customer Targeting & Simulation Routes ───────────────────────
// GET /api/customers/targeting/:slotId, POST /api/customers/simulate-notification
const customerRouter = require('./routes/customers');
app.use('/api/customers', customerRouter);

// ─── 404 catch-all ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.path} not found.` });
});

// ─── Global error handler ─────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Unhandled Error]', err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    status: 'error',
    message: err.message || 'Internal server error.',
  });
});

// ─── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Booking provider: ${process.env.BOOKING_PROVIDER || 'demo'}`);
});

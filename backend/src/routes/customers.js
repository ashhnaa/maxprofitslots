/**
 * customers.js — Customer Targeting & Notification Simulation Routes
 *
 * REST Endpoints:
 *   GET  /api/customers/targeting/:slotId — Get top ranked target customers for a vacant slot
 *   POST /api/customers/simulate-notification — Simulate sending notification to targets
 */

const express = require('express');
const router = express.Router();
const customerTargetingService = require('../services/customerTargetingService');

function sendError(res, statusCode, message, details = null) {
  return res.status(statusCode).json({
    status: 'error',
    message,
    ...(details ? { details } : {}),
  });
}

// ─── GET /api/customers/targeting/:slotId ──────────────────────────────
router.get('/targeting/:slotId', async (req, res) => {
  try {
    const { slotId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

    const result = await customerTargetingService.getTargetCustomers(slotId, { limit });

    res.json({
      status: 'ok',
      data: result,
    });
  } catch (err) {
    console.error(`[GET /api/customers/targeting/${req.params.slotId}]`, err.message);
    const status = err.status || 500;
    sendError(res, status, err.message);
  }
});

// ─── POST /api/customers/simulate-notification ─────────────────────────
router.post('/simulate-notification', async (req, res) => {
  try {
    const { slotId, customerIds } = req.body;

    if (!slotId) {
      return sendError(res, 400, 'slotId is required for notification simulation.');
    }

    const count = Array.isArray(customerIds) ? customerIds.length : (req.body.recipientCount || 0);

    res.json({
      status: 'ok',
      data: {
        simulated: true,
        slotId: parseInt(slotId, 10),
        recipientCount: count,
        notificationStatus: 'not_sent',
        channel: 'SIMULATION_PUSH_SMS',
        message: `Simulation complete: ${count} customer(s) targeted for slot #${slotId}. No real SMS/WhatsApp messages dispatched.`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[POST /api/customers/simulate-notification]', err.message);
    sendError(res, 500, 'Failed to simulate notification.', err.message);
  }
});

module.exports = router;

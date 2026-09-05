/**
 * agent.js — /api/agent/* route handlers
 *
 * REST API for AI Profit Optimization Agent orchestration.
 */

const express = require('express');
const router  = express.Router();
const agent   = require('../services/agent/profitOptimizationAgent');

// POST /api/agent/optimize — Execute agent profit optimization workflow for a vacant slot
router.post('/optimize', async (req, res, next) => {
  try {
    const { slotId } = req.body;

    if (slotId === undefined || slotId === null) {
      const err = new Error('Missing slotId in request body. Body must contain { "slotId": number }.');
      err.status = 400;
      throw err;
    }

    const id = parseInt(slotId, 10);
    if (isNaN(id)) {
      const err = new Error('Invalid slotId parameter. Must be a numeric integer.');
      err.status = 400;
      throw err;
    }

    const result = await agent.runOptimization(id);
    res.json(result);
  } catch (err) {
    if (err.trace) {
      return res.status(err.status || 400).json({
        success: false,
        error: err.message,
        trace: err.trace,
      });
    }
    next(err);
  }
});

module.exports = router;

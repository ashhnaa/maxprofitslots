/**
 * optimization.js — /api/optimization/* route handlers
 *
 * REST API for profit optimization evaluation.
 */

const express = require('express');
const router  = express.Router();
const { evaluateSlot } = require('../services/optimizationService');

// POST /api/optimization/evaluate — Evaluate profit optimization for a vacant slot
router.post('/evaluate', async (req, res, next) => {
  try {
    const { slotId } = req.body;

    if (slotId === undefined || slotId === null) {
      const err = new Error('Missing slotId in request body. Body must contain { "slotId": number }.');
      err.status = 400;
      throw err;
    }

    const id = parseInt(slotId, 10);
    if (isNaN(id)) {
      const err = new Error('Invalid slotId. Must be a numeric integer.');
      err.status = 400;
      throw err;
    }

    const evaluation = await evaluateSlot(id);
    res.json({
      status: 'ok',
      data: evaluation,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

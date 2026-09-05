/**
 * optimizationService.js
 *
 * PROFIT OPTIMIZATION ENGINE
 * ==========================
 *
 * Evaluates candidate interventions for a vacant slot, computes expected
 * revenue and expected profit under each action, enforces business rules,
 * and selects the action that maximizes EXPECTED PROFIT.
 */

const provider = require('../config/providerConfig');
const actionConfig = require('../config/actionConfig');
const { predictBookingProbability } = require('./predictionService');

/**
 * Evaluate profit optimization for a given slot.
 *
 * @param {number} slotId
 * @returns {Promise<Object>} Recommendation payload
 */
async function evaluateSlot(slotId) {
  // 1. Retrieve slot through Booking Data Provider
  const slot = await provider.getSlotById(slotId);
  if (!slot) {
    const err = new Error(`Slot with ID ${slotId} not found.`);
    err.status = 404;
    throw err;
  }

  // 2. Business Constraint: Only evaluate vacant/available slots
  if (slot.status !== 'AVAILABLE') {
    const err = new Error(`Slot ${slotId} status is '${slot.status}'. Profit optimization is only applicable to vacant (AVAILABLE) slots.`);
    err.status = 400;
    throw err;
  }

  // 3. Obtain historical fill rate context for this pattern
  const slotDate = new Date(slot.date);
  const pythonDayOfWeek = (slotDate.getDay() + 6) % 7;
  const startHour = parseInt(String(slot.startTime).split(':')[0], 10) || 12;

  let historicalFillRate = 25.0; // fallback
  try {
    const opps = await provider.getOffPeakOpportunities({
      arenaId: slot.arenaId,
      sport: slot.sport,
      period: slot.period,
      limit: 100,
    });

    const match = opps.find(o => o.time.startsWith(slot.startTime.substring(0, 2)));
    if (match) {
      historicalFillRate = match.historicalFillRate;
    } else {
      const summary = await provider.getAnalyticsSummary({
        arenaId: slot.arenaId,
        sport: slot.sport,
      });
      historicalFillRate = (slot.period === 'PEAK') ? summary.peakFillRate : summary.nonPeakFillRate;
    }
  } catch (_e) {
    // default fallback
  }

  // 4. Obtain ML booking probability P(booking | do_nothing)
  const mlRes = await predictBookingProbability(slot, historicalFillRate / 100.0);
  const baseProbability = mlRes.bookingProbability;

  // 5. Evaluate all candidate actions
  const actionEvaluations = [];

  for (const [actionKey, actionSpec] of Object.entries(actionConfig.actions)) {
    let isValid = true;
    let invalidationReason = null;

    // Constraint Check 1: Peak discount prohibition
    if (slot.period === 'PEAK' && !actionSpec.allowedInPeak) {
      isValid = false;
      invalidationReason = 'Discounts are prohibited during PEAK hours.';
    }

    // Constraint Check 2: Maximum discount cap (20%)
    if (actionSpec.discountPercentage > actionConfig.maxDiscountPercentage) {
      isValid = false;
      invalidationReason = `Discount (${actionSpec.discountPercentage}%) exceeds maximum limit of ${actionConfig.maxDiscountPercentage}%.`;
    }

    // Constraint Check 3: Non-negative final price
    const finalPrice = Math.max(0, parseFloat((slot.normalPrice * (1.0 - (actionSpec.discountPercentage / 100.0))).toFixed(2)));
    if (finalPrice < 0) {
      isValid = false;
      invalidationReason = 'Final price cannot be negative.';
    }

    if (!isValid) {
      actionEvaluations.push({
        action: actionKey,
        label: actionSpec.label,
        isValid: false,
        invalidationReason,
        bookingProbability: 0,
        discountPercentage: actionSpec.discountPercentage,
        finalPrice,
        expectedRevenue: 0,
        actionCost: actionSpec.actionCost,
        expectedProfit: -999999, // Invalid actions must never be chosen
      });
      continue;
    }

    // Programmatic calculations for valid action:
    // P(booking | action) = min(1.0, baseProbability + uplift)
    const actionProbability = Math.min(1.0, parseFloat((baseProbability + actionSpec.probabilityUplift).toFixed(4)));
    const expectedRevenue   = parseFloat((actionProbability * finalPrice).toFixed(2));
    const expectedProfit    = parseFloat((expectedRevenue - actionSpec.actionCost).toFixed(2));

    actionEvaluations.push({
      action: actionKey,
      label: actionSpec.label,
      isValid: true,
      bookingProbability: actionProbability,
      probabilityUplift: actionSpec.probabilityUplift,
      discountPercentage: actionSpec.discountPercentage,
      finalPrice,
      expectedRevenue,
      actionCost: actionSpec.actionCost,
      expectedProfit,
    });
  }

  // 6. Select recommendedAction = valid action with maximum expectedProfit
  const validActions = actionEvaluations.filter(a => a.isValid);
  validActions.sort((a, b) => b.expectedProfit - a.expectedProfit);

  const best = validActions[0];

  // 7. Formulate programmatic reason string based on calculated numbers
  let reason = '';
  if (best.action === 'DO_NOTHING') {
    reason = `Natural booking probability (${(baseProbability * 100).toFixed(1)}%) is high enough that baseline expected profit (₹${best.expectedProfit}) exceeds the net profit of notifications or discounts.`;
  } else if (best.action === 'TARGETED_NOTIFICATION') {
    const doNothing = validActions.find(a => a.action === 'DO_NOTHING');
    reason = `Low predicted natural demand (${(baseProbability * 100).toFixed(1)}%). Targeted customer notification achieves highest expected profit (₹${best.expectedProfit} vs ₹${doNothing ? doNothing.expectedProfit : 0} baseline) without sacrificing full slot price.`;
  } else if (best.action.startsWith('DISCOUNT_')) {
    const doNothing = validActions.find(a => a.action === 'DO_NOTHING');
    reason = `Significant off-peak underutilization (${historicalFillRate}% fill rate). Applying a ${best.discountPercentage}% discount boosts booking probability to ${(best.bookingProbability * 100).toFixed(1)}%, maximizing expected profit (₹${best.expectedProfit} vs ₹${doNothing ? doNothing.expectedProfit : 0} baseline).`;
  } else {
    reason = `Action ${best.label} provides the highest expected profit (₹${best.expectedProfit}) under current business constraints.`;
  }

  // Format alternatives breakdown
  const alternatives = actionEvaluations.map(a => {
    if (!a.isValid) {
      return {
        action: a.action,
        label: a.label,
        isValid: false,
        invalidationReason: a.invalidationReason,
      };
    }
    return {
      action: a.action,
      label: a.label,
      isValid: true,
      bookingProbability: a.bookingProbability,
      discountPercentage: a.discountPercentage,
      finalPrice: a.finalPrice,
      expectedRevenue: a.expectedRevenue,
      actionCost: a.actionCost,
      expectedProfit: a.expectedProfit,
    };
  });

  return {
    slot: {
      id: slot.id,
      arenaId: slot.arenaId,
      sport: slot.sport,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      normalPrice: slot.normalPrice,
      period: slot.period,
      status: slot.status,
    },
    historicalFillRate,
    bookingProbability: baseProbability,
    recommendedAction: best.action,
    recommendedActionLabel: best.label,
    expectedRevenue: best.expectedRevenue,
    expectedProfit: best.expectedProfit,
    actionCost: best.actionCost,
    reason,
    alternatives,
  };
}

module.exports = {
  evaluateSlot,
};

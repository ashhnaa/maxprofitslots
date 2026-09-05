/**
 * agentTools.js
 *
 * STANDARDIZED AGENT TOOL DEFINITIONS
 * ===================================
 *
 * Provides clean function tools called by the Profit Optimization Agent.
 * Each tool wraps existing underlying services rather than duplicating logic.
 */

const provider = require('../../config/providerConfig');
const { predictBookingProbability } = require('../predictionService');
const { getRules } = require('./ruleRetriever');
const actionConfig = require('../../config/actionConfig');

/**
 * Tool 1: Retrieve slot details via Booking Data Provider.
 */
async function getSlotDetails(slotId) {
  const id = parseInt(slotId, 10);
  if (isNaN(id)) {
    const err = new Error('Invalid slotId. Must be a numeric integer.');
    err.status = 400;
    throw err;
  }

  const slot = await provider.getSlotById(id);
  if (!slot) {
    const err = new Error(`Slot with ID ${id} not found.`);
    err.status = 404;
    throw err;
  }
  return slot;
}

/**
 * Tool 2: Retrieve historical performance metrics for a slot's pattern.
 */
async function getHistoricalPerformance(slot) {
  let historicalFillRate = 25.0; // Default fallback
  try {
    const opps = await provider.getOffPeakOpportunities({
      arenaId: slot.arenaId,
      sport: slot.sport,
      period: slot.period,
      limit: 100,
    });

    const slotHour = String(slot.startTime).substring(0, 2);
    const match = opps.find(o => String(o.time).startsWith(slotHour));
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
  return historicalFillRate;
}

/**
 * Tool 3: Predict natural booking probability via ML model.
 */
async function getNaturalDemandPrediction(slot, historicalFillRate) {
  const fillRateDecimal = historicalFillRate > 1.0 ? historicalFillRate / 100.0 : historicalFillRate;
  const res = await predictBookingProbability(slot, fillRateDecimal);
  return res.bookingProbability;
}

/**
 * Tool 4: Retrieve grounded business rules for an arena.
 */
async function getArenaRules(arenaId) {
  return await getRules(arenaId);
}

/**
 * Tool 5: Evaluate revenue and expected profit under candidate actions against business rules.
 */
function evaluateActions(slot, rules, baseProbability) {
  const evaluations = [];

  for (const [actionKey, actionSpec] of Object.entries(actionConfig.actions)) {
    let isValid = true;
    let invalidationReason = null;

    // Rule Check 1: Peak discount prohibition
    if (slot.period === 'PEAK' && !actionSpec.allowedInPeak) {
      isValid = false;
      invalidationReason = 'Discounts are prohibited during PEAK hours under arena policy.';
    }

    // Rule Check 2: Max discount cap
    if (actionSpec.discountPercentage > rules.maxDiscountPercentage) {
      isValid = false;
      invalidationReason = `Discount (${actionSpec.discountPercentage}%) exceeds arena maximum threshold of ${rules.maxDiscountPercentage}%.`;
    }

    // Rule Check 3: Non-negative final price
    const finalPrice = Math.max(0, parseFloat((slot.normalPrice * (1.0 - (actionSpec.discountPercentage / 100.0))).toFixed(2)));
    if (finalPrice < 0) {
      isValid = false;
      invalidationReason = 'Final price cannot be negative.';
    }

    if (!isValid) {
      evaluations.push({
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

    // Cost adjustment if rules override notification cost
    const actionCost = (actionKey === 'TARGETED_NOTIFICATION') ? rules.notificationCost : actionSpec.actionCost;

    const actionProbability = Math.min(1.0, parseFloat((baseProbability + actionSpec.probabilityUplift).toFixed(4)));
    const expectedRevenue   = parseFloat((actionProbability * finalPrice).toFixed(2));
    const expectedProfit    = parseFloat((expectedRevenue - actionCost).toFixed(2));

    evaluations.push({
      action: actionKey,
      label: actionSpec.label,
      isValid: true,
      bookingProbability: actionProbability,
      probabilityUplift: actionSpec.probabilityUplift,
      discountPercentage: actionSpec.discountPercentage,
      finalPrice,
      expectedRevenue,
      actionCost,
      expectedProfit,
    });
  }

  return evaluations;
}

/**
 * Tool 6: Select best action with MAXIMUM EXPECTED PROFIT among valid actions.
 */
function selectBestAction(evaluations) {
  const validActions = evaluations.filter(a => a.isValid);
  if (!validActions.length) {
    throw new Error('No valid actions available for evaluation.');
  }
  validActions.sort((a, b) => b.expectedProfit - a.expectedProfit);
  return validActions[0];
}

module.exports = {
  getSlotDetails,
  getHistoricalPerformance,
  getNaturalDemandPrediction,
  getArenaRules,
  evaluateActions,
  selectBestAction,
};

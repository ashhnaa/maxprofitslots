/**
 * agentTools.js
 *
 * STANDARDIZED AGENT TOOL DEFINITIONS
 * ===================================
 *
 * Provides clean function tools called by the Profit Optimization Agent.
 * Each tool wraps underlying services and grounded policy knowledge.
 */

const provider = require('../../config/providerConfig');
const { predictBookingProbability } = require('../predictionService');
const { getRelevantRules } = require('./ruleRetriever');
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
async function getArenaRules(slot) {
  const arenaId = typeof slot === 'object' ? slot.arenaId : slot;
  return await getRelevantRules({ arenaId, slot: typeof slot === 'object' ? slot : null });
}

/**
 * Tool 5: Evaluate revenue and expected profit under candidate actions against grounded business rules.
 */
function evaluateActions(slot, rules, baseProbability) {
  const evaluations = [];
  const slotDate = slot.date ? new Date(slot.date) : null;
  const isWeekend = slotDate ? (slotDate.getDay() === 0 || slotDate.getDay() === 6) : false;

  for (const [actionKey, actionSpec] of Object.entries(actionConfig.actions)) {
    let isValid = true;
    let invalidationReason = null;
    let violatingPolicy = null;

    // Rule Check 1: Peak discount prohibition
    if (slot.period === 'PEAK' && !actionSpec.allowedInPeak && actionSpec.discountPercentage > 0) {
      isValid = false;
      violatingPolicy = 'Peak-Hour Restrictions';
      invalidationReason = `Discounts prohibited during PEAK hours (Source: ${rules.policySource} - ${violatingPolicy})`;
    }

    // Rule Check 2: Weekend discount prohibition
    if (isValid && isWeekend && rules.allowWeekendDiscounts === false && actionSpec.discountPercentage > 0) {
      isValid = false;
      violatingPolicy = 'Weekend Restrictions';
      invalidationReason = `Discounts prohibited on weekends (Source: ${rules.policySource} - ${violatingPolicy})`;
    }

    // Rule Check 3: Max discount cap
    if (isValid && actionSpec.discountPercentage > rules.maxDiscountPercentage) {
      isValid = false;
      violatingPolicy = 'Discount Policy';
      invalidationReason = `Discount (${actionSpec.discountPercentage}%) exceeds arena maximum threshold of ${rules.maxDiscountPercentage}% (Source: ${rules.policySource} - ${violatingPolicy})`;
    }

    // Rule Check 4: Price floor check
    const finalPrice = Math.max(0, parseFloat((slot.normalPrice * (1.0 - (actionSpec.discountPercentage / 100.0))).toFixed(2)));
    if (isValid && rules.minimumFinalPrice > 0 && finalPrice < rules.minimumFinalPrice && actionSpec.discountPercentage > 0) {
      isValid = false;
      violatingPolicy = 'Discount Policy';
      invalidationReason = `Final price ₹${finalPrice} is below arena price floor of ₹${rules.minimumFinalPrice} (Source: ${rules.policySource} - ${violatingPolicy})`;
    }

    if (!isValid) {
      evaluations.push({
        action: actionKey,
        label: actionSpec.label,
        isValid: false,
        invalidationReason,
        violatingPolicy,
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
    throw new Error('No valid actions available for evaluation after applying grounded business rules.');
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

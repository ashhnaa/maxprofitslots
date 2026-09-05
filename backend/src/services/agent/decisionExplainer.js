/**
 * decisionExplainer.js
 *
 * DETERMINISTIC DECISION EXPLAINER
 * ================================
 *
 * Generates clear, human-readable natural language explanations of the agent's
 * optimization decision based on actual calculated profit numbers and rule constraints.
 *
 * NOTE: Financial calculations are strictly deterministic and non-LLM derived.
 */

/**
 * Generate a clear explanation for the agent's recommendation.
 *
 * @param {Object} bestAction Recommended best action object
 * @param {Array} allEvaluations Matrix of all action evaluations
 * @param {number} baseProbability Natural ML booking probability
 * @param {number} historicalFillRate Historical fill rate percentage
 * @param {Object} slot Slot details
 * @returns {string} Human-readable reason
 */
function generateExplanation(bestAction, allEvaluations, baseProbability, historicalFillRate, slot) {
  const baseProbPct = (baseProbability * 100).toFixed(1);
  const doNothing = allEvaluations.find(a => a.action === 'DO_NOTHING');
  const doNothingProfit = doNothing ? doNothing.expectedProfit : 0;

  if (bestAction.action === 'DO_NOTHING') {
    if (slot.period === 'PEAK') {
      return `Natural booking probability is high (${baseProbPct}%) for peak hours. Taking action or offering discounts is unnecessary and would reduce total profit below baseline (₹${bestAction.expectedProfit}).`;
    }
    return `Natural booking probability is already sufficient (${baseProbPct}%). Taking action or offering price discounts would incur costs or margin loss that exceed expected revenue uplift. DO_NOTHING yields maximum expected profit (₹${bestAction.expectedProfit}).`;
  }

  if (bestAction.action === 'TARGETED_NOTIFICATION') {
    return `Natural booking demand is low (${baseProbPct}%). Targeted customer notification increases expected booking probability to ${(bestAction.bookingProbability * 100).toFixed(1)}%, delivering highest net expected profit (₹${bestAction.expectedProfit} vs ₹${doNothingProfit} baseline) without discounting full slot price.`;
  }

  if (bestAction.action.startsWith('DISCOUNT_')) {
    return `Slot exhibits significant off-peak underutilization (${historicalFillRate}% historical fill rate). Applying a ${bestAction.discountPercentage}% dynamic discount boosts expected booking probability to ${(bestAction.bookingProbability * 100).toFixed(1)}%, yielding the highest expected profit (₹${bestAction.expectedProfit} vs ₹${doNothingProfit} baseline) under arena business constraints.`;
  }

  return `Action ${bestAction.label} achieves the highest expected profit (₹${bestAction.expectedProfit}) among all valid options.`;
}

module.exports = {
  generateExplanation,
};

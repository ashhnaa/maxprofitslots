/**
 * profitOptimizationAgent.js
 *
 * AI PROFIT OPTIMIZATION AGENT (ORCHESTRATOR)
 * ===========================================
 *
 * Orchestrates the end-to-end profit optimization workflow:
 *
 *   OBSERVE → ANALYZE HISTORY → PREDICT → RETRIEVE RULES → VALIDATE ACTIONS → EVALUATE → OPTIMIZE → EXPLAIN → RECOMMEND → TARGET CUSTOMERS
 *
 * Guarantees zero direct SQL access by routing all slot operations, history,
 * predictions, and policy checks through standardized tool interfaces.
 */

const agentTools = require('./agentTools');
const { generateExplanation } = require('./decisionExplainer');
const customerTargetingService = require('../customerTargetingService');

class ProfitOptimizationAgent {

  /**
   * Run the profit optimization agent workflow for a given slot.
   *
   * @param {number} slotId
   * @returns {Promise<Object>} Agent decision payload with transparent trace log and grounding metadata
   */
  async runOptimization(slotId) {
    const trace = [];

    // STEP 1 — OBSERVE
    trace.push(`STEP 1 (OBSERVE): Receiving request for slotId ${slotId}`);
    const slot = await agentTools.getSlotDetails(slotId);
    trace.push(`Observed slot #${slot.id} [${slot.sport} | ${slot.date} ${slot.startTime} | Period: ${slot.period} | Normal Price: ₹${slot.normalPrice} | Status: ${slot.status}]`);

    if (slot.status !== 'AVAILABLE') {
      trace.push(`[REJECTED] Slot #${slot.id} status is '${slot.status}'. Optimization is restricted to vacant (AVAILABLE) slots.`);
      const err = new Error(`Slot #${slot.id} status is '${slot.status}'. Profit optimization is only applicable to vacant (AVAILABLE) slots.`);
      err.status = 400;
      err.trace = trace;
      throw err;
    }

    // STEP 2 — ANALYZE HISTORY
    trace.push('STEP 2 (ANALYZE HISTORY): Querying historical demand statistics via Booking Provider');
    const historicalFillRate = await agentTools.getHistoricalPerformance(slot);
    trace.push(`Retrieved historical fill rate: ${historicalFillRate}% for this pattern`);

    // STEP 3 — PREDICT NATURAL DEMAND
    trace.push('STEP 3 (PREDICT): Invoking RandomForest ML model for natural demand estimation');
    const bookingProbability = await agentTools.getNaturalDemandPrediction(slot, historicalFillRate);
    trace.push(`Predicted natural booking probability P(natural | do_nothing) = ${(bookingProbability * 100).toFixed(1)}%`);

    // STEP 4 — RETRIEVE GROUNDED ARENA BUSINESS RULES
    trace.push(`STEP 4 (RETRIEVE RULES): Querying grounded business policy knowledge for Arena ID ${slot.arenaId}`);
    const rules = await agentTools.getArenaRules(slot);
    trace.push(`Retrieved policy from '${rules.policySource}' (Max discount: ${rules.maxDiscountPercentage}%, Peak discounts: ${rules.allowPeakDiscounts}, Weekend discounts: ${rules.allowWeekendDiscounts}, Notification cost: ₹${rules.notificationCost})`);

    // STEP 5 — VALIDATE ACTIONS & EVALUATE REVENUE/PROFIT
    trace.push('STEP 5 (VALIDATE & EVALUATE): Validating candidate actions against grounded policy rules & computing expected net profit');
    const actionEvaluations = agentTools.evaluateActions(slot, rules, bookingProbability);
    actionEvaluations.forEach(a => {
      if (a.isValid) {
        trace.push(`Evaluated [${a.action}]: P(book)=${(a.bookingProbability * 100).toFixed(1)}%, Final Price=₹${a.finalPrice}, Cost=₹${a.actionCost} -> Exp Revenue=₹${a.expectedRevenue}, Exp Profit=₹${a.expectedProfit}`);
      } else {
        trace.push(`Evaluated [${a.action}]: REJECTED BY POLICY (${a.invalidationReason})`);
      }
    });

    const rejectedActions = actionEvaluations
      .filter(a => !a.isValid)
      .map(a => ({
        action: a.action,
        label: a.label,
        reason: a.invalidationReason,
        violatingPolicy: a.violatingPolicy || 'Arena Business Policy',
      }));

    // STEP 6 — OPTIMIZE PROFIT
    trace.push('STEP 6 (OPTIMIZE PROFIT): Selecting valid action with MAXIMUM EXPECTED PROFIT');
    const bestAction = agentTools.selectBestAction(actionEvaluations);
    trace.push(`Selected profit-maximizing valid action: '${bestAction.action}' (Expected Profit: ₹${bestAction.expectedProfit})`);

    // STEP 7 — DECISION EXPLANATION
    trace.push('STEP 7 (EXPLAIN): Generating deterministic financial decision explanation');
    const reason = generateExplanation(bestAction, actionEvaluations, bookingProbability, historicalFillRate, slot);

    // STEP 8 — CUSTOMER TARGETING (ONLY IF TARGETED_NOTIFICATION)
    let targetCustomers = [];
    if (bestAction.action === 'TARGETED_NOTIFICATION') {
      trace.push('STEP 8 (TARGET CUSTOMERS): Action is TARGETED_NOTIFICATION. Invoking Customer Targeting Engine for top relevant customers');
      const targetingResult = await customerTargetingService.getTargetCustomers(slot.id);
      targetCustomers = targetingResult.customers;
      trace.push(`Identified ${targetCustomers.length} top target customer(s) based on historical sport, arena, and time preferences`);
    } else {
      trace.push(`STEP 8 (CUSTOMER TARGETING): Action is '${bestAction.action}'. Customer targeting skipped to optimize marketing cost.`);
    }

    // STEP 9 — RETURN RECOMMENDATION & TRACE
    trace.push(`STEP 9 (RECOMMEND): Agent decision complete for slot #${slot.id}`);

    const formattedActions = actionEvaluations.map(a => ({
      action: a.action,
      label: a.label,
      isValid: a.isValid,
      invalidationReason: a.invalidationReason || null,
      violatingPolicy: a.violatingPolicy || null,
      bookingProbability: a.bookingProbability,
      discountPercentage: a.discountPercentage,
      finalPrice: a.finalPrice,
      expectedRevenue: a.expectedRevenue,
      actionCost: a.actionCost,
      expectedProfit: a.expectedProfit,
    }));

    return {
      success: true,
      data: {
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
        bookingProbability,
        rules: {
          arenaId: rules.arenaId,
          arenaName: rules.arenaName,
          maxDiscountPercentage: rules.maxDiscountPercentage,
          allowPeakDiscounts: rules.allowPeakDiscounts,
          allowWeekendDiscounts: rules.allowWeekendDiscounts,
          notificationCost: rules.notificationCost,
          minimumFinalPrice: rules.minimumFinalPrice,
          isGroundedPolicy: rules.isGroundedPolicy,
          policySource: rules.policySource,
        },
        grounding: {
          isGroundedPolicy: rules.isGroundedPolicy,
          policySource: rules.policySource,
          sourceDocuments: rules.sourceDocuments || [rules.policySource],
          rulesUsed: rules.rulesUsed || [],
          rejectedActions,
        },
        actions: formattedActions,
        recommendedAction: bestAction.action,
        recommendedActionLabel: bestAction.label,
        expectedRevenue: bestAction.expectedRevenue,
        expectedProfit: bestAction.expectedProfit,
        actionCost: bestAction.actionCost,
        reason,
        targetCustomers,
        trace,
      },
    };
  }
}

module.exports = new ProfitOptimizationAgent();

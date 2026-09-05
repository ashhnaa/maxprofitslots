/**
 * actionTools.js
 *
 * SIMULATED ACTION EXECUTION TOOLS (PLACEHOLDERS)
 * ===============================================
 *
 * These tools represent future automated execution actions (e.g. triggering
 * SMS/push gateways or updating external booking system prices).
 *
 * CRITICAL RULE:
 * Currently, these functions DO NOT execute real external calls or alter live bookings.
 * They return simulated status payloads to maintain safe architectural boundaries.
 */

async function sendCustomerNotification(slotId, customerIds = []) {
  return {
    simulated: true,
    action: 'TARGETED_NOTIFICATION',
    slotId,
    targetCount: customerIds.length,
    status: 'not_executed',
    message: 'Simulation mode active. Notification dispatch skipped.',
    timestamp: new Date().toISOString(),
  };
}

async function applyDiscount(slotId, discountPercentage) {
  return {
    simulated: true,
    action: 'APPLY_DISCOUNT',
    slotId,
    discountPercentage,
    status: 'not_executed',
    message: 'Simulation mode active. Slot price modification skipped.',
    timestamp: new Date().toISOString(),
  };
}

async function createPromotion(slotId, promoCode) {
  return {
    simulated: true,
    action: 'CREATE_PROMOTION',
    slotId,
    promoCode,
    status: 'not_executed',
    message: 'Simulation mode active. Campaign creation skipped.',
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  sendCustomerNotification,
  applyDiscount,
  createPromotion,
};

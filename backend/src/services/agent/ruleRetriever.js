/**
 * ruleRetriever.js
 *
 * GROUNDED BUSINESS RULE RETRIEVER (RAG ABSTRACTION PLACEHOLDER)
 * ================================================================
 *
 * Provides a clean retrieval interface `getRules(arenaId)` for retrieving
 * arena-specific business constraints, pricing guidelines, discount caps,
 * and outreach policies.
 *
 * Architectural Principle:
 * ------------------------
 * Structured transactional booking data (slots, bookings, prices) comes from
 * the Booking Data Provider / SQL.
 * Unstructured/semi-structured business rules & policies come from this
 * retriever interface.
 *
 * Currently: Returns structured demo configuration rules per arena.
 * Future Extension: This module can be replaced with a real RAG retriever:
 *   Arena Policy Documents → Embeddings → Vector Database → Retriever
 */

const actionConfig = require('../../config/actionConfig');

/**
 * Retrieve grounded business rules for a specific arena.
 *
 * @param {number} arenaId
 * @returns {Promise<Object>} Structured rules
 */
async function getRules(arenaId) {
  const parsedArenaId = parseInt(arenaId, 10) || 1;

  // Demo Arena-specific rule variations
  let arenaSpecificConfig = {
    notificationCost: 15,
    maxDiscountPercentage: actionConfig.maxDiscountPercentage,
    allowPeakDiscounts: actionConfig.allowPeakDiscounts,
  };

  if (parsedArenaId === 2) {
    arenaSpecificConfig.notificationCost = 12; // Urban Turf Arena bulk notification rate
  } else if (parsedArenaId === 3) {
    arenaSpecificConfig.notificationCost = 18; // Champions Sports Zone premium SMS rate
  }

  return {
    arenaId: parsedArenaId,
    maxDiscountPercentage: arenaSpecificConfig.maxDiscountPercentage,
    allowPeakDiscounts: arenaSpecificConfig.allowPeakDiscounts,
    notificationCost: arenaSpecificConfig.notificationCost,
    allowedActions: [
      'DO_NOTHING',
      'TARGETED_NOTIFICATION',
      'DISCOUNT_10',
      'DISCOUNT_20',
    ],
    isGroundedPolicy: true,
    policySource: 'Configured Arena Business Rules (RAG Abstraction Placeholder)',
    retrievedAt: new Date().toISOString(),
  };
}

module.exports = {
  getRules,
};

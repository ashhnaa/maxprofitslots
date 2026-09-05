/**
 * actionConfig.js
 *
 * CENTRALIZED ACTION ASSUMPTIONS & BUSINESS CONSTRAINTS
 * ====================================================
 *
 * Defines candidate interventions, uplift assumptions, discount rules,
 * and cost parameters for profit evaluation.
 *
 * IMPORTANT:
 * The probability uplifts and costs are DEMONSTRATION ASSUMPTIONS for
 * the current hackathon MVP. In a production system, these parameters
 * would be dynamically learned from real intervention/campaign data.
 */

module.exports = {
  // Global Business Rules
  maxDiscountPercentage: 20, // Maximum allowed discount percentage
  allowPeakDiscounts: false, // Strict business rule: No discounts during PEAK hours

  // Candidate Actions Configuration
  actions: {
    DO_NOTHING: {
      type: 'DO_NOTHING',
      label: 'Do Nothing (Baseline)',
      description: 'Maintain normal pricing with no promotion or outreach.',
      probabilityUplift: 0.0,
      discountPercentage: 0,
      actionCost: 0,
      allowedInPeak: true,
    },
    TARGETED_NOTIFICATION: {
      type: 'TARGETED_NOTIFICATION',
      label: 'Targeted Customer Notification',
      description: 'Send targeted push/SMS notification to historical players.',
      probabilityUplift: 0.15, // +15% demand uplift demonstration assumption
      discountPercentage: 0,
      actionCost: 15, // ₹15 messaging delivery cost
      allowedInPeak: true,
    },
    DISCOUNT_10: {
      type: 'DISCOUNT_10',
      label: '10% Dynamic Discount',
      description: 'Apply 10% dynamic price discount to vacant slot.',
      probabilityUplift: 0.20, // +20% demand uplift demonstration assumption
      discountPercentage: 10,
      actionCost: 0,
      allowedInPeak: false, // Invalid during peak
    },
    DISCOUNT_20: {
      type: 'DISCOUNT_20',
      label: '20% Dynamic Discount',
      description: 'Apply 20% dynamic price discount to vacant slot.',
      probabilityUplift: 0.35, // +35% demand uplift demonstration assumption
      discountPercentage: 20,
      actionCost: 0,
      allowedInPeak: false, // Invalid during peak
    },
  },
};

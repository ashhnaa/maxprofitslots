/**
 * customerTargetingService.js
 *
 * CUSTOMER TARGETING ENGINE
 * =========================
 *
 * Identifies customers who are most likely to book a selected vacant slot based on
 * their historical booking behavior.
 *
 * Core Concept:
 *   When the AI Profit Agent recommends 'TARGETED_NOTIFICATION', this service
 *   calculates a deterministic relevance score (0–100) for customers and ranks them.
 *
 * Scored Features (Max 100 Points):
 *   - Sport Preference Match:    Up to 40 pts
 *   - Arena Preference Match:    Up to 25 pts
 *   - Day-of-Week Match:         Up to 15 pts
 *   - Time Window Match (±2h):   Up to 15 pts
 *   - Recency Bonus (last 30d):   Up to  5 pts
 *
 * IMPORTANT ARCHITECTURE RULES:
 *   1. Zero raw SQL access — queries go exclusively through BookingProvider.
 *   2. Zero hardcoded scores or reasons — all scores are derived from historical data.
 *   3. Excludes customers with 0 booking history or invalid records.
 */

const provider = require('../config/providerConfig');

// Configurable limit via process.env or fallback default 10
const DEFAULT_TARGET_LIMIT = parseInt(process.env.TARGET_CUSTOMER_LIMIT || '10', 10);

class CustomerTargetingService {

  /**
   * Determine top relevant customers for a given slot.
   *
   * @param {number|string} slotId
   * @param {{ limit?: number }} options
   * @returns {Promise<Object>} Slot details, targetCount, and ranked customers
   */
  async getTargetCustomers(slotId, options = {}) {
    const parsedSlotId = parseInt(slotId, 10);

    if (isNaN(parsedSlotId)) {
      const err = new Error('Invalid slot ID format.');
      err.status = 400;
      throw err;
    }

    // Retrieve slot through BookingProvider
    const slot = await provider.getSlotById(parsedSlotId);
    if (!slot) {
      const err = new Error(`Slot #${parsedSlotId} not found.`);
      err.status = 404;
      throw err;
    }

    if (slot.status !== 'AVAILABLE') {
      const err = new Error(`Slot #${parsedSlotId} status is '${slot.status}'. Customer targeting is only available for vacant (AVAILABLE) slots.`);
      err.status = 400;
      throw err;
    }

    // Retrieve all customers
    const customers = await provider.getCustomers({ limit: 500 });
    if (!customers || customers.length === 0) {
      return {
        slot,
        targetCount: 0,
        customers: [],
      };
    }

    const slotDow = new Date(slot.date).getDay(); // 0 = Sun, 6 = Sat
    const slotStartHour = parseInt(slot.startTime.split(':')[0], 10);

    const scoredCustomers = [];

    // Evaluate each customer based on their historical booking records
    for (const customer of customers) {
      const history = await provider.getCustomerBookingHistory(customer.id, { limit: 100 });
      if (!history || history.length === 0) {
        // Exclude customers with no booking history
        continue;
      }

      const scoreResult = this.calculateCustomerRelevance(history, {
        sport: slot.sport,
        arenaId: slot.arenaId,
        dow: slotDow,
        startHour: slotStartHour,
      });

      if (scoreResult.score > 0) {
        scoredCustomers.push({
          customerId: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          targetScore: scoreResult.score,
          reasons: scoreResult.reasons,
          totalHistoricalBookings: history.length,
        });
      }
    }

    // Sort by targetScore descending, then by total historical bookings
    scoredCustomers.sort((a, b) => b.targetScore - a.targetScore || b.totalHistoricalBookings - a.totalHistoricalBookings);

    // Apply configurable limit
    const limit = Math.min(parseInt(options.limit || DEFAULT_TARGET_LIMIT, 10), 50);
    const topTargets = scoredCustomers.slice(0, limit);

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
      targetCount: topTargets.length,
      customers: topTargets,
    };
  }

  /**
   * Deterministic scoring calculation based on customer history and slot features.
   *
   * @param {Array} history Array of historical booking objects
   * @param {{ sport: string, arenaId: number, dow: number, startHour: number }} slotTarget
   * @returns {{ score: number, reasons: Array<string> }}
   */
  calculateCustomerRelevance(history, slotTarget) {
    const totalBookings = history.length;
    if (totalBookings === 0) return { score: 0, reasons: [] };

    let sportMatchCount = 0;
    let arenaMatchCount = 0;
    let dowMatchCount = 0;
    let timeWindowMatchCount = 0;
    let mostRecentDate = null;

    const now = new Date();

    history.forEach(b => {
      // Sport match
      if (b.sport && b.sport.toLowerCase() === slotTarget.sport.toLowerCase()) {
        sportMatchCount++;
      }

      // Arena match
      if (b.arenaId === slotTarget.arenaId) {
        arenaMatchCount++;
      }

      // Day of week match
      if (b.date) {
        const bDow = new Date(b.date).getDay();
        if (bDow === slotTarget.dow) {
          dowMatchCount++;
        }

        const bDate = new Date(b.date);
        if (!mostRecentDate || bDate > mostRecentDate) {
          mostRecentDate = bDate;
        }
      }

      // Time window match (±2 hours)
      if (b.startTime) {
        const bHour = parseInt(b.startTime.split(':')[0], 10);
        if (Math.abs(bHour - slotTarget.startHour) <= 2) {
          timeWindowMatchCount++;
        }
      }
    });

    // 1. Sport Score (Max 40 pts)
    const sportRatio = sportMatchCount / totalBookings;
    const sportScore = Math.round(sportRatio * 40);

    // 2. Arena Score (Max 25 pts)
    const arenaRatio = arenaMatchCount / totalBookings;
    const arenaScore = Math.round(arenaRatio * 25);

    // 3. Day of Week Score (Max 15 pts)
    const dowRatio = dowMatchCount / totalBookings;
    const dowScore = Math.round(dowRatio * 15);

    // 4. Time Window Score (Max 15 pts)
    const timeRatio = timeWindowMatchCount / totalBookings;
    const timeScore = Math.round(timeRatio * 15);

    // 5. Recency Bonus (Max 5 pts)
    let recencyScore = 0;
    if (mostRecentDate) {
      const daysDiff = (now - mostRecentDate) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 30) recencyScore = 5;
      else if (daysDiff <= 60) recencyScore = 3;
      else if (daysDiff <= 90) recencyScore = 1;
    }

    const rawScore = sportScore + arenaScore + dowScore + timeScore + recencyScore;
    const score = Math.min(100, Math.max(0, rawScore));

    // Generate natural behavioral reasons
    const reasons = [];

    if (sportMatchCount > 0) {
      const sportPct = Math.round((sportMatchCount / totalBookings) * 100);
      reasons.push(`Frequently books ${slotTarget.sport} (${sportMatchCount} bookings, ${sportPct}%)`);
    }

    if (arenaMatchCount > 0) {
      const arenaPct = Math.round((arenaMatchCount / totalBookings) * 100);
      reasons.push(`Prefers Arena #${slotTarget.arenaId} (${arenaMatchCount} bookings, ${arenaPct}%)`);
    }

    if (dowMatchCount > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      reasons.push(`Often books on ${dayNames[slotTarget.dow]}s (${dowMatchCount} bookings)`);
    }

    if (timeWindowMatchCount > 0) {
      reasons.push(`Has booked around ${slotTarget.startHour}:00 (${timeWindowMatchCount} bookings within ±2h)`);
    }

    if (recencyScore > 0) {
      reasons.push(`Active customer (recent booking in last 30–60 days)`);
    }

    return {
      score,
      reasons: reasons.length ? reasons : ['General historical customer'],
    };
  }
}

module.exports = new CustomerTargetingService();

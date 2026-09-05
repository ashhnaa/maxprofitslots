/**
 * BookingProvider.js
 *
 * BOOKING DATA PROVIDER — CONTRACT / INTERFACE
 * ============================================
 *
 * This is the formal contract that every BookingProvider implementation
 * must satisfy.  The rest of the application (analytics, ML pipeline,
 * decision engine, agent) only ever talks to THIS interface — never to
 * a raw database or a third-party API directly.
 *
 * Why does this exist?
 * ---------------------
 * Sports arena owners already have their own booking management systems.
 * We do NOT want to force them to migrate.  Instead we wrap whichever
 * system they use behind this standard interface so that our Profit
 * Optimization logic never changes regardless of where the data comes from.
 *
 * Current implementation:  DemoBookingProvider  (PostgreSQL synthetic data)
 * Future implementation:   ExternalBookingProvider  (real arena booking API)
 *
 * How to add a new provider
 * --------------------------
 *  1. Create a new class that extends BookingProvider.
 *  2. Override every method below.
 *  3. Register it in config/providerConfig.js.
 *  4. Set BOOKING_PROVIDER=<name> in .env.
 *
 * Normalized return shapes
 * -------------------------
 * Every method returns plain JavaScript objects whose keys follow
 * camelCase and are independent of the underlying storage schema.
 * This means the rest of the app never breaks when we change the DB
 * schema or switch to an external API.
 *
 *   Arena:
 *     { id, name, location, createdAt }
 *
 *   Slot:
 *     { id, arenaId, sport, date, startTime, endTime,
 *       durationMinutes, normalPrice, period, status, createdAt }
 *
 *   Booking:
 *     { id, slotId, customerId, bookingTime, originalPrice,
 *       discountPercentage, discountAmount, finalPrice,
 *       durationMinutes, status, createdAt }
 *
 *   Customer:
 *     { id, name, email, phone, createdAt }
 *
 *   BookingStatistics:
 *     { totalSlots, bookedSlots, availableSlots, fillRate,
 *       peakFillRate, nonPeakFillRate, totalRevenue,
 *       avgBookingValue, cancellationRate, byPeriod, bySport }
 */

class BookingProvider {

  /**
   * Return all arenas.
   * @returns {Promise<Arena[]>}
   */
  async getArenas() {
    throw new Error('BookingProvider.getArenas() must be implemented.');
  }

  /**
   * Return all slots with status = AVAILABLE.
   * @param {{ arenaId?: number, date?: string, sport?: string, period?: string }} filters
   * @returns {Promise<Slot[]>}
   */
  async getAvailableSlots(filters = {}) {
    throw new Error('BookingProvider.getAvailableSlots() must be implemented.');
  }

  /**
   * Return a single slot by ID, or null if not found.
   * @param {number} slotId
   * @returns {Promise<Slot|null>}
   */
  async getSlotById(slotId) {
    throw new Error('BookingProvider.getSlotById() must be implemented.');
  }

  /**
   * Return all slots for a specific date (all statuses).
   * @param {string} date  YYYY-MM-DD
   * @param {{ arenaId?: number, sport?: string, period?: string, status?: string }} filters
   * @returns {Promise<Slot[]>}
   */
  async getSlotsByDate(date, filters = {}) {
    throw new Error('BookingProvider.getSlotsByDate() must be implemented.');
  }

  /**
   * Return all bookings for a specific slot.
   * @param {number} slotId
   * @returns {Promise<Booking[]>}
   */
  async getBookingsForSlot(slotId) {
    throw new Error('BookingProvider.getBookingsForSlot() must be implemented.');
  }

  /**
   * Return historical bookings with optional filters.
   * @param {{ arenaId?: number, sport?: string, period?: string,
   *            status?: string, fromDate?: string, toDate?: string,
   *            limit?: number, offset?: number }} filters
   * @returns {Promise<Booking[]>}
   */
  async getHistoricalBookings(filters = {}) {
    throw new Error('BookingProvider.getHistoricalBookings() must be implemented.');
  }

  /**
   * Return all customers (optionally scoped to an arena via join).
   * @param {{ limit?: number, offset?: number }} options
   * @returns {Promise<Customer[]>}
   */
  async getCustomers(options = {}) {
    throw new Error('BookingProvider.getCustomers() must be implemented.');
  }

  /**
   * Return a single customer by ID, or null if not found.
   * @param {number} customerId
   * @returns {Promise<Customer|null>}
   */
  async getCustomerById(customerId) {
    throw new Error('BookingProvider.getCustomerById() must be implemented.');
  }

  /**
   * Return full booking history for a customer.
   * @param {number} customerId
   * @param {{ limit?: number, status?: string }} options
   * @returns {Promise<Booking[]>}
   */
  async getCustomerBookingHistory(customerId, options = {}) {
    throw new Error('BookingProvider.getCustomerBookingHistory() must be implemented.');
  }

  /**
   * Return aggregated booking statistics useful for the optimizer.
   * @param {{ arenaId?: number, fromDate?: string, toDate?: string }} filters
   * @returns {Promise<BookingStatistics>}
   */
  async getBookingStatistics(filters = {}) {
    throw new Error('BookingProvider.getBookingStatistics() must be implemented.');
  }
}

module.exports = BookingProvider;

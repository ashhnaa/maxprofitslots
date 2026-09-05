/**
 * ExternalBookingProvider.js
 *
 * FUTURE EXTERNAL BOOKING SYSTEM ADAPTER
 * =======================================
 *
 * This stub represents how a real arena booking system (e.g. Playo,
 * SportzBuddy, PlayAll, or a custom arena ERP) would integrate with
 * the Sports Turf Profit Optimizer.
 *
 * Architectural Principle:
 * ------------------------
 * Arena owners DO NOT replace their booking software. Instead, they provide
 * read/write API credentials (or webhooks). An implementation of
 * ExternalBookingProvider translates the third-party API payloads into the
 * standard normalized shapes defined by BookingProvider.
 *
 * How to activate in production:
 * ------------------------------
 *  1. Implement the HTTP client calls inside the methods below.
 *  2. Map external JSON fields → BookingProvider camelCase objects.
 *  3. Set `BOOKING_PROVIDER=external` in `backend/.env`.
 */

const BookingProvider = require('./BookingProvider');

class ExternalBookingProvider extends BookingProvider {
  constructor(apiConfig = {}) {
    super();
    this.baseUrl = apiConfig.baseUrl || process.env.EXTERNAL_BOOKING_API_URL;
    this.apiKey  = apiConfig.apiKey  || process.env.EXTERNAL_BOOKING_API_KEY;
  }

  async getArenas() {
    throw new Error('ExternalBookingProvider.getArenas() not connected to live external API.');
  }

  async getAvailableSlots(filters = {}) {
    throw new Error('ExternalBookingProvider.getAvailableSlots() not connected to live external API.');
  }

  async getSlotById(slotId) {
    throw new Error('ExternalBookingProvider.getSlotById() not connected to live external API.');
  }

  async getSlotsByDate(date, filters = {}) {
    throw new Error('ExternalBookingProvider.getSlotsByDate() not connected to live external API.');
  }

  async getBookingsForSlot(slotId) {
    throw new Error('ExternalBookingProvider.getBookingsForSlot() not connected to live external API.');
  }

  async getHistoricalBookings(filters = {}) {
    throw new Error('ExternalBookingProvider.getHistoricalBookings() not connected to live external API.');
  }

  async getCustomers(options = {}) {
    throw new Error('ExternalBookingProvider.getCustomers() not connected to live external API.');
  }

  async getCustomerById(customerId) {
    throw new Error('ExternalBookingProvider.getCustomerById() not connected to live external API.');
  }

  async getCustomerBookingHistory(customerId, options = {}) {
    throw new Error('ExternalBookingProvider.getCustomerBookingHistory() not connected to live external API.');
  }

  async getBookingStatistics(filters = {}) {
    throw new Error('ExternalBookingProvider.getBookingStatistics() not connected to live external API.');
  }

  async getAnalyticsSummary(filters = {}) {
    throw new Error('ExternalBookingProvider.getAnalyticsSummary() not connected to live external API.');
  }

  async getUtilizationAnalytics(filters = {}) {
    throw new Error('ExternalBookingProvider.getUtilizationAnalytics() not connected to live external API.');
  }

  async getSportAnalytics(filters = {}) {
    throw new Error('ExternalBookingProvider.getSportAnalytics() not connected to live external API.');
  }

  async getArenaAnalytics(filters = {}) {
    throw new Error('ExternalBookingProvider.getArenaAnalytics() not connected to live external API.');
  }

  async getDayOfWeekAnalytics(filters = {}) {
    throw new Error('ExternalBookingProvider.getDayOfWeekAnalytics() not connected to live external API.');
  }

  async getTimeAnalytics(filters = {}) {
    throw new Error('ExternalBookingProvider.getTimeAnalytics() not connected to live external API.');
  }

  async getOffPeakOpportunities(filters = {}) {
    throw new Error('ExternalBookingProvider.getOffPeakOpportunities() not connected to live external API.');
  }
}

module.exports = ExternalBookingProvider;

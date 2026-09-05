/**
 * ExternalBookingProvider.js
 *
 * FUTURE EXTERNAL BOOKING SYSTEM ADAPTER
 * =======================================
 *
 * This stub represents how a real arena booking system (e.g. Playo,
 * SportzBuddy, PlayAll, or a custom arena ERP) would be integrated.
 *
 * To activate this provider:
 *   1. Set BOOKING_PROVIDER=external in backend/.env
 *   2. Set EXTERNAL_BOOKING_API_URL, EXTERNAL_BOOKING_API_KEY, etc.
 *   3. Implement every method below by calling the real external API
 *      and mapping its response to the normalized shapes defined in
 *      BookingProvider.js.
 *
 * ==================================================================
 * REQUIRED EXTERNAL API CONTRACT
 * ==================================================================
 *
 * The external booking system must expose (or be adaptable to) at
 * least the following endpoints/capabilities.  The exact format may
 * differ — that is what this adapter normalizes away.
 *
 *  GET /arenas
 *    → list of arenas with id, name, location
 *
 *  GET /slots?date=YYYY-MM-DD&arenaId=&sport=&status=
 *    → list of slots for a given day
 *
 *  GET /slots/:id
 *    → single slot detail
 *
 *  GET /bookings?slotId=&customerId=&fromDate=&toDate=&status=
 *    → list of bookings (supports date-range filtering for history)
 *
 *  GET /customers/:id
 *    → customer profile
 *
 *  GET /customers/:id/bookings
 *    → booking history for a customer
 *
 * Authentication:
 *   Bearer token / API key passed in Authorization header.
 *   Configure via EXTERNAL_BOOKING_API_KEY in .env.
 *
 * Rate limits:
 *   Implement caching (Redis / in-memory) here if the external API
 *   enforces rate limits.  The rest of the application should be
 *   unaware of this caching.
 *
 * Webhook / push vs polling:
 *   If the external system pushes booking events via webhook, handle
 *   the webhook in a separate route and update a local cache here.
 *
 * ==================================================================
 * DATA MAPPING EXAMPLE
 * ==================================================================
 *
 * External API response:
 *   {
 *     "slot_id": "abc-123",
 *     "court":   "Football Ground A",
 *     "time_from": "2026-09-10T17:00:00",
 *     "time_to":   "2026-09-10T18:00:00",
 *     "rate": 1200,
 *     "booking_status": "open"
 *   }
 *
 * Normalized Slot (what the rest of our app sees):
 *   {
 *     id:              "abc-123",
 *     arenaId:         1,
 *     sport:           "Football",
 *     date:            "2026-09-10",
 *     startTime:       "17:00:00",
 *     endTime:         "18:00:00",
 *     durationMinutes: 60,
 *     normalPrice:     1200,
 *     period:          "PEAK",
 *     status:          "AVAILABLE"
 *   }
 *
 * ==================================================================
 */

const BookingProvider = require('./BookingProvider');

class ExternalBookingProvider extends BookingProvider {

  constructor() {
    super();
    this.apiUrl = process.env.EXTERNAL_BOOKING_API_URL;
    this.apiKey = process.env.EXTERNAL_BOOKING_API_KEY;

    if (!this.apiUrl) {
      console.warn(
        '[ExternalBookingProvider] EXTERNAL_BOOKING_API_URL is not set. ' +
        'All calls will throw NotImplementedError until configured.'
      );
    }
  }

  _notImplemented(method) {
    throw new Error(
      `ExternalBookingProvider.${method}() is not yet implemented. ` +
      'Set BOOKING_PROVIDER=demo to use the PostgreSQL demo provider, ' +
      'or implement this method to connect to your booking API.'
    );
  }

  async getArenas()                              { this._notImplemented('getArenas'); }
  async getAvailableSlots(filters)               { this._notImplemented('getAvailableSlots'); }
  async getSlotById(slotId)                      { this._notImplemented('getSlotById'); }
  async getSlotsByDate(date, filters)            { this._notImplemented('getSlotsByDate'); }
  async getBookingsForSlot(slotId)               { this._notImplemented('getBookingsForSlot'); }
  async getHistoricalBookings(filters)           { this._notImplemented('getHistoricalBookings'); }
  async getCustomers(options)                    { this._notImplemented('getCustomers'); }
  async getCustomerById(customerId)              { this._notImplemented('getCustomerById'); }
  async getCustomerBookingHistory(customerId, o) { this._notImplemented('getCustomerBookingHistory'); }
  async getBookingStatistics(filters)            { this._notImplemented('getBookingStatistics'); }
}

module.exports = ExternalBookingProvider;

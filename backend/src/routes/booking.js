/**
 * booking.js — /api/booking/* route handlers
 *
 * All routes talk to the BookingProvider interface only.
 * No database code exists here.
 */

const express  = require('express');
const router   = express.Router();
const provider = require('../config/providerConfig');

// ─── Helpers ─────────────────────────────────────────────────────

function sendError(res, status, message, detail) {
  const body = { status: 'error', message };
  if (detail) body.detail = detail;
  return res.status(status).json(body);
}

function validateDate(dateStr) {
  return dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// ─── GET /api/booking/arenas ──────────────────────────────────────
// Returns all arenas.
router.get('/arenas', async (req, res) => {
  try {
    const arenas = await provider.getArenas();
    res.json({ status: 'ok', count: arenas.length, data: arenas });
  } catch (err) {
    console.error('[GET /arenas]', err.message);
    sendError(res, 500, 'Failed to retrieve arenas.', err.message);
  }
});

// ─── GET /api/booking/slots ───────────────────────────────────────
// Query params: date, arenaId, sport, period, status
// If ?date= is provided, returns slots for that specific date (all statuses).
// Otherwise returns available slots (with optional filters).
router.get('/slots', async (req, res) => {
  try {
    const { date, arenaId, sport, period, status } = req.query;

    // Validate period if provided
    if (period && !['PEAK', 'NON_PEAK'].includes(period.toUpperCase())) {
      return sendError(res, 400, 'Invalid period. Use PEAK or NON_PEAK.');
    }

    // Validate status if provided
    const validStatuses = ['AVAILABLE', 'BOOKED', 'BLOCKED'];
    if (status && !validStatuses.includes(status.toUpperCase())) {
      return sendError(res, 400, `Invalid status. Use: ${validStatuses.join(', ')}.`);
    }

    // Validate arenaId if provided
    if (arenaId && isNaN(parseInt(arenaId, 10))) {
      return sendError(res, 400, 'arenaId must be a number.');
    }

    let slots;
    if (date) {
      if (!validateDate(date)) {
        return sendError(res, 400, 'Invalid date format. Use YYYY-MM-DD.');
      }
      slots = await provider.getSlotsByDate(date, { arenaId, sport, period, status });
    } else {
      slots = await provider.getAvailableSlots({ arenaId, sport, period, date });
    }

    res.json({ status: 'ok', count: slots.length, data: slots });
  } catch (err) {
    console.error('[GET /slots]', err.message);
    sendError(res, 500, 'Failed to retrieve slots.', err.message);
  }
});

// ─── GET /api/booking/slots/:id ───────────────────────────────────
// Returns a single slot by ID. Includes its bookings.
router.get('/slots/:id', async (req, res) => {
  try {
    const slotId = parseInt(req.params.id, 10);
    if (isNaN(slotId)) {
      return sendError(res, 400, 'Slot ID must be a valid number.');
    }

    const slot = await provider.getSlotById(slotId);
    if (!slot) {
      return sendError(res, 404, `Slot with ID ${slotId} not found.`);
    }

    // Attach bookings for this slot
    const bookings = await provider.getBookingsForSlot(slotId);

    res.json({ status: 'ok', data: { ...slot, bookings } });
  } catch (err) {
    console.error('[GET /slots/:id]', err.message);
    sendError(res, 500, 'Failed to retrieve slot.', err.message);
  }
});

// ─── GET /api/booking/bookings ─────────────────────────────────────
// Query params: slotId, arenaId, sport, period, status,
//               fromDate, toDate, limit, offset
router.get('/bookings', async (req, res) => {
  try {
    const { slotId, arenaId, sport, period, status,
            fromDate, toDate, limit, offset } = req.query;

    // Validate dates
    if (fromDate && !validateDate(fromDate)) {
      return sendError(res, 400, 'Invalid fromDate format. Use YYYY-MM-DD.');
    }
    if (toDate && !validateDate(toDate)) {
      return sendError(res, 400, 'Invalid toDate format. Use YYYY-MM-DD.');
    }

    const validStatuses = ['CONFIRMED', 'CANCELLED', 'COMPLETED'];
    if (status && !validStatuses.includes(status.toUpperCase())) {
      return sendError(res, 400, `Invalid status. Use: ${validStatuses.join(', ')}.`);
    }

    const bookings = await provider.getHistoricalBookings({
      slotId, arenaId, sport, period, status,
      fromDate, toDate, limit, offset,
    });

    res.json({ status: 'ok', count: bookings.length, data: bookings });
  } catch (err) {
    console.error('[GET /bookings]', err.message);
    sendError(res, 500, 'Failed to retrieve bookings.', err.message);
  }
});

// ─── GET /api/booking/customers ────────────────────────────────────
// Query params: limit, offset
router.get('/customers', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const customers = await provider.getCustomers({ limit, offset });
    res.json({ status: 'ok', count: customers.length, data: customers });
  } catch (err) {
    console.error('[GET /customers]', err.message);
    sendError(res, 500, 'Failed to retrieve customers.', err.message);
  }
});

// ─── GET /api/booking/customers/:id ───────────────────────────────
// Returns a single customer.
router.get('/customers/:id', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) {
      return sendError(res, 400, 'Customer ID must be a valid number.');
    }

    const customer = await provider.getCustomerById(customerId);
    if (!customer) {
      return sendError(res, 404, `Customer with ID ${customerId} not found.`);
    }

    res.json({ status: 'ok', data: customer });
  } catch (err) {
    console.error('[GET /customers/:id]', err.message);
    sendError(res, 500, 'Failed to retrieve customer.', err.message);
  }
});

// ─── GET /api/booking/customers/:id/history ───────────────────────
// Returns full booking history for a customer.
// Query params: limit, status
router.get('/customers/:id/history', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) {
      return sendError(res, 400, 'Customer ID must be a valid number.');
    }

    // Verify customer exists
    const customer = await provider.getCustomerById(customerId);
    if (!customer) {
      return sendError(res, 404, `Customer with ID ${customerId} not found.`);
    }

    const { limit, status } = req.query;
    const history = await provider.getCustomerBookingHistory(customerId, { limit, status });

    res.json({
      status:   'ok',
      customer,
      count:    history.length,
      data:     history,
    });
  } catch (err) {
    console.error('[GET /customers/:id/history]', err.message);
    sendError(res, 500, 'Failed to retrieve customer booking history.', err.message);
  }
});

// ─── GET /api/booking/statistics ──────────────────────────────────
// Returns aggregated booking stats.
// Query params: arenaId, fromDate, toDate
router.get('/statistics', async (req, res) => {
  try {
    const { arenaId, fromDate, toDate } = req.query;

    if (fromDate && !validateDate(fromDate)) {
      return sendError(res, 400, 'Invalid fromDate format. Use YYYY-MM-DD.');
    }
    if (toDate && !validateDate(toDate)) {
      return sendError(res, 400, 'Invalid toDate format. Use YYYY-MM-DD.');
    }

    const stats = await provider.getBookingStatistics({ arenaId, fromDate, toDate });
    res.json({ status: 'ok', data: stats });
  } catch (err) {
    console.error('[GET /statistics]', err.message);
    sendError(res, 500, 'Failed to retrieve statistics.', err.message);
  }
});

module.exports = router;

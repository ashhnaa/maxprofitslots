/**
 * DemoBookingProvider.js
 *
 * PostgreSQL-backed implementation of BookingProvider.
 *
 * Uses the existing `sports_turf_db` database and the synthetic
 * dataset generated in Step 3. This is the "demo" simulation of
 * what will eventually be a real arena booking system API.
 *
 * Data flow:
 *   PostgreSQL (sports_turf_db)
 *     ↓  raw rows
 *   DemoBookingProvider._normalize*()
 *     ↓  clean camelCase objects
 *   BookingProvider interface
 *     ↓
 *   Routes / Business Logic / Agent
 *
 * IMPORTANT: This class must NEVER be imported directly by agent or
 * optimizer code. Always go through the provider interface via
 * config/providerConfig.js.
 */

const BookingProvider = require('./BookingProvider');
const db = require('../config/database');

// ---------------------------------------------------------------
// Row normalizers — translate raw DB columns → camelCase objects
// These are the ONLY place in the app where raw column names exist.
// ---------------------------------------------------------------

function normalizeArena(row) {
  return {
    id:        row.id,
    name:      row.name,
    location:  row.location,
    createdAt: row.created_at,
  };
}

function normalizeSlot(row) {
  return {
    id:              row.id,
    arenaId:         row.arena_id,
    sport:           row.sport,
    date:            row.date instanceof Date
                       ? row.date.toISOString().split('T')[0]
                       : row.date,
    startTime:       row.start_time,
    endTime:         row.end_time,
    durationMinutes: row.duration_minutes,
    normalPrice:     parseFloat(row.normal_price),
    period:          row.period,
    status:          row.status,
    createdAt:       row.created_at,
  };
}

function normalizeBooking(row) {
  return {
    id:                 row.id,
    slotId:             row.slot_id,
    customerId:         row.customer_id,
    bookingTime:        row.booking_time,
    originalPrice:      parseFloat(row.original_price),
    discountPercentage: parseFloat(row.discount_percentage),
    discountAmount:     parseFloat(row.discount_amount),
    finalPrice:         parseFloat(row.final_price),
    durationMinutes:    row.duration_minutes,
    status:             row.status,
    createdAt:          row.created_at,
  };
}

function normalizeCustomer(row) {
  return {
    id:        row.id,
    name:      row.name,
    email:     row.email,
    phone:     row.phone,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------
// Helper: build a WHERE clause from an object of conditions
// ---------------------------------------------------------------
function buildWhere(conditions) {
  const clauses = [];
  const values  = [];
  let   idx     = 1;

  for (const [col, val] of Object.entries(conditions)) {
    if (val !== undefined && val !== null && val !== '') {
      clauses.push(`${col} = $${idx++}`);
      values.push(val);
    }
  }
  return {
    where:  clauses.length ? 'WHERE ' + clauses.join(' AND ') : '',
    values,
  };
}

// ---------------------------------------------------------------
// DemoBookingProvider
// ---------------------------------------------------------------
class DemoBookingProvider extends BookingProvider {

  // ------------------------------------------------------------------
  // Arenas
  // ------------------------------------------------------------------

  async getArenas() {
    const result = await db.query(
      'SELECT * FROM arenas ORDER BY id'
    );
    return result.rows.map(normalizeArena);
  }

  // ------------------------------------------------------------------
  // Slots
  // ------------------------------------------------------------------

  async getAvailableSlots(filters = {}) {
    const conditions = { status: 'AVAILABLE' };
    if (filters.arenaId) conditions['arena_id'] = parseInt(filters.arenaId, 10);
    if (filters.sport)   conditions['sport']    = filters.sport;
    if (filters.period)  conditions['period']   = filters.period.toUpperCase();
    if (filters.date)    conditions['date']     = filters.date;

    const { where, values } = buildWhere(conditions);
    const sql = `SELECT * FROM slots ${where} ORDER BY date, start_time LIMIT 500`;

    const result = await db.query(sql, values);
    return result.rows.map(normalizeSlot);
  }

  async getSlotById(slotId) {
    const id = parseInt(slotId, 10);
    if (isNaN(id)) return null;

    const result = await db.query(
      'SELECT * FROM slots WHERE id = $1',
      [id]
    );
    return result.rows.length ? normalizeSlot(result.rows[0]) : null;
  }

  async getSlotsByDate(date, filters = {}) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD.');
    }

    const conditions = { date };
    if (filters.arenaId) conditions['arena_id'] = parseInt(filters.arenaId, 10);
    if (filters.sport)   conditions['sport']    = filters.sport;
    if (filters.period)  conditions['period']   = filters.period.toUpperCase();
    if (filters.status)  conditions['status']   = filters.status.toUpperCase();

    const { where, values } = buildWhere(conditions);
    const sql = `SELECT * FROM slots ${where} ORDER BY arena_id, sport, start_time`;

    const result = await db.query(sql, values);
    return result.rows.map(normalizeSlot);
  }

  // ------------------------------------------------------------------
  // Bookings
  // ------------------------------------------------------------------

  async getBookingsForSlot(slotId) {
    const id = parseInt(slotId, 10);
    if (isNaN(id)) return [];

    const result = await db.query(
      'SELECT * FROM bookings WHERE slot_id = $1 ORDER BY booking_time DESC',
      [id]
    );
    return result.rows.map(normalizeBooking);
  }

  async getHistoricalBookings(filters = {}) {
    const clauses = [];
    const values  = [];
    let   idx     = 1;

    if (filters.slotId)   { clauses.push(`b.slot_id = $${idx++}`);   values.push(parseInt(filters.slotId, 10)); }
    if (filters.status)   { clauses.push(`b.status = $${idx++}`);    values.push(filters.status.toUpperCase()); }
    if (filters.sport)    { clauses.push(`s.sport = $${idx++}`);     values.push(filters.sport); }
    if (filters.period)   { clauses.push(`s.period = $${idx++}`);    values.push(filters.period.toUpperCase()); }
    if (filters.arenaId)  { clauses.push(`s.arena_id = $${idx++}`);  values.push(parseInt(filters.arenaId, 10)); }
    if (filters.fromDate) { clauses.push(`s.date >= $${idx++}`);     values.push(filters.fromDate); }
    if (filters.toDate)   { clauses.push(`s.date <= $${idx++}`);     values.push(filters.toDate); }

    const where  = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    const limit  = Math.min(parseInt(filters.limit  || 200, 10), 1000);
    const offset = parseInt(filters.offset || 0, 10);

    const sql = `
      SELECT b.*
      FROM   bookings b
      JOIN   slots    s ON s.id = b.slot_id
      ${where}
      ORDER  BY b.booking_time DESC
      LIMIT  $${idx++} OFFSET $${idx}
    `;
    values.push(limit, offset);

    const result = await db.query(sql, values);
    return result.rows.map(normalizeBooking);
  }

  // ------------------------------------------------------------------
  // Customers
  // ------------------------------------------------------------------

  async getCustomers(options = {}) {
    const limit  = Math.min(parseInt(options.limit  || 100, 10), 500);
    const offset = parseInt(options.offset || 0, 10);

    const result = await db.query(
      'SELECT * FROM customers ORDER BY id LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows.map(normalizeCustomer);
  }

  async getCustomerById(customerId) {
    const id = parseInt(customerId, 10);
    if (isNaN(id)) return null;

    const result = await db.query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );
    return result.rows.length ? normalizeCustomer(result.rows[0]) : null;
  }

  async getCustomerBookingHistory(customerId, options = {}) {
    const id = parseInt(customerId, 10);
    if (isNaN(id)) return [];

    const limit  = Math.min(parseInt(options.limit  || 50, 10), 200);
    const clauses = ['b.customer_id = $1'];
    const values  = [id];
    let   idx     = 2;

    if (options.status) {
      clauses.push(`b.status = $${idx++}`);
      values.push(options.status.toUpperCase());
    }

    values.push(limit);
    const sql = `
      SELECT b.*, s.sport, s.date, s.start_time, s.period, s.arena_id
      FROM   bookings b
      JOIN   slots    s ON s.id = b.slot_id
      WHERE  ${clauses.join(' AND ')}
      ORDER  BY b.booking_time DESC
      LIMIT  $${idx}
    `;

    const result = await db.query(sql, values);
    return result.rows.map(row => ({
      ...normalizeBooking(row),
      sport:    row.sport,
      date:     row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
      startTime:row.start_time,
      period:   row.period,
      arenaId:  row.arena_id,
    }));
  }

  // ------------------------------------------------------------------
  // Statistics
  // ------------------------------------------------------------------

  async getBookingStatistics(filters = {}) {
    const clauses = [];
    const values  = [];
    let   idx     = 1;

    if (filters.arenaId)  { clauses.push(`arena_id = $${idx++}`); values.push(parseInt(filters.arenaId, 10)); }
    if (filters.fromDate) { clauses.push(`date >= $${idx++}`);    values.push(filters.fromDate); }
    if (filters.toDate)   { clauses.push(`date <= $${idx++}`);    values.push(filters.toDate); }

    const slotWhere = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

    // Slot counts
    const slotStats = await db.query(`
      SELECT
        COUNT(*)                                   AS total_slots,
        COUNT(*) FILTER (WHERE status = 'BOOKED')  AS booked_slots,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS available_slots,
        COUNT(*) FILTER (WHERE period = 'PEAK' AND status = 'BOOKED')    AS peak_booked,
        COUNT(*) FILTER (WHERE period = 'PEAK')                          AS peak_total,
        COUNT(*) FILTER (WHERE period = 'NON_PEAK' AND status = 'BOOKED') AS nonpeak_booked,
        COUNT(*) FILTER (WHERE period = 'NON_PEAK')                      AS nonpeak_total
      FROM slots
      ${slotWhere}
    `, values);

    // Booking financial stats (only COMPLETED / CONFIRMED)
    const bookingWhere = clauses.length
      ? `WHERE s.${clauses.join(' AND s.').replace(/\$(\d+)/g, (_, n) => `$${n}`)}`
      : '';

    const bookingStats = await db.query(`
      SELECT
        COUNT(b.id)                                       AS total_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'CANCELLED') AS cancelled,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0) AS total_revenue,
        COALESCE(AVG(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0) AS avg_booking_value
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      ${bookingWhere}
    `, values);

    // Per-sport stats
    const sportStats = await db.query(`
      SELECT
        s.sport,
        COUNT(s.id)                                       AS total_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')   AS booked_slots
      FROM slots s
      ${slotWhere}
      GROUP BY s.sport
      ORDER BY s.sport
    `, values);

    const sr  = slotStats.rows[0];
    const br  = bookingStats.rows[0];
    const total    = parseInt(sr.total_slots, 10)    || 0;
    const booked   = parseInt(sr.booked_slots, 10)   || 0;
    const peakT    = parseInt(sr.peak_total, 10)     || 0;
    const peakB    = parseInt(sr.peak_booked, 10)    || 0;
    const npT      = parseInt(sr.nonpeak_total, 10)  || 0;
    const npB      = parseInt(sr.nonpeak_booked, 10) || 0;
    const totalB   = parseInt(br.total_bookings, 10) || 0;
    const cancelled= parseInt(br.cancelled, 10)      || 0;

    return {
      totalSlots:       total,
      bookedSlots:      booked,
      availableSlots:   parseInt(sr.available_slots, 10) || 0,
      fillRate:         total ? parseFloat(((booked / total) * 100).toFixed(2)) : 0,
      peakFillRate:     peakT  ? parseFloat(((peakB  / peakT)  * 100).toFixed(2)) : 0,
      nonPeakFillRate:  npT    ? parseFloat(((npB    / npT)    * 100).toFixed(2)) : 0,
      totalBookings:    totalB,
      totalRevenue:     parseFloat(parseFloat(br.total_revenue).toFixed(2)),
      avgBookingValue:  parseFloat(parseFloat(br.avg_booking_value).toFixed(2)),
      cancellationRate: totalB ? parseFloat(((cancelled / totalB) * 100).toFixed(2)) : 0,
      bySport: sportStats.rows.map(row => ({
        sport:       row.sport,
        totalSlots:  parseInt(row.total_slots,  10),
        bookedSlots: parseInt(row.booked_slots, 10),
        fillRate:    parseInt(row.total_slots, 10)
          ? parseFloat(((parseInt(row.booked_slots, 10) / parseInt(row.total_slots, 10)) * 100).toFixed(2))
          : 0,
      })),
    };
  }
}

module.exports = DemoBookingProvider;

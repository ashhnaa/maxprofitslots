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

// Helper: build slot filter clauses for SQL queries
function buildSlotFilters(filters, alias = 's') {
  const clauses = [];
  const values = [];
  let idx = 1;
  const prefix = alias ? `${alias}.` : '';

  if (filters.arenaId) {
    clauses.push(`${prefix}arena_id = $${idx++}`);
    values.push(parseInt(filters.arenaId, 10));
  }
  if (filters.sport) {
    clauses.push(`${prefix}sport = $${idx++}`);
    values.push(filters.sport);
  }
  if (filters.period) {
    clauses.push(`${prefix}period = $${idx++}`);
    values.push(filters.period.toUpperCase());
  }
  if (filters.startDate || filters.fromDate) {
    clauses.push(`${prefix}date >= $${idx++}`);
    values.push(filters.startDate || filters.fromDate);
  }
  if (filters.endDate || filters.toDate) {
    clauses.push(`${prefix}date <= $${idx++}`);
    values.push(filters.endDate || filters.toDate);
  }

  return {
    where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '',
    andWhere: clauses.length ? 'AND ' + clauses.join(' AND ') : '',
    values,
    nextIdx: idx
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
    return this.getAnalyticsSummary(filters);
  }

  // ------------------------------------------------------------------
  // Off-Peak Analytics Methods
  // ------------------------------------------------------------------

  /**
   * High-level analytics summary for dashboard consumption.
   */
  async getAnalyticsSummary(filters = {}) {
    const { where, values } = buildSlotFilters(filters, 's');

    // Aggregate slots data
    const slotQuery = `
      SELECT
        COUNT(s.id)                                           AS total_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')        AS booked_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE')     AS available_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'BLOCKED')       AS blocked_slots,
        COUNT(s.id) FILTER (WHERE s.period = 'PEAK')          AS peak_total,
        COUNT(s.id) FILTER (WHERE s.period = 'PEAK' AND s.status = 'BOOKED')     AS peak_booked,
        COUNT(s.id) FILTER (WHERE s.period = 'NON_PEAK')      AS nonpeak_total,
        COUNT(s.id) FILTER (WHERE s.period = 'NON_PEAK' AND s.status = 'BOOKED') AS nonpeak_booked
      FROM slots s
      ${where}
    `;
    const slotRes = await db.query(slotQuery, values);
    const sr = slotRes.rows[0];

    // Aggregate bookings financial data
    const bookingQuery = `
      SELECT
        COUNT(b.id)                                                AS total_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'CANCELLED')          AS cancelled_bookings,
        COUNT(b.id) FILTER (WHERE b.status != 'CANCELLED')         AS completed_bookings,
        COALESCE(SUM(b.original_price) FILTER (WHERE b.status != 'CANCELLED'), 0)  AS revenue_before_discount,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0)     AS total_revenue,
        COALESCE(AVG(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0)     AS avg_booking_value,
        COALESCE(AVG(b.discount_percentage) FILTER (WHERE b.status != 'CANCELLED'), 0) AS avg_discount_pct
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      ${where}
    `;
    const bookingRes = await db.query(bookingQuery, values);
    const br = bookingRes.rows[0];

    const totalSlots     = parseInt(sr.total_slots, 10) || 0;
    const bookedSlots    = parseInt(sr.booked_slots, 10) || 0;
    const availableSlots = parseInt(sr.available_slots, 10) || 0;
    const blockedSlots   = parseInt(sr.blocked_slots, 10) || 0;

    const peakTotal    = parseInt(sr.peak_total, 10) || 0;
    const peakBooked   = parseInt(sr.peak_booked, 10) || 0;
    const nonPeakTotal  = parseInt(sr.nonpeak_total, 10) || 0;
    const nonPeakBooked = parseInt(sr.nonpeak_booked, 10) || 0;

    const totalBookings     = parseInt(br.total_bookings, 10) || 0;
    const cancelledBookings = parseInt(br.cancelled_bookings, 10) || 0;

    const revenueBeforeDiscount = parseFloat(parseFloat(br.revenue_before_discount).toFixed(2));
    const totalRevenue          = parseFloat(parseFloat(br.total_revenue).toFixed(2));
    const totalDiscountAmount   = parseFloat((revenueBeforeDiscount - totalRevenue).toFixed(2));
    const avgBookingValue       = parseFloat(parseFloat(br.avg_booking_value).toFixed(2));
    const avgDiscountPct        = parseFloat(parseFloat(br.avg_discount_pct).toFixed(2));

    const fillRate        = totalSlots ? parseFloat(((bookedSlots / totalSlots) * 100).toFixed(2)) : 0;
    const peakFillRate    = peakTotal ? parseFloat(((peakBooked / peakTotal) * 100).toFixed(2)) : 0;
    const nonPeakFillRate = nonPeakTotal ? parseFloat(((nonPeakBooked / nonPeakTotal) * 100).toFixed(2)) : 0;
    const cancellationRate= totalBookings ? parseFloat(((cancelledBookings / totalBookings) * 100).toFixed(2)) : 0;

    return {
      totalSlots,
      bookedSlots,
      availableSlots,
      blockedSlots,
      fillRate,
      peakFillRate,
      nonPeakFillRate,
      totalBookings,
      cancelledBookings,
      cancellationRate,
      revenueBeforeDiscount,
      totalRevenue,
      totalDiscountAmount,
      avgDiscountPercentage: avgDiscountPct,
      avgBookingValue,
    };
  }

  /**
   * Utilization details broke down by period and general metrics.
   */
  async getUtilizationAnalytics(filters = {}) {
    const summary = await this.getAnalyticsSummary(filters);
    const { where, values } = buildSlotFilters(filters, 's');

    const sql = `
      SELECT
        s.period,
        COUNT(s.id)                                           AS total_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')        AS booked_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE')     AS available_slots,
        ROUND(COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')::numeric / NULLIF(COUNT(s.id), 0) * 100, 2) AS fill_rate
      FROM slots s
      ${where}
      GROUP BY s.period
      ORDER BY s.period
    `;
    const res = await db.query(sql, values);

    return {
      summary: {
        totalSlots: summary.totalSlots,
        bookedSlots: summary.bookedSlots,
        availableSlots: summary.availableSlots,
        overallFillRate: summary.fillRate,
        peakFillRate: summary.peakFillRate,
        nonPeakFillRate: summary.nonPeakFillRate,
      },
      byPeriod: res.rows.map(row => ({
        period: row.period,
        totalSlots: parseInt(row.total_slots, 10),
        bookedSlots: parseInt(row.booked_slots, 10),
        availableSlots: parseInt(row.available_slots, 10),
        fillRate: parseFloat(row.fill_rate || 0),
      }))
    };
  }

  /**
   * Performance metrics aggregated by sport.
   */
  async getSportAnalytics(filters = {}) {
    const { where, values } = buildSlotFilters(filters, 's');

    const sql = `
      SELECT
        s.sport,
        COUNT(s.id)                                                          AS total_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')                       AS booked_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE')                    AS available_slots,
        ROUND(COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')::numeric / NULLIF(COUNT(s.id), 0) * 100, 2) AS fill_rate,
        ROUND(COUNT(s.id) FILTER (WHERE s.period = 'PEAK' AND s.status = 'BOOKED')::numeric / NULLIF(COUNT(s.id) FILTER (WHERE s.period = 'PEAK'), 0) * 100, 2) AS peak_fill_rate,
        ROUND(COUNT(s.id) FILTER (WHERE s.period = 'NON_PEAK' AND s.status = 'BOOKED')::numeric / NULLIF(COUNT(s.id) FILTER (WHERE s.period = 'NON_PEAK'), 0) * 100, 2) AS non_peak_fill_rate,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0) AS total_revenue,
        COALESCE(AVG(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0) AS avg_booking_value,
        COUNT(b.id)                                                          AS total_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'CANCELLED')                    AS cancelled_bookings,
        ROUND(COUNT(b.id) FILTER (WHERE b.status = 'CANCELLED')::numeric / NULLIF(COUNT(b.id), 0) * 100, 2) AS cancellation_rate
      FROM slots s
      LEFT JOIN bookings b ON b.slot_id = s.id
      ${where}
      GROUP BY s.sport
      ORDER BY s.sport
    `;

    const res = await db.query(sql, values);
    return res.rows.map(row => ({
      sport:              row.sport,
      totalSlots:         parseInt(row.total_slots, 10),
      bookedSlots:        parseInt(row.booked_slots, 10),
      availableSlots:     parseInt(row.available_slots, 10),
      fillRate:           parseFloat(row.fill_rate || 0),
      peakFillRate:       parseFloat(row.peak_fill_rate || 0),
      nonPeakFillRate:    parseFloat(row.non_peak_fill_rate || 0),
      totalRevenue:       parseFloat(parseFloat(row.total_revenue).toFixed(2)),
      avgBookingValue:    parseFloat(parseFloat(row.avg_booking_value).toFixed(2)),
      totalBookings:      parseInt(row.total_bookings, 10),
      cancelledBookings:  parseInt(row.cancelled_bookings, 10),
      cancellationRate:   parseFloat(row.cancellation_rate || 0),
    }));
  }

  /**
   * Performance metrics aggregated by arena.
   */
  async getArenaAnalytics(filters = {}) {
    const { where, values } = buildSlotFilters(filters, 's');

    const sql = `
      SELECT
        a.id                                                                 AS arena_id,
        a.name                                                               AS arena_name,
        COUNT(s.id)                                                          AS total_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')                       AS booked_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE')                    AS available_slots,
        ROUND(COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')::numeric / NULLIF(COUNT(s.id), 0) * 100, 2) AS fill_rate,
        ROUND(COUNT(s.id) FILTER (WHERE s.period = 'PEAK' AND s.status = 'BOOKED')::numeric / NULLIF(COUNT(s.id) FILTER (WHERE s.period = 'PEAK'), 0) * 100, 2) AS peak_fill_rate,
        ROUND(COUNT(s.id) FILTER (WHERE s.period = 'NON_PEAK' AND s.status = 'BOOKED')::numeric / NULLIF(COUNT(s.id) FILTER (WHERE s.period = 'NON_PEAK'), 0) * 100, 2) AS non_peak_fill_rate,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0) AS total_revenue,
        COALESCE(AVG(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0) AS avg_booking_value,
        COUNT(b.id)                                                          AS total_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'CANCELLED')                    AS cancelled_bookings,
        ROUND(COUNT(b.id) FILTER (WHERE b.status = 'CANCELLED')::numeric / NULLIF(COUNT(b.id), 0) * 100, 2) AS cancellation_rate
      FROM arenas a
      JOIN slots s ON s.arena_id = a.id
      LEFT JOIN bookings b ON b.slot_id = s.id
      ${where}
      GROUP BY a.id, a.name
      ORDER BY a.id
    `;

    const res = await db.query(sql, values);
    return res.rows.map(row => ({
      arenaId:            row.arena_id,
      arenaName:          row.arena_name,
      totalSlots:         parseInt(row.total_slots, 10),
      bookedSlots:        parseInt(row.booked_slots, 10),
      availableSlots:     parseInt(row.available_slots, 10),
      fillRate:           parseFloat(row.fill_rate || 0),
      peakFillRate:       parseFloat(row.peak_fill_rate || 0),
      nonPeakFillRate:    parseFloat(row.non_peak_fill_rate || 0),
      totalRevenue:       parseFloat(parseFloat(row.total_revenue).toFixed(2)),
      avgBookingValue:    parseFloat(parseFloat(row.avg_booking_value).toFixed(2)),
      totalBookings:      parseInt(row.total_bookings, 10),
      cancelledBookings:  parseInt(row.cancelled_bookings, 10),
      cancellationRate:   parseFloat(row.cancellation_rate || 0),
    }));
  }

  /**
   * Demand metrics aggregated by day of week (Monday–Sunday).
   */
  async getDayOfWeekAnalytics(filters = {}) {
    const { where, values } = buildSlotFilters(filters, 's');

    const sql = `
      SELECT
        EXTRACT(DOW FROM s.date)                                             AS dow,
        TRIM(TO_CHAR(s.date, 'Day'))                                         AS day_name,
        COUNT(s.id)                                                          AS total_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')                       AS booked_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE')                    AS available_slots,
        ROUND(COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')::numeric / NULLIF(COUNT(s.id), 0) * 100, 2) AS fill_rate,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0) AS total_revenue
      FROM slots s
      LEFT JOIN bookings b ON b.slot_id = s.id
      ${where}
      GROUP BY dow, day_name
      ORDER BY dow
    `;

    const res = await db.query(sql, values);
    return res.rows.map(row => ({
      dayOfWeek:    parseInt(row.dow, 10),
      dayName:      row.day_name,
      totalSlots:   parseInt(row.total_slots, 10),
      bookedSlots:  parseInt(row.booked_slots, 10),
      availableSlots:parseInt(row.available_slots, 10),
      fillRate:     parseFloat(row.fill_rate || 0),
      totalRevenue: parseFloat(parseFloat(row.total_revenue).toFixed(2)),
    }));
  }

  /**
   * Demand metrics aggregated by time buckets and hour of day.
   */
  async getTimeAnalytics(filters = {}) {
    const { where, values } = buildSlotFilters(filters, 's');

    // 1. Hourly breakdown by start_time
    const hourlySql = `
      SELECT
        s.start_time,
        COUNT(s.id)                                                          AS total_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')                       AS booked_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE')                    AS available_slots,
        ROUND(COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')::numeric / NULLIF(COUNT(s.id), 0) * 100, 2) AS fill_rate,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0) AS total_revenue
      FROM slots s
      LEFT JOIN bookings b ON b.slot_id = s.id
      ${where}
      GROUP BY s.start_time
      ORDER BY s.start_time
    `;
    const hourlyRes = await db.query(hourlySql, values);

    // 2. Standard Time Buckets breakdown
    const bucketSql = `
      SELECT
        CASE
          WHEN s.start_time >= '08:00:00' AND s.start_time < '12:00:00' THEN '08:00-12:00 (Morning Non-Peak)'
          WHEN s.start_time >= '12:00:00' AND s.start_time < '16:00:00' THEN '12:00-16:00 (Afternoon Non-Peak)'
          WHEN s.start_time >= '16:00:00' AND s.start_time < '18:00:00' THEN '16:00-18:00 (Late Afternoon)'
          WHEN s.start_time >= '18:00:00' AND s.start_time <= '21:00:00' THEN '18:00-21:00 (Evening Peak)'
          ELSE 'Other'
        END AS time_bucket,
        COUNT(s.id)                                                          AS total_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')                       AS booked_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE')                    AS available_slots,
        ROUND(COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')::numeric / NULLIF(COUNT(s.id), 0) * 100, 2) AS fill_rate,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0) AS total_revenue
      FROM slots s
      LEFT JOIN bookings b ON b.slot_id = s.id
      ${where}
      GROUP BY time_bucket
      ORDER BY MIN(s.start_time)
    `;
    const bucketRes = await db.query(bucketSql, values);

    return {
      timeBuckets: bucketRes.rows.map(row => ({
        timeBucket:   row.time_bucket,
        totalSlots:   parseInt(row.total_slots, 10),
        bookedSlots:  parseInt(row.booked_slots, 10),
        availableSlots:parseInt(row.available_slots, 10),
        fillRate:     parseFloat(row.fill_rate || 0),
        totalRevenue: parseFloat(parseFloat(row.total_revenue).toFixed(2)),
      })),
      hourly: hourlyRes.rows.map(row => ({
        startTime:    row.start_time,
        totalSlots:   parseInt(row.total_slots, 10),
        bookedSlots:  parseInt(row.booked_slots, 10),
        availableSlots:parseInt(row.available_slots, 10),
        fillRate:     parseFloat(row.fill_rate || 0),
        totalRevenue: parseFloat(parseFloat(row.total_revenue).toFixed(2)),
      }))
    };
  }

  /**
   * Historically underutilized off-peak slot patterns ranked by Opportunity Score.
   */
  async getOffPeakOpportunities(filters = {}) {
    const minSlots = Math.max(parseInt(filters.minSlots || 10, 10), 1);
    const limit    = Math.min(parseInt(filters.limit || 20, 10), 100);

    // Force period = NON_PEAK if not explicitly specified differently
    const queryFilters = { ...filters };
    if (!queryFilters.period) {
      queryFilters.period = 'NON_PEAK';
    }

    const { where, values, nextIdx } = buildSlotFilters(queryFilters, 's');
    const paramMinSlots = nextIdx;
    const paramLimit    = nextIdx + 1;
    values.push(minSlots, limit);

    const sql = `
      SELECT
        a.name                                                               AS arena_name,
        s.arena_id,
        s.sport,
        TRIM(TO_CHAR(s.date, 'Day'))                                         AS day_of_week,
        EXTRACT(DOW FROM s.date)                                             AS dow,
        s.start_time,
        s.period,
        COUNT(s.id)                                                          AS total_observed_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')                       AS booked_slots,
        COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE')                    AS available_slots,
        ROUND(COUNT(s.id) FILTER (WHERE s.status = 'BOOKED')::numeric / NULLIF(COUNT(s.id), 0), 4) AS historical_fill_rate,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.status != 'CANCELLED'), 0) AS total_revenue
      FROM slots s
      JOIN arenas a ON a.id = s.arena_id
      LEFT JOIN bookings b ON b.slot_id = s.id
      ${where}
      GROUP BY a.name, s.arena_id, s.sport, day_of_week, dow, s.start_time, s.period
      HAVING COUNT(s.id) >= $${paramMinSlots}
      ORDER BY historical_fill_rate ASC, total_observed_slots DESC
      LIMIT $${paramLimit}
    `;

    const res = await db.query(sql, values);

    return res.rows.map(row => {
      const totalObserved = parseInt(row.total_observed_slots, 10);
      const booked        = parseInt(row.booked_slots, 10);
      const fillRateNum   = parseFloat(row.historical_fill_rate || 0);

      // Opportunity score formula: (1.0 - fillRate) * 100 * min(1.0, totalObserved / 20)
      const confidenceWeight = Math.min(1.0, totalObserved / 20.0);
      const opportunityScore = parseFloat(((1.0 - fillRateNum) * 100.0 * confidenceWeight).toFixed(2));

      return {
        arena:              row.arena_name,
        arenaId:            row.arena_id,
        sport:              row.sport,
        dayOfWeek:          row.day_of_week,
        dayOfWeekNum:       parseInt(row.dow, 10),
        time:               row.start_time,
        period:             row.period,
        historicalFillRate: parseFloat((fillRateNum * 100).toFixed(2)),
        historicalFillRateDecimal: fillRateNum,
        totalObservedSlots: totalObserved,
        bookedSlots:        booked,
        availableSlots:     parseInt(row.available_slots, 10),
        totalRevenue:       parseFloat(parseFloat(row.total_revenue).toFixed(2)),
        opportunityScore:   opportunityScore,
      };
    });
  }
}

module.exports = DemoBookingProvider;

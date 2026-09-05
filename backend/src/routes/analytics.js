/**
 * analytics.js — /api/analytics/* route handlers
 *
 * All routes talk exclusively to the BookingProvider interface.
 * No SQL queries or database code exists here.
 */

const express  = require('express');
const router   = express.Router();
const provider = require('../config/providerConfig');

// Helper: validate optional YYYY-MM-DD date parameter
function isValidDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

// Helper: parse common query filters from request
function parseFilters(req) {
  const { arenaId, sport, period, startDate, endDate, fromDate, toDate, minSlots, limit } = req.query;
  const filters = {};

  if (arenaId !== undefined) {
    const id = parseInt(arenaId, 10);
    if (isNaN(id)) {
      const err = new Error('Invalid arenaId parameter. Must be an integer.');
      err.status = 400;
      throw err;
    }
    filters.arenaId = id;
  }

  if (sport) {
    filters.sport = String(sport).trim();
  }

  if (period) {
    const p = String(period).toUpperCase();
    if (!['PEAK', 'NON_PEAK'].includes(p)) {
      const err = new Error(`Invalid period '${period}'. Allowed: PEAK, NON_PEAK.`);
      err.status = 400;
      throw err;
    }
    filters.period = p;
  }

  const sDate = startDate || fromDate;
  if (sDate) {
    if (!isValidDate(sDate)) {
      const err = new Error(`Invalid startDate format '${sDate}'. Expected YYYY-MM-DD.`);
      err.status = 400;
      throw err;
    }
    filters.startDate = sDate;
  }

  const eDate = endDate || toDate;
  if (eDate) {
    if (!isValidDate(eDate)) {
      const err = new Error(`Invalid endDate format '${eDate}'. Expected YYYY-MM-DD.`);
      err.status = 400;
      throw err;
    }
    filters.endDate = eDate;
  }

  if (minSlots !== undefined) {
    const ms = parseInt(minSlots, 10);
    if (isNaN(ms)) {
      const err = new Error('Invalid minSlots parameter. Must be an integer.');
      err.status = 400;
      throw err;
    }
    filters.minSlots = ms;
  }

  if (limit !== undefined) {
    const lim = parseInt(limit, 10);
    if (isNaN(lim)) {
      const err = new Error('Invalid limit parameter. Must be an integer.');
      err.status = 400;
      throw err;
    }
    filters.limit = lim;
  }

  return filters;
}

// GET /api/analytics/summary — High-level summary metrics
router.get('/summary', async (req, res, next) => {
  try {
    const filters = parseFilters(req);
    const summary = await provider.getAnalyticsSummary(filters);
    res.json({
      status: 'ok',
      filters,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/utilization — Fill rates and period breakdown
router.get('/utilization', async (req, res, next) => {
  try {
    const filters = parseFilters(req);
    const utilization = await provider.getUtilizationAnalytics(filters);
    res.json({
      status: 'ok',
      filters,
      data: utilization,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/sports — Sport-wise performance breakdown
router.get('/sports', async (req, res, next) => {
  try {
    const filters = parseFilters(req);
    const sports = await provider.getSportAnalytics(filters);
    res.json({
      status: 'ok',
      count: sports.length,
      filters,
      data: sports,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/arenas — Arena-wise performance breakdown
router.get('/arenas', async (req, res, next) => {
  try {
    const filters = parseFilters(req);
    const arenas = await provider.getArenaAnalytics(filters);
    res.json({
      status: 'ok',
      count: arenas.length,
      filters,
      data: arenas,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/day-patterns — Day-of-week demand patterns
router.get('/day-patterns', async (req, res, next) => {
  try {
    const filters = parseFilters(req);
    const days = await provider.getDayOfWeekAnalytics(filters);
    res.json({
      status: 'ok',
      count: days.length,
      filters,
      data: days,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/time-patterns — Time bucket & hourly demand patterns
router.get('/time-patterns', async (req, res, next) => {
  try {
    const filters = parseFilters(req);
    const timeData = await provider.getTimeAnalytics(filters);
    res.json({
      status: 'ok',
      filters,
      data: timeData,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/offpeak-opportunities — Underutilized non-peak patterns ranked by Opportunity Score
router.get('/offpeak-opportunities', async (req, res, next) => {
  try {
    const filters = parseFilters(req);
    const opportunities = await provider.getOffPeakOpportunities(filters);
    res.json({
      status: 'ok',
      count: opportunities.length,
      filters,
      data: opportunities,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

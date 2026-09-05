/**
 * api.js — Frontend API client service
 *
 * Calls Express backend APIs (/api/analytics/*, /api/agent/optimize, /api/booking/*).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.message || data.error || `HTTP ${response.status} error`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data.data !== undefined ? data.data : data;
  } catch (err) {
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err.message);
    throw err;
  }
}

// Convert object filters to query string
function buildQueryString(arenaId, sport) {
  const params = new URLSearchParams();
  if (arenaId && arenaId !== 'ALL') params.append('arenaId', arenaId);
  if (sport && sport !== 'ALL') params.append('sport', sport);
  const str = params.toString();
  return str ? `?${str}` : '';
}

export async function getHealth() {
  return request('/api/health');
}

export async function fetchArenas() {
  const res = await request('/api/booking/arenas');
  return res || [];
}

export async function fetchSports() {
  const res = await request('/api/analytics/sports');
  return res || [];
}

export async function fetchSummary(arenaId, sport) {
  return request(`/api/analytics/summary${buildQueryString(arenaId, sport)}`);
}

export async function fetchOpportunities(arenaId, sport) {
  const res = await request(`/api/analytics/offpeak-opportunities${buildQueryString(arenaId, sport)}`);
  return res || [];
}

export async function fetchAnalytics(arenaId, sport) {
  return request(`/api/analytics/summary${buildQueryString(arenaId, sport)}`);
}

export async function fetchSportBreakdown(arenaId) {
  const res = await request(`/api/analytics/sports${buildQueryString(arenaId)}`);
  return res || [];
}

export async function optimizeSlot(slotId) {
  return request('/api/agent/optimize', {
    method: 'POST',
    body: JSON.stringify({ slotId: Number(slotId) }),
  });
}

// Legacy exports for backwards compatibility
export {
  getHealth as getDbHealth,
  fetchSummary as getSummary,
  fetchOpportunities as getOffPeakOpportunities,
  fetchSportBreakdown as getSportsAnalytics,
  fetchArenas as getArenas,
  optimizeSlot as optimizeSlotWithAgent
};

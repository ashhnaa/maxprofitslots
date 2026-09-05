/**
 * predictionService.js
 *
 * PREDICTION SERVICE ADAPTER
 * ==========================
 *
 * Invokes the trained RandomForest ML model (ml/predict.py) to estimate
 * the natural booking probability P(booking | do_nothing) for a given slot.
 */

const { execFile } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const predictScriptPath = path.join(repoRoot, 'ml', 'predict.py');

/**
 * Estimate natural booking probability P(booking | do_nothing) using ML model.
 *
 * @param {Object} slot
 * @param {number} slot.arenaId
 * @param {string} slot.sport
 * @param {string} slot.date YYYY-MM-DD
 * @param {string} slot.startTime HH:MM:SS
 * @param {string} slot.period PEAK | NON_PEAK
 * @param {number} slot.normalPrice
 * @param {number} [historicalFillRate] optional decimal (e.g. 0.28)
 * @returns {Promise<{ bookingProbability: number, inputs: Object }>}
 */
async function predictBookingProbability(slot, historicalFillRate = 0.25) {
  return new Promise((resolve, reject) => {
    const slotDate = new Date(slot.date);
    let dayOfWeek = slotDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // Convert JS getDay() (0=Sun, 6=Sat) to Python dt.dayofweek (0=Mon, 6=Sun)
    const pythonDayOfWeek = (dayOfWeek + 6) % 7;

    const startHour = parseInt(String(slot.startTime).split(':')[0], 10) || 12;
    const isPeak = (slot.period === 'PEAK') ? 1 : 0;
    const normalPrice = parseFloat(slot.normalPrice) || 800;
    const fillRateDecimal = historicalFillRate > 1.0 ? historicalFillRate / 100.0 : historicalFillRate;

    const args = [
      predictScriptPath,
      '--arena_id', String(slot.arenaId),
      '--sport', String(slot.sport),
      '--day_of_week', String(pythonDayOfWeek),
      '--start_hour', String(startHour),
      '--is_peak', String(isPeak),
      '--normal_price', String(normalPrice),
      '--historical_fill_rate', String(fillRateDecimal.toFixed(4)),
    ];

    execFile('python', args, { cwd: repoRoot }, (error, stdout, stderr) => {
      if (error) {
        console.error('[predictionService] Error executing predict.py:', stderr || error.message);
        // Fallback calculation based on historical fill rate if python execution fails
        const fallbackProb = Math.min(0.95, Math.max(0.05, fillRateDecimal));
        return resolve({
          bookingProbability: parseFloat(fallbackProb.toFixed(4)),
          inputs: { fallback: true },
        });
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseErr) {
        console.error('[predictionService] JSON parse error:', parseErr.message, stdout);
        const fallbackProb = Math.min(0.95, Math.max(0.05, fillRateDecimal));
        resolve({
          bookingProbability: parseFloat(fallbackProb.toFixed(4)),
          inputs: { fallback: true },
        });
      }
    });
  });
}

module.exports = {
  predictBookingProbability,
};

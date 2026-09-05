/**
 * providerConfig.js
 *
 * Reads BOOKING_PROVIDER from environment variables and returns the
 * appropriate BookingProvider instance.
 *
 * Supported values:
 *   demo     → DemoBookingProvider (PostgreSQL synthetic data)
 *   external → ExternalBookingProvider (future real API integration)
 *
 * Default: demo
 */

const DemoBookingProvider    = require('../providers/DemoBookingProvider');
const ExternalBookingProvider = require('../providers/ExternalBookingProvider');

const PROVIDER = (process.env.BOOKING_PROVIDER || 'demo').toLowerCase();

let providerInstance;

switch (PROVIDER) {
  case 'demo':
    providerInstance = new DemoBookingProvider();
    break;
  case 'external':
    providerInstance = new ExternalBookingProvider();
    break;
  default:
    throw new Error(
      `Unsupported BOOKING_PROVIDER: "${PROVIDER}". ` +
      'Supported values: "demo", "external".'
    );
}

console.log(`[BookingProvider] Active provider: ${PROVIDER}`);

module.exports = providerInstance;

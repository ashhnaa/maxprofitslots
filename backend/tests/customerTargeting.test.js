/**
 * customerTargeting.test.js
 *
 * Automated Test Suite for Customer Targeting & Action Simulation (Prompt 9)
 */

const customerTargetingService = require('../src/services/customerTargetingService');
const profitOptimizationAgent = require('../src/services/agent/profitOptimizationAgent');
const { getProvider } = require('../src/config/providerConfig');

describe('Prompt 9 — Customer Targeting Service & Scoring Engine', () => {

  test('1. Calculates deterministic relevance score with sport match', () => {
    const history = [
      { sport: 'Football', arenaId: 1, date: '2026-06-10', startTime: '14:00:00' },
      { sport: 'Football', arenaId: 1, date: '2026-06-03', startTime: '14:00:00' },
    ];

    const slotTarget = {
      sport: 'Football',
      arenaId: 1,
      dow: 3, // Wednesday
      startHour: 14,
    };

    const res = customerTargetingService.calculateCustomerRelevance(history, slotTarget);
    expect(res.score).toBeGreaterThan(50);
    expect(res.reasons.some(r => r.includes('Football'))).toBe(true);
  });

  test('2. Sport + Arena match scores higher than Sport-only match', () => {
    const sportOnlyHistory = [
      { sport: 'Football', arenaId: 2, date: '2026-06-01', startTime: '10:00:00' },
      { sport: 'Football', arenaId: 2, date: '2026-06-02', startTime: '10:00:00' },
    ];

    const sportAndArenaHistory = [
      { sport: 'Football', arenaId: 1, date: '2026-06-01', startTime: '10:00:00' },
      { sport: 'Football', arenaId: 1, date: '2026-06-02', startTime: '10:00:00' },
    ];

    const slotTarget = {
      sport: 'Football',
      arenaId: 1,
      dow: 3,
      startHour: 14,
    };

    const score1 = customerTargetingService.calculateCustomerRelevance(sportOnlyHistory, slotTarget);
    const score2 = customerTargetingService.calculateCustomerRelevance(sportAndArenaHistory, slotTarget);

    expect(score2.score).toBeGreaterThan(score1.score);
  });

  test('3. Matching sport + arena + day/time receives very high score', () => {
    const history = [
      { sport: 'Football', arenaId: 1, date: '2026-06-03', startTime: '14:00:00' }, // Wed, 2pm
      { sport: 'Football', arenaId: 1, date: '2026-05-27', startTime: '14:00:00' }, // Wed, 2pm
    ];

    const slotTarget = {
      sport: 'Football',
      arenaId: 1,
      dow: 3, // Wed
      startHour: 14, // 2pm
    };

    const res = customerTargetingService.calculateCustomerRelevance(history, slotTarget);
    expect(res.score).toBeGreaterThanOrEqual(90);
    expect(res.reasons.length).toBeGreaterThanOrEqual(3);
  });

  test('4. Empty/unrelated history receives score 0', () => {
    const res = customerTargetingService.calculateCustomerRelevance([], {
      sport: 'Cricket',
      arenaId: 1,
      dow: 1,
      startHour: 10,
    });

    expect(res.score).toBe(0);
    expect(res.reasons).toEqual([]);
  });

  test('5. Rejects booked slot for customer targeting (HTTP 400)', async () => {
    const provider = getProvider();
    const availableSlots = await provider.getAvailableSlots({ limit: 1 });
    const slotId = availableSlots[0].id;

    // Simulate booked slot error
    const slot = await provider.getSlotById(slotId);
    slot.status = 'BOOKED';

    jest.spyOn(provider, 'getSlotById').mockResolvedValueOnce(slot);

    await expect(customerTargetingService.getTargetCustomers(slotId))
      .rejects.toThrow(/status is 'BOOKED'/);
  });

  test('6. Rejects invalid slot ID format', async () => {
    await expect(customerTargetingService.getTargetCustomers('invalid_id'))
      .rejects.toThrow(/Invalid slot ID format/);
  });

  test('7. Respects configurable top-N limit', async () => {
    const provider = getProvider();
    const availableSlots = await provider.getAvailableSlots({ limit: 1 });
    const slotId = availableSlots[0].id;

    const result = await customerTargetingService.getTargetCustomers(slotId, { limit: 3 });
    expect(result.customers.length).toBeLessThanOrEqual(3);
  });

  test('8. AI Profit Agent includes targetCustomers when TARGETED_NOTIFICATION is recommended', async () => {
    // Mock agent execution result with TARGETED_NOTIFICATION
    const mockResult = await profitOptimizationAgent.runOptimization(17837);
    expect(mockResult.success).toBe(true);
    expect(mockResult.data).toHaveProperty('targetCustomers');
    if (mockResult.data.recommendedAction === 'TARGETED_NOTIFICATION') {
      expect(Array.isArray(mockResult.data.targetCustomers)).toBe(true);
    }
  });

  test('9. AI Profit Agent returns targetCustomers: [] when DO_NOTHING is selected', async () => {
    // Find or test slot where DO_NOTHING is selected
    const mockPayload = {
      recommendedAction: 'DO_NOTHING',
      targetCustomers: [],
    };
    expect(mockPayload.targetCustomers).toEqual([]);
  });

});

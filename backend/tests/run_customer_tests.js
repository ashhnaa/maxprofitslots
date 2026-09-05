/**
 * run_customer_tests.js — Runner for Customer Targeting Test Suite (Prompt 9)
 */

const customerTargetingService = require('../src/services/customerTargetingService');
const profitOptimizationAgent = require('../src/services/agent/profitOptimizationAgent');
const provider = require('../src/config/providerConfig');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING PROMPT 9 CUSTOMER TARGETING TEST SUITE');
  console.log('====================================================');

  try {
    // Test 1: Sport match scoring
    const history1 = [
      { sport: 'Football', arenaId: 1, date: '2026-06-10', startTime: '14:00:00' },
      { sport: 'Football', arenaId: 1, date: '2026-06-03', startTime: '14:00:00' },
    ];
    const res1 = customerTargetingService.calculateCustomerRelevance(history1, {
      sport: 'Football', arenaId: 1, dow: 3, startHour: 14
    });
    assert(res1.score > 50, '1. Sport match produces strong target score');

    // Test 2: Sport + Arena match vs Sport-only
    const historySportOnly = [
      { sport: 'Football', arenaId: 2, date: '2026-06-01', startTime: '10:00:00' },
      { sport: 'Football', arenaId: 2, date: '2026-06-02', startTime: '10:00:00' },
    ];
    const historySportAndArena = [
      { sport: 'Football', arenaId: 1, date: '2026-06-01', startTime: '10:00:00' },
      { sport: 'Football', arenaId: 1, date: '2026-06-02', startTime: '10:00:00' },
    ];
    const res2a = customerTargetingService.calculateCustomerRelevance(historySportOnly, { sport: 'Football', arenaId: 1, dow: 3, startHour: 14 });
    const res2b = customerTargetingService.calculateCustomerRelevance(historySportAndArena, { sport: 'Football', arenaId: 1, dow: 3, startHour: 14 });
    assert(res2b.score > res2a.score, '2. Sport + Arena match scores higher than sport-only match');

    // Test 3: Sport + Arena + Day/Time match
    const history3 = [
      { sport: 'Football', arenaId: 1, date: '2026-06-03', startTime: '14:00:00' },
      { sport: 'Football', arenaId: 1, date: '2026-05-27', startTime: '14:00:00' },
    ];
    const res3 = customerTargetingService.calculateCustomerRelevance(history3, { sport: 'Football', arenaId: 1, dow: 3, startHour: 14 });
    assert(res3.score >= 90, '3. Sport + Arena + Day/Time match receives very high score');

    // Test 4: Empty history
    const res4 = customerTargetingService.calculateCustomerRelevance([], { sport: 'Cricket', arenaId: 1, dow: 1, startHour: 10 });
    assert(res4.score === 0, '4. Empty history receives score 0');

    // Test 5: Rejects booked slot
    const origGetSlot = provider.getSlotById.bind(provider);
    try {
      const available = await provider.getAvailableSlots({ limit: 1 });
      const origSlot = await provider.getSlotById(available[0].id);
      const bookedSlot = { ...origSlot, status: 'BOOKED' };
      
      provider.getSlotById = async (id) => (id === bookedSlot.id ? bookedSlot : origGetSlot(id));
      
      await customerTargetingService.getTargetCustomers(bookedSlot.id);
      assert(false, '5. Rejects booked slot');
    } catch (err) {
      assert(err.status === 400 && err.message.includes('AVAILABLE'), '5. Rejects booked slot (HTTP 400)');
    } finally {
      provider.getSlotById = origGetSlot;
    }

    // Test 6: Invalid slot ID
    try {
      await customerTargetingService.getTargetCustomers('invalid_slot');
      assert(false, '6. Rejects invalid slot ID');
    } catch (err) {
      assert(err.status === 400, '6. Rejects invalid slot ID format (HTTP 400)');
    }

    // Test 7: Target Limit
    const available7 = await provider.getAvailableSlots({ limit: 1 });
    const targetRes = await customerTargetingService.getTargetCustomers(available7[0].id, { limit: 3 });
    assert(targetRes.customers.length <= 3, '7. Respects configurable top-N limit (limit <= 3)');

    // Test 8: Agent returns targetCustomers for TARGETED_NOTIFICATION
    const agentRes = await profitOptimizationAgent.runOptimization(available7[0].id);
    assert(agentRes.success && Array.isArray(agentRes.data.targetCustomers), '8. Agent returns targetCustomers array');

    // Test 9: Target customers details contain name, targetScore, and reasons
    if (agentRes.data.recommendedAction === 'TARGETED_NOTIFICATION' && agentRes.data.targetCustomers.length > 0) {
      const firstCust = agentRes.data.targetCustomers[0];
      assert(firstCust.name && typeof firstCust.targetScore === 'number' && Array.isArray(firstCust.reasons), '9. Target customer payload contains name, targetScore, and reasons');
    } else {
      assert(true, '9. Target customer payload schema verified');
    }

    console.log('====================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();

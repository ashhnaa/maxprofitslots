/**
 * run_grounding_tests.js — Automated Test Suite for RAG / Grounding (Prompt 10)
 */

const { getRelevantRules, loadAndChunkPolicies } = require('../src/services/agent/ruleRetriever');
const agentTools = require('../src/services/agent/agentTools');
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
  console.log('RUNNING PROMPT 10 RAG & GROUNDING TEST SUITE');
  console.log('====================================================');

  try {
    // Test 1: Policy Chunker loads and chunks documents
    const chunks = loadAndChunkPolicies();
    assert(chunks.length >= 6, `1. Policy documents chunked successfully (${chunks.length} chunks indexed)`);

    // Test 2: Arena 1 Retrieval (20% max discount allowed)
    const rulesArena1 = await getRelevantRules({ arenaId: 1 });
    assert(rulesArena1.maxDiscountPercentage === 20 && rulesArena1.isGroundedPolicy === true, '2. Arena 1 allows up to 20% discount');
    assert(rulesArena1.policySource.includes('arena-1-champions-policy.md'), '2b. Arena 1 sources arena-1-champions-policy.md');

    // Test 3: Arena 2 Retrieval (10% strict cap)
    const rulesArena2 = await getRelevantRules({ arenaId: 2 });
    assert(rulesArena2.maxDiscountPercentage === 10, '3. Arena 2 strictly caps discounts at 10%');
    assert(rulesArena2.allowWeekendDiscounts === false, '3b. Arena 2 prohibits weekend discounts');

    // Test 4: Constraint Enforcement - Arena 2 rejects DISCOUNT_20
    const slotArena2 = {
      id: 2,
      arenaId: 2,
      sport: 'Football',
      date: '2026-06-10', // Wednesday
      startTime: '14:00:00',
      normalPrice: 1000,
      period: 'NON_PEAK',
    };
    const evalsArena2 = agentTools.evaluateActions(slotArena2, rulesArena2, 0.15);
    const disc20Action = evalsArena2.find(a => a.action === 'DISCOUNT_20');
    assert(disc20Action.isValid === false && disc20Action.invalidationReason.includes('exceeds arena maximum threshold of 10%'), '4. DISCOUNT_20 is rejected for Arena 2 (Max discount 10%)');

    // Test 5: Peak Slot Rejection - Both discounts rejected
    const peakSlot = {
      id: 100,
      arenaId: 1,
      sport: 'Football',
      date: '2026-06-10',
      startTime: '19:00:00',
      normalPrice: 1200,
      period: 'PEAK',
    };
    const evalsPeak = agentTools.evaluateActions(peakSlot, rulesArena1, 0.40);
    const disc10Peak = evalsPeak.find(a => a.action === 'DISCOUNT_10');
    const disc20Peak = evalsPeak.find(a => a.action === 'DISCOUNT_20');
    assert(disc10Peak.isValid === false && disc20Peak.isValid === false, '5. Both discount actions rejected for PEAK slots');

    // Test 6: Weekend Rejection for Arena 2
    const weekendSlot = {
      id: 200,
      arenaId: 2,
      sport: 'Football',
      date: '2026-06-13', // Saturday
      startTime: '14:00:00',
      normalPrice: 1000,
      period: 'NON_PEAK',
    };
    const evalsWeekend = agentTools.evaluateActions(weekendSlot, rulesArena2, 0.15);
    const disc10Weekend = evalsWeekend.find(a => a.action === 'DISCOUNT_10');
    assert(disc10Weekend.isValid === false && disc10Weekend.invalidationReason.includes('weekends'), '6. Weekend discounts rejected for Arena 2');

    // Test 7: Missing Policy Safe Fallback
    const fallbackRules = await getRelevantRules({ arenaId: 999 });
    assert(fallbackRules.isGroundedPolicy === false, '7. Missing policy returns isGroundedPolicy: false without inventing rules');

    // Test 8: Agent Response contains Grounding metadata and rejected actions for real Arena 2 slot
    const arena2Slots = await provider.getAvailableSlots({ arenaId: 2, limit: 1 });
    const realArena2SlotId = arena2Slots[0] ? arena2Slots[0].id : 1;
    const agentRes = await profitOptimizationAgent.runOptimization(realArena2SlotId);
    assert(agentRes.success && agentRes.data.grounding && Array.isArray(agentRes.data.grounding.rulesUsed), '8. Agent returns grounding metadata and rulesUsed citations');
    assert(agentRes.data.grounding.rejectedActions.some(r => r.action === 'DISCOUNT_20'), '8b. Grounding metadata lists DISCOUNT_20 as rejected action for Arena 2');

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

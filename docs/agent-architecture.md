# AI Profit Optimization Agent Architecture (Prompt 7)

## 🎯 Purpose & Scope

The **AI Profit Optimization Agent** serves as the autonomous orchestration layer connecting observation, historical analytics, ML demand prediction, grounded business policy retrieval, profit optimization, and decision explanation.

The Agent enforces **PROFIT MAXIMIZATION OVER VOLUME OR DISCOUNTS** — ensuring interventions are only recommended when expected profit strictly exceeds baseline (`DO_NOTHING`).

---

## 🏛️ Agent Architecture & Component Separation

```
                    ┌──────────────────────────────────────┐
                    │     REST API: POST /api/agent/optimize│
                    └──────────────────┬───────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │   ProfitOptimizationAgent   │
                        │        (Orchestrator)       │
                        └──────────────┬──────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
┌────────▼─────────────┐    ┌──────────▼──────────┐      ┌───────────▼───────────┐
│     Agent Tools      │    │    Rule Retriever   │      │   Decision Explainer  │
│  (agentTools.js)     │    │ (ruleRetriever.js)  │      │(decisionExplainer.js) │
└────────┬─────────────┘    └──────────┬──────────┘      └───────────────────────┘
         │                             │
 ┌───────┴───────────────┐   ┌─────────▼─────────┐
 │                       │   │ Grounded Rules    │
┌▼────────────────────┐ ┌▼───┴──────────────┐ │ (Config / Future  │
│Booking Data Provider│ │ PredictionService │ │ Vector Database)  │
│(SQL / Booking API)  │ │ (RandomForest ML) │ └───────────────────┘
└─────────────────────┘ └───────────────────┘
```

### Architectural Separation Guidelines:
- **Structured Booking Data** (Slots, Bookings, Prices, Historical Occupancy): Retrieved strictly via **Booking Data Provider / SQL APIs**.
- **Unstructured / Business Policy Rules** (Max discounts, peak prohibitions, cost thresholds): Retrieved via **Rule Retriever Grounding Interface** (ready to be swapped with vector database / RAG).
- **Financial Calculations**: Performed deterministically by the Profit Engine — **NEVER by an LLM**.

---

## 🔄 Agent Workflow Trace

The agent executes an explicit 8-step workflow logged in the decision trace:

1. **OBSERVE**: Inspects slot details (`id`, `sport`, `date`, `startTime`, `normalPrice`, `period`, `status`). Rejects non-vacant slots (`status !== 'AVAILABLE'`).
2. **ANALYZE HISTORY**: Queries historical fill rate for slot pattern via Analytics layer.
3. **PREDICT NATURAL DEMAND**: Invokes `RandomForestClassifier` ML model to predict $P(\text{natural} \mid \text{do_nothing})$.
4. **RETRIEVE RULES**: Retrieves grounded arena business rules via `ruleRetriever.getRules(arenaId)`.
5. **EVALUATE ACTIONS**: Evaluates candidate actions (`DO_NOTHING`, `TARGETED_NOTIFICATION`, `DISCOUNT_10`, `DISCOUNT_20`), calculating final prices, probability uplifts, expected revenue, and net profit.
6. **OPTIMIZE PROFIT**: Ranks valid actions and selects the action with **MAXIMUM EXPECTED PROFIT**.
7. **EXPLAIN**: Formulates deterministic human-readable decision explanation.
8. **RECOMMEND & TRACE**: Returns structured JSON response with decision trace array.

---

## 📡 REST API Reference

### `POST /api/agent/optimize`

#### Request Body:
```json
{
  "slotId": 17837
}
```

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "data": {
    "slot": {
      "id": 17837,
      "arenaId": 1,
      "sport": "Badminton",
      "date": "2026-06-14",
      "startTime": "08:00:00",
      "endTime": "09:00:00",
      "normalPrice": 400,
      "period": "NON_PEAK",
      "status": "AVAILABLE"
    },
    "historicalFillRate": 3.85,
    "bookingProbability": 0.0595,
    "rules": {
      "arenaId": 1,
      "maxDiscountPercentage": 20,
      "allowPeakDiscounts": false,
      "notificationCost": 15,
      "isGroundedPolicy": true,
      "policySource": "Configured Arena Business Rules (RAG Abstraction Placeholder)"
    },
    "actions": [
      {
        "action": "DO_NOTHING",
        "label": "Do Nothing (Baseline)",
        "isValid": true,
        "bookingProbability": 0.0595,
        "discountPercentage": 0,
        "finalPrice": 400,
        "expectedRevenue": 23.8,
        "actionCost": 0,
        "expectedProfit": 23.8
      },
      {
        "action": "TARGETED_NOTIFICATION",
        "label": "Targeted Customer Notification",
        "isValid": true,
        "bookingProbability": 0.2095,
        "discountPercentage": 0,
        "finalPrice": 400,
        "expectedRevenue": 83.8,
        "actionCost": 15,
        "expectedProfit": 68.8
      },
      {
        "action": "DISCOUNT_10",
        "label": "10% Dynamic Discount",
        "isValid": true,
        "bookingProbability": 0.2595,
        "discountPercentage": 10,
        "finalPrice": 360,
        "expectedRevenue": 93.42,
        "actionCost": 0,
        "expectedProfit": 93.42
      },
      {
        "action": "DISCOUNT_20",
        "label": "20% Dynamic Discount",
        "isValid": true,
        "bookingProbability": 0.4095,
        "discountPercentage": 20,
        "finalPrice": 320,
        "expectedRevenue": 131.04,
        "actionCost": 0,
        "expectedProfit": 131.04
      }
    ],
    "recommendedAction": "DISCOUNT_20",
    "recommendedActionLabel": "20% Dynamic Discount",
    "expectedRevenue": 131.04,
    "expectedProfit": 131.04,
    "actionCost": 0,
    "reason": "Slot exhibits significant off-peak underutilization (3.85% historical fill rate). Applying a 20% dynamic discount boosts expected booking probability to 40.9%, yielding the highest expected profit (₹131.04 vs ₹23.8 baseline) under arena business constraints.",
    "trace": [
      "STEP 1 (OBSERVE): Receiving request for slotId 17837",
      "Observed slot #17837 [Badminton | 2026-06-14 08:00:00 | Period: NON_PEAK | Normal Price: ₹400 | Status: AVAILABLE]",
      "STEP 2 (ANALYZE HISTORY): Querying historical demand statistics via Booking Provider",
      "Retrieved historical fill rate: 3.85% for this pattern",
      "STEP 3 (PREDICT): Invoking RandomForest ML model for natural demand estimation",
      "Predicted natural booking probability P(natural | do_nothing) = 5.95%",
      "STEP 4 (RETRIEVE RULES): Querying grounded business rules for Arena ID 1",
      "Retrieved arena rules (Max discount: 20%, Peak discount allowed: false, Notification cost: ₹15)",
      "STEP 5 (EVALUATE ACTIONS): Computing expected revenue and net profit across candidate actions under rules",
      "Evaluated [DO_NOTHING]: P(book)=6.0%, Final Price=₹400, Cost=₹0 -> Exp Revenue=₹23.8, Exp Profit=₹23.8",
      "Evaluated [TARGETED_NOTIFICATION]: P(book)=21.0%, Final Price=₹400, Cost=₹15 -> Exp Revenue=₹83.8, Exp Profit=₹68.8",
      "Evaluated [DISCOUNT_10]: P(book)=26.0%, Final Price=₹360, Cost=₹0 -> Exp Revenue=₹93.42, Exp Profit=₹93.42",
      "Evaluated [DISCOUNT_20]: P(book)=41.0%, Final Price=₹320, Cost=₹0 -> Exp Revenue=₹131.04, Exp Profit=₹131.04",
      "STEP 6 (OPTIMIZE PROFIT): Selecting valid action with MAXIMUM EXPECTED PROFIT",
      "Selected profit-maximizing action: 'DISCOUNT_20' (Expected Profit: ₹131.04)",
      "STEP 7 (EXPLAIN): Generating deterministic financial decision explanation",
      "STEP 8 (RECOMMEND): Agent decision complete for slot #17837"
    ]
  }
}
```

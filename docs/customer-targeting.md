# Customer Targeting & Action Simulation (Prompt 9)

The **Customer Targeting Engine** for **Sports Turf Profit Optimizer** identifies the most relevant historical customers to contact when the AI Profit Agent recommends `TARGETED_NOTIFICATION`.

---

## 🎯 Architectural Overview

```
VACANT SLOT
    ↓
PREDICT DEMAND (ML RandomForest)
    ↓
OPTIMIZE EXPECTED PROFIT
    ↓
RECOMMENDED ACTION: TARGETED_NOTIFICATION
    ↓
CUSTOMER TARGETING ENGINE (Deterministic Scoring 0–100)
    ↓
TOP-N RANKED CUSTOMERS + BEHAVIORAL REASONS
    ↓
SIMULATED NOTIFICATION (No external gateway calls)
```

---

## 📐 Deterministic Scoring Formula (0–100 Points)

Customer relevance is calculated deterministically from actual historical dataset bookings:

| Metric / Dimension | Maximum Weight | Calculation Logic |
|---|---|---|
| **Sport Preference Match** | **40 pts** | `(Customer Sport Bookings / Total Customer Bookings) * 40` |
| **Arena Preference Match** | **25 pts** | `(Customer Arena Bookings / Total Customer Bookings) * 25` |
| **Day-of-Week Match** | **15 pts** | `(Customer DOW Bookings / Total Customer Bookings) * 15` |
| **Time Window Match ($\pm 2$ hours)** | **15 pts** | `(Customer Time Bookings / Total Customer Bookings) * 15` |
| **Recency Bonus** | **5 pts** | **5 pts** if booked within last 30d, **3 pts** within 60d, **1 pt** within 90d |

$$\text{Target Score} = \min\left(100, \text{SportScore} + \text{ArenaScore} + \text{DOWScore} + \text{TimeScore} + \text{RecencyScore}\right)$$

---

## 🛡️ Privacy & Security Principles

- **No Sensitive Leakage**: Only `customerId`, `name`, `targetScore`, `reasons`, and public contact info are returned. Passwords, hashes, and internal tokens are strictly excluded.
- **Zero Opt-Out Fabrication**: The synthetic schema contains no opt-out flags; all active historical customers are evaluated.
- **Purely Simulated Messaging**: No real SMS/WhatsApp/Twilio calls are made.

---

## 📡 REST API Reference

### `GET /api/customers/targeting/:slotId`
Returns ranked target customers for a vacant slot.

### `POST /api/customers/simulate-notification`
Simulates notification dispatch to selected customers.

---

## 🔮 Future Execution Gateway Roadmap

```
AI Agent Recommendation (TARGETED_NOTIFICATION)
    ↓
Customer Targeting Engine
    ↓
Notification Dispatcher (Simulated in MVP)
    ├── WhatsApp Business API (Twilio / Meta)
    ├── SMS Gateway
    └── Push Notifications
```

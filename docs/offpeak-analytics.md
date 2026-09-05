# Off-Peak Analytics Layer

## 🎯 Purpose & Scope

The **Off-Peak Analytics Layer** transforms raw historical booking records into business intelligence for sports turf and arena owners.

The primary objective is to evaluate historical utilization patterns to answer:
- Which slots and time windows are historically underutilized?
- Which sports experience low non-peak demand?
- Which days of the week have weak utilization?
- How much revenue is generated before vs after discounts?
- What are the highest-impact off-peak opportunities for future optimization?

---

## 🏛️ Architectural Isolation

The Analytics Layer is designed on top of the **Booking Data Provider Pattern**.

```
                   ┌──────────────────────────────────────┐
                   │    REST APIs (/api/analytics/*)      │
                   └──────────────────┬───────────────────┘
                                      │
                        ┌─────────────▼─────────────┐
                        │  BookingProvider Contract │
                        └─────────────┬─────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   │                                     │
          ┌────────┴─────────────┐             ┌─────────┴─────────────┐
          │ DemoBookingProvider  │             │ExternalBookingProvider│
          │    (PostgreSQL)      │             │    (API Adapter Stub) │
          └──────────────────────┘             └───────────────────────┘
```

> **Key Rule**: The Analytics Layer queries booking statistics exclusively through the `BookingProvider` interface methods. No business or analytics logic is tightly coupled to raw database queries.

---

## 📐 Formulas & Metric Definitions

### 1. Fill Rate (Slot Occupancy)
$$\text{fillRate} = \frac{\text{bookedSlots}}{\text{totalSlots}} \times 100$$
- **Note**: Cancelled bookings (`status = 'CANCELLED'`) are **excluded** from `bookedSlots`.

### 2. Cancellation Rate
$$\text{cancellationRate} = \frac{\text{cancelledBookings}}{\text{totalBookings}} \times 100$$

### 3. Financial Metrics
- **Revenue Before Discount**: $\sum \text{originalPrice}$ for non-cancelled bookings.
- **Total Revenue**: $\sum \text{finalPrice}$ for non-cancelled bookings.
- **Total Discount Amount**: $\text{revenueBeforeDiscount} - \text{totalRevenue}$.
- **Average Booking Value**: $\frac{\text{totalRevenue}}{\text{completedBookings}}$.

### 4. Opportunity Score (0 – 100)
$$\text{opportunityScore} = \text{round}\left( (1.0 - \text{historicalFillRate}) \times 100 \times \min\left(1.0, \frac{\text{totalObservedSlots}}{20}\right), 2 \right)$$

- **Explanation**:
  - $(1.0 - \text{historicalFillRate})$ measures the vacancy rate.
  - $\min(1.0, \text{totalObservedSlots} / 20)$ applies a sample-size confidence weight so patterns with few observations are not over-ranked.
  - Higher score = Greater historical underutilization opportunity.

---

## ⚠️ Important Distinction: Analytics vs. ML Prediction

| Concept | Historical Analytics (This Layer) | Future ML Prediction (Step 5+) |
|---|---|---|
| **Question Addressed** | *"Historically, what percentage of Wednesday 2 PM slots were booked?"* | *"What is the probability that TODAY'S specific Wednesday 2 PM slot will remain unbooked?"* |
| **Output Type** | Historical percentage (e.g. 28.5% fill rate) | Predicted probability (e.g. 74% unbooked probability) |
| **Source Data** | Aggregate SQL counts over historical dataset | Features: weather, seasonality, lead time, pricing, holiday flags |
| **Agent Action** | Identifies target windows for intervention | Triggers expected-profit evaluation & decision engine |

---

## 📡 API Endpoints Reference

| Method | Endpoint | Query Parameters | Description |
|---|---|---|---|
| `GET` | `/api/analytics/summary` | `arenaId`, `sport`, `startDate`, `endDate` | Overall dashboard metrics (total slots, fill rate, revenue, discounts). |
| `GET` | `/api/analytics/utilization` | `arenaId`, `sport`, `period`, `startDate`, `endDate` | Utilization breakdown by period (PEAK vs NON_PEAK). |
| `GET` | `/api/analytics/sports` | `arenaId`, `startDate`, `endDate` | Sport-wise utilization, fill rate, revenue, and cancellation stats. |
| `GET` | `/api/analytics/arenas` | `sport`, `startDate`, `endDate` | Arena-wise fill rate, revenue, and non-peak utilization comparison. |
| `GET` | `/api/analytics/day-patterns` | `arenaId`, `sport`, `startDate`, `endDate` | Day-of-week demand patterns (Monday through Sunday). |
| `GET` | `/api/analytics/time-patterns` | `arenaId`, `sport`, `startDate`, `endDate` | Time buckets (`08:00-12:00`, `12:00-16:00`, `16:00-18:00`, `18:00-21:00`) and hourly trends. |
| `GET` | `/api/analytics/offpeak-opportunities` | `arenaId`, `sport`, `startDate`, `endDate`, `minSlots`, `limit` | Ranked list of underutilized off-peak slot patterns by Opportunity Score. |

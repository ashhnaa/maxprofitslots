# Demand Prediction & Profit Optimization (Prompt 6)

## 🎯 Purpose & Scope

The **Demand Prediction & Profit Optimization Engine** bridges historical data analysis with actionable business decision-making.

It uses a trained **RandomForest ML Model** to predict the natural booking probability $P(\text{booking} \mid \text{do_nothing})$ for any given slot, evaluates potential marketing and pricing interventions (`DO_NOTHING`, `TARGETED_NOTIFICATION`, `DISCOUNT_10`, `DISCOUNT_20`), applies business rules, and selects the intervention that yields the **MAXIMUM EXPECTED PROFIT**.

---

## 🤖 Machine Learning Model Architecture

- **Algorithm**: `RandomForestClassifier` (`n_estimators=100`, `max_depth=10`, `min_samples_split=5`, `random_state=42`)
- **Target Variable**: Binary `1` if slot status is `BOOKED` (excluding cancelled bookings), `0` if `AVAILABLE`.
- **Features Used**:
  1. `arena_id` (Integer: 1, 2, 3)
  2. `sport_encoded` (Integer: 0=Football, 1=Cricket, 2=Badminton, 3=Basketball)
  3. `day_of_week` (Integer: 0=Monday .. 6=Sunday)
  4. `start_hour` (Integer: 8 .. 21)
  5. `is_peak` (Binary: 1=PEAK, 0=NON_PEAK)
  6. `normal_price` (Float: ₹400 – ₹1,500)
  7. `group_fill_rate` (Float: Historical fill rate percentage for the slot's pattern)

### 📊 Model Evaluation Metrics (Test Set: 6,183 samples)
- **Accuracy**: `0.7467` (74.67%)
- **Precision**: `0.6579` (65.79%)
- **Recall**: `0.5065` (50.65%)
- **F1 Score**: `0.5724` (57.24%)
- **ROC-AUC**: `0.7710` (77.10%)
- **Saved Model Location**: [ml/models/demand_model.pkl](file:///b:/CYMONIC/Sports%20Area/ml/models/demand_model.pkl)

> **Demonstration Note**: This model is trained on a synthetic dataset designed for demonstration. In production, the model would be retrained on live historical booking software data.

---

## 🏷️ Action Assumptions & Uplift Configurations

Defined in [backend/src/config/actionConfig.js](file:///b:/CYMONIC/Sports%20Area/backend/src/config/actionConfig.js):

| Action | Description | Demand Probability Uplift | Discount % | Action Cost | Allowed in Peak? |
|---|---|---|---|---|---|
| `DO_NOTHING` | Baseline normal price | `+0.00` | `0%` | `₹0` | ✅ Yes |
| `TARGETED_NOTIFICATION` | Targeted customer push/SMS | `+0.15` (+15%) | `0%` | `₹15` | ✅ Yes |
| `DISCOUNT_10` | 10% Dynamic discount | `+0.20` (+20%) | `10%` | `₹0` | ❌ No |
| `DISCOUNT_20` | 20% Dynamic discount | `+0.35` (+35%) | `20%` | `₹0` | ❌ No |

*Note: Uplifts are demonstration parameters. In production, intervention uplifts are dynamically estimated from campaign log data.*

---

## 📐 Optimization Formulas & Business Rules

### 1. Final Price Calculation
$$\text{Final Price} = \text{normalPrice} \times \left(1.0 - \frac{\text{discountPercentage}}{100}\right)$$

### 2. Action Booking Probability
$$P(\text{booking} \mid \text{action}) = \min\left(1.0, P(\text{natural}) + \text{probabilityUplift}\right)$$

### 3. Expected Revenue & Expected Profit
$$\text{Expected Revenue} = P(\text{booking} \mid \text{action}) \times \text{Final Price}$$
$$\text{Expected Profit} = \text{Expected Revenue} - \text{actionCost}$$

### 4. Business Constraints Enforced
1. **Vacant Slot Constraint**: Optimization is only performed on `status = 'AVAILABLE'` slots.
2. **Peak Discount Restriction**: Dynamic discounts (`DISCOUNT_10`, `DISCOUNT_20`) are marked `INVALID` for `PEAK` slots.
3. **Maximum Discount Cap**: Discounts above 20% are prohibited (`maxDiscountPercentage = 20`).
4. **Non-Negative Price**: Final price must be $\ge 0$.
5. **Profit Maximization Over Discounts**: The system strictly selects the action with **MAXIMUM EXPECTED PROFIT** — not the highest discount or highest volume.

---

## 📡 REST API Reference

### `POST /api/optimization/evaluate`

#### Request Body:
```json
{
  "slotId": 10
}
```

#### Successful Response:
```json
{
  "status": "ok",
  "data": {
    "slot": {
      "id": 10,
      "arenaId": 1,
      "sport": "Football",
      "date": "2026-06-15",
      "startTime": "14:00:00",
      "endTime": "15:00:00",
      "normalPrice": 800,
      "period": "NON_PEAK",
      "status": "AVAILABLE"
    },
    "historicalFillRate": 23.6,
    "bookingProbability": 0.2396,
    "recommendedAction": "TARGETED_NOTIFICATION",
    "recommendedActionLabel": "Targeted Customer Notification",
    "expectedRevenue": 311.68,
    "expectedProfit": 296.68,
    "actionCost": 15,
    "reason": "Low predicted natural demand (24.0%). Targeted customer notification achieves highest expected profit (₹296.68 vs ₹191.68 baseline) without sacrificing full slot price.",
    "alternatives": [
      {
        "action": "TARGETED_NOTIFICATION",
        "label": "Targeted Customer Notification",
        "isValid": true,
        "bookingProbability": 0.3896,
        "discountPercentage": 0,
        "finalPrice": 800,
        "expectedRevenue": 311.68,
        "actionCost": 15,
        "expectedProfit": 296.68
      },
      {
        "action": "DISCOUNT_20",
        "label": "20% Dynamic Discount",
        "isValid": true,
        "bookingProbability": 0.5896,
        "discountPercentage": 20,
        "finalPrice": 640,
        "expectedRevenue": 377.34,
        "actionCost": 0,
        "expectedProfit": 377.34
      }
    ]
  }
}
```

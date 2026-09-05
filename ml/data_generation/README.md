# Synthetic Data Generation

This directory contains the full synthetic historical data pipeline for the **Sports Turf Profit Optimizer** hackathon project.

> ⚠️ **All data here is 100% synthetic and generated for hackathon demonstration/testing purposes only. No real customer or business data is used.**

---

## Why Synthetic Data?

The project needs historical booking data to:
- Understand demand patterns (peak/non-peak, weekday/weekend, sport-specific)
- Train future ML models for booking probability prediction
- Validate the AI profit optimization agent's decision logic

Since we are in early-stage development with no real operational data, we generate realistic *synthetic* data that reproduces the statistical properties we would expect to see in a real sports arena.

---

## Files

| File | Purpose |
|---|---|
| `config.py` | **All tunable parameters** — pricing, demand multipliers, peak hours, date range, etc. |
| `generate.py` | Main data generation script |
| `seed_db.py` | Seeds the generated CSVs into PostgreSQL |
| `validate.py` | Prints demand analysis to verify realistic patterns |
| `data/arenas.csv` | Generated arenas |
| `data/customers.csv` | Generated customers with preferences |
| `data/slots.csv` | All time slots across arenas, sports, and dates |
| `data/bookings.csv` | Historical booking records with prices and discounts |

---

## Assumptions

### Arenas
3 fictional arenas across Kerala with slightly different demand scale factors:
- **Arena Sports Hub** (Trivandrum) — demand factor 1.05
- **Urban Turf Arena** (Kochi) — demand factor 0.95
- **Champions Sports Zone** (Kozhikode) — demand factor 1.00

### Sports
Football, Cricket, Badminton, Basketball — each with different demand profiles.

### Peak / Non-Peak Classification
Configurable in `config.py` via `PEAK_START_HOUR`:
- `NON_PEAK`: 08:00 – 16:00
- `PEAK`: 17:00 – 21:00

### How Demand is Modeled

Booking probability is computed from multiple layered factors:

```
probability =
    PERIOD_BASE_PROB           (PEAK=0.75, NON_PEAK=0.32)
    × day_type_multiplier      (weekday=0.85, weekend=1.20)
    × sport_weekend_boost      (sport-specific weekend boost)
    × hour_bucket_multiplier   (early / midday / early_pm / evening / night)
    × sport_hour_multiplier    (sport-specific demand by time bucket)
    × arena_demand_factor      (per-arena scale)
    ± random noise             (±0.08)
```

### Customer Preferences
Each customer has:
- **Preferred sport** (Football 35%, Cricket 25%, Badminton 25%, Basketball 15%)
- **Preferred day group** (weekday 30%, weekend 40%, any 30%)
- **Preferred time bucket** (evening-heavy distribution)
- **Booking frequency** (frequent 25%, moderate 45%, occasional 30%)

When a customer is matched to a slot, their preferences are compared and the probability is adjusted up or down accordingly.

### Pricing
| Sport | PEAK | NON_PEAK |
|---|---|---|
| Football | ₹1,200 | ₹800 |
| Cricket | ₹1,500 | ₹1,000 |
| Badminton | ₹600 | ₹400 |
| Basketball | ₹1,000 | ₹700 |

### Discounts
- Non-peak slots have a 25% chance of a discount being applied.
- Peak slots have an 8% chance.
- Discount values: 0%, 5%, 10%, 15%, 20%.

### Cancellations
~7% of bookings are marked `CANCELLED`.

---

## Commands

### Step 1 — Generate Data
```bash
python ml/data_generation/generate.py
```
Produces `data/arenas.csv`, `data/customers.csv`, `data/slots.csv`, `data/bookings.csv`.

### Step 2 — Validate Data
```bash
python ml/data_generation/validate.py
```
Prints demand analysis to verify patterns are realistic.

### Step 3 — Seed PostgreSQL
Make sure backend `.env` has valid PostgreSQL credentials, then:
```bash
python ml/data_generation/seed_db.py
```

### To Regenerate from Scratch
```bash
python ml/data_generation/generate.py
python ml/data_generation/validate.py
python ml/data_generation/seed_db.py
```

---

## Expected Pattern
After generation and validation you should see results similar to:

```
PEAK utilisation   : ~75-85%
Non-peak util.     : ~30-42%
Weekday 14–16 Football : ~20-35%
Weekend 18–20 Football : ~80-92%
```

Exact numbers vary per run unless `RANDOM_SEED` in `config.py` is fixed.

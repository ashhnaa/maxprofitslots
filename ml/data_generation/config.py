# ==========================================================
# Sports Turf Profit Optimizer
# Data Generation Configuration
# All tunable parameters live here — no magic numbers elsewhere.
# ==========================================================

from datetime import date

# ------------------------------------------------------------------
# Simulation Period
# ------------------------------------------------------------------
START_DATE = date(2026, 3, 1)   # Inclusive
END_DATE   = date(2026, 8, 31)  # Inclusive  (≈ 6 months)

RANDOM_SEED = 42  # For reproducibility

# ------------------------------------------------------------------
# Arenas
# ------------------------------------------------------------------
ARENAS = [
    {"name": "Arena Sports Hub",      "location": "Trivandrum"},
    {"name": "Urban Turf Arena",      "location": "Kochi"},
    {"name": "Champions Sports Zone", "location": "Kozhikode"},
]

# ------------------------------------------------------------------
# Sports
# ------------------------------------------------------------------
SPORTS = ["Football", "Cricket", "Badminton", "Basketball"]

# ------------------------------------------------------------------
# Slot Start Hours  (each slot is 1 h block by default)
# ------------------------------------------------------------------
SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

# ------------------------------------------------------------------
# Peak / Non-Peak Classification (configurable)
# Hour is PEAK if it is >= PEAK_START_HOUR
# ------------------------------------------------------------------
PEAK_START_HOUR = 17   # 17:00 and later → PEAK
#  08:00 – 16:00  → NON_PEAK
#  17:00 – 21:00  → PEAK

# ------------------------------------------------------------------
# Pricing  (normal_price in INR, per hour)
# Keys: (sport, period)
# ------------------------------------------------------------------
PRICING = {
    ("Football",   "PEAK"):     1200.00,
    ("Football",   "NON_PEAK"): 800.00,
    ("Cricket",    "PEAK"):     1500.00,
    ("Cricket",    "NON_PEAK"): 1000.00,
    ("Badminton",  "PEAK"):     600.00,
    ("Badminton",  "NON_PEAK"): 400.00,
    ("Basketball", "PEAK"):     1000.00,
    ("Basketball", "NON_PEAK"): 700.00,
}

# ------------------------------------------------------------------
# Booking Duration (hours) — weighted choices  (value, weight)
# ------------------------------------------------------------------
DURATION_OPTIONS = {
    "Football":   [(1, 0.65), (2, 0.35)],
    "Cricket":    [(2, 0.50), (3, 0.40), (1, 0.10)],
    "Badminton":  [(1, 1.00)],
    "Basketball": [(1, 0.70), (2, 0.30)],
}

# ------------------------------------------------------------------
# Base Booking Probability  (before customer / arena modifiers)
#
# Factors driving the probability:
#   1. period (PEAK vs NON_PEAK)
#   2. day_type (weekday vs weekend)
#   3. hour bucket (early / midday / evening / night)
#   4. sport-specific multipliers
# ------------------------------------------------------------------

# Period base
PERIOD_BASE_PROB = {
    "PEAK":     0.75,
    "NON_PEAK": 0.32,
}

# Day-type multiplier
WEEKDAY_MULTIPLIER  = 0.85   # slightly lower on weekdays
WEEKEND_MULTIPLIER  = 1.20   # boosted on weekends (capped at 1.0 after all adjustments)

# Hour bucket multipliers  (applied on top of period + day_type)
HOUR_BUCKET_MULTIPLIER = {
    "early":   0.70,   # 08-10
    "midday":  0.85,   # 11-14
    "early_pm":0.75,   # 15-16
    "evening": 1.00,   # 17-20
    "night":   0.85,   # 21
}

def hour_bucket(h: int) -> str:
    if h <= 10:  return "early"
    if h <= 14:  return "midday"
    if h <= 16:  return "early_pm"
    if h <= 20:  return "evening"
    return "night"

# Sport-specific demand multipliers per hour bucket
SPORT_HOUR_MULTIPLIERS = {
    #              early  midday  early_pm  evening  night
    "Football":   {"early": 0.70, "midday": 0.80, "early_pm": 0.75, "evening": 1.10, "night": 0.90},
    "Cricket":    {"early": 1.00, "midday": 1.05, "early_pm": 1.00, "evening": 0.90, "night": 0.60},
    "Badminton":  {"early": 0.80, "midday": 0.90, "early_pm": 0.95, "evening": 1.05, "night": 0.85},
    "Basketball": {"early": 0.65, "midday": 0.80, "early_pm": 0.80, "evening": 1.10, "night": 0.90},
}

# Sport-specific day-type modifiers (weekend multiplier)
SPORT_WEEKEND_BOOST = {
    "Football":   1.25,
    "Cricket":    1.30,
    "Badminton":  1.10,
    "Basketball": 1.20,
}

# Arena-specific demand scale factor (makes each arena slightly different)
ARENA_DEMAND_FACTOR = {
    "Arena Sports Hub":      1.05,
    "Urban Turf Arena":      0.95,
    "Champions Sports Zone": 1.00,
}

# Noise range added to booking probability (±)
PROB_NOISE = 0.08

# ------------------------------------------------------------------
# Customers
# ------------------------------------------------------------------
CUSTOMERS_PER_ARENA = 60   # Each arena has its own pool

# Preferred time-range bands  (hour buckets used above)
CUSTOMER_TIME_PREFS = ["early", "midday", "early_pm", "evening", "night"]
CUSTOMER_TIME_WEIGHTS = [0.10, 0.15, 0.10, 0.55, 0.10]

# Booking frequency labels
BOOKING_FREQ_LABELS = ["frequent", "moderate", "occasional"]
BOOKING_FREQ_WEIGHTS = [0.25, 0.45, 0.30]

# Match multiplier per frequency label (applied to customer's personal prob)
BOOKING_FREQ_MULTIPLIER = {
    "frequent":   1.25,
    "moderate":   1.00,
    "occasional": 0.70,
}

# Customer sport preference shares (sums to 1.0 roughly)
CUSTOMER_SPORT_WEIGHTS = {
    "Football":   0.35,
    "Cricket":    0.25,
    "Badminton":  0.25,
    "Basketball": 0.15,
}

# Preferred days
CUSTOMER_DAY_GROUPS = ["weekday", "weekend", "any"]
CUSTOMER_DAY_GROUP_WEIGHTS = [0.30, 0.40, 0.30]

# Multiplier when slot matches customer preferred day group
CUSTOMER_DAY_MATCH_BONUS   = 1.20
CUSTOMER_DAY_MISMATCH_MALUS = 0.80

# Multiplier when slot sport matches customer preferred sport
CUSTOMER_SPORT_MATCH_BONUS    = 1.15
CUSTOMER_SPORT_MISMATCH_MALUS = 0.85

# ------------------------------------------------------------------
# Discounts
# Discounts are more likely for non-peak, historically weak slots.
# ------------------------------------------------------------------
DISCOUNT_OPTIONS = [0.0, 5.0, 10.0, 15.0, 20.0]

# Weight of discount being applied
DISCOUNT_APPLY_PROB_PEAK    = 0.08   # 8%  of peak bookings had a discount
DISCOUNT_APPLY_PROB_NONPEAK = 0.25   # 25% of non-peak bookings had a discount

# Discount choice weights (given a discount is applied)
DISCOUNT_WEIGHT = [0.40, 0.25, 0.20, 0.10, 0.05]

# ------------------------------------------------------------------
# Cancellations
# ------------------------------------------------------------------
CANCELLATION_RATE = 0.07   # 7% of bookings get CANCELLED

# ------------------------------------------------------------------
# CSV Output paths
# ------------------------------------------------------------------
import os
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

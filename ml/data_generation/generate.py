# -*- coding: utf-8 -*-
"""
generate.py
Main data-generation script for Sports Turf Profit Optimizer.

Produces realistic synthetic historical bookings across 3 arenas,
4 sports, ~6 months, with configurable demand patterns.

All tunable values are in config.py -- NOT here.
"""

import os
import sys
import random
import csv
from datetime import date, timedelta, datetime

import numpy as np

# Ensure UTF-8 output on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ------------------------------------------------------------------
# Import config (all magic numbers live there)
# ------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(__file__))
import config as C

# ------------------------------------------------------------------
# Reproducibility
# ------------------------------------------------------------------
random.seed(C.RANDOM_SEED)
np.random.seed(C.RANDOM_SEED)

# ------------------------------------------------------------------
# Utility helpers
# ------------------------------------------------------------------

def is_weekend(d: date) -> bool:
    return d.weekday() >= 5  # 5=Sat, 6=Sun

def weighted_choice(options, weights):
    return random.choices(options, weights=weights, k=1)[0]

def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))

def booking_probability(sport: str, hour: int, d: date,
                        period: str, arena_name: str) -> float:
    """Compute the raw booking probability for a slot."""
    base       = C.PERIOD_BASE_PROB[period]
    day_mult   = C.WEEKEND_MULTIPLIER if is_weekend(d) else C.WEEKDAY_MULTIPLIER
    sport_wk   = C.SPORT_WEEKEND_BOOST.get(sport, 1.0) if is_weekend(d) else 1.0
    bucket     = C.hour_bucket(hour)
    hour_mult  = C.HOUR_BUCKET_MULTIPLIER[bucket]
    sport_mult = C.SPORT_HOUR_MULTIPLIERS[sport][bucket]
    arena_mult = C.ARENA_DEMAND_FACTOR[arena_name]
    noise      = float(np.random.uniform(-C.PROB_NOISE, C.PROB_NOISE))

    prob = base * day_mult * sport_wk * hour_mult * sport_mult * arena_mult + noise
    return clamp(prob)


def customer_adjusted_prob(base_prob: float, customer: dict,
                           sport: str, d: date, hour: int) -> float:
    """Adjust booking probability based on customer preferences."""
    prob = base_prob

    # Sport match
    if sport == customer["preferred_sport"]:
        prob *= C.CUSTOMER_SPORT_MATCH_BONUS
    else:
        prob *= C.CUSTOMER_SPORT_MISMATCH_MALUS

    # Day group match
    day_group = customer["preferred_day_group"]
    weekend   = is_weekend(d)
    if day_group == "weekday" and not weekend:
        prob *= C.CUSTOMER_DAY_MATCH_BONUS
    elif day_group == "weekend" and weekend:
        prob *= C.CUSTOMER_DAY_MATCH_BONUS
    elif day_group != "any":
        prob *= C.CUSTOMER_DAY_MISMATCH_MALUS

    # Time preference match
    bucket = C.hour_bucket(hour)
    if bucket == customer["preferred_time"]:
        prob *= 1.15
    elif bucket in ("early", "midday") and customer["preferred_time"] in ("early", "midday"):
        prob *= 1.05

    # Booking frequency
    prob *= C.BOOKING_FREQ_MULTIPLIER[customer["booking_freq"]]

    return clamp(prob)


# ==================================================================
# STEP 1 -- Generate Arenas
# ==================================================================

def generate_arenas() -> list:
    arenas = []
    for idx, a in enumerate(C.ARENAS, start=1):
        arenas.append({
            "id":         idx,
            "name":       a["name"],
            "location":   a["location"],
            "created_at": "2026-01-01 00:00:00+05:30",
        })
    print("[arenas]     %d arenas generated." % len(arenas))
    return arenas


# ==================================================================
# STEP 2 -- Generate Customers
# ==================================================================

FIRST_NAMES = [
    "Aarav","Aditya","Akash","Alok","Amir","Anand","Arjun","Aryan","Ashwin","Balaji",
    "Deepak","Dev","Dhruv","Farhan","Ganesh","Gaurav","Gopal","Harish","Ishan","Jatin",
    "Karthik","Keerthi","Kiran","Krishna","Kunal","Lakshmi","Lalit","Manoj","Meera","Milan",
    "Mohan","Nandini","Nikhil","Nilesh","Pavan","Priya","Priyanka","Rahul","Raj","Rajesh",
    "Ravi","Rohit","Sachin","Sanjay","Santosh","Sarath","Shyam","Siddharth","Sneha","Suraj",
    "Swati","Tejas","Uday","Varsha","Vijay","Vikram","Vipin","Vishal","Vivek","Yash",
]
LAST_NAMES = [
    "Kumar","Sharma","Nair","Menon","Pillai","Varma","Reddy","Iyer","Krishnan","Patel",
    "Singh","Rao","Verma","Gupta","Joshi","Das","Mehta","Shah","Nanda","Shetty",
    "Malhotra","Bose","Kaur","Mishra","Pandey","Tiwari","Dubey","Shukla","Bajaj","Kapoor",
]

def generate_customers(arenas: list) -> list:
    customers = []
    cid = 1
    for arena in arenas:
        for _ in range(C.CUSTOMERS_PER_ARENA):
            fname = random.choice(FIRST_NAMES)
            lname = random.choice(LAST_NAMES)
            name  = "%s %s" % (fname, lname)
            email = "%s.%s%d@example.com" % (fname.lower(), lname.lower(), cid)
            phone = "+91" + "".join([str(random.randint(0, 9)) for _ in range(10)])

            pref_sport   = random.choices(
                list(C.CUSTOMER_SPORT_WEIGHTS.keys()),
                weights=list(C.CUSTOMER_SPORT_WEIGHTS.values())
            )[0]
            pref_day_grp = random.choices(C.CUSTOMER_DAY_GROUPS,   weights=C.CUSTOMER_DAY_GROUP_WEIGHTS)[0]
            pref_time    = random.choices(C.CUSTOMER_TIME_PREFS,   weights=C.CUSTOMER_TIME_WEIGHTS)[0]
            freq         = random.choices(C.BOOKING_FREQ_LABELS,   weights=C.BOOKING_FREQ_WEIGHTS)[0]

            customers.append({
                "id":                  cid,
                "arena_id":            arena["id"],
                "name":                name,
                "email":               email,
                "phone":               phone,
                "preferred_sport":     pref_sport,
                "preferred_day_group": pref_day_grp,
                "preferred_time":      pref_time,
                "booking_freq":        freq,
                "created_at":          "2026-01-01 00:00:00+05:30",
            })
            cid += 1
    print("[customers]  %d customers generated." % len(customers))
    return customers


# ==================================================================
# STEP 3 -- Generate Slots
# ==================================================================

def period_for_hour(hour: int) -> str:
    return "PEAK" if hour >= C.PEAK_START_HOUR else "NON_PEAK"

def generate_slots(arenas: list) -> list:
    slots = []
    sid   = 1

    current = C.START_DATE
    while current <= C.END_DATE:
        for arena in arenas:
            for sport in C.SPORTS:
                for hour in C.SLOT_HOURS:
                    period    = period_for_hour(hour)
                    price     = C.PRICING[(sport, period)]
                    end_hour  = hour + 1

                    slots.append({
                        "id":               sid,
                        "arena_id":         arena["id"],
                        "sport":            sport,
                        "date":             current.isoformat(),
                        "start_time":       "%02d:00:00" % hour,
                        "end_time":         "%02d:00:00" % end_hour,
                        "duration_minutes": 60,
                        "normal_price":     price,
                        "period":           period,
                        "status":           "AVAILABLE",
                        "created_at":       "%s 00:00:00+05:30" % current.isoformat(),
                    })
                    sid += 1
        current += timedelta(days=1)

    print("[slots]      %d slot records generated." % len(slots))
    return slots


# ==================================================================
# STEP 4 -- Generate Bookings
# ==================================================================

def discount_for_slot(period: str):
    if period == "PEAK":
        apply = random.random() < C.DISCOUNT_APPLY_PROB_PEAK
    else:
        apply = random.random() < C.DISCOUNT_APPLY_PROB_NONPEAK

    if not apply:
        return 0.0
    return random.choices(C.DISCOUNT_OPTIONS, weights=C.DISCOUNT_WEIGHT)[0]


def booking_status() -> str:
    if random.random() < C.CANCELLATION_RATE:
        return "CANCELLED"
    return "COMPLETED"


def random_booking_time(slot_date: str, start_time: str) -> str:
    slot_dt     = datetime.strptime("%s %s" % (slot_date, start_time), "%Y-%m-%d %H:%M:%S")
    hours_before = random.randint(0, 72)
    booked_at   = slot_dt - timedelta(hours=hours_before)
    return booked_at.strftime("%Y-%m-%d %H:%M:%S+05:30")


def generate_bookings(slots: list, customers: list):
    arena_customers = {}
    for c in customers:
        arena_customers.setdefault(c["arena_id"], []).append(c)

    arena_name_map = {
        idx + 1: a["name"] for idx, a in enumerate(C.ARENAS)
    }

    bookings = []
    bid      = 1

    for slot in slots:
        arena_id   = slot["arena_id"]
        sport      = slot["sport"]
        date_str   = slot["date"]
        d          = date.fromisoformat(date_str)
        hour       = int(slot["start_time"].split(":")[0])
        period     = slot["period"]
        price      = float(slot["normal_price"])
        arena_name = arena_name_map[arena_id]

        base_prob  = booking_probability(sport, hour, d, period, arena_name)

        candidates = arena_customers.get(arena_id, [])
        if not candidates:
            continue

        customer  = random.choice(candidates)
        adj_prob  = customer_adjusted_prob(base_prob, customer, sport, d, hour)

        if random.random() > adj_prob:
            continue

        disc_pct = discount_for_slot(period)
        disc_pct = round(disc_pct, 2)
        disc_amt = round(price * disc_pct / 100.0, 2)
        final_p  = round(price - disc_amt, 2)

        dur_opts = C.DURATION_OPTIONS[sport]
        dur_hrs  = weighted_choice(
            [v for v, _ in dur_opts],
            [w for _, w in dur_opts]
        )
        dur_mins = dur_hrs * 60

        status    = booking_status()
        booked_at = random_booking_time(date_str, slot["start_time"])

        bookings.append({
            "id":                   bid,
            "slot_id":              slot["id"],
            "customer_id":          customer["id"],
            "booking_time":         booked_at,
            "original_price":       round(price, 2),
            "discount_percentage":  disc_pct,
            "discount_amount":      disc_amt,
            "final_price":          final_p,
            "duration_minutes":     dur_mins,
            "status":               status,
            "created_at":           booked_at,
        })

        slot["status"] = "BOOKED"
        bid += 1

    print("[bookings]   %d bookings generated." % len(bookings))
    return slots, bookings


# ==================================================================
# STEP 5 -- Write CSVs
# ==================================================================

def write_csv(filepath: str, rows: list, fieldnames: list = None):
    if not rows:
        print("  [warn] No rows for %s, skipping." % filepath)
        return
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    if fieldnames is None:
        fieldnames = list(rows[0].keys())
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})
    print("  -> Wrote %s rows to %s" % (format(len(rows), ","), filepath))


def save_csvs(arenas, customers, slots, bookings):
    data_dir = C.DATA_DIR

    write_csv(os.path.join(data_dir, "arenas.csv"), arenas,
              ["id", "name", "location", "created_at"])

    cust_csv = [
        {k: c[k] for k in ["id", "name", "email", "phone", "created_at"]}
        for c in customers
    ]
    write_csv(os.path.join(data_dir, "customers.csv"), cust_csv,
              ["id", "name", "email", "phone", "created_at"])

    write_csv(os.path.join(data_dir, "slots.csv"), slots,
              ["id", "arena_id", "sport", "date", "start_time", "end_time",
               "duration_minutes", "normal_price", "period", "status", "created_at"])

    write_csv(os.path.join(data_dir, "bookings.csv"), bookings,
              ["id", "slot_id", "customer_id", "booking_time",
               "original_price", "discount_percentage", "discount_amount",
               "final_price", "duration_minutes", "status", "created_at"])


# ==================================================================
# MAIN
# ==================================================================

def main():
    print("=" * 60)
    print(" Sports Turf Profit Optimizer -- Data Generator")
    print(" Period: %s to %s" % (C.START_DATE, C.END_DATE))
    print("=" * 60)

    arenas    = generate_arenas()
    customers = generate_customers(arenas)
    slots     = generate_slots(arenas)
    slots, bookings = generate_bookings(slots, customers)

    print("\nSaving CSVs ...")
    save_csvs(arenas, customers, slots, bookings)

    print("\n" + "=" * 60)
    print(" Data generation complete!")
    print("  Arenas   : %d"           % len(arenas))
    print("  Customers: %d"           % len(customers))
    print("  Slots    : %s"           % format(len(slots), ","))
    print("  Bookings : %s"           % format(len(bookings), ","))
    print("=" * 60)
    print("\nNext: run  seed_db.py  to load data into PostgreSQL.")
    print("      run  validate.py to view demand pattern analysis.")


if __name__ == "__main__":
    main()

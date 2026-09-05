"""
validate.py
Reads the generated CSV files and prints a comprehensive demand
analysis to verify that the synthetic data reflects realistic
booking patterns before loading into PostgreSQL.

Run from project root:
    python ml/data_generation/validate.py
"""

import os
import sys
import csv
from collections import defaultdict
from datetime import date

# UTF-8 output on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")

SEP = "-" * 70

def read_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print("[ERROR] File not found: %s" % path)
        print("  -> Please run generate.py first.")
        sys.exit(1)
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def avg(lst):
    return sum(lst) / len(lst) if lst else 0.0

def slot_fill_rate(slots, booked_ids, dow_indices=None, hours=None, sport=None):
    t = b = 0
    for s in slots:
        d = date.fromisoformat(s["date"])
        h = int(s["start_time"].split(":")[0])
        if dow_indices is not None and d.weekday() not in dow_indices:
            continue
        if hours is not None and h not in hours:
            continue
        if sport is not None and s["sport"] != sport:
            continue
        t += 1
        if s["id"] in booked_ids:
            b += 1
    return (100.0 * b / t) if t else 0.0


def main():
    print("=" * 70)
    print(" Sports Turf Profit Optimizer -- Dataset Validation")
    print("=" * 70)

    slots     = read_csv("slots.csv")
    bookings  = read_csv("bookings.csv")
    customers = read_csv("customers.csv")
    arenas    = read_csv("arenas.csv")

    slot_map   = {s["id"]: s for s in slots}
    booked_ids = set()
    cancelled_ids = set()
    for b in bookings:
        if b["status"] != "CANCELLED":
            booked_ids.add(b["slot_id"])
        else:
            cancelled_ids.add(b["slot_id"])

    # ------------------------------------------------------------------
    # 1. Basic counts
    # ------------------------------------------------------------------
    print("\n" + SEP)
    print(" 1. Record Counts")
    print(SEP)
    print("   Arenas      : %d"   % len(arenas))
    print("   Customers   : %d"   % len(customers))
    print("   Slots total : %s"   % format(len(slots), ","))
    total_b     = len(bookings)
    confirmed_b = len(booked_ids)
    print("   Bookings    : %s  (active: %s  cancelled: %s)" % (
        format(total_b, ","),
        format(confirmed_b, ","),
        format(len(cancelled_ids), ",")
    ))

    # ------------------------------------------------------------------
    # 2. Booking count by sport
    # ------------------------------------------------------------------
    print("\n" + SEP)
    print(" 2. Fill Rate by Sport")
    print(SEP)
    sport_slots  = defaultdict(int)
    sport_booked = defaultdict(int)
    for s in slots:
        sport_slots[s["sport"]] += 1
        if s["id"] in booked_ids:
            sport_booked[s["sport"]] += 1
    for sport in sorted(sport_slots):
        total  = sport_slots[sport]
        booked = sport_booked[sport]
        pct    = 100.0 * booked / total if total else 0
        bar    = "#" * int(pct / 3)
        print("   %-12s  Slots: %6s   Booked: %5s   Fill: %5.1f%%  %s" % (
            sport, format(total, ","), format(booked, ","), pct, bar))

    # ------------------------------------------------------------------
    # 3. Peak vs Non-Peak
    # ------------------------------------------------------------------
    print("\n" + SEP)
    print(" 3. Fill Rate -- PEAK vs NON_PEAK")
    print(SEP)
    period_slots  = defaultdict(int)
    period_booked = defaultdict(int)
    for s in slots:
        period_slots[s["period"]] += 1
        if s["id"] in booked_ids:
            period_booked[s["period"]] += 1
    for period in ["PEAK", "NON_PEAK"]:
        total  = period_slots[period]
        booked = period_booked[period]
        pct    = 100.0 * booked / total if total else 0
        bar    = "#" * int(pct / 3)
        print("   %-12s  Slots: %6s   Booked: %5s   Fill: %5.1f%%  %s" % (
            period, format(total, ","), format(booked, ","), pct, bar))

    peak_fill    = 100.0 * period_booked["PEAK"]    / period_slots["PEAK"]
    nonpeak_fill = 100.0 * period_booked["NON_PEAK"] / period_slots["NON_PEAK"]
    gap = peak_fill - nonpeak_fill
    status = "OK" if gap > 5 else "WARNING: gap too small"
    print("\n   PEAK vs NON_PEAK gap: %+.1fpp  [%s]" % (gap, status))

    # ------------------------------------------------------------------
    # 4. Day-of-week fill rate
    # ------------------------------------------------------------------
    print("\n" + SEP)
    print(" 4. Fill Rate by Day of Week")
    print(SEP)
    DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    dow_slots  = defaultdict(int)
    dow_booked = defaultdict(int)
    for s in slots:
        d   = date.fromisoformat(s["date"])
        day = DAYS[d.weekday()]
        dow_slots[day]  += 1
        if s["id"] in booked_ids:
            dow_booked[day] += 1
    for day in DAYS:
        total  = dow_slots[day]
        booked = dow_booked[day]
        pct    = 100.0 * booked / total if total else 0
        bar    = "#" * int(pct / 3)
        print("   %-10s  %5.1f%%  %s" % (day, pct, bar))

    # ------------------------------------------------------------------
    # 5. Hourly fill rate
    # ------------------------------------------------------------------
    print("\n" + SEP)
    print(" 5. Fill Rate by Start Hour")
    print(SEP)
    hour_slots  = defaultdict(int)
    hour_booked = defaultdict(int)
    for s in slots:
        h = int(s["start_time"].split(":")[0])
        hour_slots[h]  += 1
        if s["id"] in booked_ids:
            hour_booked[h] += 1
    for h in sorted(hour_slots):
        total  = hour_slots[h]
        booked = hour_booked[h]
        pct    = 100.0 * booked / total if total else 0
        tag    = " <- PEAK" if h >= 17 else ""
        bar    = "#" * int(pct / 3)
        print("   %02d:00  %5.1f%%  %s%s" % (h, pct, bar, tag))

    # ------------------------------------------------------------------
    # 6. Key demand pattern checks
    # ------------------------------------------------------------------
    print("\n" + SEP)
    print(" 6. Key Demand Pattern Verification")
    print(SEP)

    wd_pm_fb    = slot_fill_rate(slots, booked_ids, dow_indices=[0,1,2,3,4], hours=[14,15,16], sport="Football")
    wknd_ev_fb  = slot_fill_rate(slots, booked_ids, dow_indices=[5,6],       hours=[18,19,20], sport="Football")
    wd_pm_all   = slot_fill_rate(slots, booked_ids, dow_indices=[0,1,2,3,4], hours=[14,15,16])
    wknd_ev_all = slot_fill_rate(slots, booked_ids, dow_indices=[5,6],       hours=[18,19,20])

    print("   Weekday 14-16 Football (low demand expected) : %5.1f%%" % wd_pm_fb)
    print("   Weekend 18-20 Football (high demand expected): %5.1f%%" % wknd_ev_fb)
    print("   Weekday 14-16 all sports                     : %5.1f%%" % wd_pm_all)
    print("   Weekend 18-20 all sports                     : %5.1f%%" % wknd_ev_all)

    diff = wknd_ev_fb - wd_pm_fb
    status2 = "OK" if diff > 10 else "WARNING: gap too small"
    print("\n   Weekend evening / Weekday afternoon gap: %+.1fpp  [%s]" % (diff, status2))

    # ------------------------------------------------------------------
    # 7. Financial summary
    # ------------------------------------------------------------------
    print("\n" + SEP)
    print(" 7. Financial Summary")
    print(SEP)
    orig_prices  = []
    final_prices = []
    discounts    = []
    for b in bookings:
        if b["status"] != "CANCELLED":
            orig_prices.append(float(b["original_price"]))
            final_prices.append(float(b["final_price"]))
            discounts.append(float(b["discount_percentage"]))

    discounted = sum(1 for d in discounts if d > 0)
    disc_pct_of_total = 100.0 * discounted / len(discounts) if discounts else 0

    print("   Active bookings              : %s" % format(len(orig_prices), ","))
    print("   Avg original booking value   : Rs. %.2f" % avg(orig_prices))
    print("   Avg final booking value      : Rs. %.2f" % avg(final_prices))
    print("   Avg discount %%               : %.2f%%" % avg(discounts))
    print("   Bookings with discount       : %s  (%.1f%%)" % (
        format(discounted, ","), disc_pct_of_total))

    # ------------------------------------------------------------------
    # 8. Cancellation rate
    # ------------------------------------------------------------------
    print("\n" + SEP)
    print(" 8. Cancellation Rate")
    print(SEP)
    cancelled = sum(1 for b in bookings if b["status"] == "CANCELLED")
    rate = 100.0 * cancelled / total_b if total_b else 0
    print("   Total bookings               : %s" % format(total_b, ","))
    print("   Cancelled                    : %s" % format(cancelled, ","))
    print("   Cancellation rate            : %.1f%%" % rate)

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + SEP)
    print(" SUMMARY")
    print(SEP)

    issues = []
    if gap < 5:
        issues.append("WARNING: PEAK vs NON_PEAK gap is too small (%.1fpp)" % gap)
    if diff < 10:
        issues.append("WARNING: Weekend/Weekday demand gap is too small (%.1fpp)" % diff)
    if rate < 2 or rate > 20:
        issues.append("WARNING: Cancellation rate %.1f%% seems unusual" % rate)

    if not issues:
        print("  All demand pattern checks PASSED.")
    else:
        for i in issues:
            print("  " + i)

    print("")
    print("  Peak utilisation   : %.1f%%" % peak_fill)
    print("  Non-peak util.     : %.1f%%" % nonpeak_fill)
    print("  Weekday 14-16 FB   : %.1f%%" % wd_pm_fb)
    print("  Weekend 18-20 FB   : %.1f%%" % wknd_ev_fb)
    print("=" * 70)


if __name__ == "__main__":
    main()

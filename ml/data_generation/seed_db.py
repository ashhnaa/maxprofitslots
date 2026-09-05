"""
seed_db.py
Reads the generated CSVs and loads them into PostgreSQL.
- Truncates demo tables in safe dependency order.
- Resets sequences so IDs align with CSV IDs.
- Inserts: arenas -> customers -> slots -> bookings.
- Verifies row counts after seeding.

Run from the project root:
    python ml/data_generation/seed_db.py
"""

import os
import sys
import csv
import io

# UTF-8 output on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

HERE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(HERE, "../../backend/.env"))

DATA_DIR = os.path.join(HERE, "data")

def get_conn():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url)
    return psycopg2.connect(
        host=os.getenv("PGHOST",     "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        dbname=os.getenv("PGDATABASE", "sports_turf_db"),
        user=os.getenv("PGUSER",     "postgres"),
        password=os.getenv("PGPASSWORD", "postgres"),
    )

def read_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print("[ERROR] CSV not found: %s" % path)
        sys.exit(1)
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def truncate_tables(cur):
    print("Truncating demo tables ...")
    cur.execute("""
        TRUNCATE TABLE campaigns, recommendations, bookings, slots, customers, arenas
        RESTART IDENTITY CASCADE;
    """)
    print("  [OK] Tables cleared and sequences reset.")

def seed_arenas(cur, rows):
    data = [(r["name"], r["location"], r["created_at"]) for r in rows]
    execute_values(cur, """
        INSERT INTO arenas (name, location, created_at)
        VALUES %s
    """, data)
    print("  [OK] Arenas inserted: %d" % len(data))

def seed_customers(cur, rows):
    data = [(r["name"], r["email"], r["phone"], r["created_at"]) for r in rows]
    execute_values(cur, """
        INSERT INTO customers (name, email, phone, created_at)
        VALUES %s
    """, data)
    print("  [OK] Customers inserted: %d" % len(data))

def seed_slots(cur, rows):
    batch_size = 2000
    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        data  = [
            (
                int(r["arena_id"]),
                r["sport"],
                r["date"],
                r["start_time"],
                r["end_time"],
                int(r["duration_minutes"]),
                float(r["normal_price"]),
                r["period"],
                r["status"],
                r["created_at"],
            )
            for r in batch
        ]
        execute_values(cur, """
            INSERT INTO slots
              (arena_id, sport, date, start_time, end_time,
               duration_minutes, normal_price, period, status, created_at)
            VALUES %s
        """, data)
        total += len(batch)
    print("  [OK] Slots inserted: %s" % format(total, ","))

def seed_bookings(cur, rows):
    batch_size = 2000
    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        data  = [
            (
                int(r["slot_id"]),
                int(r["customer_id"]),
                r["booking_time"],
                float(r["original_price"]),
                float(r["discount_percentage"]),
                float(r["discount_amount"]),
                float(r["final_price"]),
                int(r["duration_minutes"]),
                r["status"],
                r["created_at"],
            )
            for r in batch
        ]
        execute_values(cur, """
            INSERT INTO bookings
              (slot_id, customer_id, booking_time,
               original_price, discount_percentage, discount_amount,
               final_price, duration_minutes, status, created_at)
            VALUES %s
        """, data)
        total += len(batch)
    print("  [OK] Bookings inserted: %s" % format(total, ","))

def verify(cur):
    tables = ["arenas", "customers", "slots", "bookings"]
    print("\nVerification:")
    for t in tables:
        cur.execute("SELECT COUNT(*) FROM %s" % t)
        count = cur.fetchone()[0]
        print("  %-12s: %8s rows" % (t, format(count, ",")))

def main():
    print("=" * 60)
    print(" Sports Turf Profit Optimizer -- Database Seeder")
    print("=" * 60)

    print("\nReading CSV files ...")
    arenas    = read_csv("arenas.csv")
    customers = read_csv("customers.csv")
    slots     = read_csv("slots.csv")
    bookings  = read_csv("bookings.csv")
    print("  Arenas: %d  Customers: %d  Slots: %s  Bookings: %s" % (
        len(arenas), len(customers),
        format(len(slots), ","), format(len(bookings), ",")
    ))

    print("\nConnecting to PostgreSQL ...")
    conn = get_conn()
    conn.autocommit = False
    cur  = conn.cursor()

    try:
        truncate_tables(cur)

        print("\nInserting data ...")
        seed_arenas(cur, arenas)
        seed_customers(cur, customers)
        seed_slots(cur, slots)
        seed_bookings(cur, bookings)

        verify(cur)
        conn.commit()
        print("\n[DONE] Database seeded successfully!")

    except Exception as e:
        conn.rollback()
        print("\n[ERROR] Seeding failed: %s" % e)
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()

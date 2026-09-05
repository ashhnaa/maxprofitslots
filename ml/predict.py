import os
import sys
import json
import argparse
import numpy as np
import pandas as pd
import joblib

def main():
    parser = argparse.ArgumentParser(description="Predict slot natural booking probability using trained RandomForest model")
    parser.add_argument('--arena_id', type=int, required=True, help="Arena ID (1-3)")
    parser.add_argument('--sport', type=str, required=True, help="Sport name (Football, Cricket, Badminton, Basketball)")
    parser.add_argument('--day_of_week', type=int, required=True, help="Day of week (0=Mon, 6=Sun)")
    parser.add_argument('--start_hour', type=int, required=True, help="Start hour (8-21)")
    parser.add_argument('--is_peak', type=int, required=True, help="1 for PEAK, 0 for NON_PEAK")
    parser.add_argument('--normal_price', type=float, required=True, help="Normal price of slot")
    parser.add_argument('--historical_fill_rate', type=float, default=None, help="Optional historical fill rate decimal (0.0 - 1.0)")

    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, 'models')
    model_path = os.path.join(models_dir, 'demand_model.pkl')
    group_rates_path = os.path.join(models_dir, 'group_fill_rates.json')

    if not os.path.exists(model_path):
        print(json.dumps({"error": f"Model file not found at {model_path}"}))
        sys.exit(1)

    model = joblib.load(model_path)

    sport_map = {'Football': 0, 'Cricket': 1, 'Badminton': 2, 'Basketball': 3}
    sport_encoded = sport_map.get(args.sport, 0)

    # Determine historical fill rate feature value
    fill_rate = args.historical_fill_rate
    if fill_rate is None and os.path.exists(group_rates_path):
        with open(group_rates_path, 'r') as f:
            group_dict = json.load(f)
        key = f"{args.arena_id}_{args.sport}_{args.day_of_week}_{args.start_hour}"
        fill_rate = group_dict.get(key, 0.25)
    
    if fill_rate is None:
        fill_rate = 0.25

    # If fill_rate is given as percentage (>1.0), convert to decimal
    if fill_rate > 1.0:
        fill_rate = fill_rate / 100.0

    features = pd.DataFrame([{
        'arena_id': args.arena_id,
        'sport_encoded': sport_encoded,
        'day_of_week': args.day_of_week,
        'start_hour': args.start_hour,
        'is_peak': args.is_peak,
        'normal_price': args.normal_price,
        'group_fill_rate': fill_rate
    }])

    prob = float(model.predict_proba(features)[0][1])

    output = {
        "bookingProbability": round(prob, 4),
        "inputs": {
            "arenaId": args.arena_id,
            "sport": args.sport,
            "dayOfWeek": args.day_of_week,
            "startHour": args.start_hour,
            "isPeak": args.is_peak,
            "normalPrice": args.normal_price,
            "historicalFillRate": round(fill_rate, 4)
        }
    }

    print(json.dumps(output))

if __name__ == '__main__':
    main()

import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import joblib

def main():
    print("=== Training Demand Prediction Model (RandomForest) ===")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, 'data_generation', 'data')
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)

    # 1. Load data from CSVs
    slots_path = os.path.join(data_dir, 'slots.csv')
    bookings_path = os.path.join(data_dir, 'bookings.csv')

    print(f"Loading slots from: {slots_path}")
    df_slots = pd.read_csv(slots_path)
    print(f"Loading bookings from: {bookings_path}")
    df_bookings = pd.read_csv(bookings_path)

    # 2. Target Variable Construction
    # Target = 1 if slot status is BOOKED (and has a non-cancelled booking), 0 otherwise
    df_slots = df_slots[df_slots['status'] != 'BLOCKED'].copy()
    
    confirmed_slot_ids = set(df_bookings[df_bookings['status'] != 'CANCELLED']['slot_id'])
    df_slots['target'] = df_slots['id'].apply(lambda x: 1 if x in confirmed_slot_ids else 0)

    print(f"Total valid slots: {len(df_slots)}")
    print(f"Target distribution - Booked (1): {df_slots['target'].sum()} ({(df_slots['target'].mean()*100):.2f}%), Unbooked (0): {(df_slots['target']==0).sum()}")

    # 3. Feature Engineering
    df_slots['date'] = pd.to_datetime(df_slots['date'])
    df_slots['day_of_week'] = df_slots['date'].dt.dayofweek  # 0=Monday, 6=Sunday
    df_slots['start_hour'] = df_slots['start_time'].apply(lambda t: int(str(t).split(':')[0]))
    df_slots['is_peak'] = df_slots['period'].apply(lambda p: 1 if p == 'PEAK' else 0)

    # Historical fill rate feature per group (arena_id, sport, day_of_week, start_hour)
    group_cols = ['arena_id', 'sport', 'day_of_week', 'start_hour']
    group_fill_rates = df_slots.groupby(group_cols)['target'].agg(['count', 'mean']).reset_index()
    group_fill_rates.rename(columns={'mean': 'group_fill_rate', 'count': 'group_count'}, inplace=True)
    
    df_slots = df_slots.merge(group_fill_rates, on=group_cols, how='left')
    df_slots['group_fill_rate'] = df_slots['group_fill_rate'].fillna(0.0)

    # Encoding categorical feature: sport
    sport_map = {'Football': 0, 'Cricket': 1, 'Badminton': 2, 'Basketball': 3}
    df_slots['sport_encoded'] = df_slots['sport'].map(sport_map)

    # Feature List
    feature_cols = [
        'arena_id',
        'sport_encoded',
        'day_of_week',
        'start_hour',
        'is_peak',
        'normal_price',
        'group_fill_rate'
    ]

    X = df_slots[feature_cols]
    y = df_slots['target']

    # 4. Train / Test Split (80/20 stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"Training set size: {len(X_train)} samples")
    print(f"Test set size:     {len(X_test)} samples")

    # 5. Model Training (RandomForestClassifier)
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # 6. Model Evaluation
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    accuracy = float(accuracy_score(y_test, y_pred))
    precision = float(precision_score(y_test, y_pred))
    recall = float(recall_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred))
    roc_auc = float(roc_auc_score(y_test, y_prob))

    print("\n--- Model Evaluation Metrics (Test Set) ---")
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}")

    # Feature Importances
    importances = dict(zip(feature_cols, [float(v) for v in model.feature_importances_]))
    print("\n--- Feature Importances ---")
    for feat, imp in importances.items():
        print(f"  {feat}: {imp:.4f}")

    # 7. Save Model & Metadata Artifacts
    model_file = os.path.join(models_dir, 'demand_model.pkl')
    joblib.dump(model, model_file)
    print(f"\nSaved model to: {model_file}")

    metadata = {
        "model_type": "RandomForestClassifier",
        "n_estimators": 100,
        "max_depth": 10,
        "trained_at": datetime.now().isoformat(),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "feature_cols": feature_cols,
        "sport_map": sport_map,
        "metrics": {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(roc_auc, 4)
        },
        "feature_importances": importances
    }

    metadata_file = os.path.join(models_dir, 'metadata.json')
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to: {metadata_file}")

    # Save group fill rates table for quick lookup in prediction service
    group_rates_file = os.path.join(models_dir, 'group_fill_rates.json')
    group_dict = group_fill_rates.set_index(['arena_id', 'sport', 'day_of_week', 'start_hour'])['group_fill_rate'].to_dict()
    str_group_dict = {f"{k[0]}_{k[1]}_{k[2]}_{k[3]}": float(v) for k, v in group_dict.items()}
    with open(group_rates_file, 'w') as f:
        json.dump(str_group_dict, f, indent=2)
    print(f"Saved group fill rates table to: {group_rates_file}")

if __name__ == '__main__':
    main()

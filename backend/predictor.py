import os
import joblib
import numpy as np
from datetime import datetime

from feature_pipeline import build_feature_vector

MODEL_PATH = "../models"
TARIFF = 7.35

print("Loading ML models...")

labels = joblib.load(os.path.join(MODEL_PATH,"appliance_labels.pkl"))
max_powers = joblib.load(os.path.join(MODEL_PATH,"max_powers.pkl"))
cutoffs = joblib.load(os.path.join(MODEL_PATH,"cutoffs.pkl"))

MODELS = {}

for name in labels:
    path = os.path.join(MODEL_PATH, f"rf_{name}.pkl")
    if os.path.exists(path):
        MODELS[name] = joblib.load(path)

print("Models loaded:", list(MODELS.keys()))


def predict_appliances(aggregate_window):

    timestamp = int(datetime.now().timestamp())

    features = build_feature_vector(aggregate_window)

    predictions = {}

    for name, model in MODELS.items():

        raw = float(np.clip(model.predict(features)[0], 0, max_powers[name]))

        watts = raw if raw >= cutoffs[name] else 0

        predictions[labels[name]] = watts

    aggregate = float(aggregate_window[-1])

    detected = sum(predictions.values())

    background = max(0, aggregate - detected)

    cost_hr = (aggregate / 1000) * TARIFF

    return {
        "timestamp": datetime.now().isoformat(),
        "aggregate": aggregate,
        "detected_appliances": predictions,
        "identified_power": detected,
        "background_power": background,
        "cost_per_hour": cost_hr,
        "cost_daily": cost_hr * 8,
        "cost_monthly": cost_hr * 8 * 30
    }
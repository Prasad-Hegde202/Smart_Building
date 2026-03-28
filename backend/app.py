"""
Flask Backend — Smart Building NILM
=====================================
Clean API only — no frontend, no HTML.
Hybrid database: SQLite (local) + Firebase (cloud)
Models: auto-downloaded from Google Drive on first run

Endpoints:
  GET  /health    → server status check
  POST /predict   → receives watts, returns disaggregation JSON
  POST /sensor    → for ESP32 IoT readings (same as /predict)
  POST /iot       → alias for /sensor (accepts "power" key too)
  GET  /latest    → most recent prediction
  GET  /history   → last 50 readings
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import joblib
import os
import sqlite3
import json
import requests
from datetime import datetime, timezone, timedelta
from collections import deque

# ================== CUSTOM CLASS (ADD HERE) ==================
class KettleSpikeDetector:
    def __init__(self, *args, **kwargs):
        pass

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        return X

    def predict(self, X):
        return [0] * len(X)  # dummy output

    def fit_transform(self, X, y=None):
        return X

import sys
sys.modules['__main__'].KettleSpikeDetector = KettleSpikeDetector


# ── IST Timezone ──────────────────────────────────────────────────────────────
IST = timezone(timedelta(hours=5, minutes=30))

def now_ist():
    return datetime.now(IST)

# ── Path Setup ────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models")

app = Flask(__name__)
CORS(app)

# ── Config ────────────────────────────────────────────────────────────────────
TARIFF         = 7.35
WINDOW_SIZE    = 15
reading_window = deque(maxlen=WINDOW_SIZE)
history        = deque(maxlen=20)

# ══════════════════════════════════════════════════════════════════════════════
# MODEL DOWNLOAD FROM GOOGLE DRIVE
# ══════════════════════════════════════════════════════════════════════════════

MODEL_URLS = {
    "appliance_labels.pkl" : "https://drive.google.com/uc?export=download&id=1Kyn6KIQFBVMPFz6Ao7yFYiF92_1zcV2k",
    "cutoffs.pkl"          : "https://drive.google.com/uc?export=download&id=1jKu60Q-QBLdfsqPY2jqodCDk_yawUPuB",
    "max_powers.pkl"       : "https://drive.google.com/uc?export=download&id=1v27kUU3YvLSlEvnfZ1vxrZGagWTp8vPR",
    "rf_Appliance2.pkl"    : "https://drive.google.com/uc?export=download&id=1tZ3mF-FqJgyG3h1HNnKwzTspvtXi4hbv",
    "rf_Appliance3.pkl"    : "https://drive.google.com/uc?export=download&id=16-eh03Gk3_ve6_YiZ7i7U7mrWacZvi79",
    "rf_Appliance6.pkl"    : "https://drive.google.com/uc?export=download&id=18LK3GzUtH7pfqL2eYRToAB9hmz0mzLzG",
    "rf_Appliance7.pkl"    : "https://drive.google.com/uc?export=download&id=1yWqfHF2_zpIQGfg5BXMOYeAfrH1Bpcu3",
    "thresholds.pkl"       : "https://drive.google.com/uc?export=download&id=1nc4AFPNpRUsaYmJfe7wh8TExl3JukSG2",
}

def download_model(url, path):
    """Download a model file from Google Drive if not already present."""
    if os.path.exists(path):
        print(f"  ✓ Found: {os.path.basename(path)}")
        return
    print(f"  ⬇ Downloading: {os.path.basename(path)} ...")
    try:
        session  = requests.Session()
        response = session.get(url, stream=True, timeout=60)

        # Handle Google Drive large file confirmation page
        for key, value in response.cookies.items():
            if key.startswith("download_warning"):
                params   = {"confirm": value, "id": url.split("id=")[-1]}
                response = session.get(
                    "https://drive.google.com/uc?export=download",
                    params=params, stream=True, timeout=60
                )
                break

        with open(path, "wb") as f:
            for chunk in response.iter_content(chunk_size=32768):
                if chunk:
                    f.write(chunk)

        size_mb = os.path.getsize(path) / (1024 * 1024)
        print(f"  ✅ Downloaded: {os.path.basename(path)} ({size_mb:.1f} MB)")

    except Exception as e:
        print(f"  ❌ Failed to download {os.path.basename(path)}: {e}")


def download_all_models():
    """Ensure all model files exist — download missing ones."""
    os.makedirs(MODEL_PATH, exist_ok=True)
    print("\n  Checking model files...")
    for filename, url in MODEL_URLS.items():
        path = os.path.join(MODEL_PATH, filename)
        download_model(url, path)
    print("  Model check complete.\n")

# ── Download models now (blocking — ensures models exist before server starts) ─
download_all_models()

# ══════════════════════════════════════════════════════════════════════════════
# DATABASE — SQLITE (LOCAL BACKUP)
# ══════════════════════════════════════════════════════════════════════════════

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "energy.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp      TEXT,
            aggregate_w    REAL,
            identified_w   REAL,
            background_w   REAL,
            identified_pct REAL,
            cost_per_hr    REAL,
            tip            TEXT,
            full_json      TEXT
        )
    """)
    conn.commit()
    conn.close()
    print("  ✅ SQLite ready")

def save_to_sqlite(result):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            INSERT INTO predictions
              (timestamp, aggregate_w, identified_w, background_w,
               identified_pct, cost_per_hr, tip, full_json)
            VALUES (?,?,?,?,?,?,?,?)
        """, (
            result["timestamp"],
            result["aggregate_w"],
            result["total_identified_w"],
            result["total_bg_w"],
            result["identified_pct"],
            result["cost"]["per_hour"],
            result["tip"],
            json.dumps(result),
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"  [SQLite] Save error: {e}")

def get_from_sqlite(limit=50):
    try:
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute("""
            SELECT full_json FROM predictions
            ORDER BY id DESC LIMIT ?
        """, (limit,)).fetchall()
        conn.close()
        return [json.loads(r[0]) for r in rows]
    except Exception as e:
        print(f"  [SQLite] Read error: {e}")
        return []

init_db()

# ══════════════════════════════════════════════════════════════════════════════
# DATABASE — FIREBASE (CLOUD PRIMARY)
# ══════════════════════════════════════════════════════════════════════════════

FIREBASE_OK  = False
db_firestore = None

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    import json

    firebase_json = os.environ.get("FIREBASE_KEY")

    if firebase_json:
        # ✅ Render / cloud
        cred_dict = json.loads(firebase_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        print("🔥 Firebase connected (ENV)")

    else:
        # ✅ Local fallback
        key_path = os.path.join(os.path.dirname(__file__), "firebase-key.json")
        if os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            print("🔥 Firebase connected (LOCAL FILE)")
        else:
            raise Exception("No Firebase config found")

    db_firestore = firestore.client()
    FIREBASE_OK  = True

except Exception as e:
    FIREBASE_OK  = False
    db_firestore = None
    print(f"⚠️ Firebase not connected: {e}")
    print("ℹ️ Running with SQLite only")


def save_to_firebase(result):
    if not FIREBASE_OK or db_firestore is None:
        return
    try:
        clean = json.loads(json.dumps(result))
        db_firestore.collection("predictions").add(clean)
    except Exception as e:
        print(f"  [Firebase] Save error: {e}")


def get_from_firebase(limit=50):
    if not FIREBASE_OK or db_firestore is None:
        return []
    try:
        docs = db_firestore.collection("predictions") \
            .order_by("timestamp_unix", direction="DESCENDING") \
            .limit(limit).stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"  [Firebase] Read error: {e}")
        return []


def get_latest_from_firebase():
    if not FIREBASE_OK or db_firestore is None:
        return None
    try:
        docs = db_firestore.collection("predictions") \
            .order_by("timestamp_unix", direction="DESCENDING") \
            .limit(1).stream()
        for doc in docs:
            return doc.to_dict()
        return None
    except Exception as e:
        print(f"  [Firebase] Latest error: {e}")
        return None

# ══════════════════════════════════════════════════════════════════════════════
# HYBRID SAVE / READ STRATEGY
# ══════════════════════════════════════════════════════════════════════════════

def save_prediction(result):
    """Save to BOTH SQLite and Firebase simultaneously."""
    # Ensure timestamp_unix always exists — required for Firebase ordering
    if "timestamp_unix" not in result:
        result["timestamp_unix"] = int(now_ist().timestamp())
    save_to_sqlite(result)
    save_to_firebase(result)


def read_history(limit=50):
    """Firebase first → SQLite → in-memory."""
    data = get_from_firebase(limit)
    if data:
        return data
    data = get_from_sqlite(limit)
    if data:
        return data
    return list(history)


def read_latest():
    """Firebase first → SQLite → in-memory."""
    doc = get_latest_from_firebase()
    if doc:
        return doc
    rows = get_from_sqlite(1)
    if rows:
        return rows[0]
    if history:
        return history[0]
    return None

# ══════════════════════════════════════════════════════════════════════════════
# LOAD ML MODELS
# ══════════════════════════════════════════════════════════════════════════════

def load_models():
    try:
        labels     = joblib.load(os.path.join(MODEL_PATH, "appliance_labels.pkl"))
        max_powers = joblib.load(os.path.join(MODEL_PATH, "max_powers.pkl"))
        cutoffs    = joblib.load(os.path.join(MODEL_PATH, "cutoffs.pkl"))
        models     = {}
        for name in labels:
            path = os.path.join(MODEL_PATH, f"rf_{name}.pkl")
            if os.path.exists(path):
                models[name] = joblib.load(path)
        print(f"  ✅ Loaded {len(models)} models: {list(models.keys())}")
        print(f"  ℹ️  Labels in pkl: {list(labels)}")
        return labels, max_powers, cutoffs, models
    except Exception as e:
        print(f"  ❌ Model load error: {e}")
        return None, None, None, {}

LABELS, MAX_POWERS, CUTOFFS, MODELS = load_models()

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE EXTRACTION
# ══════════════════════════════════════════════════════════════════════════════

def extract_features(window_agg, timestamp):
    features = []
    diffs    = np.diff(window_agg)
    features.append(np.mean(window_agg))
    features.append(np.std(window_agg))
    features.append(np.min(window_agg))
    features.append(np.max(window_agg))
    features.append(np.max(window_agg) - np.min(window_agg))
    features.append(np.median(window_agg))
    features.append(np.percentile(window_agg, 25))
    features.append(np.percentile(window_agg, 75))
    features.append(np.sum(window_agg))
    features.append(window_agg[-1])
    features.append(window_agg[-2])
    features.append(window_agg[-3])
    features.append(window_agg[-1] - window_agg[-2])
    features.append(window_agg[-2] - window_agg[-3])
    features.append(window_agg[-1] - window_agg[0])
    features.append(window_agg[-1] - np.mean(window_agg))
    features.append(abs(window_agg[-1] - window_agg[-2]))
    features.append(abs(window_agg[-2] - window_agg[-3]))
    features.append(np.mean(np.abs(diffs)))
    features.append(np.max(np.abs(diffs)))
    features.append(np.std(diffs))
    features.append(np.mean(window_agg[-5:]))
    features.append(np.mean(window_agg[-10:]))
    features.append(np.std(window_agg[-5:]))
    features.append(np.std(window_agg[-10:]))
    features.append(np.mean(window_agg[-5:]) - np.mean(window_agg[-10:]))
    x     = np.arange(len(window_agg))
    slope = np.polyfit(x, window_agg, 1)[0]
    features.append(slope)
    features.append(np.sum(window_agg ** 2))
    features.append(np.sqrt(np.mean(window_agg ** 2)))
    features.append(float(np.argmax(window_agg)))
    features.append(float(np.argmin(window_agg)))
    dt = datetime.fromtimestamp(timestamp, tz=IST)
    features.append(np.sin(2 * np.pi * dt.hour      / 24))
    features.append(np.cos(2 * np.pi * dt.hour      / 24))
    features.append(np.sin(2 * np.pi * dt.weekday() / 7))
    features.append(np.cos(2 * np.pi * dt.weekday() / 7))
    features.append(np.sin(2 * np.pi * dt.minute    / 60))
    features.append(np.cos(2 * np.pi * dt.minute    / 60))
    return features

# ══════════════════════════════════════════════════════════════════════════════
# APPLIANCE CLASSIFIER
# ══════════════════════════════════════════════════════════════════════════════

def classify_appliance(watts, window_agg):
    if watts <= 0:
        return None, None, None
    variability = np.std(window_agg) / (np.mean(window_agg) + 1e-8)
    is_cycling  = variability > 0.05
    is_spiking  = (np.max(window_agg) - np.min(window_agg)) > 300

    if 300 <= watts <= 2500 and is_cycling:
        return "Motor Appliance", "Washing Machine / Water Pump", "🔄"
    if watts >= 2000:
        return "Heating Appliance", "Geyser / Electric Water Heater", "🔥"
    if watts >= 1000 and (is_spiking or not is_cycling):
        return "Thermal Appliance", "Air Conditioner / Room Heater", "🌡️"
    if watts >= 500:
        return "Heating Appliance", "Induction Stove / Electric Iron", "♨️"
    if watts >= 200 and is_cycling:
        return "Motor Appliance", "Washing Machine (Low Load) / Mixer", "🔄"
    if watts >= 50:
        return "Standby Appliance", "Television / Computer / Set-top Box", "📺"
    return "Low Power Device", "Charger / Small Appliance", "🔌"

# ══════════════════════════════════════════════════════════════════════════════
# BACKGROUND ESTIMATOR
# ══════════════════════════════════════════════════════════════════════════════

def estimate_background(unaccounted, hour):
    devices   = []
    remaining = unaccounted

    def add(name, frac, max_w, note):
        nonlocal remaining
        w = min(max_w, remaining * frac)
        if w > 5:
            devices.append({"name": name, "watts": round(w, 1), "note": note})
            remaining -= w

    add("🧊 Refrigerator",         0.25, 150, "Always ON — compressor cycling")
    add(f"🌀 Ceiling Fan(s) ×{'2' if 6<=hour<=22 else '1'}",
        0.20, 150 if 6<=hour<=22 else 75,
        f"{'2 fans' if 6<=hour<=22 else '1 fan'} running")
    if hour >= 18 or hour < 6:
        add("💡 LED Lights",        0.15,  80, "Evening/night lighting")
    else:
        add("💡 LED Lights",        0.08,  30, "Daytime minimal lighting")
    if 17 <= hour <= 23:
        add("📺 TV + Set-top Box",  0.20, 120, "Evening viewing")
    add("📡 WiFi Router",           0.05,  15, "Always ON")
    add("🔋 Phone/Laptop Chargers", 0.10,  40, "Charging devices")
    if 6 <= hour <= 9 or 17 <= hour <= 20:
        add("💧 Water Motor Pump",  0.30, 370, "Morning/evening water supply")

    return devices, max(0, remaining)

# ══════════════════════════════════════════════════════════════════════════════
# CORE PREDICTION
# ══════════════════════════════════════════════════════════════════════════════

def run_prediction(window_agg, timestamp):
    if not MODELS:
        return {"error": "Models not loaded. Check models/ folder."}

    features = np.array(
        extract_features(window_agg, timestamp)
    ).reshape(1, -1)

    seen_categories = {}
    for name, model in MODELS.items():
        raw   = float(np.clip(model.predict(features)[0], 0, MAX_POWERS[name]))
        watts = raw if raw >= CUTOFFS[name] else 0.0
        if watts <= 0:
            continue
        category, indian_name, emoji = classify_appliance(watts, window_agg)
        if category is None:
            continue
        if category not in seen_categories or watts > seen_categories[category]["watts"]:
            seen_categories[category] = {
                "category"   : category,
                "appliance"  : indian_name,
                "emoji"      : emoji,
                "watts"      : round(watts, 1),
                "cost_per_hr": round((watts / 1000) * TARIFF, 2),
            }

    current_agg   = float(window_agg[-1])
    on_appliances = list(seen_categories.values())

    # Physical constraint 1 — no appliance > 95% of aggregate
    on_appliances = [
        a for a in on_appliances if a["watts"] <= current_agg * 0.95
    ]

    # Physical constraint 2 — total cannot exceed aggregate
    on_appliances.sort(key=lambda x: x["watts"], reverse=True)
    budget, valid = current_agg, []
    for a in on_appliances:
        if a["watts"] <= budget:
            valid.append(a)
            budget -= a["watts"]
    on_appliances = valid

    total_identified = sum(a["watts"] for a in on_appliances)

    for a in on_appliances:
        a["share_pct"] = round(
            100 * a["watts"] / current_agg, 1
        ) if current_agg > 0 else 0

    unaccounted = max(0.0, current_agg - total_identified)
    dt          = datetime.fromtimestamp(timestamp, tz=IST)
    hour        = dt.hour

    bg_devices, truly_unknown = estimate_background(unaccounted, hour)
    total_bg = sum(d["watts"] for d in bg_devices) + truly_unknown

    if 6 <= hour < 9:
        tip = "Morning peak! Stagger Geyser + Washing Machine usage."
    elif 12 <= hour < 15:
        tip = "Afternoon — good time for heavy appliances if solar available."
    elif 18 <= hour < 21:
        tip = "Evening peak (6-9 PM). Avoid high-power appliances if possible."
    elif 22 <= hour or hour < 5:
        tip = "Night — low load. Good time for washing machine cycle."
    else:
        tip = "Normal hours. Consumption looks typical."

    return {
        "timestamp"          : dt.strftime("%d %b %Y, %I:%M %p"),
        "timestamp_unix"     : int(timestamp),
        "aggregate_w"        : round(current_agg, 1),
        "aggregate_kw"       : round(current_agg / 1000, 3),
        "detected"           : on_appliances,
        "background"         : bg_devices,
        "truly_unknown_w"    : round(truly_unknown, 1),
        "total_identified_w" : round(total_identified, 1),
        "total_bg_w"         : round(total_bg, 1),
        "identified_pct"     : round(
            100 * total_identified / current_agg, 1
        ) if current_agg > 0 else 0,
        "cost": {
            "per_hour": round((current_agg / 1000) * TARIFF, 2),
            "daily"   : round((current_agg / 1000) * TARIFF * 8, 2),
            "monthly" : round((current_agg / 1000) * TARIFF * 8 * 30, 2),
        },
        "tip"     : tip,
        "tariff"  : TARIFF,
        "location": "Bengaluru, Karnataka",
    }

# ══════════════════════════════════════════════════════════════════════════════
# API ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status"        : "ok",
        "models_loaded" : len(MODELS),
        "model_names"   : list(MODELS.keys()),
        "server_time"   : now_ist().strftime("%d %b %Y, %I:%M:%S %p"),
        "sqlite"        : "connected",
        "firebase"      : "connected" if FIREBASE_OK else "not connected",
        "message"       : "NILM Backend running ✅"
    })


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data      = request.get_json(force=True)
        watts     = float(data.get("watts", 0))
        timestamp = int(data.get("timestamp", now_ist().timestamp()))

        if watts <= 0:
            return jsonify({"error": "watts must be > 0"}), 400

        reading_window.append(watts)
        window = list(reading_window)
        if len(window) < WINDOW_SIZE:
            window = [window[0]] * (WINDOW_SIZE - len(window)) + window

        result = run_prediction(np.array(window, dtype=float), timestamp)
        if "error" in result:
            return jsonify(result), 500
        history.appendleft(result)
        save_prediction(result)
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/sensor", methods=["POST"])
def sensor():
    try:
        data      = request.get_json(force=True)
        watts     = float(data.get("watts", 0))
        timestamp = int(data.get("ts", now_ist().timestamp()))

        if watts <= 0:
            return jsonify({"error": "watts must be > 0"}), 400

        reading_window.append(watts)
        window = list(reading_window)
        if len(window) < WINDOW_SIZE:
            window = [window[0]] * (WINDOW_SIZE - len(window)) + window

        result = run_prediction(np.array(window, dtype=float), timestamp)
        if "error" in result:
            return jsonify(result), 500
        history.appendleft(result)
        save_prediction(result)

        print(f"  [IoT] {watts}W → {len(result.get('detected', []))} appliance(s) detected")
        return jsonify({"status": "ok", "result": result})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/iot", methods=["POST"])
def iot():
    """Alias for /sensor — accepts both 'watts' and 'power' keys."""
    try:
        data      = request.get_json(force=True)
        watts     = float(data.get("watts") or data.get("power") or 0)
        timestamp = int(data.get("ts", now_ist().timestamp()))

        if watts <= 0:
            return jsonify({"error": "watts/power must be > 0"}), 400

        reading_window.append(watts)
        window = list(reading_window)
        if len(window) < WINDOW_SIZE:
            window = [window[0]] * (WINDOW_SIZE - len(window)) + window

        result = run_prediction(np.array(window, dtype=float), timestamp)
        if "error" in result:
            return jsonify(result), 500
        history.appendleft(result)
        save_prediction(result)

        print(f"  [IoT] {watts}W → {len(result.get('detected', []))} appliance(s) detected")
        return jsonify({"status": "ok", "result": result})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/latest", methods=["GET"])
def get_latest():
    result = read_latest()
    if result:
        return jsonify(result)
    return jsonify({"message": "no predictions yet"})


@app.route("/history", methods=["GET"])
def get_history():
    return jsonify(read_history(limit=50))


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "="*55)
    print("  ⚡ NILM Flask Backend — Smart Building Project")
    print("="*55)
    print(f"  Models path  : {MODEL_PATH}")
    print(f"  SQLite DB    : {DB_PATH}")
    print(f"  Firebase     : {'✅ connected' if FIREBASE_OK else '⚠️  not connected'}")
    print(f"  Health check : http://localhost:5000/health")
    print(f"  Predict API  : POST http://localhost:5000/predict")
    print(f"  Sensor API   : POST http://localhost:5000/sensor")
    print(f"  IoT alias    : POST http://localhost:5000/iot")
    print(f"  Latest API   : GET  http://localhost:5000/latest")
    print(f"  History API  : GET  http://localhost:5000/history")
    print("="*55 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
import joblib
import os

MODEL_PATH = "../models"

MODELS = {
    "Washing Machine": joblib.load(os.path.join(MODEL_PATH, "rf_Appliance2.pkl")),
    "Dishwasher": joblib.load(os.path.join(MODEL_PATH, "rf_Appliance3.pkl")),
    "Kettle": joblib.load(os.path.join(MODEL_PATH, "rf_Appliance6.pkl")),
    "Tumble Dryer": joblib.load(os.path.join(MODEL_PATH, "rf_Appliance7.pkl")),
}
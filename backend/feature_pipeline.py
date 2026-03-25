import numpy as np
import time
import sys
import os

# Import feature extraction from training pipeline
sys.path.append("../src")
from preprocess import extract_features

WINDOW_SIZE = 15


def build_feature_vector(aggregate_window):

    if len(aggregate_window) < WINDOW_SIZE:
        raise ValueError("Need at least 15 aggregate readings")

    timestamp = int(time.time())

    features = extract_features(
        np.array(aggregate_window),
        timestamp
    )

    return np.array(features).reshape(1, -1)
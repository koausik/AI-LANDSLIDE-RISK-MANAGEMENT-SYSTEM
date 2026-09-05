import os
from flask import Flask, render_template, request, jsonify
import requests
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import urllib.parse

app = Flask(__name__)

# -----------------------------------------------------------------------------
# 1. TRAIN AI MODEL IN MEMORY
# -----------------------------------------------------------------------------
def train_ai_model():
    np.random.seed(42)
    samples = 3000
    rainfall = np.random.uniform(0.0, 300.0, samples)
    soil_moisture = np.random.uniform(10.0, 100.0, samples)
    slope_angle = np.random.uniform(10.0, 60.0, samples)
    
    hazard_score = (
        (rainfall / 300.0) * 0.45 +
        (soil_moisture / 100.0) * 0.35 +
        (slope_angle / 60.0) * 0.20
    )
    labels = (hazard_score > 0.56).astype(int)
    
    X = pd.DataFrame({'rainfall': rainfall, 'moisture': soil_moisture, 'slope': slope_angle})
    clf = RandomForestClassifier(n_estimators=60, random_state=42)
    clf.fit(X, labels)
    return clf

ai_model = train_ai_model()

# -----------------------------------------------------------------------------
# 2. INDIAN PRESET COORDINATES
# -----------------------------------------------------------------------------
INDIAN_PRESETS = {
    "odisha": (20.9517, 85.0985, "Odisha, India", 35.0),
    "assam": (26.2006, 92.9376, "Assam, India", 42.0),
    "nagaland": (26.1584, 94.5624, "Nagaland, India", 52.0),
    "wayanad": (11.6854, 76.1320, "Wayanad, Kerala, India", 48.0),
    "himachal pradesh": (31.1048, 77.1734, "Himachal Pradesh, India", 55.0),
    "uttarakhand": (30.0668, 79.0193, "Uttarakhand, India", 58.0),
    "sikkim": (27.5330, 88.5122, "Sikkim, India", 56.0),
    "meghalaya": (25.4670, 91.3662, "Meghalaya, India", 45.0),
    "manipur": (24.6637, 93.9063, "Manipur, India", 46.0),
    "mizoram": (23.1645, 92.9376, "Mizoram, India", 49.0),
    "tamil nadu": (11.1271, 78.6569, "Tamil Nadu, India", 32.0),
    "kerala": (10.8505, 76.2711, "Kerala, India", 40.0),
    "karnataka": (15.3173, 75.7139, "Karnataka, India", 30.0),
    "maharashtra": (19.7515, 75.7139, "Maharashtra, India", 33.0),
    "west bengal": (22.9868, 87.8550, "West Bengal, India", 30.0)
}

# -----------------------------------------------------------------------------
# 3. ROUTES & API ENDPOINTS
# -----------------------------------------------------------------------------
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/search", methods=["GET"])
def search_location():
    query = request.args.get("query", "").strip().lower()
    if query in INDIAN_PRESETS:
        lat, lon, name, slope = INDIAN_PRESETS[query]
        return jsonify({"success": True, "lat": lat, "lon": lon, "name": name, "slope": slope})
    
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(query)}&count=10&language=en&format=json"
    try:
        res = requests.get(url, timeout=5).json()
        if "results" in res:
            india_results = [r for r in res["results"] if r.get("country_code", "").upper() == "IN" or r.get("country", "").lower() == "india"]
            if india_results:
                matched = india_results[0]
                return jsonify({
                    "success": True,
                    "lat": matched["latitude"],
                    "lon": matched["longitude"],
                    "name": f"{matched['name']}, {matched.get('admin1', 'India')}, India",
                    "slope": 38.0
                })
    except Exception:
        pass
    return jsonify({"success": False, "message": "Location not found in India"})

@app.route("/api/reverse-geocode", methods=["GET"])
def reverse_geo():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
    headers = {'User-Agent': 'LandslideSystem/1.0'}
    try:
        res = requests.get(url, headers=headers, timeout=4).json()
        parts = res.get('display_name', f'Coordinates ({lat}, {lon})').split(",")
        return jsonify({"name": ", ".join(parts[:3])})
    except Exception:
        return jsonify({"name": f"Sector ({float(lat):.2f}°N, {float(lon):.2f}°E)"})

@app.route("/api/telemetry", methods=["POST"])
def get_telemetry():
    data = request.json
    lat = float(data.get("lat", 20.9517))
    lon = float(data.get("lon", 85.0985))
    slope = float(data.get("slope", 35.0))

    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=precipitation,surface_pressure&hourly=soil_moisture_0_to_1cm&forecast_days=1"
    try:
        res = requests.get(url, timeout=6).json()
        rain = round(res['current'].get('precipitation', 0.0) * 24.0, 2)
        soil_raw = res['hourly']['soil_moisture_0_to_1cm'][0]
        moisture = round(min(max(soil_raw * 100.0 * 2.2, 12.0), 98.0), 2)
        pressure = round(res['current'].get('surface_pressure', 1013.2), 1)
    except Exception:
        rain, moisture, pressure = 32.0, 45.0, 1010.0

    features = pd.DataFrame([{'rainfall': rain, 'moisture': moisture, 'slope': slope}])
    danger = round(ai_model.predict_proba(features)[0][1] * 100.0, 2)
    stability = round(100.0 - danger, 2)

    return jsonify({
        "rainfall": rain,
        "moisture": moisture,
        "slope": slope,
        "pressure": pressure,
        "danger_risk": danger,
        "stability": stability
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
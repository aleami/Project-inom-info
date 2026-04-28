import json
import numpy as np
from sklearn.cluster import DBSCAN

INPUT_FILE = "rooms.json"
OUTPUT_FILE = "rooms_clustered.json"

MAX_DISTANCE_METERS = 25  # adjust parameters

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

print("Total raw entries:", len(data))

clean_data = []

for i, room in enumerate(data):
    if not isinstance(room, dict):
        print(f"Skipping index {i}: not a dict")
        continue

    if "lat" not in room or "lng" not in room:
        print(f"Skipping index {i}: missing lat/lng -> {room}")
        continue

    try:
        lat = float(room["lat"])
        lng = float(room["lng"])
    except (TypeError, ValueError):
        print(f"Skipping index {i}: invalid lat/lng types -> {room}")
        continue

    room["lat"] = lat
    room["lng"] = lng
    clean_data.append(room)

print("Valid entries:", len(clean_data))

# -----------------------------
# PREPARE COORDINATES
# -----------------------------
coords = np.array([[r["lat"], r["lng"]] for r in clean_data])

# -----------------------------
# DBSCAN CLUSTERING (HAVERSINE)
# -----------------------------
kms_per_radian = 6371.0088
epsilon = (MAX_DISTANCE_METERS / 1000) / kms_per_radian

db = DBSCAN(
    eps=epsilon,
    min_samples=1,
    algorithm="ball_tree",
    metric="haversine"
)

coords_rad = np.radians(coords)
labels = db.fit_predict(coords_rad)


for room, label in zip(clean_data, labels):
    room["building_id"] = int(label)


unique_buildings = len(set(labels))
print(f"Clustered into {unique_buildings} buildings")


with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(clean_data, f, indent=2, ensure_ascii=False)

print(f"Saved to {OUTPUT_FILE}")
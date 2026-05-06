import json
import math

try:
    import numpy as np
    from sklearn.cluster import DBSCAN
except ImportError:
    np = None
    DBSCAN = None

INPUT_FILE = "rooms.json"
OUTPUT_FILE = "rooms_clustered.json"

MAX_DISTANCE_METERS = 25  # adjust parameters

ALLOWED_AREAS = [
    # KTH Campus / Valhallavägen, including AlbaNova.
    {
        "name": "KTH Campus and AlbaNova",
        "min_lat": 59.3457,
        "max_lat": 59.3550,
        "min_lng": 18.0550,
        "max_lng": 18.0760,
    },
]

EXCLUDED_POINTS = [
    # Duplicate/incorrect AlbaNova marker named "Byggnad 2".
    (59.3537, 18.0576),
]


def is_allowed_area(lat, lng):
    return any(
        area["min_lat"] <= lat <= area["max_lat"]
        and area["min_lng"] <= lng <= area["max_lng"]
        for area in ALLOWED_AREAS
    )


def is_excluded_point(lat, lng):
    return any(
        abs(lat - excluded_lat) < 0.000001
        and abs(lng - excluded_lng) < 0.000001
        for excluded_lat, excluded_lng in EXCLUDED_POINTS
    )

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

def haversine_meters(a, b):
    lat1, lng1 = map(math.radians, a)
    lat2, lng2 = map(math.radians, b)
    d_lat = lat2 - lat1
    d_lng = lng2 - lng1
    h = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(d_lng / 2) ** 2
    )
    return 6371008.8 * 2 * math.asin(math.sqrt(h))


def cluster_with_fallback(coords):
    labels = [-1] * len(coords)
    current_label = 0

    for start_index in range(len(coords)):
        if labels[start_index] != -1:
            continue

        labels[start_index] = current_label
        queue = [start_index]

        while queue:
            index = queue.pop()

            for other_index, other_coord in enumerate(coords):
                if labels[other_index] != -1:
                    continue

                if haversine_meters(coords[index], other_coord) <= MAX_DISTANCE_METERS:
                    labels[other_index] = current_label
                    queue.append(other_index)

        current_label += 1

    return labels


coords = [[r["lat"], r["lng"]] for r in clean_data]

if DBSCAN is not None:
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
else:
    print("numpy/sklearn not found; using pure Python clustering fallback")
    labels = cluster_with_fallback(coords)


for room, label in zip(clean_data, labels):
    room["building_id"] = int(label)


filtered_data = [
    room for room in clean_data
    if is_allowed_area(room["lat"], room["lng"])
    and not is_excluded_point(room["lat"], room["lng"])
]


unique_buildings = len(set(labels))
print(f"Clustered into {unique_buildings} buildings")
print("Allowed entries:", len(filtered_data))


with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(filtered_data, f, indent=2, ensure_ascii=False)

print(f"Saved to {OUTPUT_FILE}")

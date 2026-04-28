from flask import Flask, jsonify
from flask_cors import CORS
import json
from pathlib import Path

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
RESTAURANTS_FILE = BASE_DIR / "kth_rooms" / "restaurants.json"
ROOMS_FILE = BASE_DIR / "kth_rooms" / "rooms_labeled.json"
MICROWAVES_FILE = BASE_DIR / "kth_rooms" / "rooms_microwave.json"
PRINTERS_FILE = BASE_DIR / "kth_rooms" / "skrivare.json"
SECTIONS_FILE = BASE_DIR / "kth_rooms" / "sections.json"

ALLOWED_AREAS = [
    {
        "name": "KTH Campus and AlbaNova",
        "min_lat": 59.3457,
        "max_lat": 59.3550,
        "min_lng": 18.0550,
        "max_lng": 18.0760,
    },
]

EXCLUDED_POINTS = [
    (59.3537, 18.0576),
]


def is_allowed_area(lat, lng):
    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return False

    return any(
        area["min_lat"] <= lat <= area["max_lat"]
        and area["min_lng"] <= lng <= area["max_lng"]
        for area in ALLOWED_AREAS
    )


def is_excluded_point(lat, lng):
    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return False

    return any(
        abs(lat - excluded_lat) < 0.000001
        and abs(lng - excluded_lng) < 0.000001
        for excluded_lat, excluded_lng in EXCLUDED_POINTS
    )


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def split_room_name_and_address(full_name):
    parts = str(full_name).split(",", 1)
    room_name = parts[0].strip()
    address = parts[1].strip() if len(parts) > 1 else ""
    return room_name, address


def attach_microwaves(places, microwaves):
    for microwave in microwaves:
        lat = microwave.get("lat")
        lng = microwave.get("lng")

        if lat is None or lng is None:
            continue

        nearest_place = None
        nearest_distance = None

        for place in places.values():
            distance = abs(place["lat"] - lat) + abs(place["lng"] - lng)
            if nearest_distance is None or distance < nearest_distance:
                nearest_distance = distance
                nearest_place = place

        if nearest_place is None:
            continue

        room_name, address = split_room_name_and_address(microwave.get("name", ""))

        if "microwaves" not in nearest_place:
            nearest_place["microwaves"] = {
                "count": 0,
                "locations": [],
            }

        nearest_place["microwaves"]["count"] += 1
        nearest_place["microwaves"]["locations"].append(
            {
                "name": room_name or "Microwave",
                "address": address,
                "mapsUrl": microwave.get("mapsUrl"),
                "source": microwave.get("source"),
            }
        )


def attach_printers(places, printers):
    for printer in printers:
        lat = printer.get("lat")
        lng = printer.get("lng")

        if lat is None or lng is None:
            continue

        nearest_place = None
        nearest_distance = None

        for place in places.values():
            distance = abs(place["lat"] - lat) + abs(place["lng"] - lng)
            if nearest_distance is None or distance < nearest_distance:
                nearest_distance = distance
                nearest_place = place

        if nearest_place is None:
            continue

        printer_name, address = split_room_name_and_address(printer.get("name", ""))

        if "printers" not in nearest_place:
            nearest_place["printers"] = {
                "count": 0,
                "locations": [],
            }

        nearest_place["printers"]["count"] += 1
        nearest_place["printers"]["locations"].append(
            {
                "name": printer_name or "Printer",
                "address": address,
                "mapsUrl": printer.get("mapsUrl"),
                "source": printer.get("source"),
            }
        )


def attach_sections(places, sections):
    for section in sections:
        lat = section.get("lat")
        lng = section.get("lng")

        if lat is None or lng is None:
            continue

        nearest_place = None
        nearest_distance = None

        for place in places.values():
            distance = abs(place["lat"] - lat) + abs(place["lng"] - lng)
            if nearest_distance is None or distance < nearest_distance:
                nearest_distance = distance
                nearest_place = place

        if nearest_place is None:
            continue

        if "sections" not in nearest_place:
            nearest_place["sections"] = []

        nearest_place["sections"].append(
            {
                "id": section.get("id"),
                "name": section.get("name") or "Section",
                "shortName": section.get("shortName") or section.get("name") or "SEC",
                "buildingName": section.get("buildingName"),
                "lat": lat,
                "lng": lng,
                "mapsUrl": section.get("mapsUrl"),
                "logoText": section.get("logoText") or section.get("shortName") or "SEC",
                "logoUrl": section.get("logoUrl"),
                "description": section.get("description", ""),
            }
        )


def build_places():
    rooms = load_json(ROOMS_FILE)
    microwaves = load_json(MICROWAVES_FILE)
    printers = load_json(PRINTERS_FILE)
    sections = load_json(SECTIONS_FILE)
    places = {}
    seen_room_ids = set()

    for room in rooms:
        room_id = room.get("id")
        if room_id in seen_room_ids:
            continue
        seen_room_ids.add(room_id)

        building_id = room.get("building_id")
        lat = room.get("lat")
        lng = room.get("lng")

        if building_id is None or lat is None or lng is None:
            continue

        if not is_allowed_area(lat, lng) or is_excluded_point(lat, lng):
            continue

        place_key = str(building_id)
        room_name, address = split_room_name_and_address(room.get("name", ""))

        if place_key not in places:
                      places[place_key] = {
                "id": f"building-{building_id}",
                "name": room.get("building_name") or "Unknown building",
                "type": "building",
                "lat": lat,
                "lng": lng,
                "addresses": set(),
                "rooms": [],
                "openingHours": "Se KTH:s öppettider"
            }
        if address:
            places[place_key]["addresses"].add(address)

        places[place_key]["rooms"].append(
            {
                "id": room_id,
                "name": room_name or room.get("name", "Unknown room"),
                "address": address,
                "mapsUrl": room.get("mapsUrl"),
                "source": room.get("source"),
                "buildingId": building_id,
                "buildingName": room.get("building_name"),
            }

        )

    attach_microwaves(places, microwaves)
    attach_printers(places, printers)
    attach_sections(places, sections)

    restaurants = load_json(RESTAURANTS_FILE)

    for restaurant in restaurants:
        if (
            not is_allowed_area(restaurant.get("lat"), restaurant.get("lng"))
            or is_excluded_point(restaurant.get("lat"), restaurant.get("lng"))
        ):
            continue

        restaurant["rooms"] = []
        restaurant["addresses"] = []
        restaurant["searchText"] = " ".join(
            part for part in [
                restaurant.get("name", ""),
                restaurant.get("openingHours", "")
            ] if part
        )
        places[f'restaurant-{restaurant["id"]}'] = restaurant

    result = list(places.values())
    result.sort(key=lambda place: place["name"].lower())

    for place in result:
        place["rooms"].sort(key=lambda room: room["name"].lower())
        place["roomCount"] = len(place["rooms"])
        search_parts = [
            place["name"],
            *place["addresses"],
        ]
        for room in place["rooms"]:
            search_parts.extend(
                [
                    room.get("name", ""),
                    room.get("address", ""),
                    room.get("buildingName", ""),
                ]
            )
        if place.get("microwaves"):
            for location in place["microwaves"]["locations"]:
                search_parts.extend(
                    [
                        location.get("name", ""),
                        location.get("address", ""),
                    ]
                )
        if place.get("printers"):
            for location in place["printers"]["locations"]:
                search_parts.extend(
                    [
                        location.get("name", ""),
                        location.get("address", ""),
                    ]
                )
        if place.get("sections"):
            for section in place["sections"]:
                search_parts.extend(
                    [
                        section.get("name", ""),
                        section.get("shortName", ""),
                        section.get("buildingName", ""),
                        section.get("description", ""),
                    ]
                )
        place["searchText"] = " ".join(part for part in search_parts if part)
        place["addresses"] = sorted(place["addresses"])
        if place.get("sections"):
            place["sections"].sort(key=lambda section: section["name"].lower())

    return result


@app.route("/api/places")
def get_places():
    return jsonify(build_places())


@app.route("/api/rooms")
def get_rooms():
    return jsonify(load_json(ROOMS_FILE))


if __name__ == "__main__":
    app.run(debug=True, port=5000)

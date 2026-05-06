from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import re
import time
import unicodedata
from datetime import datetime
from html import unescape
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import HTTPSHandler, HTTPCookieProcessor, Request, build_opener, urlopen
import ssl

try:
    import certifi
except ImportError:
    certifi = None

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
RESTAURANTS_FILE = BASE_DIR / "kth_rooms" / "restaurants.json"
ROOMS_FILE = BASE_DIR / "kth_rooms" / "rooms_labeled.json"
MICROWAVES_FILE = BASE_DIR / "kth_rooms" / "rooms_microwave.json"
PRINTERS_FILE = BASE_DIR / "kth_rooms" / "skrivare.json"
SECTIONS_FILE = BASE_DIR / "kth_rooms" / "sections.json"
ROOM_SCHEDULE_URL = "https://sakurapi.se/room-reservation/schedule/get"
ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson"
TIMEEDIT_START_URL = "https://cloud.timeedit.net/kth/web/stud02/ri1Q9.html"
TIMEEDIT_OBJECTS_URL = os.environ.get(
    "TIMEEDIT_OBJECTS_URL",
    "https://cloud.timeedit.net/kth/web/stud02/objects.json?sid=5&types=186&fe=0"
)
TIMEEDIT_BOOKING_BASE_URL = os.environ.get(
    "TIMEEDIT_BOOKING_BASE_URL",
    "https://cloud.timeedit.net/kth/web/stud02/ri.html"
)
TIMEEDIT_CACHE_TTL_SECONDS = int(os.environ.get("TIMEEDIT_CACHE_TTL_SECONDS", "45"))
TIMEEDIT_BOOKING_PARAMS = {
    "h": "t",
    "sid": "5",
    "ox": "0",
    "types": "0",
    "fe": "0",
    "part": "f",
    "tg": "-1",
    "se": "f",
    "exw": "f",
    "rr": "1",
}
DEFAULT_ORS_API_KEY = (
    "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjBlOTcyODcw"
    "ODYyMzQ4ZDc4MzdhYzMzNzM1N2RiYmY1IiwiaCI6Im11cm11cjY0In0="
)
ORS_API_KEY = os.environ.get("OPENROUTESERVICE_API_KEY")

if not ORS_API_KEY:
    env_file = BASE_DIR.parent / ".env.local"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            key, _, value = line.partition("=")
            if key.strip() in {"OPENROUTESERVICE_API_KEY", "VITE_OPENROUTESERVICE_API_KEY"} and value.strip():
                ORS_API_KEY = value.strip()
                break

if not ORS_API_KEY:
    ORS_API_KEY = DEFAULT_ORS_API_KEY

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

_timeedit_rooms_cache = {
    "timestamp": 0.0,
    "data": None,
}


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


def normalize_label(value):
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", ascii_only.lower()).strip()


def get_label_aliases(value):
    base = normalize_label(value)
    aliases = {base}
    alias_map = {
        "m huset": {"maskin"},
        "maskin": {"m huset"},
        "e huset": {"e huset huvudbyggnaden"},
        "u huset": {"u huset undervisningshuset"},
        "kth bibliotek": {"kth biblioteket"},
        "kth biblioteket": {"kth bibliotek"},
        "nymble": {"karhuset"},
        "karhuset": {"nymble"},
        "a huset": {"a huset"},
        "b huset": {"bergs b huset", "b huset"},
        "d huset": {"d huset huvudbyggnaden"},
        "teknikringen 14": {"ringen huset"},
        "ringen huset": {"teknikringen 14"},
        "roslagstullsbacken 33": {"albanova"},
        "w huset": {"byggteknik design"},
        "byggteknik design": {"w huset"},
    }
    aliases.update(alias_map.get(base, set()))
    return {alias for alias in aliases if alias}


def find_best_place_for_resource(places, label, lat, lng):
    label_aliases = get_label_aliases(label)

    for place in places.values():
        place_labels = {
            normalize_label(place.get("name")),
            *[normalize_label(address) for address in place.get("addresses", set())],
        }
        if label_aliases & {item for item in place_labels if item}:
            return place

    nearest_place = None
    nearest_distance = None

    for place in places.values():
        distance = abs(place["lat"] - lat) + abs(place["lng"] - lng)
        if nearest_distance is None or distance < nearest_distance:
            nearest_distance = distance
            nearest_place = place

    return nearest_place


def resolve_building_name(building_name, address):
    if building_name and str(building_name).strip().lower() != "unknown":
        return building_name

    normalized_address = str(address).strip().lower()
    if normalized_address == "valhallavägen 79":
        return "Cybercampus Sverige"
    if normalized_address in {"brinellvägen 4", "teknikringen 1"}:
        return "KTH Innovation"
    if normalized_address == "drottning kristinas väg 29":
        return "Flygsektionen: T-Centralen"

    return building_name or "Unknown building"


def attach_microwaves(places, microwaves):
    for microwave in microwaves:
        lat = microwave.get("lat")
        lng = microwave.get("lng")
        microwave_count = microwave.get("count") or 1

        if lat is None or lng is None:
            continue

        nearest_place = find_best_place_for_resource(
            places,
            microwave.get("name", ""),
            lat,
            lng,
        )

        if nearest_place is None:
            continue

        room_name, address = split_room_name_and_address(microwave.get("name", ""))

        if "microwaves" not in nearest_place:
            nearest_place["microwaves"] = {
                "count": 0,
                "locations": [],
            }

        nearest_place["microwaves"]["count"] += microwave_count
        nearest_place["microwaves"]["locations"].append(
            {
                "name": room_name or "Microwave",
                "address": address,
                "count": microwave_count,
                "lat": lat,
                "lng": lng,
                "mapsUrl": microwave.get("mapsUrl"),
                "source": microwave.get("source"),
            }
        )


def attach_printers(places, printers):
    for printer in printers:
        lat = printer.get("lat")
        lng = printer.get("lng")
        printer_count = printer.get("count") or 1

        if lat is None or lng is None:
            continue

        nearest_place = find_best_place_for_resource(
            places,
            printer.get("name", ""),
            lat,
            lng,
        )

        if nearest_place is None:
            continue

        printer_name, address = split_room_name_and_address(printer.get("name", ""))

        if "printers" not in nearest_place:
            nearest_place["printers"] = {
                "count": 0,
                "locations": [],
            }

        nearest_place["printers"]["count"] += printer_count
        nearest_place["printers"]["locations"].append(
            {
                "name": printer_name or "Printer",
                "address": address,
                "count": printer_count,
                "lat": lat,
                "lng": lng,
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
        resolved_building_name = resolve_building_name(room.get("building_name"), address)

        if place_key not in places:
            places[place_key] = {
                "id": f"building-{building_id}",
                "name": resolved_building_name,
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
                "buildingName": resolved_building_name,
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


def get_ssl_context():
    return (
        ssl.create_default_context(cafile=certifi.where())
        if certifi
        else ssl.create_default_context()
    )


def create_url_opener():
    cookie_jar = CookieJar()
    return build_opener(
        HTTPCookieProcessor(cookie_jar),
        HTTPSHandler(context=get_ssl_context()),
    )


def fetch_text(opener, url, referer=None):
    request_obj = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
            "Accept-Language": "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Referer": referer or TIMEEDIT_START_URL,
            "Origin": "https://cloud.timeedit.net",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Upgrade-Insecure-Requests": "1",
        },
    )
    with opener.open(request_obj, timeout=20) as response:
        return response.read().decode("utf-8", errors="replace")


def fetch_json_with_opener(opener, url):
    return json.loads(fetch_text(opener, url))


def clean_html_text(value):
    text = re.sub(r"<[^>]+>", "", str(value or ""))
    return unescape(re.sub(r"\s+", " ", text)).strip()


def discover_timeedit_urls(start_html):
    discovered = {
        "objects_url": None,
        "booking_base_url": None,
    }

    objects_match = re.search(r"""["']([^"']*objects\.json[^"']*)["']""", start_html, re.IGNORECASE)
    if objects_match:
        discovered["objects_url"] = urljoin(TIMEEDIT_START_URL, unescape(objects_match.group(1)))

    booking_match = re.search(r"""["']([^"']*ri\.html[^"']*)["']""", start_html, re.IGNORECASE)
    if booking_match:
        discovered["booking_base_url"] = urljoin(TIMEEDIT_START_URL, unescape(booking_match.group(1).split("?", 1)[0]))

    return discovered


def parse_room_number(name, fallback=""):
    match = re.search(r"\b([A-Za-z]?\d{3,4}[A-Za-z]?)\b", str(name or ""))
    return match.group(1) if match else fallback


def parse_seats(value):
    match = re.search(r"(\d+)", str(value or ""))
    return int(match.group(1)) if match else 0


def build_timeedit_room_link(room_id, booking_base_url):
    params = dict(TIMEEDIT_BOOKING_PARAMS)
    params["objects"] = room_id
    return f"{booking_base_url}?{urlencode(params)}"


def build_timeedit_booking_url(room_ids, booking_base_url):
    params = dict(TIMEEDIT_BOOKING_PARAMS)
    params["objects"] = ",".join(room_ids)
    return f"{booking_base_url}?{urlencode(params)}"


def parse_rooms_from_objects_payload(data, booking_base_url):
    rooms = []

    for obj in data.get("objects", []):
        fields = obj.get("fields", {})
        room_type = fields.get("Lokaltyp") or ""
        room_name = fields.get("Webbsignatur") or fields.get("Namn") or ""

        if "grupprum" not in normalize_label(room_type or room_name):
            continue

        room_id = obj.get("idAndType") or obj.get("id")
        if not room_id:
            continue

        rooms.append({
            "id": str(room_id),
            "name": room_name,
            "type": room_type or "Grupprum",
            "seats": parse_seats(fields.get("Platser")),
            "campus": fields.get("Campus") or "",
            "roomNumber": fields.get("Rumsnummer") or parse_room_number(room_name),
            "timeEditUrl": build_timeedit_room_link(str(room_id), booking_base_url),
        })

    return rooms


def parse_meta_from_booking_row(meta_text):
    parts = [part.strip() for part in clean_html_text(meta_text).split(",") if part.strip()]
    room_type = parts[0] if parts else "Grupprum"
    seats = 0
    campus = ""

    for part in parts[1:]:
        if "platser" in normalize_label(part):
            seats = parse_seats(part)
        elif not campus:
            campus = part

    return room_type, seats, campus


def parse_room_rows_from_booking_html(html, booking_base_url):
    anchor_regex = re.compile(
        r"""openObject\(([\d.]+),\s*this,\s*'t'\).*?<div class="objbase">(.*?)</div>.*?<div class="objmore">(.*?)</div>""",
        re.IGNORECASE | re.DOTALL,
    )

    rooms = []
    for match in anchor_regex.finditer(html):
        room_id = match.group(1).strip()
        room_name = clean_html_text(match.group(2))
        meta_text = match.group(3)
        room_type, seats, campus = parse_meta_from_booking_row(meta_text)

        rooms.append({
            "id": room_id,
            "name": room_name,
            "type": room_type,
            "seats": seats,
            "campus": campus,
            "roomNumber": parse_room_number(room_name),
            "timeEditUrl": build_timeedit_room_link(room_id, booking_base_url),
        })

    return rooms


def merge_room_metadata(ordered_rooms, object_rooms):
    object_room_map = {room["id"]: room for room in object_rooms}
    merged_rooms = []

    for room in ordered_rooms:
        object_room = object_room_map.get(room["id"], {})
        merged_rooms.append({
            **room,
            "name": object_room.get("name") or room.get("name"),
            "type": object_room.get("type") or room.get("type") or "Grupprum",
            "seats": object_room.get("seats") or room.get("seats") or 0,
            "campus": object_room.get("campus") or room.get("campus") or "",
            "roomNumber": object_room.get("roomNumber") or room.get("roomNumber") or parse_room_number(room.get("name")),
            "timeEditUrl": object_room.get("timeEditUrl") or room.get("timeEditUrl"),
        })

    return merged_rooms


def parse_bookings_from_html(html, rooms):
    booking_regex = re.compile(r"<div\b[^>]*bookingDiv[^>]*>", re.IGNORECASE)

    bookings = []

    for match in booking_regex.finditer(html):
        booking_html = match.group(0)
        style_match = re.search(r'style="([^"]*)"', booking_html, re.IGNORECASE)
        booking_id_match = re.search(r'data-id="([^"]+)"', booking_html, re.IGNORECASE)
        title_match = re.search(r'title="([^"]*)"', booking_html, re.IGNORECASE)

        if not style_match or not booking_id_match or not title_match:
            continue

        style = style_match.group(1)
        booking_id = booking_id_match.group(1)
        title = unescape(title_match.group(1))

        top_match = re.search(r"top:\s*([\d.]+)px", style)
        time_match = re.search(r"(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+-\s+(\d{2}:\d{2})", title)

        if not top_match or not time_match:
            continue

        room_index = round(float(top_match.group(1)) / 40)
        if room_index < 0 or room_index >= len(rooms):
            continue

        room = rooms[room_index]
        bookings.append({
            "id": booking_id,
            "roomId": room["id"],
            "roomName": room["name"],
            "date": time_match.group(1),
            "start": time_match.group(2),
            "end": time_match.group(3),
        })

    return bookings


def time_to_minutes(value):
    hours, minutes = [int(part) for part in str(value).split(":")]
    return (hours * 60) + minutes


def get_room_status(room, bookings, now=None):
    now = now or datetime.now()
    today = now.strftime("%Y-%m-%d")
    current_minutes = (now.hour * 60) + now.minute

    room_bookings_today = sorted(
        [booking for booking in bookings if booking["roomId"] == room["id"] and booking["date"] == today],
        key=lambda booking: time_to_minutes(booking["start"]),
    )

    current_booking = next((
        booking
        for booking in room_bookings_today
        if time_to_minutes(booking["start"]) <= current_minutes < time_to_minutes(booking["end"])
    ), None)

    next_booking = next((
        booking
        for booking in room_bookings_today
        if time_to_minutes(booking["start"]) > current_minutes
    ), None)

    return {
        **room,
        "availableNow": current_booking is None,
        "currentBooking": current_booking,
        "nextBooking": next_booking,
    }


def fetch_timeedit_rooms():
    now = time.time()
    cached_data = _timeedit_rooms_cache.get("data")
    cached_timestamp = _timeedit_rooms_cache.get("timestamp", 0.0)

    if cached_data and (now - cached_timestamp) < TIMEEDIT_CACHE_TTL_SECONDS:
        return cached_data

    opener = create_url_opener()
    start_html = fetch_text(opener, TIMEEDIT_START_URL, referer=TIMEEDIT_START_URL)
    discovered_urls = discover_timeedit_urls(start_html)
    booking_base_url = discovered_urls["booking_base_url"] or TIMEEDIT_BOOKING_BASE_URL
    objects_url = discovered_urls["objects_url"] or TIMEEDIT_OBJECTS_URL

    object_rooms = []
    try:
        object_rooms = parse_rooms_from_objects_payload(
            fetch_json_with_opener(opener, objects_url),
            booking_base_url,
        )
    except (HTTPError, URLError, json.JSONDecodeError, KeyError, ValueError):
        object_rooms = []

    room_ids = [room["id"] for room in object_rooms]
    if not room_ids:
        raise ValueError("TimeEdit room list could not be loaded from objects.json")

    booking_html = fetch_text(
        opener,
        build_timeedit_booking_url(room_ids, booking_base_url),
        referer=TIMEEDIT_START_URL,
    )
    ordered_rooms = parse_room_rows_from_booking_html(booking_html, booking_base_url)
    if not ordered_rooms:
        ordered_rooms = object_rooms

    merged_rooms = merge_room_metadata(ordered_rooms, object_rooms)
    bookings = parse_bookings_from_html(booking_html, merged_rooms)
    rooms_with_status = [
        get_room_status(room, bookings)
        for room in merged_rooms
    ]

    _timeedit_rooms_cache["timestamp"] = now
    _timeedit_rooms_cache["data"] = rooms_with_status
    return rooms_with_status


def fetch_schedule_rooms_fallback():
    ssl_context = get_ssl_context()
    with urlopen(f"{ROOM_SCHEDULE_URL}?dayOffset=0", timeout=15, context=ssl_context) as response:
        schedule_data = json.load(response)

    rooms = []
    for building in schedule_data.get("buildings", []):
        building_name = building.get("name") or ""
        for room in building.get("rooms", []):
            if room.get("hide"):
                continue

            room_name = room.get("name") or ""
            room_id = str(room.get("externalId") or f"{building_name}-{room_name}")
            reservations = sorted(
                room.get("reservedTimes") or [],
                key=lambda reservation: reservation.get("start", ""),
            )

            rooms.append(get_room_status({
                "id": room_id,
                "name": room_name,
                "type": "Grupprum",
                "seats": int(room.get("seats") or 0),
                "campus": building_name,
                "roomNumber": parse_room_number(room_name),
                "timeEditUrl": TIMEEDIT_START_URL,
            }, [
                {
                    "id": reservation.get("id") or reservation.get("reservationId") or "",
                    "roomId": room_id,
                    "roomName": room_name,
                    "date": datetime.fromisoformat(reservation["start"].replace("Z", "+00:00")).strftime("%Y-%m-%d"),
                    "start": datetime.fromisoformat(reservation["start"].replace("Z", "+00:00")).strftime("%H:%M"),
                    "end": datetime.fromisoformat(reservation["end"].replace("Z", "+00:00")).strftime("%H:%M"),
                }
                for reservation in reservations
                if reservation.get("start") and reservation.get("end")
            ]))

    return rooms


@app.route("/api/places")
def get_places():
    return jsonify(build_places())


@app.route("/api/rooms")
def get_rooms():
    try:
        return jsonify(fetch_timeedit_rooms())
    except HTTPError as exc:
        try:
            fallback_rooms = fetch_schedule_rooms_fallback()
            return jsonify(fallback_rooms)
        except Exception as fallback_exc:
            return jsonify({
                "error": "Could not fetch TimeEdit rooms",
                "status": exc.code,
                "fallbackError": str(fallback_exc),
            }), 502
    except URLError as exc:
        try:
            fallback_rooms = fetch_schedule_rooms_fallback()
            return jsonify(fallback_rooms)
        except Exception as fallback_exc:
            return jsonify({
                "error": "Could not fetch TimeEdit rooms",
                "details": str(exc.reason),
                "fallbackError": str(fallback_exc),
            }), 502
    except Exception as exc:
        try:
            fallback_rooms = fetch_schedule_rooms_fallback()
            return jsonify(fallback_rooms)
        except Exception as fallback_exc:
            return jsonify({
                "error": "Could not parse TimeEdit rooms",
                "details": str(exc),
                "fallbackError": str(fallback_exc),
            }), 502


@app.route("/")
def backend_index():
    return jsonify({
        "service": "CampusFinder backend",
        "frontend": "Open the app through Vite, usually http://127.0.0.1:5173/ or http://<this-computer-ip>:5173/ from another device.",
    })


@app.route("/api/room-schedule")
def get_room_schedule():
    day_offset = request.args.get("dayOffset", "0")
    query_string = urlencode({"dayOffset": day_offset})
    ssl_context = get_ssl_context()

    try:
        with urlopen(
            f"{ROOM_SCHEDULE_URL}?{query_string}",
            timeout=10,
            context=ssl_context,
        ) as response:
            return jsonify(json.load(response))
    except HTTPError as exc:
        return jsonify({"error": "Could not fetch room schedule", "status": exc.code}), 502
    except URLError as exc:
        return jsonify({"error": "Could not fetch room schedule", "details": str(exc.reason)}), 502


@app.route("/api/directions", methods=["GET"])
def directions_info():
    return jsonify({
        "message": "Use POST /api/directions from the map to calculate navigation.",
        "example": {"coordinates": [[18.0712, 59.3493], [18.0730, 59.3484]]},
    })


@app.route("/api/directions", methods=["POST"])
def get_directions():
    if not ORS_API_KEY:
        return jsonify({"error": "OpenRouteService API key is not configured"}), 500

    payload = request.get_json(silent=True) or {}
    coordinates = payload.get("coordinates")

    if (
        not isinstance(coordinates, list)
        or len(coordinates) != 2
        or not all(isinstance(point, list) and len(point) == 2 for point in coordinates)
    ):
        return jsonify({"error": "Expected coordinates as [[lng, lat], [lng, lat]]"}), 400

    request_body = json.dumps({
        "coordinates": coordinates,
        "instructions": True,
        "units": "m",
    }).encode("utf-8")

    direction_request = Request(
        ORS_DIRECTIONS_URL,
        data=request_body,
        headers={
            "Authorization": ORS_API_KEY,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    ssl_context = get_ssl_context()

    try:
        with urlopen(direction_request, timeout=15, context=ssl_context) as response:
            return jsonify(json.load(response))
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        parsed_details = None
        try:
            parsed_details = json.loads(details)
        except json.JSONDecodeError:
            parsed_details = details
        return jsonify({
            "error": "Could not fetch directions",
            "status": exc.code,
            "details": parsed_details,
        }), 502
    except URLError as exc:
        return jsonify({"error": "Could not fetch directions", "details": str(exc.reason)}), 502


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)

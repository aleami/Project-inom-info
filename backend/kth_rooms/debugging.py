import json

with open("rooms.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for i, room in enumerate(data):
    if not isinstance(room, dict):
        print("NOT A DICT at index", i, room)
        continue

    if "lat" not in room or "lng" not in room:
        print("MISSING lat/lng at index", i)
        print(room)
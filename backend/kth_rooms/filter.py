import json

def split_rooms(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    letters = []
    numbers = []
    empty = []

    for room in data:
        name = room.get("name")

        if not name or not isinstance(name, str):
            empty.append(room)
            continue

        name = name.strip()

        if len(name) == 0:
            empty.append(room)
            continue

        first_char = name[0]

        if first_char.isalpha():
            letters.append(room)
        elif first_char.isdigit():
            numbers.append(room)
        else:
            empty.append(room)

    return letters, numbers, empty


def save_json(data, filename):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


letters, numbers, empty = split_rooms("rooms.json")

save_json(letters, "rooms_letters.json")
save_json(numbers, "rooms_numbers.json")
save_json(empty, "rooms_empty.json")

print("Done:")
print("Letters:", len(letters))
print("Numbers:", len(numbers))
print("Empty:", len(empty))
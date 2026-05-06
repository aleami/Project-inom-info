import json

# -----------------------------
# INPUT / OUTPUT
# -----------------------------
INPUT_FILE = "rooms_clustered.json"
OUTPUT_FILE = "rooms_labeled.json"

# -----------------------------
# LOAD DATA
# -----------------------------
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

# -----------------------------
# STEP 1: DEFINE YOUR MAPPING
# -----------------------------
# 👇 EDIT THIS MANUALLY
BUILDING_NAMES = {
    0: "AlbaNova",
    1: "YKI-huset",
    2: "Kemi",
    3: "Q-huset",
    4: "SEED-huset / H-huset",
    5: "KTH-Entré",
    6: "H-huset",
    7: "Q-huset",
    8: "Ringen-huset",
    9: "Maskin",
    10: "Technology and Health",
    11: "Kemi",
    12: "Maskin",
    13: "Flyget",
    14: "Hus 3",
    15: "F-huset / Sing-Sing",
    16: "Kemi",
    17: "V-huset",
    18: "Byggnad 16",
    19: "Hus 2",
    20: "L-huset",
    21: "Unknown",
    22: "Kemi",
    23: "D-huset, huvudbyggnaden",
    24: "Electrum 1",
    25: "KTH Biblioteket",
    26: "Bergs, B-huset",
    27: "Byggteknik & Design",
    28: "Unknown",
    29: "Sing-Sing",
    30: "A-huset",
    31: "Pyramiden 20",
    32: "Byggnad 15",
    33: "Rektorshuset",
    34: "D-huset, huvudbyggnaden",
    35: "Unknown",
    36: "U-huset, undervisningshuset",
    37: "Gamla KIMAB-huset",
    38: "Kemi",
    39: "E-huset, huvudbyggnaden",
    40: "Byggnad 1",
    41: "Kemi",
    42: "Gamla provningsanstalten",
    43: "Byggnad 10",
    44: "Hus 1",
    45: "L-huset",
    46: "E-huset, huvudbyggnaden",
    47: "Gamla KIMAB-huset",
    48: "Kårhuset",
    49: "Byggnad 13",
    50: "Studenthus 1",
    51: "Byggnad 12",
    52: "V-huset / H-huset",
    53: "Maskin",
    54: "Byggnad 11",
    55: "Hus B",
    56: "Byggnad 2",
    57: "U-huset, undervisningshuset",
    58: "Byggnad 14",
    59: "Kårhuset",
    60: "Byggnad 2",
    61: "Unknown",
    62: "H-huset",
    63: "Gamma",
    64: "Kemi",
    65: "Hus A",
    66: "Hus C",
}

# -----------------------------
# STEP 2: APPLY MAPPING
# -----------------------------
unknown_buildings = set()

for room in data:
    b_id = room.get("building_id")

    if b_id in BUILDING_NAMES:
        room["building_name"] = BUILDING_NAMES[b_id]
    else:
        room["building_name"] = "Unknown"
        unknown_buildings.add(b_id)

# -----------------------------
# STEP 3: PRINT UNMAPPED IDS
# -----------------------------
if unknown_buildings:
    print("⚠️ Unmapped building IDs found:")
    for b in sorted(unknown_buildings):
        print(" -", b)

# -----------------------------
# SAVE OUTPUT
# -----------------------------
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\nDone! Saved to {OUTPUT_FILE}")

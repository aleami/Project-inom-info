import kthRooms from "./kthRooms.json";

function getAddressFromName(name) {
  const parts = name.split(",");
  return parts.length > 1 ? parts.slice(1).join(",").trim() : "Okänd adress";
}

function getRoomName(name) {
  return name.split(",")[0].trim();
}

function getBuildingName(address) {
  if (address.includes("Drottning Kristinas väg 4")) return "E-huset";
  if (address.includes("Brinellvägen 83") || address.includes("Brinellvägen 85")) return "M-huset";
  if (address.includes("Osquars backe 31")) return "KTH Biblioteket";
  if (address.includes("Valhallavägen 79")) return "Q-huset";
  if (address.includes("Malvinas väg")) return "B-huset";
  if (address.includes("Teknikringen 14")) return "Teknikringen 14";
  if (address.includes("Teknikringen 10") || address.includes("Teknikringen 10B")) return "Teknikringen 10";
  if (address.includes("Teknikringen 40")) return "Teknikringen 40";
  if (address.includes("Teknikringen 56")) return "K-huset";
  if (address.includes("Brinellvägen 23")) return "B-huset";
  if (address.includes("Brinellvägen 26A")) return "W-huset";
  if (address.includes("Teknikringen 8")) return "U-huset";
  if (address.includes("Drottning Kristinas väg 30")) return "A-huset";
  if (address.includes("Lindstedtsvägen 24") || address.includes("Lindstedtsvägen 25")) return "Fysikhuset";
  if (address.includes("Lindstedtsvägen 30")) return "Maskin";
  if (address.includes("Roslagstullsbacken 21")) return "AlbaNova";
  if (address.includes("Roslagstullsbacken 35")) return "AlbaNova";
  if (address.includes("Albanovägen 29")) return "Albanova";
  if (address.includes("Brinellvägen 68")) return "L-huset";
  if (address.includes("Brinellvägen 26")) return "W-huset";
  return address;
}

export function transformKthRoomsToPlaces() {
  const campusRooms = kthRooms.filter(
    (room) =>
      room.lat > 59.346 &&
      room.lat < 59.355 &&
      room.lng > 18.058 &&
      room.lng < 18.076
  );

  const grouped = new Map();

  for (const room of campusRooms) {
    const address = getAddressFromName(room.name);
    const buildingName = getBuildingName(address);
    const key = `${buildingName}-${room.lat}-${room.lng}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: buildingName,
        type: "building",
        lat: room.lat,
        lng: room.lng,
        openingHours: "Se KTH Places",
        rooms: [],
      });
    }

    grouped.get(key).rooms.push({
      id: room.id,
      name: getRoomName(room.name),
      type: "group-room",
      seats: 4,
      available: true,
      notes: address,
      mapsUrl: room.mapsUrl,
      source: room.source,
    });
  }

  return Array.from(grouped.values());
}

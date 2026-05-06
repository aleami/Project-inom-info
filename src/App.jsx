import { useEffect, useMemo, useState } from "react";
import CampusMap from "./CampusMap";
import { places as staticPlaces } from "./places";
import "./App.css";

const ROOM_SCHEDULE_API_URL = "/api/room-schedule";

function normalizeRoomName(name) {
  return String(name || "")
    .trim()
    .replace(/\s*\(.*?\)\s*/g, "")
    .toUpperCase();
}

function getPlaceBuildingCode(place) {
  const match = place.name.match(/^([A-Z])-/i);
  return match ? match[1].toUpperCase() : null;
}

function getCurrentAndNextReservation(reservedTimes) {
  const now = new Date();
  const reservations = [...reservedTimes].sort(
    (a, b) => new Date(a.start) - new Date(b.start)
  );

  let currentReservation = null;
  let nextReservation = null;

  for (const reservation of reservations) {
    const start = new Date(reservation.start);
    const end = new Date(reservation.end);

    if (start <= now && now < end) {
      currentReservation = reservation;
      break;
    }

    if (start > now) {
      nextReservation = reservation;
      break;
    }
  }

  return {
    currentReservation,
    nextReservation,
  };
}

function createBookingStatus(scheduleRoom) {
  if (!scheduleRoom) return null;

  const { currentReservation, nextReservation } = getCurrentAndNextReservation(
    scheduleRoom.reservedTimes || []
  );

  return {
    isBookable: true,
    requiresAccess: !!scheduleRoom.requiresAccess,
    isBookedNow: !!currentReservation,
    currentReservation,
    nextReservation,
  };
}

function mergePlacesWithSchedule(places, scheduleBuildings) {
  if (!scheduleBuildings.length) return places;

  const scheduleByBuildingCode = new Map(
    scheduleBuildings.map((building) => [building.name?.toUpperCase(), building])
  );

  return places.map((place) => {
    const buildingCode = getPlaceBuildingCode(place);
    const scheduleBuilding = buildingCode
      ? scheduleByBuildingCode.get(buildingCode)
      : null;

    if (!scheduleBuilding || place.type === "restaurant") {
      return place;
    }

    const scheduleRooms = new Map(
      (scheduleBuilding.rooms || [])
        .filter((room) => !room.hide)
        .map((room) => [normalizeRoomName(room.name), room])
    );

    const mergedRooms = (place.rooms || []).map((room) => {
      const scheduleRoom = scheduleRooms.get(normalizeRoomName(room.name));

      return {
        ...room,
        bookingStatus: createBookingStatus(scheduleRoom),
      };
    });

    for (const scheduleRoom of scheduleRooms.values()) {
      const roomName = normalizeRoomName(scheduleRoom.name);
      const alreadyExists = mergedRooms.some(
        (room) => normalizeRoomName(room.name) === roomName
      );

      if (alreadyExists) continue;

      mergedRooms.push({
        id: scheduleRoom.externalId || `${place.id}-${roomName.toLowerCase()}`,
        name: scheduleRoom.name,
        type: "bookable-room",
        seats: 0,
        available: false,
        bookingStatus: createBookingStatus(scheduleRoom),
        notes: scheduleRoom.requiresAccess ? "Kräver access" : "Bokningsbar sal",
      });
    }

    mergedRooms.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );

    return {
      ...place,
      rooms: mergedRooms,
    };
  });
}

function isRestaurant(place) {
  return place.type === "restaurant";
}

function getAvailabilityStats(place) {
  const rooms = place.rooms || [];

  const totalSeats = rooms.reduce((sum, room) => sum + (room.seats || 0), 0);

  const freeSeats = rooms.reduce((sum, room) => {
    if (room.freeSeats !== undefined) {
      return sum + room.freeSeats;
    }
    return sum + (room.available ? room.seats || 0 : 0);
  }, 0);

  let status = "full";
  const ratio = totalSeats > 0 ? freeSeats / totalSeats : 0;

  if (ratio >= 0.6) status = "available";
  else if (ratio > 0) status = "limited";

  return {
    total: totalSeats,
    available: freeSeats,
    status,
  };
}

function statusLabel(status) {
  if (status === "available") return "Mycket ledigt";
  if (status === "limited") return "Begränsat";
  return "Fullt";
}

function statusColor(status) {
  if (status === "available") return "#004791";
  if (status === "limited") return "#6298D2";
  return "#000061";
}

function roomMatchesSearch(room, query) {
  if (!query) return false;

  const groupRoomKeyword =
    query.includes("grupprum") ||
    query.includes("group room") ||
    query.includes("group-room") ||
    query.includes("bokningsbar") ||
    query.includes("studierum");

  return (
    room.name.toLowerCase().includes(query) ||
    String(room.type || "").toLowerCase().includes(query) ||
    (room.notes && room.notes.toLowerCase().includes(query)) ||
    (groupRoomKeyword &&
      (room.type === "group-room" ||
        room.type === "bookable-room" ||
        !!room.bookingStatus))
  );
}

function getMatchingRooms(place, query) {
  return (place.rooms || []).filter((room) => roomMatchesSearch(room, query));
}

function formatBookingLabel(bookingStatus) {
  if (!bookingStatus?.isBookable) return null;

  const formatTime = (value) =>
    new Date(value).toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (bookingStatus.isBookedNow && bookingStatus.currentReservation) {
    return `Bokad nu ${formatTime(bookingStatus.currentReservation.start)}-${formatTime(
      bookingStatus.currentReservation.end
    )}`;
  }

  if (bookingStatus.nextReservation) {
    return `Ledig nu, bokad ${formatTime(bookingStatus.nextReservation.start)}-${formatTime(
      bookingStatus.nextReservation.end
    )}`;
  }

  return bookingStatus.requiresAccess
    ? "Ledig idag, kräver access"
    : "Ledig idag";
}

function App() {
  const [search, setSearch] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [scheduleBuildings, setScheduleBuildings] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoomSchedule() {
      try {
        const response = await fetch(`${ROOM_SCHEDULE_API_URL}?dayOffset=0`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Schedule request failed with ${response.status}`);
        }

        const data = await response.json();
        setScheduleBuildings(data.buildings || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Could not load room schedule", error);
        }
      }
    }

    loadRoomSchedule();

    return () => controller.abort();
  }, []);

  const places = useMemo(
    () => mergePlacesWithSchedule(staticPlaces, scheduleBuildings),
    [scheduleBuildings]
  );

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return places;

    return places.filter((place) => {
      const buildingMatch = place.name.toLowerCase().includes(q);

      const roomMatch = (place.rooms || []).some(
        (room) =>
          room.name.toLowerCase().includes(q) ||
          String(room.type || "").toLowerCase().includes(q) ||
          (room.notes && room.notes.toLowerCase().includes(q))
      );

      const microwaveKeyword =
        q.includes("mikro") ||
        q.includes("micro") ||
        q.includes("microwave");

      const microwaveMatch = microwaveKeyword && !!place.microwaves;

      const microwaveTextMatch =
        place.microwaves &&
        (String(place.microwaves.count).includes(q) ||
          place.microwaves.location.toLowerCase().includes(q) ||
          (place.microwaves.notes &&
            place.microwaves.notes.toLowerCase().includes(q)));

      return (
        buildingMatch ||
        roomMatch ||
        microwaveMatch ||
        microwaveTextMatch
      );
    });
  }, [places, search]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px",
        background:
          "linear-gradient(135deg, #DEF0FF 0%, #FFFFFF 55%, #EBE5E0 100%)",
        fontFamily: "Figtree, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: "24px",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid #d6e8ff",
            borderRadius: "28px",
            padding: "24px",
            boxShadow: "0 20px 60px rgba(0,71,145,0.08)",
            backdropFilter: "blur(10px)",
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              fontWeight: 900,
              color: "#000061",
              marginBottom: "10px",
              letterSpacing: "-0.03em",
            }}
          >
            CampusFinder
          </h1>

          <p
            style={{
              fontSize: "16px",
              color: "#004791",
              lineHeight: 1.6,
              marginBottom: "20px",
            }}
          >
            Hitta KTHs bästa studieplatser, restauranger och mikrovågsugnar med smart sökning.
          </p>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder="Sök byggnad, rum, restaurang eller mikro..."
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "16px",
              border: "1px solid #6298D2",
              background: "#FFFFFF",
              fontSize: "15px",
              marginBottom: "20px",
              outline: "none",
            }}
          />

          <div
            style={{
              display: "grid",
              gap: "12px",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            {filteredPlaces.map((place) => {
              const restaurant = isRestaurant(place);
              const stats = restaurant ? null : getAvailabilityStats(place);
              const selected = selectedBuildingId === place.id;
              const matchingRooms = getMatchingRooms(
                place,
                search.trim().toLowerCase()
              );

              return (
                <button
                  key={place.id}
                  onClick={() => setSelectedBuildingId(place.id)}
                  style={{
                    border: selected
                      ? "2px solid #004791"
                      : "1px solid #dbeafe",
                    background: selected ? "#DEF0FF" : "#FFFFFF",
                    borderRadius: "18px",
                    padding: "16px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "18px",
                      color: "#000061",
                      marginBottom: "6px",
                    }}
                  >
                    {place.name}
                  </div>

                  {restaurant ? (
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#004791",
                        fontWeight: 700,
                      }}
                    >
                      🍽️ Restaurang · {place.openingHours}
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#004791",
                          marginBottom: place.microwaves ? "6px" : "0",
                        }}
                      >
                        {stats.available}/{stats.total} lediga ·{" "}
                        <span
                          style={{
                            color: statusColor(stats.status),
                            fontWeight: 700,
                          }}
                        >
                          {statusLabel(stats.status)}
                        </span>
                      </div>

                      {place.microwaves && (
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#004791",
                            fontWeight: 700,
                          }}
                        >
                          🍽️ {place.microwaves.count} mikrovågsugnar ·{" "}
                          {place.microwaves.location}
                          {place.microwaves.notes
                            ? ` (${place.microwaves.notes})`
                            : ""}
                        </div>
                      )}

                      {matchingRooms.length > 0 && (
                        <div
                          style={{
                            display: "grid",
                            gap: "8px",
                            marginTop: "12px",
                          }}
                        >
                          {matchingRooms.map((room) => {
                            const bookingLabel = formatBookingLabel(
                              room.bookingStatus
                            );

                            return (
                              <div
                                key={room.id}
                                style={{
                                  border: "1px solid #bfdbfe",
                                  borderRadius: "12px",
                                  padding: "10px 12px",
                                  background: "rgba(255,255,255,0.75)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: 800,
                                    color: "#000061",
                                  }}
                                >
                                  {room.name}
                                </div>

                                {bookingLabel && (
                                  <div
                                    style={{
                                      fontSize: "12px",
                                      color: room.bookingStatus.isBookedNow
                                        ? "#9f1239"
                                        : "#166534",
                                      fontWeight: 700,
                                      marginTop: "4px",
                                    }}
                                  >
                                    {bookingLabel}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            borderRadius: "30px",
            padding: "18px",
            border: "1px solid #dbeafe",
            boxShadow: "0 20px 60px rgba(0,71,145,0.08)",
          }}
        >
          <CampusMap
            places={filteredPlaces}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={setSelectedBuildingId}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";

import braziliaLogo from "./brazilia-logo.png";
import thsLogo from "./ths-logo.png";
import slLogo from "./sl-logo.png";
import sevenElevenLogo from "./seven-eleven-logo.png";
import laCampusLogo from "./la-campus-logo.png";
import systerOBrorLogo from "./syster-o-bror-logo.png";
import kioskLogo from "./kiosk-logo.png";

const MAP_BOUNDS = [
  [59.31, 17.96],
  [59.39, 18.12],
];

const DIRECTIONS_API_URL = "/api/directions";
const ARRIVAL_DISTANCE_METERS = 30;
const WATCH_POSITION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 5000,
};

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

function getRouteSummary(route) {
  return route?.features?.[0]?.properties?.summary || null;
}

function getRouteLatLngs(route) {
  const coordinates = route?.features?.[0]?.geometry?.coordinates || [];
  return coordinates.map(([lng, lat]) => [lat, lng]);
}

function getRouteSteps(route) {
  return route?.features?.[0]?.properties?.segments?.[0]?.steps || [];
}

function getDistanceBetweenPoints(start, end) {
  if (!start || !end) return Number.POSITIVE_INFINITY;

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(end.lat - start.latitude);
  const longitudeDelta = toRadians(end.lng - start.longitude);
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.lat);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function createBuildingIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 22px;
        height: 22px;
        background: #004791;
        border: 4px solid white;
        border-radius: 999px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.25);
      "></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function createRestaurantIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 34px;
        height: 34px;
        background: white;
        border: 2px solid #1e3a8a;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.22);
      ">
        🍴
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -14],
  });
}

function createRestaurantLogoIcon(place) {
  let iconUrl = null;

  if (place.id === "nymble") iconUrl = thsLogo;
  if (place.id === "brazilia") iconUrl = braziliaLogo;
  if (place.id === "7eleven") iconUrl = sevenElevenLogo;
  if (place.id === "la-campus") iconUrl = laCampusLogo;
  if (place.id === "syster-o-bror") iconUrl = systerOBrorLogo;
  if (place.id === "kiosk" || place.id === "murad-kiosken") iconUrl = kioskLogo;
  if (place.id === "tekniska-tunnelbana") iconUrl = slLogo;

  if (!iconUrl) return createRestaurantIcon();

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 46px;
        height: 46px;
        background: rgba(255,255,255,0.96);
        border: 2px solid white;
        border-radius: 999px;
        box-shadow: 0 8px 20px rgba(15,23,42,0.20);
        overflow: visible;
        position: relative;
      ">
        <img src="${iconUrl}" alt="" style="
          width: 34px;
          height: 34px;
          object-fit: contain;
          display: block;
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        " />
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -20],
  });
}

function createUserLocationIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 22px;
        height: 22px;
        background: #2563eb;
        border: 4px solid white;
        border-radius: 999px;
        box-shadow: 0 8px 18px rgba(37,99,235,0.35);
      "></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function isRestaurant(place) {
  return place.type === "restaurant";
}

function FlyToSelected({ places, selectedBuildingId }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedBuildingId) return;

    const selected = places.find((place) => place.id === selectedBuildingId);
    if (!selected) return;

    map.flyTo([selected.lat, selected.lng], 17, {
      duration: 1.2,
    });
  }, [map, places, selectedBuildingId]);

  return null;
}

function FitRouteToBounds({ routeLatLngs }) {
  const map = useMap();

  useEffect(() => {
    if (routeLatLngs.length > 1) {
      map.fitBounds(L.latLngBounds(routeLatLngs), {
        padding: [56, 56],
        maxZoom: 18,
      });
    }
  }, [map, routeLatLngs]);

  return null;
}

function KeepPopupSizedAfterZoom() {
  useMapEvents({
    zoomend(event) {
      event.target._popup?.update();
    },
    resize(event) {
      event.target._popup?.update();
    },
  });

  return null;
}

function RoomLink({ href, children }) {
  if (!href) return children;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        color: "#004791",
        textDecoration: "none",
        fontWeight: 700,
      }}
    >
      {children}
    </a>
  );
}

function formatReservationTime(value) {
  return new Date(value).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RoomBookingStatus({ bookingStatus }) {
  if (!bookingStatus?.isBookable) return null;

  const baseStyle = {
    fontSize: "12px",
    fontWeight: 700,
    marginTop: "6px",
  };

  if (bookingStatus.isBookedNow && bookingStatus.currentReservation) {
    return (
      <div
        style={{
          ...baseStyle,
          color: "#9f1239",
        }}
      >
        Bokad nu {formatReservationTime(bookingStatus.currentReservation.start)}
        –
        {formatReservationTime(bookingStatus.currentReservation.end)}
      </div>
    );
  }

  if (bookingStatus.nextReservation) {
    return (
      <div
        style={{
          ...baseStyle,
          color: "#166534",
        }}
      >
        Ledig nu · bokad {formatReservationTime(bookingStatus.nextReservation.start)}
        –
        {formatReservationTime(bookingStatus.nextReservation.end)}
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        color: "#166534",
      }}
    >
      Ledig idag
      {bookingStatus.requiresAccess ? " · kräver access" : ""}
    </div>
  );
}

function RestaurantLinks({ place }) {
  let lunchPage = null;
  let website = null;
  let title = place.name;
  let logo = null;

  if (place.id === "nymble") {
    lunchPage = "https://nymble.gastrogate.com/lunch/";
    website = "https://ths.kth.se/studentliv/nymble";
    logo = thsLogo;
  }

  if (place.id === "brazilia") {
    lunchPage = "https://www.restaurangbrazilia.se/meny/lunch/";
    website = "https://www.restaurangbrazilia.se/";
    logo = braziliaLogo;
  }

  if (place.id === "7eleven") {
    website = "https://www.7-eleven.se/";
    logo = sevenElevenLogo;
  }

  if (place.id === "la-campus") {
    website = "https://www.kth.se/";
    logo = laCampusLogo;
  }

  if (place.id === "syster-o-bror") {
    website = "https://systerobror.se/";
    logo = systerOBrorLogo;
  }

  if (place.id === "kiosk" || place.id === "murad-kiosken") {
    logo = kioskLogo;
  }

  if (place.id === "tekniska-tunnelbana") {
    website = "https://sl.se/";
    logo = slLogo;
  }

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "12px",
        border: "1px solid #dbeafe",
        borderRadius: "14px",
        background: "#f8fbff",
      }}
    >
      {logo && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "10px",
          }}
        >
          <img
            src={logo}
            alt={title}
            style={{
              maxWidth: "90px",
              maxHeight: "70px",
              objectFit: "contain",
            }}
          />
        </div>
      )}

      <div
        style={{
          fontSize: "14px",
          fontWeight: 800,
          color: "#1e3a8a",
          marginBottom: "10px",
          textAlign: "center",
        }}
      >
        {title}
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {lunchPage && (
          <a
            href={lunchPage}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "8px 10px",
              borderRadius: "10px",
              background: "#111827",
              color: "white",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            Öppna veckomeny
          </a>
        )}

        {website && (
          <a
            href={website}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "8px 10px",
              borderRadius: "10px",
              background: "#004791",
              color: "white",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            Öppna hemsida
          </a>
        )}
      </div>
    </div>
  );
}

export default function CampusMap({
  places,
  selectedBuildingId,
  onSelectBuilding,
}) {
  const [userPosition, setUserPosition] = useState(null);
  const [route, setRoute] = useState(null);
  const [activeNavigationDestination, setActiveNavigationDestination] = useState(null);
  const [routeMessage, setRouteMessage] = useState(
    "Aktivera din plats och välj ett mål för navigation."
  );
  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const routeRequestId = useRef(0);
  const navigationSessionId = useRef(0);
  const watchIdRef = useRef(null);

  const buildingIcon = useMemo(() => createBuildingIcon(), []);
  const userLocationIcon = useMemo(() => createUserLocationIcon(), []);
  const routeLatLngs = useMemo(() => getRouteLatLngs(route), [route]);
  const routeSummary = getRouteSummary(route);
  const routeSteps = useMemo(() => getRouteSteps(route), [route]);
  const hasActiveNavigation = Boolean(activeNavigationDestination);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  async function requestUserPosition() {
    if (!navigator.geolocation) {
      throw new Error("Din webbläsare stödjer inte platsdelning.");
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        (error) => reject(new Error(`Kunde inte hämta din plats: ${error.message}`)),
        { ...WATCH_POSITION_OPTIONS, maximumAge: 30000 }
      );
    });
  }

  function clearNavigationWatch() {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  function stopNavigation(message = "Navigation stoppad.") {
    navigationSessionId.current += 1;
    routeRequestId.current += 1;
    clearNavigationWatch();
    setActiveNavigationDestination(null);
    setRoute(null);
    setIsLocating(false);
    setIsRouting(false);
    setRouteMessage(message);
  }

  function startNavigationWatch(destination, sessionId) {
    if (!navigator.geolocation) return;

    clearNavigationWatch();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (navigationSessionId.current !== sessionId) return;

        const nextPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setUserPosition(nextPosition);

        if (getDistanceBetweenPoints(nextPosition, destination) <= ARRIVAL_DISTANCE_METERS) {
          stopNavigation(`Du är framme vid ${destination.name}. Navigation avslutad.`);
        }
      },
      () => {
        if (navigationSessionId.current !== sessionId) return;
        setRouteMessage(
          `Navigation till ${destination.name} är igång, men live-positionen kunde inte uppdateras.`
        );
      },
      WATCH_POSITION_OPTIONS
    );
  }

  async function fetchRoute(startPosition, destination) {
    const response = await fetch(DIRECTIONS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [startPosition.longitude, startPosition.latitude],
          [destination.lng, destination.lat],
        ],
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "OpenRouteService kunde inte skapa en rutt.");
    }

    return response.json();
  }

  async function routeToPlace(
    destination,
    startPosition = userPosition,
    sessionId = navigationSessionId.current
  ) {
    if (!destination) {
      setRoute(null);
      setRouteMessage("Välj ett mål på kartan eller i listan.");
      return;
    }

    if (!startPosition) {
      setRoute(null);
      setRouteMessage("Aktivera din plats för att beräkna gångrutt.");
      return;
    }

    const requestId = routeRequestId.current + 1;
    routeRequestId.current = requestId;
    setIsRouting(true);
    setRouteMessage(`Beräknar gångrutt till ${destination.name}...`);

    try {
      const nextRoute = await fetchRoute(startPosition, destination);
      if (routeRequestId.current !== requestId || navigationSessionId.current !== sessionId) return;

      setRoute(nextRoute);
      const summary = getRouteSummary(nextRoute);
      const distance = formatDistance(summary?.distance);
      const duration = formatDuration(summary?.duration);
      setRouteMessage(
        summary
          ? `${destination.name}: ${distance} gång, cirka ${duration}.`
          : `${destination.name}: rutt skapad.`
      );
    } catch (error) {
      if (routeRequestId.current !== requestId || navigationSessionId.current !== sessionId) return;
      clearNavigationWatch();
      setActiveNavigationDestination(null);
      setRoute(null);
      setRouteMessage(error.message);
    } finally {
      if (routeRequestId.current === requestId && navigationSessionId.current === sessionId) {
        setIsRouting(false);
      }
    }
  }

  async function locateUser() {
    setIsLocating(true);
    setRouteMessage("Hämtar din plats...");

    try {
      const nextPosition = await requestUserPosition();
      setUserPosition(nextPosition);
      setRouteMessage(
        `Plats hittad. Tryck Navigate på ett mål. Noggrannhet ${Math.round(
          nextPosition.accuracy || 0
        )} m.`
      );
    } catch (error) {
      setRoute(null);
      setRouteMessage(error.message);
    } finally {
      setIsLocating(false);
    }
  }

  async function startNavigation(place) {
    onSelectBuilding(place.id);
    const sessionId = navigationSessionId.current + 1;
    navigationSessionId.current = sessionId;
    setActiveNavigationDestination(place);
    setRoute(null);

    if (userPosition) {
      startNavigationWatch(place, sessionId);
      await routeToPlace(place, userPosition, sessionId);
      return;
    }

    setIsLocating(true);
    setRouteMessage("Hämtar din plats för navigation...");

    try {
      const nextPosition = await requestUserPosition();
      if (navigationSessionId.current !== sessionId) return;
      setUserPosition(nextPosition);
      startNavigationWatch(place, sessionId);
      await routeToPlace(place, nextPosition, sessionId);
    } catch (error) {
      if (navigationSessionId.current !== sessionId) return;
      clearNavigationWatch();
      setActiveNavigationDestination(null);
      setRoute(null);
      setRouteMessage(error.message);
    } finally {
      if (navigationSessionId.current === sessionId) {
        setIsLocating(false);
      }
    }
  }

  return (
    <div
      style={{
        borderRadius: "24px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          zIndex: 500,
          width: "min(360px, calc(100% - 32px))",
          display: "grid",
          gap: "8px",
        }}
      >
        <button
          type="button"
          onClick={locateUser}
          disabled={isLocating}
          style={{
            justifySelf: "start",
            padding: "10px 14px",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            background: isLocating ? "#dbeafe" : "#004791",
            color: isLocating ? "#1e3a8a" : "white",
            fontWeight: 800,
            cursor: isLocating ? "wait" : "pointer",
            boxShadow: "0 8px 18px rgba(15,23,42,0.14)",
          }}
        >
          {isLocating ? "Hämtar plats..." : "Använd min plats"}
        </button>

        <div
          style={{
            padding: "10px 12px",
            border: "1px solid #dbeafe",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.96)",
            color: "#0f172a",
            fontSize: "13px",
            fontWeight: 700,
            lineHeight: 1.35,
            boxShadow: "0 8px 18px rgba(15,23,42,0.12)",
          }}
        >
          {isRouting ? "Rutt beräknas..." : routeMessage}
          {routeSummary && (
            <div
              style={{
                marginTop: "6px",
                color: "#004791",
                fontSize: "12px",
              }}
            >
              {formatDistance(routeSummary.distance)} · {formatDuration(routeSummary.duration)}
            </div>
          )}
          {routeSteps.length > 0 && (
            <ol
              style={{
                margin: "8px 0 0",
                paddingLeft: "18px",
                maxHeight: "120px",
                overflowY: "auto",
                color: "#334155",
                fontSize: "12px",
              }}
            >
              {routeSteps.slice(0, 6).map((step, index) => (
                <li key={`${step.way_points?.join("-") || index}-${step.instruction}`}>
                  {step.instruction}
                </li>
              ))}
            </ol>
          )}
          {hasActiveNavigation && (
            <button
              type="button"
              onClick={() => stopNavigation("Navigation stoppad manuellt.")}
              style={{
                marginTop: "10px",
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                background: "#dc2626",
                color: "white",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 8px 18px rgba(220,38,38,0.18)",
              }}
            >
              Stoppa navigation
            </button>
          )}
        </div>
      </div>

      <MapContainer
        center={[59.3493, 18.0712]}
        zoom={16}
        minZoom={13}
        keyboard={false}
        closePopupOnClick={false}
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={0.8}
        style={{
          height: "82vh",
          width: "100%",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors & CartoDB"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <FlyToSelected
          places={places}
          selectedBuildingId={selectedBuildingId}
        />
        <FitRouteToBounds
          routeLatLngs={routeLatLngs}
        />
        <KeepPopupSizedAfterZoom />

        {userPosition && (
          <>
            <Marker
              position={[userPosition.latitude, userPosition.longitude]}
              icon={userLocationIcon}
            >
              <Popup>Du är här</Popup>
            </Marker>
            <Circle
              center={[userPosition.latitude, userPosition.longitude]}
              radius={userPosition.accuracy || 25}
              pathOptions={{
                color: "#2563eb",
                weight: 1,
                fillColor: "#2563eb",
                fillOpacity: 0.12,
              }}
            />
          </>
        )}

        {routeLatLngs.length > 1 && (
          <Polyline
            positions={routeLatLngs}
            pathOptions={{
              color: "#16a34a",
              weight: 6,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {places.map((place) => {
          const restaurant = isRestaurant(place);

          const markerIcon = restaurant
            ? createRestaurantLogoIcon(place)
            : buildingIcon;

          return (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => onSelectBuilding(place.id),
              }}
            >
              <Popup
                minWidth={240}
                maxWidth={300}
                closeOnClick={false}
                keepInView
                autoPan
                autoPanPadding={[18, 18]}
              >
                <div
                  style={{
                    width: "min(280px, calc(100vw - 64px))",
                    maxHeight: "min(52vh, 360px)",
                    overflowY: "auto",
                    overflowX: "hidden",
                    fontFamily: "system-ui, sans-serif",
                    paddingRight: "1px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      color: "#1e3a8a",
                      marginBottom: "6px",
                      lineHeight: 1.15,
                    }}
                  >
                    {place.name}
                  </div>

                  {place.openingHours && (
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#475569",
                        marginBottom: "8px",
                      }}
                    >
                      <strong>Öppettider:</strong> {place.openingHours}
                    </div>
                  )}

                  {activeNavigationDestination?.id === place.id ? (
                    <button
                      type="button"
                      onClick={() => stopNavigation("Navigation stoppad manuellt.")}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #fecaca",
                        borderRadius: "10px",
                        background: "#dc2626",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: 800,
                        cursor: "pointer",
                        marginBottom: "10px",
                        boxShadow: "0 8px 16px rgba(220,38,38,0.16)",
                      }}
                    >
                      Stoppa navigation
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startNavigation(place)}
                      disabled={isLocating || isRouting}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "none",
                        borderRadius: "10px",
                        background: isLocating || isRouting ? "#dbeafe" : "#16a34a",
                        color: isLocating || isRouting ? "#1e3a8a" : "white",
                        fontSize: "14px",
                        fontWeight: 800,
                        cursor: isLocating || isRouting ? "wait" : "pointer",
                        marginBottom: "10px",
                      }}
                    >
                      {isLocating || isRouting ? "Startar navigation..." : "Navigate"}
                    </button>
                  )}

                  {restaurant && <RestaurantLinks place={place} />}

                  {!restaurant && place.microwaves && (
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#004791",
                        marginBottom: "8px",
                        fontWeight: 700,
                      }}
                    >
                      🍽️ {place.microwaves.count} mikrovågsugnar kopplade till byggnaden
                    </div>
                  )}

                  {!restaurant && (place.rooms || []).length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gap: "6px",
                      }}
                    >
                      {place.rooms.map((room) => (
                        <div
                          key={room.id}
                          style={{
                            border: "1px solid #dbeafe",
                            borderRadius: "10px",
                            padding: "8px 10px",
                            background: "#f8fbff",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 800,
                              color: "#0f172a",
                              marginBottom: "4px",
                            }}
                          >
                            <RoomLink href={room.mapsUrl}>{room.name}</RoomLink>
                          </div>

                          {room.address && (
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#475569",
                                marginBottom: room.source ? "4px" : "0",
                              }}
                            >
                              {room.address}
                            </div>
                          )}

                          {room.source && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                              }}
                            >
                              <RoomLink href={room.source}>KTH Places</RoomLink>
                            </div>
                          )}

                          <RoomBookingStatus bookingStatus={room.bookingStatus} />
                        </div>
                      ))}
                    </div>
                  )}

                  {!restaurant && place.roomCount > (place.rooms || []).length && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "8px",
                      }}
                    >
                      Visar {place.rooms.length} av {place.roomCount} rum.
                    </div>
                  )}

                  {!restaurant && place.roomCount === (place.rooms || []).length && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "8px",
                      }}
                    >
                      Visar alla {place.rooms.length} rum.
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

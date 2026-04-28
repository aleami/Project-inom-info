import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
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
  const buildingIcon = createBuildingIcon();

  return (
    <div
      style={{
        borderRadius: "24px",
        overflow: "hidden",
      }}
    >
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
        <KeepPopupSizedAfterZoom />

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


function getGeolocationErrorMessage(error) {
  if (!error) {
    return "Kunde inte hämta din position.";
  }

  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Platsåtkomst nekades. Tillåt platsåtkomst i webbläsaren för att räkna ut distansen.";
    case error.POSITION_UNAVAILABLE:
      return "Din position kunde inte hämtas just nu.";
    case error.TIMEOUT:
      return "Det tog för lång tid att hämta din position.";
    default:
      return "Ett okänt fel uppstod när din position skulle hämtas.";
  }
}


export function requestUserLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Din webbläsare stödjer inte platsåtkomst."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(new Error(getGeolocationErrorMessage(error)));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}


export function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}


export async function getDistanceToPlace(placeLat, placeLng) {
  if (typeof placeLat !== "number" || typeof placeLng !== "number") {
    throw new Error("placeLat och placeLng måste vara nummer.");
  }

  const userLocation = await requestUserLocation();
  const distanceInMeters = calculateDistanceInMeters(
    userLocation.latitude,
    userLocation.longitude,
    placeLat,
    placeLng
  );

  return {
    userLatitude: userLocation.latitude,
    userLongitude: userLocation.longitude,
    placeLatitude: placeLat,
    placeLongitude: placeLng,
    distanceInMeters,
    distanceInKilometers: distanceInMeters / 1000,
    accuracy: userLocation.accuracy,
  };
}


export function formatDistance(distanceInMeters) {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  }

  return `${(distanceInMeters / 1000).toFixed(1)} km`;
}

/*
EXEMPEL: Så kopplar du in filen i en kartfil

import { getDistanceToPlace, formatDistance } from "./distanceToPlace.js";

async function onPlaceSelected(place) {
  try {
    // place.lat och place.lng kommer från kartans sökresultat
    const result = await getDistanceToPlace(place.lat, place.lng);

    console.log("Användarens position:", result.userLatitude, result.userLongitude);
    console.log("Platsens position:", result.placeLatitude, result.placeLongitude);
    console.log("Distans:", formatDistance(result.distanceInMeters));

    // Här kan du visa distansen i UI:t
    document.getElementById("distance").textContent = formatDistance(result.distanceInMeters);
  } catch (error) {
    console.error(error.message);
    alert(error.message);
  }
}
*/

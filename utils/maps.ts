import type { EventLocationDetails, FamilyEvent } from "@/types/event";

export type MapLocationInput = {
  name?: string | null;
  address?: string | null;
  query?: string | null;
  lat?: number | null;
  lng?: number | null;
};

/** Best single-line label for cards / details. */
export function getEventLocationLabel(event: FamilyEvent): string {
  return (
    event.locationName?.trim() ||
    event.location?.trim() ||
    event.locationAddress?.trim() ||
    ""
  );
}

export function eventToMapLocation(event: FamilyEvent): MapLocationInput | null {
  const label = getEventLocationLabel(event);
  if (!label && event.locationLat == null && event.locationLng == null) {
    return null;
  }

  return {
    name: event.locationName ?? null,
    address: event.locationAddress ?? null,
    query: label || event.locationAddress || event.locationName || null,
    lat: event.locationLat ?? null,
    lng: event.locationLng ?? null,
  };
}

function hasCoordinates(location: MapLocationInput): boolean {
  return (
    typeof location.lat === "number" &&
    Number.isFinite(location.lat) &&
    typeof location.lng === "number" &&
    Number.isFinite(location.lng)
  );
}

function searchQuery(location: MapLocationInput): string {
  return (
    location.address?.trim() ||
    location.query?.trim() ||
    location.name?.trim() ||
    ""
  );
}

/**
 * Google Maps HTTPS URL.
 * Opens the Maps app when the OS supports it; otherwise the website.
 * Prefer lat/lng; otherwise use a URL-encoded search query.
 */
export function getGoogleMapsUrl(location: MapLocationInput): string {
  if (hasCoordinates(location)) {
    return `https://www.google.com/maps/search/?api=1&query=${location.lat}%2C${location.lng}`;
  }

  const query = searchQuery(location);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Apple Maps HTTPS URL.
 * Prefer ll= with an optional q= label; otherwise q= search only.
 */
export function getAppleMapsUrl(location: MapLocationInput): string {
  if (hasCoordinates(location)) {
    const lat = location.lat as number;
    const lng = location.lng as number;
    const params = new URLSearchParams({
      ll: `${lat},${lng}`,
      q: location.name?.trim() || location.address?.trim() || `${lat},${lng}`,
    });
    return `https://maps.apple.com/?${params.toString()}`;
  }

  const query = searchQuery(location);
  return `https://maps.apple.com/?${new URLSearchParams({ q: query }).toString()}`;
}

export function locationDetailsFromEvent(
  event: FamilyEvent,
): EventLocationDetails {
  return {
    name: event.locationName,
    address: event.locationAddress,
    lat: event.locationLat,
    lng: event.locationLng,
    placeId: event.locationPlaceId,
  };
}

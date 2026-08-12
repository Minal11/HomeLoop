function getGoogleMapsApiKey(): string {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  if (!key) {
    throw new Error(
      "Missing GOOGLE_MAPS_API_KEY. Add it to .env.local (server) or Vercel env.",
    );
  }

  return key;
}

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
};

export type PlaceDetails = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      text?: { text?: string };
    };
  }>;
  error?: { message?: string; status?: string };
};

type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  error?: { message?: string; status?: string };
};

export async function fetchPlaceSuggestions(input: {
  query: string;
  sessionToken: string;
  latitude?: number;
  longitude?: number;
}): Promise<PlaceSuggestion[]> {
  const query = input.query.trim();
  if (query.length < 2) {
    return [];
  }

  const body: Record<string, unknown> = {
    input: query,
    languageCode: "en",
    sessionToken: input.sessionToken,
  };

  if (
    typeof input.latitude === "number" &&
    typeof input.longitude === "number" &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    body.locationBias = {
      circle: {
        center: {
          latitude: input.latitude,
          longitude: input.longitude,
        },
        radius: 50000.0,
      },
    };
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": getGoogleMapsApiKey(),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as AutocompleteResponse;

  if (!response.ok) {
    console.error("Places autocomplete failed:", payload);
    throw new Error(
      payload.error?.message || "Unable to search locations right now.",
    );
  }

  const suggestions: PlaceSuggestion[] = [];

  for (const item of payload.suggestions ?? []) {
    const prediction = item.placePrediction;
    if (!prediction?.placeId) {
      continue;
    }

    const primaryText =
      prediction.structuredFormat?.mainText?.text?.trim() ||
      prediction.text?.text?.trim() ||
      "";
    const secondaryText =
      prediction.structuredFormat?.secondaryText?.text?.trim() || "";

    if (!primaryText) {
      continue;
    }

    suggestions.push({
      placeId: prediction.placeId,
      primaryText,
      secondaryText,
    });

    if (suggestions.length >= 6) {
      break;
    }
  }

  return suggestions;
}

export async function fetchPlaceDetails(input: {
  placeId: string;
  sessionToken: string;
}): Promise<PlaceDetails> {
  const placeId = input.placeId.trim();
  if (!placeId) {
    throw new Error("Missing place id.");
  }

  const url = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
  );
  url.searchParams.set("sessionToken", input.sessionToken);
  url.searchParams.set("languageCode", "en");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getGoogleMapsApiKey(),
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as PlaceDetailsResponse;

  if (!response.ok) {
    console.error("Place details failed:", payload);
    throw new Error(
      payload.error?.message || "Unable to load that place right now.",
    );
  }

  const lat = payload.location?.latitude;
  const lng = payload.location?.longitude;
  const name = payload.displayName?.text?.trim() || "";
  const address = payload.formattedAddress?.trim() || "";

  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    throw new Error("That place is missing map coordinates.");
  }

  return {
    placeId: payload.id?.replace(/^places\//, "") || placeId,
    name: name || address,
    address,
    lat,
    lng,
  };
}

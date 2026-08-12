import { NextResponse } from "next/server";

import { fetchPlaceSuggestions } from "@/lib/places";

export const runtime = "nodejs";

type AutocompleteBody = {
  query?: string;
  sessionToken?: string;
  latitude?: number;
  longitude?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AutocompleteBody;
    const query = body.query?.trim() ?? "";
    const sessionToken = body.sessionToken?.trim() ?? "";

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Missing autocomplete session." },
        { status: 400 },
      );
    }

    const suggestions = await fetchPlaceSuggestions({
      query,
      sessionToken,
      latitude: body.latitude,
      longitude: body.longitude,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Unable to search locations.";
    const status = message.includes("Missing GOOGLE_MAPS_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

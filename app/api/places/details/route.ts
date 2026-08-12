import { NextResponse } from "next/server";

import { fetchPlaceDetails } from "@/lib/places";

export const runtime = "nodejs";

type DetailsBody = {
  placeId?: string;
  sessionToken?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DetailsBody;
    const placeId = body.placeId?.trim() ?? "";
    const sessionToken = body.sessionToken?.trim() ?? "";

    if (!placeId || !sessionToken) {
      return NextResponse.json(
        { error: "Missing place selection." },
        { status: 400 },
      );
    }

    const place = await fetchPlaceDetails({ placeId, sessionToken });
    return NextResponse.json({ place });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Unable to load place.";
    const status = message.includes("Missing GOOGLE_MAPS_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

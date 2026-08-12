import { NextResponse } from "next/server";

import {
  createEventFromShortcut,
  type ShortcutEventPayload,
} from "@/lib/shortcuts/create-event";
import { authenticateShortcutBearer } from "@/lib/shortcuts/tokens";
import { getSiteUrl } from "@/utils/app-url";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json(
    {
      ok: false,
      error: "UNAUTHORIZED",
      message: "HomeLoop Shortcut authorization failed.",
    },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateShortcutBearer(
      request.headers.get("authorization"),
    );

    if (!auth) {
      return unauthorized();
    }

    let body: ShortcutEventPayload;
    try {
      body = (await request.json()) as ShortcutEventPayload;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_EVENT",
          message: "Request body must be JSON.",
        },
        { status: 400 },
      );
    }

    const result = await createEventFromShortcut({
      userId: auth.userId,
      body,
      siteUrl: getSiteUrl(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Shortcut events API error:", error);
    const message =
      error instanceof Error &&
      error.message.includes("SUPABASE_SERVICE_ROLE_KEY")
        ? "Shortcut API is not configured on the server yet."
        : "Unable to create event right now.";

    return NextResponse.json(
      {
        ok: false,
        error: "SERVER_ERROR",
        message,
      },
      { status: 500 },
    );
  }
}

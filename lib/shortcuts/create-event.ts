import {
  mapFamilyEventInputToRow,
  mapEventRowToFamilyEvent,
} from "@/lib/events";
import { createServiceClient } from "@/lib/supabase/admin";
import type { EventCategory, EventRow, FamilyEvent } from "@/types/event";
import { EVENT_CATEGORIES } from "@/types/event";
import type { ReminderOffsetMinutes } from "@/types/reminder";
import {
  calculateRemindAtUtc,
  isReminderOffsetMinutes,
  zonedLocalDateTimeToUtc,
} from "@/utils/reminders";

export type ShortcutEventPayload = {
  title?: unknown;
  Title?: unknown;
  date?: unknown;
  Date?: unknown;
  time?: unknown;
  Time?: unknown;
  location?: unknown;
  Location?: unknown;
  category?: unknown;
  notes?: unknown;
  reminderMinutes?: unknown;
  // Intentionally ignored if present — never trust client IDs.
  family_id?: unknown;
  familyId?: unknown;
  user_id?: unknown;
  userId?: unknown;
  people?: unknown;
};

export type ShortcutCreateSuccess = {
  ok: true;
  eventId: string;
  title: string;
  message: string;
  url: string;
};

export type ShortcutCreateFailure = {
  ok: false;
  error: string;
  message: string;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function pickString(
  body: ShortcutEventPayload,
  lower: keyof ShortcutEventPayload,
  upper: keyof ShortcutEventPayload,
): string | null {
  return asTrimmedString(body[lower]) ?? asTrimmedString(body[upper]);
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function normalizeTimeInput(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] ? Number(match[3]) : 0;

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isEventCategory(value: string): value is EventCategory {
  return (EVENT_CATEGORIES as readonly string[]).includes(value);
}

function getZonedCalendarDateIso(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }

  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function isEventInPast(input: {
  startDate: string;
  startTime: string | null;
  timeZone: string;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();

  if (!input.startTime) {
    const todayIso = getZonedCalendarDateIso(now, input.timeZone);
    return input.startDate < todayIso;
  }

  const eventUtc = zonedLocalDateTimeToUtc(
    input.startDate,
    input.startTime,
    input.timeZone,
  );
  return eventUtc.getTime() < now.getTime();
}

async function syncReminderWithServiceClient(input: {
  eventId: string;
  startDate: string;
  startTime?: string | null;
  timeZone: string;
  offsetMinutes: ReminderOffsetMinutes;
}): Promise<void> {
  const supabase = createServiceClient();
  const remindAt = calculateRemindAtUtc({
    startDate: input.startDate,
    startTime: input.startTime,
    offsetMinutes: input.offsetMinutes,
    timeZone: input.timeZone,
  });

  const { error } = await supabase.from("event_reminders").upsert(
    {
      event_id: input.eventId,
      offset_minutes: input.offsetMinutes,
      remind_at: remindAt.toISOString(),
      sent_at: null,
    },
    { onConflict: "event_id" },
  );

  if (error) {
    console.error("Shortcut reminder sync failed:", error);
    // Event already created — do not fail the whole request.
  }
}

/**
 * Create a family event for an authenticated Shortcut user.
 * Family is resolved server-side from membership — never from the request body.
 */
export async function createEventFromShortcut(input: {
  userId: string;
  body: ShortcutEventPayload;
  siteUrl: string;
}): Promise<
  | { status: 200; body: ShortcutCreateSuccess }
  | { status: 400 | 404 | 500; body: ShortcutCreateFailure }
> {
  const title = pickString(input.body, "title", "Title");
  const date = pickString(input.body, "date", "Date");
  const rawTime = pickString(input.body, "time", "Time");
  const location = pickString(input.body, "location", "Location");
  const notes = asTrimmedString(input.body.notes);
  const categoryRaw = asTrimmedString(input.body.category);

  if (!title) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "INVALID_EVENT",
        message: "Event title is required.",
      },
    };
  }

  if (!date || !isValidDateOnly(date)) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "INVALID_DATE",
        message: "Event date must be YYYY-MM-DD.",
      },
    };
  }

  let startTime: string | null = null;
  if (rawTime) {
    startTime = normalizeTimeInput(rawTime);
    if (!startTime) {
      return {
        status: 400,
        body: {
          ok: false,
          error: "INVALID_TIME",
          message: "Event time must be HH:mm or HH:mm:ss.",
        },
      };
    }
  }

  let category: EventCategory = "Other";
  if (categoryRaw) {
    if (!isEventCategory(categoryRaw)) {
      return {
        status: 400,
        body: {
          ok: false,
          error: "INVALID_CATEGORY",
          message: "Please choose a valid HomeLoop category.",
        },
      };
    }
    category = categoryRaw;
  }

  let reminderOffsetMinutes: ReminderOffsetMinutes | null = null;
  if (
    input.body.reminderMinutes !== undefined &&
    input.body.reminderMinutes !== null &&
    `${input.body.reminderMinutes}`.trim() !== ""
  ) {
    const minutes = Number(input.body.reminderMinutes);
    if (!Number.isFinite(minutes) || !isReminderOffsetMinutes(minutes)) {
      return {
        status: 400,
        body: {
          ok: false,
          error: "INVALID_REMINDER",
          message: "Please choose a valid HomeLoop reminder offset.",
        },
      };
    }
    reminderOffsetMinutes = minutes;
  }

  const supabase = createServiceClient();

  const { data: membership, error: membershipError } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", input.userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("Shortcut family membership lookup failed:", membershipError);
    return {
      status: 500,
      body: {
        ok: false,
        error: "SERVER_ERROR",
        message: "Unable to create event right now.",
      },
    };
  }

  if (!membership?.family_id) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "NO_FAMILY",
        message: "Join or create a HomeLoop family first.",
      },
    };
  }

  const familyId = membership.family_id;

  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("id, timezone")
    .eq("id", familyId)
    .maybeSingle();

  if (familyError) {
    console.error("Shortcut family lookup failed:", familyError);
    return {
      status: 500,
      body: {
        ok: false,
        error: "SERVER_ERROR",
        message: "Unable to create event right now.",
      },
    };
  }

  const timeZone = family?.timezone?.trim() || "America/Chicago";

  if (
    isEventInPast({
      startDate: date,
      startTime,
      timeZone,
    })
  ) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "PAST_DATE",
        message: "This event date is in the past. Please check the date.",
      },
    };
  }

  const mapped = mapFamilyEventInputToRow({
    title,
    startDate: date,
    startTime: startTime ?? undefined,
    assignedTo: "Family",
    category,
    location: location ?? undefined,
    notes: notes ?? undefined,
    reminderOffsetMinutes,
  });

  const { data: inserted, error: insertError } = await supabase
    .from("events")
    .insert({
      ...mapped,
      created_by: input.userId,
      family_id: familyId,
    })
    .select(
      "id, title, start_date, start_time, end_date, end_time, assigned_to, category, location, location_name, location_address, location_lat, location_lng, location_place_id, notes, created_by, family_id, created_at, updated_at",
    )
    .single();

  if (insertError || !inserted) {
    console.error("Shortcut event insert failed:", insertError);
    return {
      status: 500,
      body: {
        ok: false,
        error: "SERVER_ERROR",
        message: "Unable to save event.",
      },
    };
  }

  const created: FamilyEvent = mapEventRowToFamilyEvent(inserted as EventRow);

  if (reminderOffsetMinutes != null) {
    await syncReminderWithServiceClient({
      eventId: created.id,
      startDate: created.startDate,
      startTime: created.startTime,
      timeZone,
      offsetMinutes: reminderOffsetMinutes,
    });
  }

  const baseUrl = input.siteUrl.replace(/\/$/, "");

  return {
    status: 200,
    body: {
      ok: true,
      eventId: created.id,
      title: created.title,
      message: "Added to HomeLoop",
      url: `${baseUrl}/events/${created.id}`,
    },
  };
}

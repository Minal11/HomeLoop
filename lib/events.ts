import { getSupabaseClient } from "@/lib/supabase/client";
import {
  EVENT_CATEGORIES,
  FAMILY_MEMBERS,
  type EventCategory,
  type EventRow,
  type FamilyEvent,
  type FamilyMember,
  type NewFamilyEventInput,
} from "@/types/event";
import { sortEvents } from "@/utils/events";

function isFamilyMember(value: string): value is FamilyMember {
  return (FAMILY_MEMBERS as readonly string[]).includes(value);
}

function isEventCategory(value: string): value is EventCategory {
  return (EVENT_CATEGORIES as readonly string[]).includes(value);
}

/** Postgres `time` often returns HH:MM:SS — keep HH:MM for the UI. */
function normalizeTime(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.slice(0, 5);
}

export function mapEventRowToFamilyEvent(row: EventRow): FamilyEvent {
  if (!isFamilyMember(row.assigned_to)) {
    throw new Error(`Unexpected assigned_to value: ${row.assigned_to}`);
  }

  if (!isEventCategory(row.category)) {
    throw new Error(`Unexpected category value: ${row.category}`);
  }

  return {
    id: row.id,
    title: row.title,
    startDate: row.start_date,
    startTime: normalizeTime(row.start_time),
    endDate: row.end_date ?? undefined,
    endTime: normalizeTime(row.end_time),
    assignedTo: row.assigned_to,
    category: row.category,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function mapFamilyEventInputToRow(
  input: NewFamilyEventInput,
): Omit<EventRow, "id" | "created_at" | "updated_at"> {
  return {
    title: input.title,
    start_date: input.startDate,
    start_time: input.startTime ?? null,
    end_date: input.endDate ?? null,
    end_time: input.endTime ?? null,
    assigned_to: input.assignedTo,
    category: input.category,
    location: input.location ?? null,
    notes: input.notes ?? null,
  };
}

export async function getEvents(): Promise<FamilyEvent[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, start_date, start_time, end_date, end_time, assigned_to, category, location, notes, created_at, updated_at",
    )
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  if (error) {
    console.error("Failed to load events from Supabase:", error);
    throw new Error("Unable to load events.");
  }

  const events = (data ?? []).map(mapEventRowToFamilyEvent);
  return sortEvents(events);
}

export async function createEvent(
  input: NewFamilyEventInput,
): Promise<FamilyEvent> {
  const supabase = getSupabaseClient();
  const row = mapFamilyEventInputToRow(input);

  const { data, error } = await supabase
    .from("events")
    .insert(row)
    .select(
      "id, title, start_date, start_time, end_date, end_time, assigned_to, category, location, notes, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    console.error("Failed to create event in Supabase:", error);
    throw new Error("Unable to save event.");
  }

  return mapEventRowToFamilyEvent(data);
}

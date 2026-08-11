import { getCurrentFamily } from "@/lib/families";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  EVENT_CATEGORIES,
  type EventCategory,
  type EventRow,
  type FamilyEvent,
  type NewFamilyEventInput,
} from "@/types/event";
import { sortEvents } from "@/utils/events";

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
  const assignedTo = row.assigned_to?.trim();
  if (!assignedTo) {
    throw new Error("Event is missing who’s involved.");
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
    assignedTo,
    category: row.category,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function mapFamilyEventInputToRow(
  input: NewFamilyEventInput,
): Omit<
  EventRow,
  "id" | "created_at" | "updated_at" | "created_by" | "family_id"
> {
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

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, ms);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

const EVENT_SELECT =
  "id, title, start_date, start_time, end_date, end_time, assigned_to, category, location, notes, created_by, family_id, created_at, updated_at";

async function requireAuthenticatedUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("Missing authenticated user for event write:", error);
    throw new Error("Your session has expired. Please sign in again.");
  }

  return user.id;
}

async function requireCurrentFamilyId(): Promise<string> {
  const family = await getCurrentFamily();
  if (!family) {
    throw new Error("Join or create a family before managing events.");
  }
  return family.id;
}

export async function getEvents(): Promise<FamilyEvent[]> {
  const supabase = getSupabaseClient();

  const query = supabase
    .from("events")
    .select(EVENT_SELECT)
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  const { data, error } = await withTimeout(
    query,
    10000,
    "Timed out while loading events.",
  );

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
  const userId = await requireAuthenticatedUserId();
  const familyId = await requireCurrentFamilyId();
  const row = {
    ...mapFamilyEventInputToRow(input),
    created_by: userId,
    family_id: familyId,
  };

  const { data, error } = await supabase
    .from("events")
    .insert(row)
    .select(EVENT_SELECT)
    .single();

  if (error || !data) {
    console.error("Failed to create event in Supabase:", error);
    throw new Error("Unable to save event.");
  }

  return mapEventRowToFamilyEvent(data);
}

export async function getEventById(id: string): Promise<FamilyEvent | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load event from Supabase:", error);
    throw new Error("Unable to load event.");
  }

  if (!data) {
    return null;
  }

  return mapEventRowToFamilyEvent(data);
}

export async function updateEvent(
  id: string,
  input: NewFamilyEventInput,
): Promise<FamilyEvent> {
  const supabase = getSupabaseClient();
  await requireAuthenticatedUserId();
  const row = mapFamilyEventInputToRow(input);

  const { data, error } = await supabase
    .from("events")
    .update(row)
    .eq("id", id)
    .select(EVENT_SELECT)
    .single();

  if (error || !data) {
    console.error("Failed to update event in Supabase:", error);
    throw new Error("Unable to save changes.");
  }

  return mapEventRowToFamilyEvent(data);
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  await requireAuthenticatedUserId();

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete event from Supabase:", error);
    throw new Error("Unable to delete event.");
  }
}

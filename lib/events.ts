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

function normalizeOptionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeOptionalNumber(
  value: number | null | undefined,
): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isMissingLocationSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { message?: string; details?: string; code?: string };
  const blob = `${record.message ?? ""} ${record.details ?? ""} ${record.code ?? ""}`.toLowerCase();
  return (
    blob.includes("location_name") ||
    blob.includes("location_address") ||
    blob.includes("location_lat") ||
    blob.includes("location_lng") ||
    blob.includes("location_place_id") ||
    blob.includes("does not exist") ||
    blob.includes("could not find")
  );
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
    location: normalizeOptionalText(row.location),
    locationName: normalizeOptionalText(row.location_name),
    locationAddress: normalizeOptionalText(row.location_address),
    locationLat: normalizeOptionalNumber(row.location_lat),
    locationLng: normalizeOptionalNumber(row.location_lng),
    locationPlaceId: normalizeOptionalText(row.location_place_id),
    notes: row.notes ?? undefined,
  };
}

export function mapFamilyEventInputToRow(
  input: NewFamilyEventInput,
): Omit<
  EventRow,
  "id" | "created_at" | "updated_at" | "created_by" | "family_id"
> {
  const locationName = normalizeOptionalText(input.locationName) ?? null;
  const locationAddress = normalizeOptionalText(input.locationAddress) ?? null;
  const locationPlaceId = normalizeOptionalText(input.locationPlaceId) ?? null;
  const locationLat = normalizeOptionalNumber(input.locationLat) ?? null;
  const locationLng = normalizeOptionalNumber(input.locationLng) ?? null;

  const displayLocation =
    normalizeOptionalText(input.location) ||
    locationName ||
    locationAddress ||
    null;

  return {
    title: input.title,
    start_date: input.startDate,
    start_time: input.startTime ?? null,
    end_date: input.endDate ?? null,
    end_time: input.endTime ?? null,
    assigned_to: input.assignedTo,
    category: input.category,
    location: displayLocation,
    location_name: locationName,
    location_address: locationAddress,
    location_lat: locationLat,
    location_lng: locationLng,
    location_place_id: locationPlaceId,
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

const EVENT_SELECT_WITH_LOCATION =
  "id, title, start_date, start_time, end_date, end_time, assigned_to, category, location, location_name, location_address, location_lat, location_lng, location_place_id, notes, created_by, family_id, created_at, updated_at";

const EVENT_SELECT_LEGACY =
  "id, title, start_date, start_time, end_date, end_time, assigned_to, category, location, notes, created_by, family_id, created_at, updated_at";

function stripStructuredLocation(
  row: ReturnType<typeof mapFamilyEventInputToRow>,
) {
  return {
    title: row.title,
    start_date: row.start_date,
    start_time: row.start_time,
    end_date: row.end_date,
    end_time: row.end_time,
    assigned_to: row.assigned_to,
    category: row.category,
    location: row.location,
    notes: row.notes,
  };
}

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

  let result: {
    data: EventRow[] | null;
    error: unknown;
  } = await withTimeout(
    supabase
      .from("events")
      .select(EVENT_SELECT_WITH_LOCATION)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true }),
    10000,
    "Timed out while loading events.",
  );

  if (result.error && isMissingLocationSchemaError(result.error)) {
    result = await withTimeout(
      supabase
        .from("events")
        .select(EVENT_SELECT_LEGACY)
        .order("start_date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: true }),
      10000,
      "Timed out while loading events.",
    );
  }

  if (result.error) {
    console.error("Failed to load events from Supabase:", result.error);
    throw new Error("Unable to load events.");
  }

  const events = ((result.data ?? []) as EventRow[]).map(mapEventRowToFamilyEvent);
  return sortEvents(events);
}

export async function createEvent(
  input: NewFamilyEventInput,
): Promise<FamilyEvent> {
  const supabase = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const familyId = await requireCurrentFamilyId();
  const mapped = mapFamilyEventInputToRow(input);
  const fullRow = {
    ...mapped,
    created_by: userId,
    family_id: familyId,
  };

  let result: { data: EventRow | null; error: unknown } = await supabase
    .from("events")
    .insert(fullRow)
    .select(EVENT_SELECT_WITH_LOCATION)
    .single();

  if (result.error && isMissingLocationSchemaError(result.error)) {
    result = await supabase
      .from("events")
      .insert({
        ...stripStructuredLocation(mapped),
        created_by: userId,
        family_id: familyId,
      })
      .select(EVENT_SELECT_LEGACY)
      .single();
  }

  if (result.error || !result.data) {
    console.error("Failed to create event in Supabase:", result.error);
    throw new Error("Unable to save event.");
  }

  return mapEventRowToFamilyEvent(result.data as EventRow);
}

export async function getEventById(id: string): Promise<FamilyEvent | null> {
  const supabase = getSupabaseClient();

  let result: { data: EventRow | null; error: unknown } = await supabase
    .from("events")
    .select(EVENT_SELECT_WITH_LOCATION)
    .eq("id", id)
    .maybeSingle();

  if (result.error && isMissingLocationSchemaError(result.error)) {
    result = await supabase
      .from("events")
      .select(EVENT_SELECT_LEGACY)
      .eq("id", id)
      .maybeSingle();
  }

  if (result.error) {
    console.error("Failed to load event from Supabase:", result.error);
    throw new Error("Unable to load event.");
  }

  if (!result.data) {
    return null;
  }

  return mapEventRowToFamilyEvent(result.data as EventRow);
}

export async function updateEvent(
  id: string,
  input: NewFamilyEventInput,
): Promise<FamilyEvent> {
  const supabase = getSupabaseClient();
  await requireAuthenticatedUserId();
  const mapped = mapFamilyEventInputToRow(input);

  let result: { data: EventRow | null; error: unknown } = await supabase
    .from("events")
    .update(mapped)
    .eq("id", id)
    .select(EVENT_SELECT_WITH_LOCATION)
    .single();

  if (result.error && isMissingLocationSchemaError(result.error)) {
    result = await supabase
      .from("events")
      .update(stripStructuredLocation(mapped))
      .eq("id", id)
      .select(EVENT_SELECT_LEGACY)
      .single();
  }

  if (result.error || !result.data) {
    console.error("Failed to update event in Supabase:", result.error);
    throw new Error("Unable to save changes.");
  }

  return mapEventRowToFamilyEvent(result.data as EventRow);
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

import { getCurrentFamily } from "@/lib/families";
import {
  mapRecurrenceFromRow,
  mapRecurrenceToRow,
  occurrenceFromSeries,
} from "@/lib/recurrence-map";
import { listEventExceptions } from "@/lib/event-exceptions";
import {
  getEventReminderOffsetMinutes,
  syncEventReminder,
} from "@/lib/reminders";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  type EventRow,
  type FamilyEvent,
  type NewFamilyEventInput,
} from "@/types/event";
import type {
  EventException,
  RecurrenceDeleteScope,
  RecurrenceEditScope,
  RecurrenceRule,
} from "@/types/recurrence";
import { getLocalDateIso, sortEvents } from "@/utils/events";
import {
  addDaysToDateOnly,
  expandRecurrenceDates,
  isRecurringRule,
  normalizeRecurrenceRule,
} from "@/utils/recurrence";

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

function isMissingColumnSchemaError(error: unknown, needles: string[]): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { message?: string; details?: string; code?: string };
  const blob = `${record.message ?? ""} ${record.details ?? ""} ${record.code ?? ""}`.toLowerCase();
  return needles.some((needle) => blob.includes(needle.toLowerCase()));
}

function isMissingLocationSchemaError(error: unknown): boolean {
  return isMissingColumnSchemaError(error, [
    "location_name",
    "location_address",
    "location_lat",
    "location_lng",
    "location_place_id",
  ]);
}

function isMissingRecurrenceSchemaError(error: unknown): boolean {
  return isMissingColumnSchemaError(error, [
    "recurrence_frequency",
    "recurrence_interval",
    "recurrence_weekdays",
    "recurrence_end_date",
    "event_exceptions",
  ]);
}

const EVENT_SELECT_WITH_RECURRENCE =
  "id, title, start_date, start_time, end_date, end_time, assigned_to, category, location, location_name, location_address, location_lat, location_lng, location_place_id, notes, created_by, family_id, recurrence_frequency, recurrence_interval, recurrence_weekdays, recurrence_end_date, created_at, updated_at";

const EVENT_SELECT_WITH_LOCATION =
  "id, title, start_date, start_time, end_date, end_time, assigned_to, category, location, location_name, location_address, location_lat, location_lng, location_place_id, notes, created_by, family_id, created_at, updated_at";

const EVENT_SELECT_LEGACY =
  "id, title, start_date, start_time, end_date, end_time, assigned_to, category, location, notes, created_by, family_id, created_at, updated_at";

export function mapEventRowToFamilyEvent(row: EventRow): FamilyEvent {
  const assignedTo = row.assigned_to?.trim();
  if (!assignedTo) {
    throw new Error("Event is missing who’s involved.");
  }

  const category = row.category?.trim();
  if (!category) {
    throw new Error("Event is missing a category.");
  }

  const recurrence = mapRecurrenceFromRow(row);

  return {
    id: row.id,
    title: row.title,
    startDate: row.start_date,
    startTime: normalizeTime(row.start_time),
    endDate: row.end_date ?? undefined,
    endTime: normalizeTime(row.end_time),
    assignedTo,
    category,
    location: normalizeOptionalText(row.location),
    locationName: normalizeOptionalText(row.location_name),
    locationAddress: normalizeOptionalText(row.location_address),
    locationLat: normalizeOptionalNumber(row.location_lat),
    locationLng: normalizeOptionalNumber(row.location_lng),
    locationPlaceId: normalizeOptionalText(row.location_place_id),
    notes: row.notes ?? undefined,
    recurrence,
    seriesId: row.id,
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

  const recurrenceFields = mapRecurrenceToRow(input.recurrence ?? null);

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
    ...recurrenceFields,
  };
}

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

function stripRecurrence(
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
    location_name: row.location_name,
    location_address: row.location_address,
    location_lat: row.location_lat,
    location_lng: row.location_lng,
    location_place_id: row.location_place_id,
    notes: row.notes,
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

async function selectEvents(supabase: ReturnType<typeof getSupabaseClient>) {
  let result: { data: EventRow[] | null; error: unknown } = await withTimeout(
    supabase
      .from("events")
      .select(EVENT_SELECT_WITH_RECURRENCE)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true }),
    10000,
    "Timed out while loading events.",
  );

  if (result.error && isMissingRecurrenceSchemaError(result.error)) {
    result = await withTimeout(
      supabase
        .from("events")
        .select(EVENT_SELECT_WITH_LOCATION)
        .order("start_date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: true }),
      10000,
      "Timed out while loading events.",
    );
  }

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

  return result;
}

async function insertEventRow(
  supabase: ReturnType<typeof getSupabaseClient>,
  mapped: ReturnType<typeof mapFamilyEventInputToRow>,
  userId: string,
  familyId: string,
) {
  const fullRow = {
    ...mapped,
    created_by: userId,
    family_id: familyId,
  };

  let result: { data: EventRow | null; error: unknown } = await supabase
    .from("events")
    .insert(fullRow)
    .select(EVENT_SELECT_WITH_RECURRENCE)
    .single();

  if (result.error && isMissingRecurrenceSchemaError(result.error)) {
    result = await supabase
      .from("events")
      .insert({
        ...stripRecurrence(mapped),
        created_by: userId,
        family_id: familyId,
      })
      .select(EVENT_SELECT_WITH_LOCATION)
      .single();
  }

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

  return result;
}

async function updateEventRow(
  supabase: ReturnType<typeof getSupabaseClient>,
  id: string,
  mapped: ReturnType<typeof mapFamilyEventInputToRow>,
) {
  let result: { data: EventRow | null; error: unknown } = await supabase
    .from("events")
    .update(mapped)
    .eq("id", id)
    .select(EVENT_SELECT_WITH_RECURRENCE)
    .single();

  if (result.error && isMissingRecurrenceSchemaError(result.error)) {
    result = await supabase
      .from("events")
      .update(stripRecurrence(mapped))
      .eq("id", id)
      .select(EVENT_SELECT_WITH_LOCATION)
      .single();
  }

  if (result.error && isMissingLocationSchemaError(result.error)) {
    result = await supabase
      .from("events")
      .update(stripStructuredLocation(stripRecurrence(mapped)))
      .eq("id", id)
      .select(EVENT_SELECT_LEGACY)
      .single();
  }

  return result;
}

/**
 * Expand stored events into display occurrences for an arbitrary date window.
 * Home uses today-7 .. today+120; other callers may pass any range.
 */
export function expandEventsForRange(
  events: FamilyEvent[],
  exceptions: EventException[],
  rangeStart: string,
  rangeEnd: string,
): FamilyEvent[] {
  const cancelledBySeries = new Map<string, Set<string>>();
  const modifiedBySeries = new Map<string, Set<string>>();
  const overrideIds = new Set<string>();

  for (const exception of exceptions) {
    if (exception.exceptionType === "cancelled") {
      const set =
        cancelledBySeries.get(exception.seriesEventId) ?? new Set<string>();
      set.add(exception.occurrenceDate);
      cancelledBySeries.set(exception.seriesEventId, set);
    } else if (exception.exceptionType === "modified") {
      const set =
        modifiedBySeries.get(exception.seriesEventId) ?? new Set<string>();
      set.add(exception.occurrenceDate);
      modifiedBySeries.set(exception.seriesEventId, set);
      if (exception.overrideEventId) {
        overrideIds.add(exception.overrideEventId);
      }
    }
  }

  const expanded: FamilyEvent[] = [];

  for (const event of events) {
    // Detached override events are normal one-time rows; include as-is.
    if (!isRecurringRule(event.recurrence)) {
      expanded.push({
        ...event,
        seriesId: event.id,
        occurrenceDate: event.startDate,
      });
      continue;
    }

    // Skip masters that are only used as series definitions when they also
    // appear as override targets — still expand the series itself.
    const cancelled = cancelledBySeries.get(event.id) ?? new Set<string>();
    const modified = modifiedBySeries.get(event.id) ?? new Set<string>();
    const skipDates = new Set<string>([...cancelled, ...modified]);

    const dates = expandRecurrenceDates({
      seriesStartDate: event.startDate,
      rule: event.recurrence,
      rangeStart,
      rangeEnd,
      cancelledDates: skipDates,
    });

    for (const date of dates) {
      expanded.push(occurrenceFromSeries(event, date));
    }
  }

  // Ensure override events that fall in-range are present (they are already
  // included as non-recurring rows above). Mark them clearly.
  return sortEvents(
    expanded.map((event) =>
      overrideIds.has(event.id)
        ? { ...event, seriesId: event.seriesId ?? event.id }
        : event,
    ),
  );
}

export async function getEvents(options?: {
  rangeStart?: string;
  rangeEnd?: string;
}): Promise<FamilyEvent[]> {
  const supabase = getSupabaseClient();
  const result = await selectEvents(supabase);

  if (result.error) {
    console.error("Failed to load events from Supabase:", result.error);
    throw new Error("Unable to load events.");
  }

  const masters = ((result.data ?? []) as EventRow[]).map(mapEventRowToFamilyEvent);
  const today = getLocalDateIso();
  const rangeStart = options?.rangeStart ?? addDaysToDateOnly(today, -7);
  const rangeEnd = options?.rangeEnd ?? addDaysToDateOnly(today, 120);

  const seriesIds = masters
    .filter((event) => isRecurringRule(event.recurrence))
    .map((event) => event.id);

  const exceptions = await listEventExceptions(seriesIds);
  return expandEventsForRange(masters, exceptions, rangeStart, rangeEnd);
}

export async function createEvent(
  input: NewFamilyEventInput,
): Promise<FamilyEvent> {
  const supabase = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const familyId = await requireCurrentFamilyId();
  const mapped = mapFamilyEventInputToRow({
    ...input,
    recurrence: normalizeRecurrenceRule(input.recurrence ?? null),
  });

  const result = await insertEventRow(supabase, mapped, userId, familyId);

  if (result.error || !result.data) {
    console.error("Failed to create event in Supabase:", result.error);
    throw new Error("Unable to save event.");
  }

  const created = mapEventRowToFamilyEvent(result.data as EventRow);

  try {
    const family = await getCurrentFamily();
    await syncEventReminder({
      eventId: created.id,
      startDate: created.startDate,
      startTime: created.startTime,
      timeZone: family?.timezone || "America/Chicago",
      offsetMinutes: input.reminderOffsetMinutes ?? null,
      recurrence: created.recurrence ?? null,
    });
  } catch (reminderError) {
    console.error(reminderError);
  }

  created.reminderOffsetMinutes = input.reminderOffsetMinutes ?? null;
  return created;
}

export async function getEventById(
  id: string,
  occurrenceDate?: string | null,
): Promise<FamilyEvent | null> {
  const supabase = getSupabaseClient();

  let result: { data: EventRow | null; error: unknown } = await supabase
    .from("events")
    .select(EVENT_SELECT_WITH_RECURRENCE)
    .eq("id", id)
    .maybeSingle();

  if (result.error && isMissingRecurrenceSchemaError(result.error)) {
    result = await supabase
      .from("events")
      .select(EVENT_SELECT_WITH_LOCATION)
      .eq("id", id)
      .maybeSingle();
  }

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

  let event = mapEventRowToFamilyEvent(result.data as EventRow);

  if (occurrenceDate && isRecurringRule(event.recurrence)) {
    const exceptions = await listEventExceptions([event.id]);
    const cancelled = new Set(
      exceptions
        .filter((item) => item.exceptionType === "cancelled")
        .map((item) => item.occurrenceDate),
    );
    const modified = exceptions.find(
      (item) =>
        item.exceptionType === "modified" &&
        item.occurrenceDate === occurrenceDate,
    );

    if (modified?.overrideEventId) {
      return getEventById(modified.overrideEventId);
    }

    if (cancelled.has(occurrenceDate)) {
      return null;
    }

    event = occurrenceFromSeries(event, occurrenceDate);
  } else {
    event.occurrenceDate = event.startDate;
  }

  try {
    event.reminderOffsetMinutes = await getEventReminderOffsetMinutes(id);
  } catch (error) {
    console.error(error);
    event.reminderOffsetMinutes = null;
  }
  return event;
}

async function endSeriesBefore(
  seriesId: string,
  occurrenceDate: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const endDate = addDaysToDateOnly(occurrenceDate, -1);
  const { data: series, error } = await supabase
    .from("events")
    .select(EVENT_SELECT_WITH_RECURRENCE)
    .eq("id", seriesId)
    .maybeSingle();

  if (error || !series) {
    console.error("Failed to load series for split/end:", error);
    throw new Error("Unable to update recurring event.");
  }

  const mapped = mapEventRowToFamilyEvent(series as EventRow);
  if (endDate < mapped.startDate) {
    // No remaining occurrences — delete the series master.
    await deleteEvent(seriesId);
    return;
  }

  const nextRule: RecurrenceRule = {
    ...(mapped.recurrence as RecurrenceRule),
    endDate,
  };

  const { error: updateError } = await supabase
    .from("events")
    .update(mapRecurrenceToRow(nextRule))
    .eq("id", seriesId);

  if (updateError) {
    console.error("Failed to end series:", updateError);
    throw new Error("Unable to update recurring event.");
  }
}

export async function updateEvent(
  id: string,
  input: NewFamilyEventInput,
  options?: {
    scope?: RecurrenceEditScope;
    occurrenceDate?: string | null;
  },
): Promise<FamilyEvent> {
  const supabase = getSupabaseClient();
  await requireAuthenticatedUserId();
  const family = await getCurrentFamily();
  const timeZone = family?.timezone || "America/Chicago";

  const existing = await getEventById(id);
  if (!existing) {
    throw new Error("Event not found.");
  }

  const scope = options?.scope ?? "all";
  const occurrenceDate = options?.occurrenceDate ?? existing.occurrenceDate;
  const isRecurring = isRecurringRule(existing.recurrence);

  if (!isRecurring || scope === "all") {
    const mapped = mapFamilyEventInputToRow({
      ...input,
      recurrence:
        scope === "all"
          ? normalizeRecurrenceRule(input.recurrence ?? null)
          : existing.recurrence ?? null,
    });

    const result = await updateEventRow(supabase, id, mapped);
    if (result.error || !result.data) {
      console.error("Failed to update event in Supabase:", result.error);
      throw new Error("Unable to save changes.");
    }

    const updated = mapEventRowToFamilyEvent(result.data as EventRow);
    try {
      await syncEventReminder({
        eventId: updated.id,
        startDate: updated.startDate,
        startTime: updated.startTime,
        timeZone,
        offsetMinutes: input.reminderOffsetMinutes ?? null,
        recurrence: updated.recurrence ?? null,
      });
    } catch (reminderError) {
      console.error(reminderError);
    }
    updated.reminderOffsetMinutes = input.reminderOffsetMinutes ?? null;
    return updated;
  }

  if (!occurrenceDate) {
    throw new Error("Missing occurrence date for recurring edit.");
  }

  if (scope === "this") {
    // Cancel this occurrence on the series and create a standalone event.
    const created = await createEvent({
      ...input,
      recurrence: null,
      startDate: input.startDate || occurrenceDate,
    });

    const { error } = await supabase.from("event_exceptions").upsert(
      {
        series_event_id: id,
        occurrence_date: occurrenceDate,
        exception_type: "modified",
        override_event_id: created.id,
      },
      { onConflict: "series_event_id,occurrence_date" },
    );

    if (error) {
      console.error("Failed to save modified exception:", error);
      throw new Error("Unable to save this occurrence.");
    }

    // Refresh series reminder schedule after exception.
    try {
      await syncEventReminder({
        eventId: id,
        startDate: existing.startDate,
        startTime: existing.startTime,
        timeZone,
        offsetMinutes: existing.reminderOffsetMinutes ?? null,
        recurrence: existing.recurrence ?? null,
      });
    } catch (reminderError) {
      console.error(reminderError);
    }

    return created;
  }

  // this and future: end old series yesterday, create new series from occurrence.
  await endSeriesBefore(id, occurrenceDate);

  const created = await createEvent({
    ...input,
    startDate: input.startDate || occurrenceDate,
    recurrence: normalizeRecurrenceRule(input.recurrence ?? existing.recurrence),
  });

  return created;
}

export async function deleteEvent(
  id: string,
  options?: {
    scope?: RecurrenceDeleteScope;
    occurrenceDate?: string | null;
  },
): Promise<void> {
  const supabase = getSupabaseClient();
  await requireAuthenticatedUserId();

  const existing = await getEventById(id);
  if (!existing) {
    return;
  }

  const scope = options?.scope ?? "all";
  const occurrenceDate = options?.occurrenceDate ?? existing.occurrenceDate;
  const isRecurring = isRecurringRule(existing.recurrence);

  if (!isRecurring || scope === "all") {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete event from Supabase:", error);
      throw new Error("Unable to delete event.");
    }
    return;
  }

  if (!occurrenceDate) {
    throw new Error("Missing occurrence date for recurring delete.");
  }

  if (scope === "this") {
    const { error } = await supabase.from("event_exceptions").upsert(
      {
        series_event_id: id,
        occurrence_date: occurrenceDate,
        exception_type: "cancelled",
        override_event_id: null,
      },
      { onConflict: "series_event_id,occurrence_date" },
    );

    if (error) {
      console.error("Failed to cancel occurrence:", error);
      throw new Error("Unable to delete this occurrence.");
    }

    try {
      const family = await getCurrentFamily();
      await syncEventReminder({
        eventId: id,
        startDate: existing.startDate,
        startTime: existing.startTime,
        timeZone: family?.timezone || "America/Chicago",
        offsetMinutes: existing.reminderOffsetMinutes ?? null,
        recurrence: existing.recurrence ?? null,
      });
    } catch (reminderError) {
      console.error(reminderError);
    }
    return;
  }

  // this and future
  await endSeriesBefore(id, occurrenceDate);

  try {
    const family = await getCurrentFamily();
    const refreshed = await getEventById(id);
    if (refreshed) {
      await syncEventReminder({
        eventId: id,
        startDate: refreshed.startDate,
        startTime: refreshed.startTime,
        timeZone: family?.timezone || "America/Chicago",
        offsetMinutes: refreshed.reminderOffsetMinutes ?? null,
        recurrence: refreshed.recurrence ?? null,
      });
    }
  } catch (reminderError) {
    console.error(reminderError);
  }
}

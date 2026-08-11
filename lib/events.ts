import { getCurrentFamily } from "@/lib/families";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  EVENT_CATEGORIES,
  type EventCategory,
  type EventPersonSummary,
  type EventRow,
  type FamilyEvent,
  type NewFamilyEventInput,
} from "@/types/event";
import type { FamilyPersonRow } from "@/types/person";
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

type EventRowWithPeople = EventRow & {
  event_people?: Array<{
    person_id: string;
    family_people:
      | Pick<FamilyPersonRow, "id" | "display_name">
      | Pick<FamilyPersonRow, "id" | "display_name">[]
      | null;
  }> | null;
};

function unwrapPerson(
  value:
    | Pick<FamilyPersonRow, "id" | "display_name">
    | Pick<FamilyPersonRow, "id" | "display_name">[]
    | null
    | undefined,
): EventPersonSummary | null {
  if (!value) {
    return null;
  }
  const row = Array.isArray(value) ? value[0] : value;
  if (!row) {
    return null;
  }
  return { id: row.id, displayName: row.display_name };
}

export function mapEventRowToFamilyEvent(row: EventRowWithPeople): FamilyEvent {
  if (!isEventCategory(row.category)) {
    throw new Error(`Unexpected category value: ${row.category}`);
  }

  const linkedPeople = (row.event_people ?? [])
    .map((link) => unwrapPerson(link.family_people))
    .filter((person): person is EventPersonSummary => Boolean(person))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const appliesToAll =
    typeof row.applies_to_all === "boolean"
      ? row.applies_to_all
      : row.assigned_to === "Family";

  // Before Step 11 backfill, fall back to legacy assigned_to for display.
  const people =
    linkedPeople.length > 0
      ? linkedPeople
      : !appliesToAll && row.assigned_to && row.assigned_to !== "Family"
        ? row.assigned_to.split(" + ").map((name, index) => ({
            id: `legacy:${row.id}:${index}`,
            displayName: name.trim(),
          }))
        : [];

  return {
    id: row.id,
    title: row.title,
    startDate: row.start_date,
    startTime: normalizeTime(row.start_time),
    endDate: row.end_date ?? undefined,
    endTime: normalizeTime(row.end_time),
    appliesToAll,
    people,
    category: row.category,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function mapFamilyEventInputToRow(
  input: NewFamilyEventInput,
  assignedTo: string,
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
    assigned_to: assignedTo,
    applies_to_all: input.appliesToAll,
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

const EVENT_SELECT_WITH_PEOPLE = `
  id, title, start_date, start_time, end_date, end_time, assigned_to, applies_to_all,
  category, location, notes, created_by, family_id, created_at, updated_at,
  event_people (
    person_id,
    family_people ( id, display_name )
  )
`;

/** Step 10-compatible select before family_people migrations are applied. */
const EVENT_SELECT_LEGACY = `
  id, title, start_date, start_time, end_date, end_time, assigned_to,
  category, location, notes, created_by, family_id, created_at, updated_at
`;

function logSupabaseError(context: string, error: unknown) {
  if (error && typeof error === "object") {
    const record = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    console.error(context, {
      message: record.message,
      code: record.code,
      details: record.details,
      hint: record.hint,
    });
    return;
  }
  console.error(context, error);
}

function isMissingStep11SchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { message?: string; code?: string; details?: string };
  const blob = `${record.message ?? ""} ${record.details ?? ""} ${record.code ?? ""}`.toLowerCase();
  return (
    blob.includes("applies_to_all") ||
    blob.includes("event_people") ||
    blob.includes("family_people") ||
    blob.includes("does not exist") ||
    blob.includes("could not find")
  );
}

async function fetchEventsWithSelect(select: string) {
  const supabase = getSupabaseClient();
  return withTimeout(
    supabase
      .from("events")
      .select(select)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true }),
    10000,
    "Timed out while loading events.",
  );
}

async function fetchEventByIdWithSelect(id: string, select: string) {
  const supabase = getSupabaseClient();
  return supabase.from("events").select(select).eq("id", id).maybeSingle();
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/** Keep real family_people UUIDs only (drops legacy:… placeholders). */
function normalizePersonIds(personIds: string[]): string[] {
  return Array.from(new Set(personIds.filter(isUuid)));
}

async function assertPeopleBelongToFamily(
  familyId: string,
  personIds: string[],
): Promise<void> {
  const uniqueIds = normalizePersonIds(personIds);
  if (uniqueIds.length === 0) {
    return;
  }

  const supabase = getSupabaseClient();
  // Validate in-memory — PostgREST `.in("id", [...])` can fail oddly
  // with multiple UUIDs (empty error object), blocking multi-select saves.
  const { data, error } = await supabase
    .from("family_people")
    .select("id")
    .eq("family_id", familyId);

  if (error) {
    logSupabaseError("Failed to validate event people:", error);
    throw new Error("Unable to validate who’s involved.");
  }

  const allowed = new Set((data ?? []).map((row) => row.id as string));
  const missing = uniqueIds.filter((id) => !allowed.has(id));
  if (missing.length > 0) {
    throw new Error("One or more people are not in your family.");
  }
}

async function syncEventPeople(
  eventId: string,
  familyId: string,
  input: NewFamilyEventInput,
): Promise<void> {
  const supabase = getSupabaseClient();
  const uniqueIds = input.appliesToAll
    ? []
    : normalizePersonIds(input.personIds);

  // Validate before clearing so a failed save does not wipe existing links.
  if (!input.appliesToAll && uniqueIds.length > 0) {
    await assertPeopleBelongToFamily(familyId, uniqueIds);
  }

  const { error: deleteError } = await supabase
    .from("event_people")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    if (isMissingStep11SchemaError(deleteError)) {
      return;
    }
    logSupabaseError("Failed to clear event people:", deleteError);
    throw new Error("Unable to update who’s involved.");
  }

  if (input.appliesToAll || uniqueIds.length === 0) {
    return;
  }

  for (const personId of uniqueIds) {
    const { error: insertError } = await supabase.from("event_people").insert({
      event_id: eventId,
      person_id: personId,
    });

    if (insertError) {
      if (isMissingStep11SchemaError(insertError)) {
        return;
      }
      // Unique violation = already linked (e.g. race); treat as success.
      const code =
        insertError && typeof insertError === "object"
          ? String((insertError as { code?: string }).code ?? "")
          : "";
      if (code === "23505") {
        continue;
      }
      logSupabaseError("Failed to save event people:", insertError);
      throw new Error("Unable to save who’s involved.");
    }
  }
}

function validatePeopleSelection(input: NewFamilyEventInput): void {
  if (!input.appliesToAll && input.personIds.length === 0) {
    throw new Error("Please choose who’s involved.");
  }
}

async function deriveLegacyAssignedTo(
  familyId: string,
  input: NewFamilyEventInput,
): Promise<string> {
  if (input.appliesToAll) {
    return "Family";
  }

  if (input.personIds.length === 0) {
    return "Family";
  }

  const uniqueIds = normalizePersonIds(input.personIds);
  if (uniqueIds.length === 0) {
    return "Family";
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("family_people")
    .select("id, display_name")
    .eq("family_id", familyId);

  if (error || !data || data.length === 0) {
    return "Family";
  }

  const nameById = new Map(
    data.map((row) => [row.id as string, row.display_name as string]),
  );
  const names = uniqueIds
    .map((id) => nameById.get(id))
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b));

  if (names.length === 0) {
    return "Family";
  }

  if (names.length === 1) {
    return names[0]!;
  }

  return names.join(" + ").slice(0, 200);
}

export async function getEvents(): Promise<FamilyEvent[]> {
  let result = await fetchEventsWithSelect(EVENT_SELECT_WITH_PEOPLE);

  if (result.error && isMissingStep11SchemaError(result.error)) {
    console.warn(
      "Step 11 event_people schema not available yet; loading legacy events.",
      result.error,
    );
    result = await fetchEventsWithSelect(EVENT_SELECT_LEGACY);
  }

  if (result.error) {
    logSupabaseError("Failed to load events from Supabase:", result.error);
    throw new Error("Unable to load events.");
  }

  const events = ((result.data ?? []) as unknown as EventRowWithPeople[]).map(
    mapEventRowToFamilyEvent,
  );
  return sortEvents(events);
}

export async function createEvent(
  input: NewFamilyEventInput,
): Promise<FamilyEvent> {
  validatePeopleSelection(input);
  const supabase = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const familyId = await requireCurrentFamilyId();
  const assignedTo = await deriveLegacyAssignedTo(familyId, input);

  const fullRow = {
    ...mapFamilyEventInputToRow(input, assignedTo),
    created_by: userId,
    family_id: familyId,
  };

  let insertResult = await supabase
    .from("events")
    .insert(fullRow)
    .select(EVENT_SELECT_WITH_PEOPLE)
    .single();

  if (insertResult.error && isMissingStep11SchemaError(insertResult.error)) {
    const legacyRow = {
      title: fullRow.title,
      start_date: fullRow.start_date,
      start_time: fullRow.start_time,
      end_date: fullRow.end_date,
      end_time: fullRow.end_time,
      assigned_to: fullRow.assigned_to,
      category: fullRow.category,
      location: fullRow.location,
      notes: fullRow.notes,
      created_by: fullRow.created_by,
      family_id: fullRow.family_id,
    };
    insertResult = await supabase
      .from("events")
      .insert(legacyRow)
      .select(EVENT_SELECT_LEGACY)
      .single();
  } else if (!insertResult.error && insertResult.data) {
    try {
      await syncEventPeople(insertResult.data.id as string, familyId, input);
    } catch (syncError) {
      if (!isMissingStep11SchemaError(syncError)) {
        throw syncError;
      }
    }
  }

  if (insertResult.error || !insertResult.data) {
    logSupabaseError("Failed to create event in Supabase:", insertResult.error);
    throw new Error("Unable to save event.");
  }

  const created = await getEventById(insertResult.data.id as string);
  if (!created) {
    throw new Error("Unable to load saved event.");
  }
  return created;
}

export async function getEventById(id: string): Promise<FamilyEvent | null> {
  let result = await fetchEventByIdWithSelect(id, EVENT_SELECT_WITH_PEOPLE);

  if (result.error && isMissingStep11SchemaError(result.error)) {
    result = await fetchEventByIdWithSelect(id, EVENT_SELECT_LEGACY);
  }

  if (result.error) {
    logSupabaseError("Failed to load event from Supabase:", result.error);
    throw new Error("Unable to load event.");
  }

  if (!result.data) {
    return null;
  }

  return mapEventRowToFamilyEvent(
    result.data as unknown as EventRowWithPeople,
  );
}

export async function updateEvent(
  id: string,
  input: NewFamilyEventInput,
): Promise<FamilyEvent> {
  validatePeopleSelection(input);
  const supabase = getSupabaseClient();
  await requireAuthenticatedUserId();
  const familyId = await requireCurrentFamilyId();
  const assignedTo = await deriveLegacyAssignedTo(familyId, input);
  const fullRow = mapFamilyEventInputToRow(input, assignedTo);

  let updateResult = await supabase
    .from("events")
    .update(fullRow)
    .eq("id", id)
    .select("id, family_id")
    .single();

  if (updateResult.error && isMissingStep11SchemaError(updateResult.error)) {
    const legacyRow = {
      title: fullRow.title,
      start_date: fullRow.start_date,
      start_time: fullRow.start_time,
      end_date: fullRow.end_date,
      end_time: fullRow.end_time,
      assigned_to: fullRow.assigned_to,
      category: fullRow.category,
      location: fullRow.location,
      notes: fullRow.notes,
    };
    updateResult = await supabase
      .from("events")
      .update(legacyRow)
      .eq("id", id)
      .select("id, family_id")
      .single();
  } else if (!updateResult.error) {
    try {
      await syncEventPeople(
        id,
        (updateResult.data?.family_id as string) || familyId,
        input,
      );
    } catch (syncError) {
      if (!isMissingStep11SchemaError(syncError)) {
        throw syncError;
      }
    }
  }

  if (updateResult.error || !updateResult.data) {
    logSupabaseError("Failed to update event in Supabase:", updateResult.error);
    throw new Error("Unable to save changes.");
  }

  const updated = await getEventById(id);
  if (!updated) {
    throw new Error("Unable to load saved event.");
  }
  return updated;
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  await requireAuthenticatedUserId();

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    logSupabaseError("Failed to delete event from Supabase:", error);
    throw new Error("Unable to delete event.");
  }
}

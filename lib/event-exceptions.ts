import { mapExceptionRow } from "@/lib/recurrence-map";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { EventException, EventExceptionRow } from "@/types/recurrence";

function isMissingExceptionsSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { message?: string; details?: string; code?: string };
  const blob = `${record.message ?? ""} ${record.details ?? ""} ${record.code ?? ""}`.toLowerCase();
  return (
    blob.includes("event_exceptions") ||
    blob.includes("does not exist") ||
    blob.includes("could not find")
  );
}

export async function listEventExceptions(
  seriesEventIds: string[],
): Promise<EventException[]> {
  if (seriesEventIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("event_exceptions")
    .select(
      "id, series_event_id, occurrence_date, exception_type, override_event_id, created_at",
    )
    .in("series_event_id", seriesEventIds);

  if (error) {
    if (isMissingExceptionsSchemaError(error)) {
      return [];
    }
    console.error("Failed to load event exceptions:", error);
    throw new Error("Unable to load recurring events.");
  }

  return ((data ?? []) as EventExceptionRow[]).map(mapExceptionRow);
}

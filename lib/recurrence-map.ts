import type { EventRow, FamilyEvent, NewFamilyEventInput } from "@/types/event";
import type {
  EventException,
  EventExceptionRow,
  RecurrenceRule,
  WeekdayIndex,
} from "@/types/recurrence";
import {
  addDaysToDateOnly,
  daySpanBetween,
  isRecurrenceFrequency,
  normalizeRecurrenceRule,
} from "@/utils/recurrence";

export function mapRecurrenceFromRow(
  row: Pick<
    EventRow,
    | "recurrence_frequency"
    | "recurrence_interval"
    | "recurrence_weekdays"
    | "recurrence_end_date"
  >,
): RecurrenceRule | null {
  const frequency = row.recurrence_frequency?.trim();
  if (!frequency || !isRecurrenceFrequency(frequency)) {
    return null;
  }

  const weekdays = Array.isArray(row.recurrence_weekdays)
    ? (row.recurrence_weekdays.filter(
        (day): day is WeekdayIndex =>
          Number.isInteger(day) && day >= 0 && day <= 6,
      ) as WeekdayIndex[])
    : undefined;

  return normalizeRecurrenceRule({
    frequency,
    interval: row.recurrence_interval ?? 1,
    weekdays,
    endDate: row.recurrence_end_date ?? null,
  });
}

export function mapRecurrenceToRow(recurrence: RecurrenceRule | null | undefined): {
  recurrence_frequency: string | null;
  recurrence_interval: number | null;
  recurrence_weekdays: number[] | null;
  recurrence_end_date: string | null;
} {
  const normalized = normalizeRecurrenceRule(recurrence ?? null);
  if (!normalized) {
    return {
      recurrence_frequency: null,
      recurrence_interval: null,
      recurrence_weekdays: null,
      recurrence_end_date: null,
    };
  }

  return {
    recurrence_frequency: normalized.frequency,
    recurrence_interval: normalized.interval,
    recurrence_weekdays:
      normalized.frequency === "weekly" && normalized.weekdays?.length
        ? normalized.weekdays
        : null,
    recurrence_end_date: normalized.endDate ?? null,
  };
}

export function mapExceptionRow(row: EventExceptionRow): EventException {
  return {
    id: row.id,
    seriesEventId: row.series_event_id,
    occurrenceDate: row.occurrence_date,
    exceptionType: row.exception_type,
    overrideEventId: row.override_event_id,
  };
}

export function occurrenceFromSeries(
  series: FamilyEvent,
  occurrenceDate: string,
): FamilyEvent {
  const span = daySpanBetween(series.startDate, series.endDate);
  const endDate =
    span > 0 ? addDaysToDateOnly(occurrenceDate, span) : undefined;

  return {
    ...series,
    startDate: occurrenceDate,
    endDate,
    seriesId: series.id,
    occurrenceDate,
  };
}

export function eventListKey(event: FamilyEvent): string {
  if (event.occurrenceDate) {
    return `${event.seriesId ?? event.id}:${event.occurrenceDate}`;
  }
  return event.id;
}

export function stripOccurrenceFields(
  input: NewFamilyEventInput,
): NewFamilyEventInput {
  return {
    title: input.title,
    startDate: input.startDate,
    startTime: input.startTime,
    endDate: input.endDate,
    endTime: input.endTime,
    assignedTo: input.assignedTo,
    category: input.category,
    location: input.location,
    locationName: input.locationName,
    locationAddress: input.locationAddress,
    locationLat: input.locationLat,
    locationLng: input.locationLng,
    locationPlaceId: input.locationPlaceId,
    notes: input.notes,
    reminderOffsetMinutes: input.reminderOffsetMinutes,
    recurrence: input.recurrence ?? null,
  };
}

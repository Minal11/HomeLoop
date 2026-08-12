import {
  ALL_DAY_REMINDER_LOCAL_TIME,
  REMINDER_OPTIONS,
  type ReminderOffsetMinutes,
} from "@/types/reminder";

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour === "24" ? "0" : lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

/**
 * Convert a civil local date/time in an IANA timezone to a UTC Date.
 * Iteratively adjusts so DST transitions are handled without a TZ library.
 */
export function zonedLocalDateTimeToUtc(
  dateIso: string,
  timeHm: string,
  timeZone: string,
): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = timeHm.split(":").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    throw new Error("Invalid date/time for reminder.");
  }

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let i = 0; i < 3; i += 1) {
    const parts = getZonedParts(new Date(utcMs), timeZone);
    const asIfUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    utcMs += desired - asIfUtc;
  }

  return new Date(utcMs);
}

export function formatReminderLabel(
  offsetMinutes: number | null | undefined,
): string | null {
  if (offsetMinutes == null) {
    return null;
  }

  const match = REMINDER_OPTIONS.find((option) => option.value === offsetMinutes);
  return match?.label ?? `${offsetMinutes} minutes before`;
}

export function formatReminderNotificationTitle(
  eventTitle: string,
  offsetMinutes: number,
): string {
  if (offsetMinutes === 0) {
    return eventTitle;
  }

  const label = formatReminderLabel(offsetMinutes)?.replace(/ before$/i, "") ?? "";
  if (!label) {
    return eventTitle;
  }
  return `${eventTitle} in ${label}`;
}

export function formatReminderNotificationBody(input: {
  startDate: string;
  startTime?: string | null;
  timeZone: string;
}): string {
  const hasStartTime = Boolean(input.startTime?.trim());
  const time =
    input.startTime?.trim()?.slice(0, 5) || ALL_DAY_REMINDER_LOCAL_TIME;
  const when = zonedLocalDateTimeToUtc(input.startDate, time, input.timeZone);

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: input.timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(when);

  if (!hasStartTime) {
    return `${dateLabel} · All day`;
  }

  const timeLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: input.timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(when);

  return `${dateLabel} at ${timeLabel}`;
}

/**
 * Compute UTC remind_at for an event in the family's IANA timezone.
 * All-day events (no start time) use 9:00 AM local family time.
 */
export function calculateRemindAtUtc(input: {
  startDate: string;
  startTime?: string | null;
  offsetMinutes: ReminderOffsetMinutes | number;
  timeZone: string;
}): Date {
  const localTime = input.startTime?.trim() || ALL_DAY_REMINDER_LOCAL_TIME;
  const eventUtc = zonedLocalDateTimeToUtc(
    input.startDate,
    localTime,
    input.timeZone,
  );
  return new Date(eventUtc.getTime() - input.offsetMinutes * 60_000);
}

export function isReminderOffsetMinutes(
  value: number,
): value is ReminderOffsetMinutes {
  return REMINDER_OPTIONS.some(
    (option) => option.value !== null && option.value === value,
  );
}

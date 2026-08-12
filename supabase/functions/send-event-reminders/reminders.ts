/**
 * Timezone helpers for the send-event-reminders Edge Function.
 * Keep in sync with `/utils/reminders.ts` (same algorithm / formatting).
 */

export const ALL_DAY_REMINDER_LOCAL_TIME = "09:00";

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

/** Convert a civil local date/time in an IANA timezone to a UTC Date. */
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

/** Notification body using family-local civil time (matches HomeLoop display). */
export function formatReminderNotificationBody(input: {
  startDate: string;
  startTime?: string | null;
  timeZone: string;
}): string {
  const hasStartTime = Boolean(input.startTime?.trim());
  const time = input.startTime?.trim()?.slice(0, 5) || ALL_DAY_REMINDER_LOCAL_TIME;
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

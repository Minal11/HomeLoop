import type { EventSection, EventSectionKey, FamilyEvent } from "@/types/event";

const SECTION_ORDER: EventSectionKey[] = [
  "today",
  "tomorrow",
  "thisWeek",
  "later",
];

const SECTION_LABELS: Record<EventSectionKey, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  thisWeek: "This Week",
  later: "Later",
};

/**
 * Parse a Postgres `date` / ISO date-only string (YYYY-MM-DD) as a local calendar day.
 * Avoid `new Date("YYYY-MM-DD")`, which is treated as UTC and can shift the day.
 */
export function parseDateOnly(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    throw new Error(`Invalid date-only value: ${isoDate}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}

/** Local calendar date as YYYY-MM-DD (never UTC-shifted). */
export function getLocalDateIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateKey(date: Date): string {
  return getLocalDateIso(date);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

/** End of the calendar week (Sunday), with Monday as the week start. */
function endOfWeek(date: Date): Date {
  const day = date.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  return addDays(date, daysUntilSunday);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function eventSortValue(event: FamilyEvent): number {
  const time = event.startTime ?? "00:00";
  return parseDateOnly(event.startDate).getTime() + timeToMinutes(time);
}

/** Local start instant for sorting (date-only events use start of day). */
function eventStartDateTime(event: FamilyEvent): Date {
  const day = parseDateOnly(event.startDate);
  if (!event.startTime) {
    return day;
  }

  const [hours, minutes] = event.startTime.split(":").map(Number);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours,
    minutes,
    0,
    0,
  );
}

function isEventUpcoming(event: FamilyEvent, now: Date): boolean {
  const eventDay = startOfDay(parseDateOnly(event.startDate));
  const today = startOfDay(now);

  if (eventDay.getTime() > today.getTime()) {
    return true;
  }

  if (eventDay.getTime() < today.getTime()) {
    return false;
  }

  // Same local calendar day: timed events must not have started yet;
  // date-only events remain eligible for the rest of the day.
  if (!event.startTime) {
    return true;
  }

  return eventStartDateTime(event).getTime() >= now.getTime();
}

export function sortEvents(events: FamilyEvent[]): FamilyEvent[] {
  return [...events].sort((a, b) => eventSortValue(a) - eventSortValue(b));
}

export function formatTime(time: string): string {
  const [hourPart, minutePart] = time.split(":");
  const hours = Number(hourPart);
  const minutes = Number(minutePart);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatEventDate(event: FamilyEvent): string {
  const start = parseDateOnly(event.startDate);
  const startLabel = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (!event.endDate || event.endDate === event.startDate) {
    return startLabel;
  }

  const end = parseDateOnly(event.endDate);
  const endLabel = end.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

export function formatEventWhen(event: FamilyEvent): string {
  const dateLabel = formatEventDate(event);
  if (!event.startTime) {
    return dateLabel;
  }
  return `${dateLabel} · ${formatTime(event.startTime)}`;
}

/**
 * Next upcoming event from the user's local now.
 * Past events (previous days, or earlier timed events today) are never Up Next.
 */
export function getNextEvent(
  events: FamilyEvent[],
  now: Date = new Date(),
): FamilyEvent | null {
  const upcoming = sortEvents(events).filter((event) =>
    isEventUpcoming(event, now),
  );
  return upcoming[0] ?? null;
}

function getSectionKey(event: FamilyEvent, today: Date): EventSectionKey {
  const todayStart = startOfDay(today);
  const tomorrow = addDays(todayStart, 1);
  const weekEnd = endOfWeek(todayStart);
  const eventDay = startOfDay(parseDateOnly(event.startDate));

  if (toDateKey(eventDay) === toDateKey(todayStart)) {
    return "today";
  }

  if (toDateKey(eventDay) === toDateKey(tomorrow)) {
    return "tomorrow";
  }

  if (
    eventDay.getTime() > tomorrow.getTime() &&
    eventDay.getTime() <= weekEnd.getTime()
  ) {
    return "thisWeek";
  }

  return "later";
}

/**
 * Group by relative day using the user's local calendar date.
 * Pass `now` only for tests; production should use the default.
 */
export function groupEventsByRelativeDay(
  events: FamilyEvent[],
  now: Date = new Date(),
): EventSection[] {
  const buckets: Record<EventSectionKey, FamilyEvent[]> = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  for (const event of sortEvents(events)) {
    buckets[getSectionKey(event, now)].push(event);
  }

  return SECTION_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    label: SECTION_LABELS[key],
    events: buckets[key],
  }));
}

type SearchablePerson = {
  displayName?: string;
};

type SearchableEvent = FamilyEvent & {
  /** Present when relational family-people assignment is loaded. */
  people?: SearchablePerson[];
};

function includesIgnoreCase(haystack: string | undefined | null, needle: string): boolean {
  if (!haystack) {
    return false;
  }
  return haystack.toLowerCase().includes(needle);
}

function collectPersonSearchText(event: SearchableEvent): string[] {
  const values: string[] = [];

  if (event.people && event.people.length > 0) {
    for (const person of event.people) {
      const name = person.displayName?.trim();
      if (name) {
        values.push(name);
      }
    }
  }

  const assigned = event.assignedTo?.trim();
  if (assigned) {
    values.push(assigned);
    for (const part of assigned.split(/\s*\+\s*/)) {
      const name = part.trim();
      if (name) {
        values.push(name);
      }
    }
  }

  return values;
}

/**
 * Client-side Home search over already-loaded events.
 * Case-insensitive; empty/whitespace query returns a sorted copy of all events.
 */
export function filterEvents(
  events: FamilyEvent[],
  query: string,
): FamilyEvent[] {
  const needle = query.trim().toLowerCase();
  const sorted = sortEvents(events);

  if (!needle) {
    return sorted;
  }

  return sorted.filter((event) => {
    const searchable = event as SearchableEvent;

    if (includesIgnoreCase(searchable.title, needle)) {
      return true;
    }
    if (includesIgnoreCase(searchable.category, needle)) {
      return true;
    }
    if (includesIgnoreCase(searchable.notes, needle)) {
      return true;
    }
    if (includesIgnoreCase(searchable.location, needle)) {
      return true;
    }
    if (includesIgnoreCase(searchable.locationName, needle)) {
      return true;
    }
    if (includesIgnoreCase(searchable.locationAddress, needle)) {
      return true;
    }

    return collectPersonSearchText(searchable).some((name) =>
      includesIgnoreCase(name, needle),
    );
  });
}

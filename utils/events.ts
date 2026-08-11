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

function parseDateOnly(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function eventSortValue(event: FamilyEvent): number {
  const time = event.startTime ?? "00:00";
  return parseDateOnly(event.startDate).getTime() + timeToMinutes(time);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
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
    month: "short",
    day: "numeric",
  });

  if (!event.endDate || event.endDate === event.startDate) {
    return startLabel;
  }

  const end = parseDateOnly(event.endDate);
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${startLabel}–${end.getDate()}`;
  }

  const endLabel = end.toLocaleDateString("en-US", {
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

export function getNextEvent(
  events: FamilyEvent[],
  todayIso: string,
): FamilyEvent | null {
  const today = startOfDay(parseDateOnly(todayIso));
  const upcoming = sortEvents(events).filter((event) => {
    return parseDateOnly(event.startDate).getTime() >= today.getTime();
  });
  return upcoming[0] ?? null;
}

function getSectionKey(event: FamilyEvent, todayIso: string): EventSectionKey {
  const today = startOfDay(parseDateOnly(todayIso));
  const tomorrow = addDays(today, 1);
  const weekEnd = endOfWeek(today);
  const eventDay = startOfDay(parseDateOnly(event.startDate));

  if (toDateKey(eventDay) === toDateKey(today)) {
    return "today";
  }

  if (toDateKey(eventDay) === toDateKey(tomorrow)) {
    return "tomorrow";
  }

  if (eventDay.getTime() > tomorrow.getTime() && eventDay.getTime() <= weekEnd.getTime()) {
    return "thisWeek";
  }

  return "later";
}

export function groupEventsByRelativeDay(
  events: FamilyEvent[],
  todayIso: string,
): EventSection[] {
  const buckets: Record<EventSectionKey, FamilyEvent[]> = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  for (const event of sortEvents(events)) {
    buckets[getSectionKey(event, todayIso)].push(event);
  }

  return SECTION_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    label: SECTION_LABELS[key],
    events: buckets[key],
  }));
}

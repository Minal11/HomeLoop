/**
 * Recurrence helpers for the send-event-reminders Edge Function.
 * Keep in sync with `/utils/recurrence.ts` (SKIP invalid monthly/yearly days).
 */

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

/** 0 = Sunday … 6 = Saturday (JS Date.getDay()). */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  /** Repeat every N units of frequency (>= 1). */
  interval: number;
  /** Required for weekly when specific days are selected. */
  weekdays?: WeekdayIndex[];
  /** Inclusive end date YYYY-MM-DD; null/undefined = never. */
  endDate?: string | null;
};

export function isRecurrenceFrequency(
  value: string,
): value is RecurrenceFrequency {
  return (
    value === "daily" ||
    value === "weekly" ||
    value === "monthly" ||
    value === "yearly"
  );
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!isValidCivilDate(year, month, day)) {
    return false;
  }
  return true;
}

export function isValidCivilDate(
  year: number,
  month: number,
  day: number,
): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  return day <= daysInMonth(year, month);
}

export function daysInMonth(year: number, month: number): number {
  // month: 1-12
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatDateOnly(
  year: number,
  month: number,
  day: number,
): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDateOnlyParts(iso: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** Civil-date arithmetic in UTC calendar space (no local TZ shift). */
export function addDaysToDateOnly(iso: string, days: number): string {
  const { year, month, day } = parseDateOnlyParts(iso);
  const utc = Date.UTC(year, month - 1, day + days);
  const next = new Date(utc);
  return formatDateOnly(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
  );
}

export function diffDaysDateOnly(fromIso: string, toIso: string): number {
  const from = parseDateOnlyParts(fromIso);
  const to = parseDateOnlyParts(toIso);
  const fromMs = Date.UTC(from.year, from.month - 1, from.day);
  const toMs = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toMs - fromMs) / 86_400_000);
}

export function weekdayIndexFromDateOnly(iso: string): WeekdayIndex {
  const { year, month, day } = parseDateOnlyParts(iso);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as WeekdayIndex;
}

export function normalizeRecurrenceRule(
  rule: RecurrenceRule | null | undefined,
): RecurrenceRule | null {
  if (!rule) {
    return null;
  }

  const interval = Math.max(1, Math.floor(Number(rule.interval) || 1));
  const endDate =
    rule.endDate && isValidDateOnly(rule.endDate) ? rule.endDate : null;

  let weekdays: WeekdayIndex[] | undefined;
  if (rule.frequency === "weekly") {
    const unique = Array.from(
      new Set(
        (rule.weekdays ?? []).filter(
          (day): day is WeekdayIndex =>
            Number.isInteger(day) && day >= 0 && day <= 6,
        ),
      ),
    ).sort((a, b) => a - b) as WeekdayIndex[];
    weekdays = unique.length > 0 ? unique : undefined;
  }

  return {
    frequency: rule.frequency,
    interval,
    weekdays,
    endDate,
  };
}

export function isRecurringRule(
  rule: RecurrenceRule | null | undefined,
): rule is RecurrenceRule {
  return Boolean(normalizeRecurrenceRule(rule));
}

/**
 * Expand recurrence occurrence dates in [rangeStart, rangeEnd] (inclusive).
 * Monthly / yearly invalid calendar days are SKIPPED (not clamped).
 */
export function expandRecurrenceDates(input: {
  seriesStartDate: string;
  rule: RecurrenceRule;
  rangeStart: string;
  rangeEnd: string;
  /** YYYY-MM-DD dates that should not appear (cancelled exceptions). */
  cancelledDates?: Iterable<string>;
}): string[] {
  const rule = normalizeRecurrenceRule(input.rule);
  if (!rule) {
    return [];
  }
  if (
    !isValidDateOnly(input.seriesStartDate) ||
    !isValidDateOnly(input.rangeStart) ||
    !isValidDateOnly(input.rangeEnd)
  ) {
    return [];
  }
  if (input.rangeEnd < input.rangeStart) {
    return [];
  }

  const cancelled = new Set(input.cancelledDates ?? []);
  const seriesEnd = rule.endDate;
  const hardEnd =
    seriesEnd && seriesEnd < input.rangeEnd ? seriesEnd : input.rangeEnd;
  const hardStart =
    input.seriesStartDate > input.rangeStart
      ? input.seriesStartDate
      : input.rangeStart;

  if (hardEnd < hardStart) {
    return [];
  }

  const dates: string[] = [];

  if (rule.frequency === "daily") {
    let cursor = input.seriesStartDate;
    if (cursor < hardStart) {
      const delta = diffDaysDateOnly(input.seriesStartDate, hardStart);
      const steps = Math.ceil(delta / rule.interval);
      cursor = addDaysToDateOnly(input.seriesStartDate, steps * rule.interval);
    }
    while (cursor <= hardEnd) {
      if (cursor >= hardStart && !cancelled.has(cursor)) {
        dates.push(cursor);
      }
      cursor = addDaysToDateOnly(cursor, rule.interval);
    }
    return dates;
  }

  if (rule.frequency === "weekly") {
    const weekdays =
      rule.weekdays && rule.weekdays.length > 0
        ? rule.weekdays
        : [weekdayIndexFromDateOnly(input.seriesStartDate)];

    let cursor = hardStart;
    while (cursor <= hardEnd) {
      const weekday = weekdayIndexFromDateOnly(cursor);
      if (weekdays.includes(weekday) && cursor >= input.seriesStartDate) {
        const dayDelta = diffDaysDateOnly(input.seriesStartDate, cursor);
        const weekIndex = Math.floor(dayDelta / 7);
        if (weekIndex % rule.interval === 0 && !cancelled.has(cursor)) {
          dates.push(cursor);
        }
      }
      cursor = addDaysToDateOnly(cursor, 1);
    }
    return dates;
  }

  if (rule.frequency === "monthly") {
    const start = parseDateOnlyParts(input.seriesStartDate);
    const targetDay = start.day;
    let year = start.year;
    let month = start.month;
    let safety = 0;

    while (safety < 2400) {
      safety += 1;
      const isoCandidate = isValidCivilDate(year, month, targetDay)
        ? formatDateOnly(year, month, targetDay)
        : null;

      if (isoCandidate) {
        if (isoCandidate > hardEnd) {
          break;
        }
        if (
          isoCandidate >= hardStart &&
          isoCandidate >= input.seriesStartDate &&
          !cancelled.has(isoCandidate)
        ) {
          dates.push(isoCandidate);
        }
      } else {
        // Invalid day for this month (e.g. Jan 31 → February): SKIP.
        const probe = formatDateOnly(year, month, 1);
        if (probe > hardEnd) {
          break;
        }
      }

      month += rule.interval;
      while (month > 12) {
        month -= 12;
        year += 1;
      }
    }
    return dates;
  }

  // yearly — SKIP non-leap Feb 29
  const start = parseDateOnlyParts(input.seriesStartDate);
  let year = start.year;
  let safety = 0;
  while (safety < 400) {
    safety += 1;
    const isoCandidate = isValidCivilDate(year, start.month, start.day)
      ? formatDateOnly(year, start.month, start.day)
      : null;

    if (isoCandidate) {
      if (isoCandidate > hardEnd) {
        break;
      }
      if (
        isoCandidate >= hardStart &&
        isoCandidate >= input.seriesStartDate &&
        !cancelled.has(isoCandidate)
      ) {
        dates.push(isoCandidate);
      }
    } else if (year > parseDateOnlyParts(hardEnd).year) {
      break;
    }

    year += rule.interval;
  }
  return dates;
}

/** Next occurrence on or after fromDate (inclusive), or null if none. */
export function getNextOccurrenceDate(input: {
  seriesStartDate: string;
  rule: RecurrenceRule;
  fromDate: string;
  cancelledDates?: Iterable<string>;
}): string | null {
  const rule = normalizeRecurrenceRule(input.rule);
  if (!rule) {
    return null;
  }

  const searchEnd =
    rule.endDate && rule.endDate < addDaysToDateOnly(input.fromDate, 3660)
      ? rule.endDate
      : addDaysToDateOnly(input.fromDate, 3660);

  const dates = expandRecurrenceDates({
    seriesStartDate: input.seriesStartDate,
    rule,
    rangeStart: input.fromDate,
    rangeEnd: searchEnd,
    cancelledDates: input.cancelledDates,
  });

  return dates[0] ?? null;
}

export function recurrenceRuleFromEventColumns(input: {
  recurrence_frequency?: string | null;
  recurrence_interval?: number | null;
  recurrence_weekdays?: number[] | null;
  recurrence_end_date?: string | null;
}): RecurrenceRule | null {
  const frequency = input.recurrence_frequency?.trim();
  if (!frequency || !isRecurrenceFrequency(frequency)) {
    return null;
  }

  const weekdays = Array.isArray(input.recurrence_weekdays)
    ? (input.recurrence_weekdays.filter(
        (day): day is WeekdayIndex =>
          Number.isInteger(day) && day >= 0 && day <= 6,
      ) as WeekdayIndex[])
    : undefined;

  return normalizeRecurrenceRule({
    frequency,
    interval: input.recurrence_interval ?? 1,
    weekdays,
    endDate: input.recurrence_end_date ?? null,
  });
}

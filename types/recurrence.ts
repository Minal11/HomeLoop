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

export type EventExceptionType = "cancelled" | "modified";

export type EventExceptionRow = {
  id: string;
  series_event_id: string;
  occurrence_date: string;
  exception_type: EventExceptionType;
  override_event_id: string | null;
  created_at: string;
};

export type EventException = {
  id: string;
  seriesEventId: string;
  occurrenceDate: string;
  exceptionType: EventExceptionType;
  overrideEventId: string | null;
};

export type RecurrenceEditScope = "this" | "future" | "all";
export type RecurrenceDeleteScope = "this" | "future" | "all";

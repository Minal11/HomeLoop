export const EVENT_CATEGORIES = [
  "Appointment",
  "Birthday",
  "Social",
  "Work",
  "School / Daycare",
  "Workshop",
  "Religious / Pooja",
  "Travel",
  "Other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** Lightweight person stamp embedded on events for display. */
export type EventPersonSummary = {
  id: string;
  displayName: string;
};

export type FamilyEvent = {
  id: string;
  title: string;
  /** ISO date string: YYYY-MM-DD */
  startDate: string;
  /** 24-hour time string: HH:mm */
  startTime?: string;
  /** ISO date string: YYYY-MM-DD */
  endDate?: string;
  /** 24-hour time string: HH:mm */
  endTime?: string;
  /** True when the event involves the whole family. */
  appliesToAll: boolean;
  /** Assigned schedulable people (empty when appliesToAll). */
  people: EventPersonSummary[];
  category: EventCategory;
  location?: string;
  notes?: string;
};

/** Event fields used when creating/updating an event (before an id is assigned). */
export type NewFamilyEventInput = {
  title: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  appliesToAll: boolean;
  personIds: string[];
  category: EventCategory;
  location?: string;
  notes?: string;
};

/** Database row shape for the Supabase `events` table (snake_case). */
export type EventRow = {
  id: string;
  title: string;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  /** Legacy text assignment — kept for migration/backfill. */
  assigned_to: string;
  /** Present after Step 11 migration; may be missing on legacy rows. */
  applies_to_all?: boolean;
  category: string;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  family_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EventSectionKey = "today" | "tomorrow" | "thisWeek" | "later";

export type EventSection = {
  key: EventSectionKey;
  label: string;
  events: FamilyEvent[];
};

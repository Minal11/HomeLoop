export const FAMILY_MEMBERS = ["Minal", "Ankush", "Ziva", "Family"] as const;

export type FamilyMember = (typeof FAMILY_MEMBERS)[number];

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

/** Structured place payload when a Places suggestion is chosen. */
export type EventLocationDetails = {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
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
  /**
   * Who the event is for.
   * Usually a FamilyMember value; may also be a multi-person label
   * such as "Ankush + Minal" from earlier multi-assign writes.
   */
  assignedTo: string;
  category: EventCategory;
  /** Display / legacy location text (manual or place name). */
  location?: string;
  locationName?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  locationPlaceId?: string;
  notes?: string;
  /** Minutes before start; null/undefined means no reminder. */
  reminderOffsetMinutes?: number | null;
};

/** Event fields used when creating a new event (before an id is assigned). */
export type NewFamilyEventInput = Omit<FamilyEvent, "id">;

/** Database row shape for the Supabase `events` table (snake_case). */
export type EventRow = {
  id: string;
  title: string;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  assigned_to: string;
  category: string;
  location: string | null;
  location_name?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_place_id?: string | null;
  notes: string | null;
  /** Who created the event (auth.users). */
  created_by: string | null;
  /** Family that owns / shares this event. */
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

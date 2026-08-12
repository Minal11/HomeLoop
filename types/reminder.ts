/** Minutes before event start. null = no reminder. 0 = at event time. */
export type ReminderOffsetMinutes =
  | 0
  | 10
  | 30
  | 60
  | 120
  | 1440
  | 2880
  | 10080;

export type ReminderOption = {
  value: ReminderOffsetMinutes | null;
  label: string;
};

export const REMINDER_OPTIONS: ReminderOption[] = [
  { value: null, label: "No reminder" },
  { value: 0, label: "At time of event" },
  { value: 10, label: "10 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 1440, label: "1 day before" },
  { value: 2880, label: "2 days before" },
  { value: 10080, label: "1 week before" },
];

/** All-day events (no start time) use 9:00 AM in the family timezone. */
export const ALL_DAY_REMINDER_LOCAL_TIME = "09:00";

export type EventReminderRow = {
  id: string;
  event_id: string;
  offset_minutes: number;
  remind_at: string;
  sent_at: string | null;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

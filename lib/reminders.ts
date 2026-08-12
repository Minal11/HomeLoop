import { getSupabaseClient } from "@/lib/supabase/client";
import type { ReminderOffsetMinutes } from "@/types/reminder";
import { calculateRemindAtUtc, isReminderOffsetMinutes } from "@/utils/reminders";

export async function getEventReminderOffsetMinutes(
  eventId: string,
): Promise<number | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("event_reminders")
    .select("offset_minutes")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    // Table may not exist yet before migration — treat as no reminder.
    const message = `${error.message ?? ""}`.toLowerCase();
    if (
      message.includes("event_reminders") ||
      message.includes("does not exist") ||
      message.includes("could not find")
    ) {
      return null;
    }
    console.error("Failed to load event reminder:", error);
    throw new Error("Unable to load reminder.");
  }

  if (!data || typeof data.offset_minutes !== "number") {
    return null;
  }

  return data.offset_minutes;
}

export async function syncEventReminder(input: {
  eventId: string;
  startDate: string;
  startTime?: string | null;
  timeZone: string;
  offsetMinutes: number | null;
}): Promise<void> {
  const supabase = getSupabaseClient();

  if (input.offsetMinutes == null) {
    const { error } = await supabase
      .from("event_reminders")
      .delete()
      .eq("event_id", input.eventId);

    if (error) {
      const message = `${error.message ?? ""}`.toLowerCase();
      if (
        message.includes("event_reminders") ||
        message.includes("does not exist") ||
        message.includes("could not find")
      ) {
        return;
      }
      console.error("Failed to clear event reminder:", error);
      throw new Error("Unable to update reminder.");
    }
    return;
  }

  if (!isReminderOffsetMinutes(input.offsetMinutes)) {
    throw new Error("Please choose a valid reminder.");
  }

  const offsetMinutes = input.offsetMinutes as ReminderOffsetMinutes;
  const remindAt = calculateRemindAtUtc({
    startDate: input.startDate,
    startTime: input.startTime,
    offsetMinutes,
    timeZone: input.timeZone,
  });

  const { error } = await supabase.from("event_reminders").upsert(
    {
      event_id: input.eventId,
      offset_minutes: offsetMinutes,
      remind_at: remindAt.toISOString(),
      sent_at: null,
    },
    { onConflict: "event_id" },
  );

  if (error) {
    console.error("Failed to save event reminder:", error);
    throw new Error("Unable to save reminder.");
  }
}

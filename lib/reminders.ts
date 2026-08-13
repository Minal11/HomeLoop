import { getSupabaseClient } from "@/lib/supabase/client";
import { listEventExceptions } from "@/lib/event-exceptions";
import type { RecurrenceRule } from "@/types/recurrence";
import type { ReminderOffsetMinutes } from "@/types/reminder";
import {
  calculateRemindAtUtc,
  isReminderOffsetMinutes,
} from "@/utils/reminders";
import {
  addDaysToDateOnly,
  getNextOccurrenceDate,
  isRecurringRule,
  normalizeRecurrenceRule,
} from "@/utils/recurrence";

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

async function skippedDatesForSeries(seriesEventId: string): Promise<string[]> {
  try {
    const exceptions = await listEventExceptions([seriesEventId]);
    return exceptions.map((item) => item.occurrenceDate);
  } catch {
    return [];
  }
}

export async function syncEventReminder(input: {
  eventId: string;
  startDate: string;
  startTime?: string | null;
  timeZone: string;
  offsetMinutes: number | null;
  recurrence?: RecurrenceRule | null;
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
  const recurrence = normalizeRecurrenceRule(input.recurrence ?? null);

  let remindAt: Date;

  if (isRecurringRule(recurrence)) {
    const skipped = await skippedDatesForSeries(input.eventId);
    const todayIso = new Intl.DateTimeFormat("en-CA", {
      timeZone: input.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    let cursor = todayIso < input.startDate ? input.startDate : todayIso;
    let chosenRemindAt: Date | null = null;

    for (let attempt = 0; attempt < 400; attempt += 1) {
      const next = getNextOccurrenceDate({
        seriesStartDate: input.startDate,
        rule: recurrence,
        fromDate: cursor,
        cancelledDates: skipped,
      });
      if (!next) {
        break;
      }
      const candidateRemindAt = calculateRemindAtUtc({
        startDate: next,
        startTime: input.startTime,
        offsetMinutes,
        timeZone: input.timeZone,
      });
      if (candidateRemindAt.getTime() >= Date.now() - 60_000) {
        chosenRemindAt = candidateRemindAt;
        break;
      }
      cursor = addDaysToDateOnly(next, 1);
    }

    if (!chosenRemindAt) {
      await supabase.from("event_reminders").delete().eq("event_id", input.eventId);
      return;
    }
    remindAt = chosenRemindAt;
  } else {
    remindAt = calculateRemindAtUtc({
      startDate: input.startDate,
      startTime: input.startTime,
      offsetMinutes,
      timeZone: input.timeZone,
    });
  }

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

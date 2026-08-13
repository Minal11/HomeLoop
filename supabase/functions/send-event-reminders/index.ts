// HomeLoop Edge Function: send due event reminders via Web Push.
// Deploy with Supabase CLI and schedule every 5 minutes.
// Secrets required:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT  (mailto:you@example.com)
//   CRON_SECRET    (required Authorization: Bearer <CRON_SECRET>)

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

import {
  addDaysToDateOnly,
  getNextOccurrenceDate,
  isRecurringRule,
  recurrenceRuleFromEventColumns,
  type RecurrenceRule,
} from "./recurrence.ts";
import {
  calculateRemindAtUtc,
  formatReminderNotificationBody,
  occurrenceDateFromRemindAt,
} from "./reminders.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ReminderRow = {
  id: string;
  event_id: string;
  offset_minutes: number;
  remind_at: string;
  last_reminded_occurrence_date?: string | null;
};

type EventRow = {
  id: string;
  title: string;
  start_date: string;
  start_time: string | null;
  family_id: string | null;
  recurrence_frequency?: string | null;
  recurrence_interval?: number | null;
  recurrence_weekdays?: number[] | null;
  recurrence_end_date?: string | null;
};

type FamilyRow = {
  id: string;
  timezone: string | null;
};

type MemberRow = {
  user_id: string;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const EVENT_SELECT_WITH_RECURRENCE =
  "id, title, start_date, start_time, family_id, recurrence_frequency, recurrence_interval, recurrence_weekdays, recurrence_end_date";
const EVENT_SELECT_BASIC = "id, title, start_date, start_time, family_id";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function authorizeCronRequest(request: Request): Response | null {
  const expected = Deno.env.get("CRON_SECRET")?.trim();
  if (!expected) {
    console.error("CRON_SECRET is not configured.");
    return jsonResponse(
      { ok: false, error: "Server misconfigured: missing CRON_SECRET." },
      500,
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const provided = match?.[1]?.trim() ?? "";

  if (!provided || provided !== expected) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  return null;
}

function reminderPhrase(offsetMinutes: number): string {
  switch (offsetMinutes) {
    case 0:
      return "";
    case 10:
      return " in 10 minutes";
    case 30:
      return " in 30 minutes";
    case 60:
      return " in 1 hour";
    case 120:
      return " in 2 hours";
    case 1440:
      return " in 1 day";
    case 2880:
      return " in 2 days";
    case 10080:
      return " in 1 week";
    default:
      return ` in ${offsetMinutes} minutes`;
  }
}

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const message = `${
    "message" in error ? (error as { message?: string }).message : ""
  } ${"details" in error ? (error as { details?: string }).details : ""}`
    .toLowerCase();
  return (
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache") ||
    message.includes("column")
  );
}

async function loadEvent(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ event: EventRow | null; error: unknown }> {
  const withRecurrence = await supabase
    .from("events")
    .select(EVENT_SELECT_WITH_RECURRENCE)
    .eq("id", eventId)
    .maybeSingle();

  if (!withRecurrence.error) {
    return { event: (withRecurrence.data as EventRow | null) ?? null, error: null };
  }

  if (isMissingColumnError(withRecurrence.error)) {
    const basic = await supabase
      .from("events")
      .select(EVENT_SELECT_BASIC)
      .eq("id", eventId)
      .maybeSingle();
    return {
      event: (basic.data as EventRow | null) ?? null,
      error: basic.error,
    };
  }

  return { event: null, error: withRecurrence.error };
}

async function loadSkippedOccurrenceDates(
  supabase: SupabaseClient,
  seriesEventId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("event_exceptions")
    .select("occurrence_date, exception_type")
    .eq("series_event_id", seriesEventId);

  if (error) {
    if (isMissingColumnError(error)) {
      return [];
    }
    console.error("Failed to load event exceptions:", error);
    return [];
  }

  return ((data ?? []) as Array<{ occurrence_date: string }>)
    .map((row) => row.occurrence_date)
    .filter(Boolean);
}

async function markReminderSent(
  supabase: SupabaseClient,
  reminderId: string,
  sentAt: string,
): Promise<void> {
  await supabase
    .from("event_reminders")
    .update({ sent_at: sentAt })
    .eq("id", reminderId)
    .is("sent_at", null);
}

async function completeReminderAfterDelivery(input: {
  supabase: SupabaseClient;
  reminder: ReminderRow;
  event: EventRow;
  recurrence: RecurrenceRule | null;
  occurrenceDate: string;
  timeZone: string;
  nowIso: string;
}): Promise<void> {
  const { supabase, reminder, event, recurrence, occurrenceDate, timeZone, nowIso } =
    input;

  if (!isRecurringRule(recurrence)) {
    await markReminderSent(supabase, reminder.id, nowIso);
    return;
  }

  const skipped = await loadSkippedOccurrenceDates(supabase, event.id);
  const nextOccurrence = getNextOccurrenceDate({
    seriesStartDate: event.start_date,
    rule: recurrence,
    fromDate: addDaysToDateOnly(occurrenceDate, 1),
    cancelledDates: skipped,
  });

  if (!nextOccurrence) {
    const terminalUpdate: Record<string, unknown> = {
      sent_at: nowIso,
      last_reminded_occurrence_date: occurrenceDate,
    };
    const { error } = await supabase
      .from("event_reminders")
      .update(terminalUpdate)
      .eq("id", reminder.id)
      .is("sent_at", null);

    if (error && isMissingColumnError(error)) {
      await markReminderSent(supabase, reminder.id, nowIso);
    }
    return;
  }

  const nextRemindAt = calculateRemindAtUtc({
    startDate: nextOccurrence,
    startTime: event.start_time,
    offsetMinutes: reminder.offset_minutes,
    timeZone,
  });

  const advanceUpdate: Record<string, unknown> = {
    sent_at: null,
    remind_at: nextRemindAt.toISOString(),
    last_reminded_occurrence_date: occurrenceDate,
  };

  const { error } = await supabase
    .from("event_reminders")
    .update(advanceUpdate)
    .eq("id", reminder.id);

  if (error && isMissingColumnError(error)) {
    // Column missing — fall back to one-time completion.
    await markReminderSent(supabase, reminder.id, nowIso);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject =
      Deno.env.get("VAPID_SUBJECT") || "mailto:homeloop@example.com";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    }
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY.");
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const nowIso = new Date().toISOString();
    const { data: dueReminders, error: dueError } = await supabase
      .from("event_reminders")
      .select("id, event_id, offset_minutes, remind_at, last_reminded_occurrence_date")
      .is("sent_at", null)
      .lte("remind_at", nowIso)
      .order("remind_at", { ascending: true })
      .limit(50);

    let reminders: ReminderRow[];
    if (dueError && isMissingColumnError(dueError)) {
      const fallback = await supabase
        .from("event_reminders")
        .select("id, event_id, offset_minutes, remind_at")
        .is("sent_at", null)
        .lte("remind_at", nowIso)
        .order("remind_at", { ascending: true })
        .limit(50);
      if (fallback.error) {
        throw fallback.error;
      }
      reminders = (fallback.data ?? []) as ReminderRow[];
    } else if (dueError) {
      throw dueError;
    } else {
      reminders = (dueReminders ?? []) as ReminderRow[];
    }

    let sentCount = 0;
    let removedSubs = 0;
    let deferredCount = 0;

    for (const reminder of reminders) {
      const { event: eventData, error: eventError } = await loadEvent(
        supabase,
        reminder.event_id,
      );

      if (eventError || !eventData?.family_id) {
        console.error(
          "Skipping reminder; event missing:",
          reminder.id,
          eventError,
        );
        // Event gone / unreadable — mark sent so we do not retry forever.
        await markReminderSent(supabase, reminder.id, nowIso);
        continue;
      }

      const event = eventData;
      const recurrence = recurrenceRuleFromEventColumns(event);

      const { data: familyData } = await supabase
        .from("families")
        .select("id, timezone")
        .eq("id", event.family_id)
        .maybeSingle();

      const family = familyData as FamilyRow | null;
      const timeZone = family?.timezone || "America/Chicago";

      const occurrenceDate = isRecurringRule(recurrence)
        ? occurrenceDateFromRemindAt({
          remindAt: reminder.remind_at,
          offsetMinutes: reminder.offset_minutes,
          timeZone,
        })
        : event.start_date;

      const { data: members, error: membersError } = await supabase
        .from("family_members")
        .select("user_id")
        .eq("family_id", event.family_id);

      if (membersError) {
        console.error("Failed to load members:", membersError);
        deferredCount += 1;
        continue;
      }

      const userIds = ((members ?? []) as MemberRow[]).map((row) => row.user_id);
      if (userIds.length === 0) {
        await markReminderSent(supabase, reminder.id, nowIso);
        continue;
      }

      const { data: subscriptions, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth")
        .in("user_id", userIds);

      if (subsError) {
        console.error("Failed to load subscriptions:", subsError);
        deferredCount += 1;
        continue;
      }

      const subs = (subscriptions ?? []) as SubscriptionRow[];
      if (subs.length === 0) {
        // Nobody subscribed — complete the reminder so it is not retried forever.
        await markReminderSent(supabase, reminder.id, nowIso);
        continue;
      }

      const title = `${event.title}${reminderPhrase(reminder.offset_minutes)}`;
      const body = formatReminderNotificationBody({
        startDate: occurrenceDate,
        startTime: event.start_time,
        timeZone,
      });
      const url = isRecurringRule(recurrence)
        ? `/events/${event.id}?on=${occurrenceDate}`
        : `/events/${event.id}`;
      const payload = JSON.stringify({
        title,
        body,
        eventId: event.id,
        url,
      });

      let successCount = 0;
      let transientFailureCount = 0;

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
          );
          successCount += 1;
          sentCount += 1;
        } catch (pushError) {
          const statusCode =
            pushError &&
            typeof pushError === "object" &&
            "statusCode" in pushError
              ? Number((pushError as { statusCode?: number }).statusCode)
              : 0;

          console.error("Push failed:", sub.endpoint, pushError);

          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            removedSubs += 1;
          } else {
            transientFailureCount += 1;
          }
        }
      }

      // Mark complete only when at least one push succeeded, or every failure was
      // a gone/expired subscription (nothing left to deliver). Temporary errors
      // leave sent_at null so the next cron can retry.
      if (successCount > 0 || transientFailureCount === 0) {
        await completeReminderAfterDelivery({
          supabase,
          reminder,
          event,
          recurrence,
          occurrenceDate,
          timeZone,
          nowIso: new Date().toISOString(),
        });
      } else {
        deferredCount += 1;
        console.warn(
          "Deferring reminder due to temporary push failures:",
          reminder.id,
        );
      }
    }

    return jsonResponse({
      ok: true,
      processed: reminders.length,
      notificationsAttempted: sentCount,
      removedSubscriptions: removedSubs,
      deferred: deferredCount,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

# send-event-reminders

Supabase Edge Function that sends due HomeLoop event reminders via Web Push.

## Required secrets

Set in Supabase → Edge Functions → Secrets (or CLI):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY` (same public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`)
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (example: `mailto:you@example.com`)
- `CRON_SECRET` (long random string; **not** a `NEXT_PUBLIC_*` value)

## Authorization

The function is deployed with `--no-verify-jwt` for Cron, but every non-OPTIONS
request must include:

```http
Authorization: Bearer <CRON_SECRET>
```

Requests without a matching bearer token receive `401 Unauthorized`.

## Deploy (Dashboard)

Create Edge Function `send-event-reminders` with these files only:

- `index.ts`
- `reminders.ts`
- `recurrence.ts`

No `_shared` folder is required. Disable JWT verification if Cron will invoke the
function (same as CLI `--no-verify-jwt`).

## Deploy (CLI)

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy send-event-reminders --no-verify-jwt
```

## Cron

In Supabase Dashboard → Edge Functions → Schedules (or Database → Cron):

- Function: `send-event-reminders`
- Schedule: every 5 minutes (`*/5 * * * *`)
- Header: `Authorization: Bearer <CRON_SECRET>`

## Notes

- Notification body times use the same family-timezone conversion as `/utils/reminders.ts`
  (local copy lives in `reminders.ts` next to `index.ts`).
- Recurrence expansion helpers live in `recurrence.ts` (copied from `/utils/recurrence.ts`;
  invalid monthly/yearly days are skipped, not clamped).
- One-time events: `sent_at` is set after successful delivery (or when nothing is left
  to deliver). Temporary push failures leave `sent_at` null so Cron can retry.
- Recurring series: after successful delivery, advance `remind_at` to the next
  occurrence, set `last_reminded_occurrence_date`, and keep `sent_at` null. If there
  is no next occurrence (end date / exceptions), set `sent_at`.
- Notification URL includes `?on=YYYY-MM-DD` for recurring occurrences.

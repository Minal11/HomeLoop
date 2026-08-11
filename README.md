# HomeLoop

A shared family hub for keeping everyone in the loop with upcoming events, appointments, and plans.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Setup

HomeLoop stores events in a Supabase PostgreSQL database.

1. Create a project at [https://supabase.com](https://supabase.com).
2. Open **SQL Editor** in the Supabase dashboard.
3. Run the schema SQL from `supabase/schema.sql`.
4. Optionally run the sample data SQL from `supabase/seed.sql`.
5. Open **Project Settings → API**.
6. Copy the **Project URL**.
7. Copy the **Publishable** API key.
8. Create a local `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

9. Restart the Next.js development server (`npm run dev`) so the new environment variables load.

### Older temporary RLS (Steps 4–5)

Early steps used temporary anonymous SELECT/INSERT/UPDATE/DELETE policies for development.

**Step 6 replaces those** with authenticated ownership policies. After auth setup, anonymous clients must have no event access.

## Authentication Setup

HomeLoop uses Supabase Auth (email + password) with `@supabase/ssr` cookie sessions.

### 1. Configure Email Auth in Supabase

1. Open **Authentication → Providers → Email**.
2. Enable Email provider.
3. For local development, you may disable **Confirm email** so sign-up signs you in immediately.
4. If Confirm email is enabled, new users must confirm before signing in.

### 2. Run ownership migration

In the SQL Editor, run:

`supabase/migrations/003_add_auth_and_event_ownership.sql`

This:

- adds nullable `events.created_by`
- drops temporary anonymous policies
- adds authenticated ownership policies (SELECT/INSERT/UPDATE/DELETE)

### 3. Create the first HomeLoop account

1. Start the app: `npm run dev`
2. Open `/login`
3. Enter email + password
4. Click **Create Account**
5. If email confirmation is required, confirm from the email, then **Sign In**

### 4. Find that user’s UUID

1. Open Supabase → **Authentication → Users**
2. Click your user
3. Copy the **User UID**

### 5. Assign existing events to that user

In SQL Editor (replace the placeholder):

```sql
update public.events
set created_by = 'YOUR_USER_UUID'
where created_by is null;
```

Verify:

```sql
select id, title, created_by
from public.events
order by start_date;
```

Every row should have a `created_by` value.

### 6. Make `created_by` required

After backfill succeeds, run:

`supabase/migrations/004_created_by_not_null.sql`

### 7. Verify RLS

While signed out / using only the publishable key without a user session, event reads should return no rows.

While signed in as your user, you should only see events you own.

### 8. Test sign-in / sign-out

1. Visit `/` while logged out → redirect to `/login`
2. Sign in → `/`
3. Refresh → still signed in
4. Add / edit / delete an event
5. Click **Sign Out** → `/login`
6. Protected routes redirect to `/login` again

### 9. Password reset (Forgot Password)

#### Supabase URL configuration

Open **Authentication → URL Configuration**.

**Local development**

1. Keep localhost redirect URLs listed (see Production Deployment for the full list).
2. While developing locally you may temporarily set **Site URL** to `http://localhost:3000`.

**Production**

After Vercel deploy, set **Site URL** to your production HTTPS origin and add matching production redirect URLs (documented under **Production Deployment** below). Keep the localhost entries so local reset still works.

#### App env

`.env.local` (local only):

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

On Vercel Production, set `NEXT_PUBLIC_SITE_URL` to the production HTTPS URL. Forgot Password also uses the browser origin when available, so recovery links stay on the current domain.

#### Flow

1. On `/login`, click **Forgot password?**
2. Enter email → **Send Reset Link**
3. Open the email link
4. HomeLoop opens `/reset-password` after `/auth/confirm` exchanges the recovery session
5. Enter + confirm a new password → **Update Password**
6. Continue to HomeLoop (or sign in with the new password)

Optional: If you customize the Supabase recovery email template for PKCE, use a link shaped like:

`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

### Install HomeLoop as a PWA

HomeLoop is installable as a Progressive Web App (standalone display, app icons, theme color). No push notifications or offline event sync in this step.

#### iPhone

1. Open HomeLoop in **Safari**
2. Tap **Share**
3. Tap **Add to Home Screen**
4. Confirm **Add**

#### Android

1. Open HomeLoop in **Chrome**
2. Use the browser menu → **Install app** / **Add to Home Screen**
3. Confirm install

Installed HomeLoop opens at `/` in standalone mode. Sign-in cookies continue to work the same as in the browser.

### Production Deployment

Deploy HomeLoop from this GitHub repository to Vercel. Keep using the existing Supabase project (do not create Vercel Postgres).

1. Open [Vercel](https://vercel.com) → **Add New… → Project**.
2. Import the existing **HomeLoop** GitHub repository (`Minal11/HomeLoop`).
3. Framework Preset: **Next.js**. Root Directory: repository root (`.`).
4. Before the first deploy, open **Environment Variables** and add (from your local `.env.local` values — do not commit them):

   | Name | Environments |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Development |
   | `NEXT_PUBLIC_SITE_URL` | Production (set to the Vercel production URL after first deploy if needed) |

   Local Development in Vercel can use `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Preview can use the preview deployment URL or omit it (the browser origin is used for password-reset redirects).

5. Click **Deploy** and wait for the build to succeed.
6. Copy the production URL (for example `https://homeloop-xxxx.vercel.app`).
7. In Vercel → Project → **Settings → Environment Variables**, set Production `NEXT_PUBLIC_SITE_URL` to that exact HTTPS URL (no trailing slash), then **Redeploy**.
8. In Supabase → **Authentication → URL Configuration**:
   - **Site URL** (production): `https://YOUR-PRODUCTION-HOST`
   - **Redirect URLs** (keep localhost for local dev; add production):
     - `http://localhost:3000/**`
     - `http://localhost:3000/auth/confirm`
     - `http://localhost:3000/auth/confirm?**`
     - `http://localhost:3000/reset-password`
     - `http://localhost:3000/reset-password?**`
     - `https://YOUR-PRODUCTION-HOST/**`
     - `https://YOUR-PRODUCTION-HOST/auth/confirm`
     - `https://YOUR-PRODUCTION-HOST/auth/confirm?**`
     - `https://YOUR-PRODUCTION-HOST/reset-password`
     - `https://YOUR-PRODUCTION-HOST/reset-password?**`
9. Test production: login, sign up, CRUD, sign out, forgot/reset password, and PWA assets (`/manifest.webmanifest`, `/sw.js`, `/icons/*`).
10. After production auth works, install HomeLoop from Safari (Step 9).

Do not put service-role keys in Vercel. Use only the publishable Supabase key.

### Family Sharing Setup

HomeLoop events belong to a **family**. Membership (not `created_by`) controls who can see and manage shared events. `created_by` still records who created each event.

#### 1. Run schema migrations first

In Supabase SQL Editor, run:

1. `supabase/migrations/005_create_families.sql`
2. `supabase/migrations/006_add_event_family_id.sql`

Do **not** run the RLS migration (`007`) until existing events are backfilled (next section).  
Do **not** run `008_events_family_id_not_null.sql` until every event has a `family_id`.

#### 2. Migrate existing events (example: Minal’s account)

Replace placeholders — never commit real UUIDs.

```sql
-- A. Your user UUID from Authentication → Users
-- B. Create family + owner membership
insert into public.families (name, created_by, invite_code)
values (
  'Kondawar-Agrekar Family',
  'YOUR_USER_UUID',
  public.generate_family_invite_code()
)
returning id, invite_code;

insert into public.family_members (family_id, user_id, role)
values ('YOUR_FAMILY_ID', 'YOUR_USER_UUID', 'owner');

insert into public.profiles (id, display_name)
values ('YOUR_USER_UUID', 'Minal')
on conflict (id) do update set display_name = excluded.display_name;

-- C. Attach existing events
update public.events
set family_id = 'YOUR_FAMILY_ID'
where created_by = 'YOUR_USER_UUID'
  and family_id is null;

-- D. Verify every event has a family_id
select id, title, created_by, family_id
from public.events
order by start_date;
```

#### 3. Enable family RLS + NOT NULL

After backfill succeeds:

1. Run `supabase/migrations/007_family_rls.sql`
2. Run `supabase/migrations/008_events_family_id_not_null.sql`

#### 4. Create family in the app (new users)

Signed-in users with no membership see **Create Family** / **Join Family** instead of events.

#### 5. Invite / join

1. Owner opens **Family** (`/family`)
2. Copy the **invite code**
3. Second person creates their own HomeLoop account
4. They open **Join Family** and enter the code
5. They are added as `member` and see shared events immediately

Owners can regenerate the invite code. Join is enforced by the `join_family_by_invite_code` Postgres function (not a client-trusted `family_id`).

#### 6. How RLS protects data

- Events are visible/editable/deletable only if `is_family_member(family_id)`
- Inserts require `created_by = auth.uid()` and membership in that family
- Anonymous users have no access
- Users cannot add themselves to arbitrary families without a valid invite code

#### 7. Test with a second account

1. Minal: family exists, events visible, invite code on `/family`
2. Ankush: sign up → Join Family with code → sees Minal’s events
3. Ankush adds an event → Minal sees it after refresh
4. Either person can edit/delete shared events
5. A third account outside the family sees none of these events

## Security note

Do not deploy publicly until you are comfortable with your auth + RLS setup.
Do not put service-role / secret keys in the Next.js app or `.env.local` for the browser.

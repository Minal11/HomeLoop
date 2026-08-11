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

Open **Authentication → URL Configuration** and set:

1. **Site URL** (local): `http://localhost:3000`
2. **Redirect URLs** allow list should include:
   - `http://localhost:3000/auth/confirm`
   - `http://localhost:3000/auth/confirm?**`
   - `http://localhost:3000/reset-password`
   - `http://localhost:3000/reset-password?**`

For production later (Vercel), also add your production origin versions of those URLs, and set:

```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain
```

#### App env

`.env.local` should include:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

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

## Security note

Do not deploy publicly until you are comfortable with your auth + RLS setup.
Do not put service-role / secret keys in the Next.js app or `.env.local` for the browser.

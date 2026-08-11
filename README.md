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

### Development RLS note

`supabase/schema.sql` enables Row Level Security and adds **temporary development policies** that allow anonymous clients to select and insert events.

These policies are **not production-ready**. Replace them when authentication is added.

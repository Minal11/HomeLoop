import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { EventRow } from "@/types/event";

type Database = {
  public: {
    Tables: {
      events: {
        Row: EventRow;
        Insert: Omit<EventRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add them to .env.local and restart the dev server.",
    );
  }

  if (!browserClient) {
    browserClient = createClient<Database>(url, publishableKey);
  }

  return browserClient;
}

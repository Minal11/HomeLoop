import type { EventRow } from "@/types/event";

export type Database = {
  public: {
    Tables: {
      events: {
        Row: EventRow;
        Insert: {
          id?: string;
          title: string;
          start_date: string;
          start_time?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          assigned_to: string;
          category: string;
          location?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          start_date?: string;
          start_time?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          assigned_to?: string;
          category?: string;
          location?: string | null;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add them to .env.local and restart the dev server.",
    );
  }

  return { url, publishableKey };
}

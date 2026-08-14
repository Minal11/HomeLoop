import type { EventRow } from "@/types/event";
import type {
  FamilyMemberDbRow,
  FamilyRow,
  ProfileRow,
} from "@/types/family";
import type { EventReminderRow, PushSubscriptionRow } from "@/types/reminder";
import type { EventExceptionRow } from "@/types/recurrence";
import type { ShortcutTokenRow } from "@/types/shortcut";
import type { FamilyCategoryRow } from "@/types/category";

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
          location_name?: string | null;
          location_address?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_place_id?: string | null;
          notes?: string | null;
          created_by: string;
          family_id: string;
          recurrence_frequency?: string | null;
          recurrence_interval?: number | null;
          recurrence_weekdays?: number[] | null;
          recurrence_end_date?: string | null;
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
          location_name?: string | null;
          location_address?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_place_id?: string | null;
          notes?: string | null;
          created_by?: string;
          family_id?: string;
          recurrence_frequency?: string | null;
          recurrence_interval?: number | null;
          recurrence_weekdays?: number[] | null;
          recurrence_end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      families: {
        Row: FamilyRow;
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          invite_code: string;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          invite_code?: string;
          timezone?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      family_members: {
        Row: FamilyMemberDbRow;
        Insert: {
          id?: string;
          family_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          display_name: string;
          has_completed_onboarding?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          has_completed_onboarding?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      event_reminders: {
        Row: EventReminderRow;
        Insert: {
          id?: string;
          event_id: string;
          offset_minutes: number;
          remind_at: string;
          sent_at?: string | null;
          last_reminded_occurrence_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          offset_minutes?: number;
          remind_at?: string;
          sent_at?: string | null;
          last_reminded_occurrence_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      event_exceptions: {
        Row: EventExceptionRow;
        Insert: {
          id?: string;
          series_event_id: string;
          occurrence_date: string;
          exception_type: string;
          override_event_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          series_event_id?: string;
          occurrence_date?: string;
          exception_type?: string;
          override_event_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      shortcut_tokens: {
        Row: ShortcutTokenRow;
        Insert: {
          id?: string;
          user_id: string;
          token_hash: string;
          name?: string;
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          token_hash?: string;
          name?: string;
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      family_categories: {
        Row: FamilyCategoryRow;
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          color: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name?: string;
          color?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_family_by_invite_code: {
        Args: { invite: string };
        Returns: string;
      };
      is_family_member: {
        Args: { fid: string };
        Returns: boolean;
      };
      is_family_owner: {
        Args: { fid: string };
        Returns: boolean;
      };
    };
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

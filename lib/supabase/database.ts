import type { EventRow } from "@/types/event";
import type {
  FamilyMemberDbRow,
  FamilyRow,
  ProfileRow,
} from "@/types/family";
import type { EventPersonRow, FamilyPersonRow } from "@/types/person";

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
          applies_to_all?: boolean;
          category: string;
          location?: string | null;
          notes?: string | null;
          created_by: string;
          family_id: string;
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
          applies_to_all?: boolean;
          category?: string;
          location?: string | null;
          notes?: string | null;
          created_by?: string;
          family_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      families: {
        Row: FamilyRow;
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          invite_code: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          invite_code?: string;
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
      family_people: {
        Row: FamilyPersonRow;
        Insert: {
          id?: string;
          family_id: string;
          display_name: string;
          linked_user_id?: string | null;
          relationship?: string | null;
          birth_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          display_name?: string;
          linked_user_id?: string | null;
          relationship?: string | null;
          birth_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_people_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      event_people: {
        Row: EventPersonRow;
        Insert: {
          event_id: string;
          person_id: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          person_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_people_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_people_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "family_people";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          display_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
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

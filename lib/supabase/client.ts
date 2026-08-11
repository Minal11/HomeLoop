import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv, type Database } from "@/lib/supabase/database";

export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}

/** Browser Supabase client for client components and event CRUD. */
export function getSupabaseClient() {
  return createClient();
}

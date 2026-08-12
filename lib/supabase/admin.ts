import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv, type Database } from "@/lib/supabase/database";

/**
 * Server-only Supabase client with the service role key.
 * Used after Shortcut token validation to create events for the token owner.
 * Never expose this key to the browser or iPhone Shortcuts.
 */
export function createServiceClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to the server environment for Shortcut API routes.",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

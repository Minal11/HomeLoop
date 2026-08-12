import { getSupabaseClient } from "@/lib/supabase/client";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  generateShortcutToken,
  hashShortcutToken,
} from "@/lib/shortcuts/crypto";
import type { ShortcutTokenRow, ShortcutTokenSummary } from "@/types/shortcut";

function mapSummary(row: ShortcutTokenRow): ShortcutTokenSummary {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export async function listShortcutTokens(): Promise<ShortcutTokenSummary[]> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const { data, error } = await supabase
    .from("shortcut_tokens")
    .select("id, user_id, token_hash, name, created_at, last_used_at, revoked_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list shortcut tokens:", error);
    throw new Error("Unable to load Shortcut access.");
  }

  return ((data ?? []) as ShortcutTokenRow[]).map(mapSummary);
}

/**
 * Creates a new Shortcut token for the signed-in user.
 * Returns the plaintext token once — it is never stored.
 */
export async function createShortcutToken(input?: {
  name?: string;
}): Promise<{ token: string; summary: ShortcutTokenSummary }> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const token = generateShortcutToken();
  const tokenHash = await hashShortcutToken(token);
  const name = input?.name?.trim() || "iPhone Shortcut";

  const { data, error } = await supabase
    .from("shortcut_tokens")
    .insert({
      user_id: user.id,
      token_hash: tokenHash,
      name,
    })
    .select("id, user_id, token_hash, name, created_at, last_used_at, revoked_at")
    .single();

  if (error || !data) {
    console.error("Failed to create shortcut token:", error);
    throw new Error("Unable to create Shortcut access.");
  }

  return {
    token,
    summary: mapSummary(data as ShortcutTokenRow),
  };
}

export async function revokeShortcutToken(tokenId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const { error } = await supabase
    .from("shortcut_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if (error) {
    console.error("Failed to revoke shortcut token:", error);
    throw new Error("Unable to revoke Shortcut access.");
  }
}

export type AuthenticatedShortcutUser = {
  tokenId: string;
  userId: string;
};

/** Validate Bearer token for the public Shortcuts API (service role). */
export async function authenticateShortcutBearer(
  authorizationHeader: string | null,
): Promise<AuthenticatedShortcutUser | null> {
  if (!authorizationHeader) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  const token = match?.[1]?.trim() ?? "";
  if (!token) {
    return null;
  }

  const tokenHash = await hashShortcutToken(token);
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("shortcut_tokens")
    .select("id, user_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("Shortcut token lookup failed:", error);
    return null;
  }

  if (!data || data.revoked_at) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const { error: touchError } = await supabase
    .from("shortcut_tokens")
    .update({ last_used_at: nowIso })
    .eq("id", data.id)
    .is("revoked_at", null);

  if (touchError) {
    console.error("Failed to update shortcut token last_used_at:", touchError);
  }

  return {
    tokenId: data.id,
    userId: data.user_id,
  };
}

import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  Family,
  FamilyMemberDbRow,
  FamilyMemberRow,
  FamilyRole,
  FamilyRow,
} from "@/types/family";

function mapFamilyRow(row: FamilyRow): Family {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
  };
}

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function displayNameFromEmail(email: string | undefined): string {
  if (!email) {
    return "Family member";
  }
  const local = email.split("@")[0]?.trim();
  if (!local) {
    return "Family member";
  }
  return local.charAt(0).toUpperCase() + local.slice(1);
}

async function requireUser() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return { supabase, user };
}

async function ensureProfile(
  userId: string,
  email: string | undefined,
  preferredName?: string,
) {
  const supabase = getSupabaseClient();
  const displayName =
    preferredName?.trim() || displayNameFromEmail(email);

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      display_name: displayName,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Failed to upsert profile:", error);
  }
}

/** Current user's first family membership (Step 10: one family per user UX). */
export async function getCurrentFamily(): Promise<Family | null> {
  const { supabase, user } = await requireUser();

  const { data: membership, error: membershipError } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("Failed to load family membership:", membershipError);
    throw new Error("Unable to load your family.");
  }

  if (!membership?.family_id) {
    return null;
  }

  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("id, name, created_by, invite_code, created_at")
    .eq("id", membership.family_id)
    .maybeSingle();

  if (familyError) {
    console.error("Failed to load family:", familyError);
    throw new Error("Unable to load your family.");
  }

  if (!family) {
    return null;
  }

  return mapFamilyRow(family as FamilyRow);
}

export async function createFamily(name: string): Promise<Family> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Please enter a family name.");
  }

  const { supabase, user } = await requireUser();

  const { data: existing, error: existingError } = await supabase
    .from("family_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check existing membership:", existingError);
    throw new Error("Unable to create family.");
  }

  if (existing) {
    throw new Error("You already belong to a family.");
  }

  await ensureProfile(user.id, user.email);

  // Retry a few times if invite_code collides
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { data: family, error: familyError } = await supabase
      .from("families")
      .insert({
        name: trimmed,
        created_by: user.id,
        invite_code: inviteCode,
      })
      .select("id, name, created_by, invite_code, created_at")
      .single();

    if (familyError || !family) {
      lastError = familyError;
      // unique violation on invite_code → retry
      if (familyError?.code === "23505") {
        continue;
      }
      console.error("Failed to create family:", familyError);
      throw new Error("Unable to create family.");
    }

    const { error: memberError } = await supabase.from("family_members").insert({
      family_id: family.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      console.error("Failed to add family owner:", memberError);
      throw new Error("Family was created but membership failed. Please refresh.");
    }

    return mapFamilyRow(family as FamilyRow);
  }

  console.error("Failed to create family after invite retries:", lastError);
  throw new Error("Unable to create family.");
}

export async function joinFamilyByInviteCode(inviteCode: string): Promise<string> {
  const normalized = inviteCode.trim().toUpperCase();
  if (normalized.length < 6) {
    throw new Error("Please enter a valid invite code.");
  }

  const { supabase, user } = await requireUser();
  await ensureProfile(user.id, user.email);

  const { data, error } = await supabase.rpc("join_family_by_invite_code", {
    invite: normalized,
  });

  if (error || !data) {
    console.error("Failed to join family:", error);
    throw new Error(friendlyJoinError(error));
  }

  return data as string;
}

function friendlyJoinError(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("already belong")) {
    return "You’re already a member of a family.";
  }

  if (normalized.includes("invalid invite")) {
    return "That invite code isn’t valid. Check it and try again.";
  }

  if (normalized.includes("not authenticated")) {
    return "Your session has expired. Please sign in again.";
  }

  return "Unable to join family. Please try again.";
}

export async function getFamilyMembers(
  familyId: string,
): Promise<FamilyMemberRow[]> {
  const { supabase } = await requireUser();

  const { data: members, error } = await supabase
    .from("family_members")
    .select("id, family_id, user_id, role, created_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load family members:", error);
    throw new Error("Unable to load family members.");
  }

  const rows = (members ?? []) as FamilyMemberDbRow[];
  const userIds = rows.map((row) => row.user_id);

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  if (profileError) {
    console.error("Failed to load profiles:", profileError);
  }

  const nameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );

  return rows.map((row) => ({
    id: row.id,
    familyId: row.family_id,
    userId: row.user_id,
    role: row.role as FamilyRole,
    createdAt: row.created_at,
    displayName: nameById.get(row.user_id) ?? "Family member",
  }));
}

export async function regenerateInviteCode(familyId: string): Promise<string> {
  const { supabase } = await requireUser();

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from("families")
      .update({ invite_code: inviteCode })
      .eq("id", familyId)
      .select("invite_code")
      .single();

    if (error || !data) {
      lastError = error;
      if (error?.code === "23505") {
        continue;
      }
      console.error("Failed to regenerate invite code:", error);
      throw new Error("Unable to regenerate invite code. Owners only.");
    }

    return data.invite_code as string;
  }

  console.error("Invite regenerate retries failed:", lastError);
  throw new Error("Unable to regenerate invite code.");
}

export async function getCurrentUserFamilyRole(
  familyId: string,
): Promise<FamilyRole | null> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("family_members")
    .select("role")
    .eq("family_id", familyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load membership role:", error);
    throw new Error("Unable to load membership.");
  }

  if (!data?.role) {
    return null;
  }

  return data.role as FamilyRole;
}

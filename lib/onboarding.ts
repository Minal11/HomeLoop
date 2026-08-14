import { getSupabaseClient } from "@/lib/supabase/client";

function isMissingOnboardingColumn(error: unknown): boolean {
  const message = `${(error as { message?: string })?.message ?? ""}`.toLowerCase();
  return (
    message.includes("has_completed_onboarding") ||
    message.includes("does not exist") ||
    message.includes("could not find")
  );
}

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return user.id;
}

/**
 * Returns whether the current user has finished the product tour.
 * If the migration has not been applied yet, treat as completed so
 * existing installs are not blocked.
 */
export async function hasCompletedHomeLoopOnboarding(): Promise<boolean> {
  const userId = await requireUserId();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("has_completed_onboarding")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingOnboardingColumn(error)) {
      return true;
    }
    console.error("Failed to load onboarding status:", error);
    return true;
  }

  if (!data) {
    // No profile yet — show tour after family setup creates one.
    return false;
  }

  return Boolean(
    (data as { has_completed_onboarding?: boolean }).has_completed_onboarding,
  );
}

/** Persist tour completion for the current user only. */
export async function markHomeLoopOnboardingComplete(): Promise<void> {
  const userId = await requireUserId();
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("profiles")
    .update({ has_completed_onboarding: true })
    .eq("id", userId);

  if (error) {
    if (isMissingOnboardingColumn(error)) {
      console.error(
        "Onboarding column missing — run migration 015_profile_onboarding.sql",
      );
      return;
    }
    console.error("Failed to mark onboarding complete:", error);
    throw new Error("Unable to save onboarding progress.");
  }
}

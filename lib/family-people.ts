import { getCurrentFamily } from "@/lib/families";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  FamilyPerson,
  FamilyPersonRow,
  NewFamilyPersonInput,
  PersonRelationship,
  UpdateFamilyPersonInput,
} from "@/types/person";
import { PERSON_RELATIONSHIPS } from "@/types/person";

function isRelationship(
  value: string | null,
): value is PersonRelationship | null {
  if (value === null) {
    return true;
  }
  return (PERSON_RELATIONSHIPS as readonly string[]).includes(value);
}

export function mapFamilyPersonRow(row: FamilyPersonRow): FamilyPerson {
  if (!isRelationship(row.relationship)) {
    throw new Error(`Unexpected relationship: ${row.relationship}`);
  }

  return {
    id: row.id,
    familyId: row.family_id,
    displayName: row.display_name,
    linkedUserId: row.linked_user_id,
    relationship: row.relationship,
    birthDate: row.birth_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const PERSON_SELECT =
  "id, family_id, display_name, linked_user_id, relationship, birth_date, created_at, updated_at";

async function requireUserAndFamily() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const family = await getCurrentFamily();
  if (!family) {
    throw new Error("Join or create a family first.");
  }

  return { supabase, user, family };
}

export async function getFamilyPeople(
  familyId?: string,
): Promise<FamilyPerson[]> {
  const { supabase, family } = await requireUserAndFamily();
  const targetFamilyId = familyId ?? family.id;

  const { data, error } = await supabase
    .from("family_people")
    .select(PERSON_SELECT)
    .eq("family_id", targetFamilyId)
    .order("display_name", { ascending: true });

  if (error) {
    console.error("Failed to load family people:", error);
    throw new Error("Unable to load family members.");
  }

  return ((data ?? []) as FamilyPersonRow[]).map(mapFamilyPersonRow);
}

/** Resolve a display name within the current family (AI-ready helper). */
export async function findFamilyPersonByName(
  displayName: string,
): Promise<FamilyPerson | null> {
  const people = await getFamilyPeople();
  const needle = displayName.trim().toLowerCase();
  return (
    people.find((person) => person.displayName.toLowerCase() === needle) ?? null
  );
}

export async function createFamilyPerson(
  input: NewFamilyPersonInput,
): Promise<FamilyPerson> {
  const { supabase, family } = await requireUserAndFamily();
  const displayName = input.displayName.trim();

  if (!displayName) {
    throw new Error("Please enter a name.");
  }

  const { data, error } = await supabase
    .from("family_people")
    .insert({
      family_id: family.id,
      display_name: displayName,
      relationship: input.relationship ?? null,
      birth_date: input.birthDate || null,
      linked_user_id: null,
    })
    .select(PERSON_SELECT)
    .single();

  if (error || !data) {
    console.error("Failed to create family person:", error);
    throw new Error("Unable to add family member.");
  }

  return mapFamilyPersonRow(data as FamilyPersonRow);
}

export async function updateFamilyPerson(
  personId: string,
  input: UpdateFamilyPersonInput,
): Promise<FamilyPerson> {
  const { supabase, family } = await requireUserAndFamily();
  const displayName = input.displayName.trim();

  if (!displayName) {
    throw new Error("Please enter a name.");
  }

  const { data, error } = await supabase
    .from("family_people")
    .update({
      display_name: displayName,
      relationship: input.relationship ?? null,
      birth_date: input.birthDate || null,
    })
    .eq("id", personId)
    .eq("family_id", family.id)
    .select(PERSON_SELECT)
    .single();

  if (error || !data) {
    console.error("Failed to update family person:", error);
    throw new Error("Unable to update family member.");
  }

  return mapFamilyPersonRow(data as FamilyPersonRow);
}

/**
 * Removes a schedulable person.
 * Cascades event_people rows only — events themselves are preserved.
 */
export async function deleteFamilyPerson(personId: string): Promise<void> {
  const { supabase, family } = await requireUserAndFamily();

  const { error } = await supabase
    .from("family_people")
    .delete()
    .eq("id", personId)
    .eq("family_id", family.id);

  if (error) {
    console.error("Failed to delete family person:", error);
    throw new Error("Unable to remove family member.");
  }
}

/**
 * Ensures the current auth user has a linked family_people row.
 * Used after createFamily / joinFamily so adults appear as schedulable people.
 * Does not allow linking to an arbitrary existing person from the client.
 */
export async function ensureLinkedFamilyPersonForCurrentUser(
  preferredName?: string,
): Promise<FamilyPerson> {
  const { supabase, user, family } = await requireUserAndFamily();

  const { data: existing, error: existingError } = await supabase
    .from("family_people")
    .select(PERSON_SELECT)
    .eq("family_id", family.id)
    .eq("linked_user_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to look up linked person:", existingError);
    throw new Error("Unable to sync family member profile.");
  }

  if (existing) {
    return mapFamilyPersonRow(existing as FamilyPersonRow);
  }

  const displayName =
    preferredName?.trim() ||
    user.email?.split("@")[0] ||
    "Family member";

  const { data, error } = await supabase
    .from("family_people")
    .insert({
      family_id: family.id,
      display_name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      linked_user_id: user.id,
      relationship: "Adult",
    })
    .select(PERSON_SELECT)
    .single();

  if (error || !data) {
    console.error("Failed to create linked family person:", error);
    throw new Error("Unable to sync family member profile.");
  }

  return mapFamilyPersonRow(data as FamilyPersonRow);
}

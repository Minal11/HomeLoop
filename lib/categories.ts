import { getCurrentFamily } from "@/lib/families";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  DEFAULT_FAMILY_CATEGORIES,
  type FamilyCategory,
  type FamilyCategoryRow,
  type NewFamilyCategoryInput,
  type UpdateFamilyCategoryInput,
} from "@/types/category";

function mapRow(row: FamilyCategoryRow): FamilyCategory {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingCategoriesTable(error: unknown): boolean {
  const message = `${(error as { message?: string })?.message ?? ""}`.toLowerCase();
  return (
    message.includes("family_categories") ||
    message.includes("does not exist") ||
    message.includes("could not find")
  );
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeColor(color: string): string {
  const trimmed = color.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    throw new Error("Choose a valid color (e.g. #4F8EDC).");
  }
  return trimmed.toUpperCase();
}

function syntheticDefaults(familyId: string): FamilyCategory[] {
  return DEFAULT_FAMILY_CATEGORIES.map((item, index) => ({
    id: `default-${index}`,
    familyId,
    name: item.name,
    color: item.color,
    sortOrder: index,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }));
}

async function requireFamilyId(): Promise<string> {
  const family = await getCurrentFamily();
  if (!family) {
    throw new Error("Join or create a family before managing categories.");
  }
  return family.id;
}

export async function listFamilyCategories(): Promise<FamilyCategory[]> {
  const familyId = await requireFamilyId();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("family_categories")
    .select("id, family_id, name, color, sort_order, created_at, updated_at")
    .eq("family_id", familyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isMissingCategoriesTable(error)) {
      return syntheticDefaults(familyId);
    }
    console.error("Failed to load categories:", error);
    throw new Error("Unable to load categories.");
  }

  return ((data ?? []) as FamilyCategoryRow[]).map(mapRow);
}

/** Seed default categories when a family has none yet. */
export async function ensureFamilyCategories(): Promise<FamilyCategory[]> {
  const familyId = await requireFamilyId();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("family_categories")
    .select("id, family_id, name, color, sort_order, created_at, updated_at")
    .eq("family_id", familyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isMissingCategoriesTable(error)) {
      return syntheticDefaults(familyId);
    }
    console.error("Failed to load categories:", error);
    throw new Error("Unable to load categories.");
  }

  const existing = ((data ?? []) as FamilyCategoryRow[]).map(mapRow);
  if (existing.length > 0) {
    return existing;
  }

  const rows = DEFAULT_FAMILY_CATEGORIES.map((item, index) => ({
    family_id: familyId,
    name: item.name,
    color: item.color,
    sort_order: index,
  }));

  const { error: insertError } = await supabase
    .from("family_categories")
    .insert(rows);

  if (insertError && !isMissingCategoriesTable(insertError)) {
    // Likely a concurrent seed — fall through to re-list.
    console.error("Failed to seed categories:", insertError);
  }

  return listFamilyCategories();
}

export async function createFamilyCategory(
  input: NewFamilyCategoryInput,
): Promise<FamilyCategory> {
  const familyId = await requireFamilyId();
  const name = normalizeName(input.name);
  const color = normalizeColor(input.color);

  if (!name) {
    throw new Error("Please enter a category name.");
  }

  const supabase = getSupabaseClient();
  const current = await listFamilyCategories();
  if (current.some((row) => row.id.startsWith("default-"))) {
    throw new Error(
      "Run the family categories migration before creating categories.",
    );
  }

  const sortOrder =
    current.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

  const { data, error } = await supabase
    .from("family_categories")
    .insert({
      family_id: familyId,
      name,
      color,
      sort_order: sortOrder,
    })
    .select("id, family_id, name, color, sort_order, created_at, updated_at")
    .single();

  if (error || !data) {
    const message = `${error?.message ?? ""}`.toLowerCase();
    if (message.includes("unique") || message.includes("duplicate")) {
      throw new Error("A category with that name already exists.");
    }
    console.error("Failed to create category:", error);
    throw new Error("Unable to create category.");
  }

  return mapRow(data as FamilyCategoryRow);
}

export async function updateFamilyCategory(
  categoryId: string,
  input: UpdateFamilyCategoryInput,
): Promise<FamilyCategory> {
  if (categoryId.startsWith("default-")) {
    throw new Error(
      "Run the family categories migration before editing categories.",
    );
  }

  const familyId = await requireFamilyId();
  const name = normalizeName(input.name);
  const color = normalizeColor(input.color);

  if (!name) {
    throw new Error("Please enter a category name.");
  }

  const supabase = getSupabaseClient();

  const { data: existing, error: existingError } = await supabase
    .from("family_categories")
    .select("id, family_id, name, color, sort_order, created_at, updated_at")
    .eq("id", categoryId)
    .eq("family_id", familyId)
    .maybeSingle();

  if (existingError || !existing) {
    console.error("Failed to load category for update:", existingError);
    throw new Error("Category not found.");
  }

  const previousName = (existing as FamilyCategoryRow).name;

  const { data, error } = await supabase
    .from("family_categories")
    .update({
      name,
      color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .eq("family_id", familyId)
    .select("id, family_id, name, color, sort_order, created_at, updated_at")
    .single();

  if (error || !data) {
    const message = `${error?.message ?? ""}`.toLowerCase();
    if (message.includes("unique") || message.includes("duplicate")) {
      throw new Error("A category with that name already exists.");
    }
    console.error("Failed to update category:", error);
    throw new Error("Unable to update category.");
  }

  if (previousName !== name) {
    const { error: eventError } = await supabase
      .from("events")
      .update({ category: name })
      .eq("family_id", familyId)
      .eq("category", previousName);

    if (eventError) {
      console.error("Failed to rename category on events:", eventError);
      throw new Error("Category updated, but existing events were not renamed.");
    }
  }

  return mapRow(data as FamilyCategoryRow);
}

export async function deleteFamilyCategory(categoryId: string): Promise<void> {
  if (categoryId.startsWith("default-")) {
    throw new Error(
      "Run the family categories migration before deleting categories.",
    );
  }

  const familyId = await requireFamilyId();
  const supabase = getSupabaseClient();

  const { data: existing, error: existingError } = await supabase
    .from("family_categories")
    .select("id, name")
    .eq("id", categoryId)
    .eq("family_id", familyId)
    .maybeSingle();

  if (existingError || !existing) {
    throw new Error("Category not found.");
  }

  const categoryName = existing.name as string;

  const { count, error: countError } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("category", categoryName);

  if (countError) {
    console.error("Failed to check category usage:", countError);
    throw new Error("Unable to delete category.");
  }

  if ((count ?? 0) > 0) {
    throw new Error(
      "This category is used by existing events. Reassign those events first.",
    );
  }

  const { error } = await supabase
    .from("family_categories")
    .delete()
    .eq("id", categoryId)
    .eq("family_id", familyId);

  if (error) {
    console.error("Failed to delete category:", error);
    throw new Error("Unable to delete category.");
  }
}

export function buildCategoryColorMap(
  categories: FamilyCategory[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const category of categories) {
    map[category.name] = category.color;
  }
  return map;
}

export type FamilyCategory = {
  id: string;
  familyId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type FamilyCategoryRow = {
  id: string;
  family_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type NewFamilyCategoryInput = {
  name: string;
  color: string;
};

export type UpdateFamilyCategoryInput = {
  name: string;
  color: string;
};

/** Default categories seeded for each family (name + color). */
export const DEFAULT_FAMILY_CATEGORIES: ReadonlyArray<{
  name: string;
  color: string;
}> = [
  { name: "Appointment", color: "#C45C6A" },
  { name: "Birthday", color: "#7E6BB8" },
  { name: "Social", color: "#4F8EDC" },
  { name: "Work", color: "#5B7C99" },
  { name: "School / Daycare", color: "#5A9E6F" },
  { name: "Workshop", color: "#C7923C" },
  { name: "Religious / Pooja", color: "#B86B3C" },
  { name: "Travel", color: "#D97B2E" },
  { name: "Other", color: "#8A7360" },
];

export const CATEGORY_COLOR_PRESETS = [
  "#C45C6A",
  "#7E6BB8",
  "#4F8EDC",
  "#5B7C99",
  "#5A9E6F",
  "#C7923C",
  "#B86B3C",
  "#D97B2E",
  "#8A7360",
  "#D6455D",
  "#3D8B7A",
  "#6B5B95",
] as const;

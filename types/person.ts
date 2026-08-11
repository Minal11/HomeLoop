export const PERSON_RELATIONSHIPS = ["Adult", "Child", "Other"] as const;

export type PersonRelationship = (typeof PERSON_RELATIONSHIPS)[number];

/** Schedulable household person (may or may not have a HomeLoop login). */
export type FamilyPerson = {
  id: string;
  familyId: string;
  displayName: string;
  linkedUserId: string | null;
  relationship: PersonRelationship | null;
  birthDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FamilyPersonRow = {
  id: string;
  family_id: string;
  display_name: string;
  linked_user_id: string | null;
  relationship: string | null;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
};

export type EventPersonRow = {
  event_id: string;
  person_id: string;
  created_at: string;
};

export type NewFamilyPersonInput = {
  displayName: string;
  relationship?: PersonRelationship | null;
  birthDate?: string | null;
};

export type UpdateFamilyPersonInput = {
  displayName: string;
  relationship?: PersonRelationship | null;
  birthDate?: string | null;
};

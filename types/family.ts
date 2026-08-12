export type FamilyRole = "owner" | "member";

export type Family = {
  id: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  /** IANA timezone for reminder scheduling (e.g. America/Chicago). */
  timezone: string;
  createdAt: string;
};

export type FamilyMemberRow = {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
  createdAt: string;
  displayName: string;
};

export type FamilyRow = {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  timezone?: string | null;
  created_at: string;
};

export type FamilyMemberDbRow = {
  id: string;
  family_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  display_name: string;
  created_at: string;
};

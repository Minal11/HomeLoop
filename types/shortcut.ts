export type ShortcutTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

/** Safe fields shown in the Family UI (never includes token_hash). */
export type ShortcutTokenSummary = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

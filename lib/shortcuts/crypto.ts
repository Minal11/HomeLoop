function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Cryptographically secure Shortcut API token (plaintext; show once). */
export function generateShortcutToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `hlsk_${toHex(bytes)}`;
}

/** SHA-256 hex digest — store only this value in shortcut_tokens.token_hash. */
export async function hashShortcutToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

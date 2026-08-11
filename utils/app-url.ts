/**
 * Public site origin for auth redirects (password reset, etc.).
 *
 * In the browser, always use the current origin so production never
 * accidentally sends recovery links to localhost.
 * On the server, prefer NEXT_PUBLIC_SITE_URL when set.
 */
export function getSiteUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  // Server-side fallback for local tooling only.
  return "http://localhost:3000";
}

/** Only allow same-app relative paths for post-auth redirects. */
export function getSafeNextPath(
  next: string | null,
  fallback = "/reset-password",
): string {
  if (!next) {
    return fallback;
  }

  if (!next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}

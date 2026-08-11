/**
 * Public site origin for auth redirects (password reset, etc.).
 * Prefer NEXT_PUBLIC_SITE_URL so local and production stay configurable.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

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

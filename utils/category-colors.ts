import {
  EVENT_CATEGORIES,
  type EventCategory,
} from "@/types/event";

/**
 * Canonical base color per HomeLoop category.
 * Same category name always resolves to the same hex.
 */
export const CATEGORY_BASE_COLORS: Record<EventCategory, string> = {
  Appointment: "#C45C6A",
  Birthday: "#7E6BB8",
  Social: "#4F8EDC",
  Work: "#5B7C99",
  "School / Daycare": "#5A9E6F",
  Workshop: "#C7923C",
  "Religious / Pooja": "#B86B3C",
  Travel: "#D97B2E",
  Other: "#8A7360",
};

const FALLBACK_BASE = "#8A7360";

export type CategoryStyles = {
  accentColor: string;
  backgroundColor: string;
  borderColor: string;
  badgeBackgroundColor: string;
  badgeTextColor: string;
  badgeBorderColor: string;
  dateTimeColor: string;
};

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  const part = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Mix a color toward white. `whiteAmount` 0 = original, 1 = white. */
export function mixWithWhite(hex: string, whiteAmount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return hex;
  }
  const amount = Math.max(0, Math.min(1, whiteAmount));
  return toHex({
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  });
}

/** Mix a color toward black for readable text accents. */
export function mixWithBlack(hex: string, blackAmount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return hex;
  }
  const amount = Math.max(0, Math.min(1, blackAmount));
  return toHex({
    r: rgb.r * (1 - amount),
    g: rgb.g * (1 - amount),
    b: rgb.b * (1 - amount),
  });
}

export function getCategoryBaseColor(
  category: string | null | undefined,
): string {
  if (
    category &&
    (EVENT_CATEGORIES as readonly string[]).includes(category)
  ) {
    return CATEGORY_BASE_COLORS[category as EventCategory];
  }
  return FALLBACK_BASE;
}

/**
 * Derive pastel card/badge styles from a category's base color.
 * Unknown/missing categories use the neutral "Other"/fallback theme.
 */
export function getCategoryStyles(
  category: string | null | undefined,
): CategoryStyles {
  const accentColor = getCategoryBaseColor(category);

  return {
    accentColor,
    backgroundColor: mixWithWhite(accentColor, 0.9),
    borderColor: mixWithWhite(accentColor, 0.72),
    badgeBackgroundColor: mixWithWhite(accentColor, 0.82),
    badgeTextColor: mixWithBlack(accentColor, 0.28),
    badgeBorderColor: mixWithWhite(accentColor, 0.55),
    dateTimeColor: mixWithBlack(accentColor, 0.22),
  };
}

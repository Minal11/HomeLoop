import type { EventPersonSummary, FamilyEvent } from "@/types/event";

/** Display label for who’s involved on cards/details. */
export function formatEventPeopleLabel(
  event: Pick<FamilyEvent, "appliesToAll" | "people">,
  familyPeopleCount?: number,
): string {
  if (event.appliesToAll) {
    return "Family";
  }

  if (
    typeof familyPeopleCount === "number" &&
    familyPeopleCount > 0 &&
    event.people.length === familyPeopleCount
  ) {
    return "Family";
  }

  if (event.people.length === 0) {
    return "Unassigned";
  }

  return event.people.map((person) => person.displayName).join(" + ");
}

export function peopleInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 1).toUpperCase();
  }
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

export function sortPeopleSummaries(
  people: EventPersonSummary[],
): EventPersonSummary[] {
  return [...people].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

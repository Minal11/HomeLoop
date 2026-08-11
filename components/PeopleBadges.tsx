import { peopleInitials } from "@/utils/people";

const BADGE_COLORS = [
  "bg-[#efe0cf] text-[#6a4424]",
  "bg-[#e5ebf0] text-[#3d4f5f]",
  "bg-[#e8edd9] text-[#4a5a2e]",
  "bg-[#f0e2d4] text-[#5c4030]",
  "bg-[#f5c4cd]/55 text-[#8a3040]",
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % BADGE_COLORS.length;
  }
  return BADGE_COLORS[hash] ?? BADGE_COLORS[0]!;
}

type PeopleBadgesProps = {
  label: string;
  names?: string[];
};

/** One or more compact people badges (or a single Family badge). */
export default function PeopleBadges({ label, names }: PeopleBadgesProps) {
  if (label === "Family" || label === "Unassigned") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-white/70 py-1 pl-1 pr-2.5 text-xs font-semibold text-foreground">
        <span
          aria-hidden="true"
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${colorForName(label)}`}
        >
          {peopleInitials(label)}
        </span>
        <span>{label}</span>
      </span>
    );
  }

  const displayNames =
    names && names.length > 0 ? names : label.split(" + ").map((part) => part.trim());

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {displayNames.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-white/70 py-1 pl-1 pr-2.5 text-xs font-semibold text-foreground"
        >
          <span
            aria-hidden="true"
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${colorForName(name)}`}
          >
            {peopleInitials(name)}
          </span>
          <span>{name}</span>
        </span>
      ))}
    </span>
  );
}

import type { FamilyMember } from "@/types/event";
import { FAMILY_MEMBERS } from "@/types/event";

const MEMBER_STYLES: Record<
  FamilyMember,
  { initials: string; className: string }
> = {
  Minal: {
    initials: "M",
    className: "bg-[#efe0cf] text-[#6a4424]",
  },
  Ankush: {
    initials: "A",
    className: "bg-[#e5ebf0] text-[#3d4f5f]",
  },
  Ziva: {
    initials: "Z",
    className: "bg-[#e8edd9] text-[#4a5a2e]",
  },
  Family: {
    initials: "F",
    className: "bg-[#f0e2d4] text-[#5c4030]",
  },
};

const FALLBACK_STYLE = {
  initials: "+",
  className: "bg-[#efe6dc] text-[#5c4030]",
};

function isFamilyMember(value: string): value is FamilyMember {
  return (FAMILY_MEMBERS as readonly string[]).includes(value);
}

function styleForLabel(member: string) {
  if (isFamilyMember(member)) {
    return MEMBER_STYLES[member];
  }

  const first = member.trim().charAt(0).toUpperCase();
  return {
    initials: first || FALLBACK_STYLE.initials,
    className: FALLBACK_STYLE.className,
  };
}

type MemberBadgeProps = {
  member: string;
};

export default function MemberBadge({ member }: MemberBadgeProps) {
  const style = styleForLabel(member);

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-surface-border bg-white/70 py-1 pl-1 pr-2.5 text-xs font-semibold text-foreground">
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${style.className}`}
      >
        {style.initials}
      </span>
      <span className="truncate">{member}</span>
    </span>
  );
}

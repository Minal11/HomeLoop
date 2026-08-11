import type { FamilyMember } from "@/types/event";

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

type MemberBadgeProps = {
  member: FamilyMember;
};

export default function MemberBadge({ member }: MemberBadgeProps) {
  const style = MEMBER_STYLES[member];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-white/70 py-1 pl-1 pr-2.5 text-xs font-semibold text-foreground">
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${style.className}`}
      >
        {style.initials}
      </span>
      <span>{member}</span>
    </span>
  );
}

import type { EventCategory } from "@/types/event";

type CategoryBadgeProps = {
  category: EventCategory;
};

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-surface-border bg-white/50 px-2.5 py-1 text-xs font-semibold text-muted">
      {category}
    </span>
  );
}

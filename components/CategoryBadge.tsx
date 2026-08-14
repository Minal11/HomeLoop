import type { EventCategory } from "@/types/event";
import { getCategoryStyles } from "@/utils/category-colors";

type CategoryBadgeProps = {
  category: EventCategory | string;
};

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  const styles = getCategoryStyles(category);

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: styles.badgeBackgroundColor,
        color: styles.badgeTextColor,
        borderColor: styles.badgeBorderColor,
      }}
    >
      {category}
    </span>
  );
}

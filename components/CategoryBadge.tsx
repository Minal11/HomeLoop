import { getCategoryStyles } from "@/utils/category-colors";

type CategoryBadgeProps = {
  category: string;
  colorMap?: Record<string, string> | null;
};

export default function CategoryBadge({
  category,
  colorMap,
}: CategoryBadgeProps) {
  const styles = getCategoryStyles(category, colorMap);

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

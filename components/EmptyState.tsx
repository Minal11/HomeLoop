import { HeartButton, HeartLink } from "@/components/HeartButton";

type EmptyStateProps = {
  href?: string;
  onAddEvent?: () => void;
};

export default function EmptyState({
  href = "/events/new",
  onAddEvent,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-surface-border bg-surface px-6 py-12 text-center shadow-[var(--shadow)]">
      <p className="font-display text-2xl font-medium text-foreground">
        Nothing coming up
      </p>
      <p className="mt-2 max-w-xs text-sm text-muted">
        Your family calendar is all clear.
      </p>
      {onAddEvent ? (
        <HeartButton
          type="button"
          onClick={onAddEvent}
          size="sm"
          className="mt-6"
        >
          + Add Event
        </HeartButton>
      ) : (
        <HeartLink href={href} size="sm" className="mt-6">
          + Add Event
        </HeartLink>
      )}
    </div>
  );
}

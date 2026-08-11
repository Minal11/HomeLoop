import Link from "next/link";

type EmptyStateProps = {
  href?: string;
  onAddEvent?: () => void;
};

export default function EmptyState({
  href = "/events/new",
  onAddEvent,
}: EmptyStateProps) {
  const className =
    "mt-6 inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white shadow-[0_10px_22px_rgba(184,51,74,0.28)] transition duration-200 hover:bg-accent-deep active:scale-[0.98]";

  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-surface-border bg-surface px-6 py-12 text-center shadow-[var(--shadow)]">
      <p className="font-display text-2xl font-medium text-foreground">
        Nothing coming up
      </p>
      <p className="mt-2 max-w-xs text-sm text-muted">
        Your family calendar is all clear.
      </p>
      {onAddEvent ? (
        <button type="button" onClick={onAddEvent} className={className}>
          + Add Event
        </button>
      ) : (
        <Link href={href} className={className}>
          + Add Event
        </Link>
      )}
    </div>
  );
}

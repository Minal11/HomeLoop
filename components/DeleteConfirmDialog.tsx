"use client";

type DeleteConfirmDialogProps = {
  open: boolean;
  eventTitle: string;
  isDeleting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteConfirmDialog({
  open,
  eventTitle,
  isDeleting,
  errorMessage,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/35 px-5 pb-8 pt-10 sm:items-center"
      role="presentation"
      onClick={isDeleting ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-event-title"
        aria-describedby="delete-event-description"
        className="w-full max-w-md rounded-3xl border border-surface-border bg-[#fffaf4] p-5 shadow-[0_18px_40px_rgba(58,36,18,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="delete-event-title"
          className="font-display text-2xl font-medium text-foreground"
        >
          Delete this event?
        </h2>
        <p id="delete-event-description" className="mt-2 text-sm text-muted">
          “{eventTitle}” will be removed from your family calendar. This action
          cannot be undone.
        </p>

        {errorMessage ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-accent">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-busy={isDeleting}
            className="w-full rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting ? "Deleting…" : "Delete Event"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="w-full rounded-2xl border border-surface-border bg-white/80 px-5 py-3.5 text-base font-bold text-foreground transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

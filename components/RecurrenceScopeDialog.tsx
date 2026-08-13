"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import type {
  RecurrenceDeleteScope,
  RecurrenceEditScope,
} from "@/types/recurrence";

type Mode = "edit" | "delete";

type RecurrenceScopeDialogProps = {
  open: boolean;
  mode: Mode;
  eventTitle: string;
  isBusy?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: (scope: RecurrenceEditScope | RecurrenceDeleteScope) => void;
};

function subscribe() {
  return () => {};
}

export default function RecurrenceScopeDialog({
  open,
  mode,
  eventTitle,
  isBusy = false,
  errorMessage,
  onCancel,
  onConfirm,
}: RecurrenceScopeDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const { body } = document;
    const scrollY = window.scrollY;
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusy) {
        event.preventDefault();
        onCancelRef.current();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open, isBusy]);

  if (!open || !isClient) {
    return null;
  }

  const title =
    mode === "edit" ? "Edit recurring event" : "Delete recurring event";

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      role="presentation"
      onClick={isBusy ? undefined : onCancel}
    >
      <div className="absolute inset-0 bg-foreground/35" aria-hidden="true" />
      <div
        className="relative flex h-[100dvh] w-full items-center justify-center"
        style={{
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
          paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
          paddingRight: "max(1.25rem, env(safe-area-inset-right))",
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="w-full max-w-md rounded-3xl border border-surface-border bg-[#fffaf4] p-5 shadow-[0_18px_40px_rgba(58,36,18,0.18)]"
          onClick={(event) => event.stopPropagation()}
        >
          <h2
            id={titleId}
            className="font-display text-2xl font-medium text-foreground"
          >
            {title}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-muted">
            “{eventTitle}” repeats. Choose how far this change should apply.
          </p>

          {errorMessage ? (
            <p role="alert" className="mt-3 text-sm font-semibold text-accent">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onConfirm("this")}
              className="w-full rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white transition hover:bg-accent-deep disabled:opacity-70"
            >
              This event only
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onConfirm("future")}
              className="w-full rounded-2xl border border-surface-border bg-white/80 px-5 py-3.5 text-base font-bold text-foreground transition hover:bg-white disabled:opacity-70"
            >
              This and future events
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onConfirm("all")}
              className="w-full rounded-2xl border border-surface-border bg-white/80 px-5 py-3.5 text-base font-bold text-foreground transition hover:bg-white disabled:opacity-70"
            >
              All events
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={onCancel}
              className="w-full rounded-2xl border border-transparent px-5 py-3.5 text-base font-bold text-muted transition hover:text-foreground disabled:opacity-70"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

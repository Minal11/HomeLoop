"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { HeartButton } from "@/components/HeartButton";

type DeleteConfirmDialogProps = {
  open: boolean;
  eventTitle: string;
  isDeleting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export default function DeleteConfirmDialog({
  open,
  eventTitle,
  isDeleting,
  errorMessage,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const isClient = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const { body } = document;
    const scrollY = window.scrollY;
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;
    const previousLeft = body.style.left;
    const previousRight = body.style.right;

    // Lock scroll without jumping to the top (iOS-friendly).
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    const focusTimer = window.setTimeout(() => {
      const firstButton =
        panelRef.current?.querySelector<HTMLButtonElement>("button");
      firstButton?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      if (isDeleting) {
        return;
      }
      event.preventDefault();
      onCancelRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);

      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.left = previousLeft;
      body.style.right = previousRight;
      body.style.width = previousWidth;
      window.scrollTo(0, scrollY);

      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === "function") {
        previous.focus();
      }
    };
  }, [open, isDeleting]);

  if (!open || !isClient) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      role="presentation"
      onClick={isDeleting ? undefined : onCancel}
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
            Delete this event?
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-muted">
            “{eventTitle}” will be removed from your family calendar. This action
            cannot be undone.
          </p>

          {errorMessage ? (
            <p role="alert" className="mt-3 text-sm font-semibold text-accent">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            <HeartButton
              type="button"
              variant="danger"
              onClick={onConfirm}
              disabled={isDeleting}
              aria-busy={isDeleting}
              className="w-full"
            >
              {isDeleting ? "Deleting…" : "Delete Event"}
            </HeartButton>
            <HeartButton
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isDeleting}
              className="w-full"
            >
              Cancel
            </HeartButton>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

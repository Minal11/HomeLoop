"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import CategoryBadge from "@/components/CategoryBadge";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import MapOpenDialog from "@/components/MapOpenDialog";
import MemberBadge from "@/components/MemberBadge";
import RecurrenceScopeDialog from "@/components/RecurrenceScopeDialog";
import { deleteEvent } from "@/lib/events";
import { eventListKey } from "@/lib/recurrence-map";
import type { FamilyEvent } from "@/types/event";
import type { RecurrenceDeleteScope } from "@/types/recurrence";
import { formatEventDate, formatTime } from "@/utils/events";
import { eventToMapLocation, getEventLocationLabel } from "@/utils/maps";
import { isRecurringRule } from "@/utils/recurrence";
import { getCategoryStyles } from "@/utils/category-colors";

type EventCardProps = {
  event: FamilyEvent;
  index?: number;
  variant?: "default" | "next";
  /** Family category name → hex color map for card/badge theming. */
  categoryColorMap?: Record<string, string> | null;
  /** Called after a successful swipe-confirmed delete so lists can refresh. */
  onDeleted?: (eventId: string) => void;
};

const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = 40;
const DIRECTION_LOCK = 10;
const SWIPE_OPEN_EVENT = "homeloop:event-card-swipe-open";

type SwipeOpenDetail = { id: string };

export default function EventCard({
  event,
  index = 0,
  variant = "default",
  categoryColorMap = null,
  onDeleted,
}: EventCardProps) {
  const router = useRouter();
  const reactId = useId();
  const cardKey = `${eventListKey(event)}-${reactId}`;
  const isRecurring = isRecurringRule(event.recurrence);
  const categoryStyles = getCategoryStyles(event.category, categoryColorMap);

  const isNext = variant === "next";
  const dateLabel = formatEventDate(event);
  const timeLabel = event.startTime ? formatTime(event.startTime) : null;
  const locationLabel = getEventLocationLabel(event);
  const mapLocation = eventToMapLocation(event);
  const notesText = event.notes?.trim() || null;

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRecurrenceDeleteOpen, setIsRecurrenceDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const lockRef = useRef<"none" | "horizontal" | "vertical">("none");
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    function handleSwipeOpen(browserEvent: Event) {
      const detail = (browserEvent as CustomEvent<SwipeOpenDetail>).detail;
      if (!detail || detail.id === cardKey) {
        return;
      }
      setOffset(0);
    }

    function handlePointerDownOutside(browserEvent: PointerEvent) {
      const target = browserEvent.target as Node | null;
      if (!rootRef.current || !target) {
        return;
      }
      if (!rootRef.current.contains(target) && offsetRef.current !== 0) {
        setOffset(0);
      }
    }

    window.addEventListener(SWIPE_OPEN_EVENT, handleSwipeOpen);
    document.addEventListener("pointerdown", handlePointerDownOutside);
    return () => {
      window.removeEventListener(SWIPE_OPEN_EVENT, handleSwipeOpen);
      document.removeEventListener("pointerdown", handlePointerDownOutside);
    };
  }, [cardKey]);

  function announceSwipeOpen() {
    window.dispatchEvent(
      new CustomEvent<SwipeOpenDetail>(SWIPE_OPEN_EVENT, {
        detail: { id: cardKey },
      }),
    );
  }

  function clampOffset(value: number) {
    return Math.min(0, Math.max(-ACTION_WIDTH, value));
  }

  function handleLocationClick(clickEvent: MouseEvent<HTMLButtonElement>) {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    if (offsetRef.current !== 0) {
      setOffset(0);
      return;
    }
    if (mapLocation) {
      setIsMapOpen(true);
    }
  }

  function handleCardActivate() {
    if (suppressClickRef.current || isDragging) {
      suppressClickRef.current = false;
      movedRef.current = false;
      return;
    }
    if (offsetRef.current !== 0) {
      setOffset(0);
      return;
    }
    router.push(
      event.occurrenceDate && isRecurring
        ? `/events/${event.id}?on=${event.occurrenceDate}`
        : `/events/${event.id}`,
    );
  }

  function handlePointerDown(pointerEvent: ReactPointerEvent<HTMLDivElement>) {
    if (pointerEvent.button !== 0) {
      return;
    }

    activePointerIdRef.current = pointerEvent.pointerId;
    startXRef.current = pointerEvent.clientX;
    startYRef.current = pointerEvent.clientY;
    startOffsetRef.current = offsetRef.current;
    lockRef.current = "none";
    movedRef.current = false;
    suppressClickRef.current = false;
    setIsDragging(false);
  }

  function handlePointerMove(pointerEvent: ReactPointerEvent<HTMLDivElement>) {
    if (activePointerIdRef.current !== pointerEvent.pointerId) {
      return;
    }

    const dx = pointerEvent.clientX - startXRef.current;
    const dy = pointerEvent.clientY - startYRef.current;

    if (lockRef.current === "none") {
      if (Math.abs(dx) < DIRECTION_LOCK && Math.abs(dy) < DIRECTION_LOCK) {
        return;
      }

      if (Math.abs(dy) > Math.abs(dx)) {
        lockRef.current = "vertical";
        return;
      }

      lockRef.current = "horizontal";
      setIsDragging(true);
      announceSwipeOpen();
      try {
        pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
      } catch {
        // Some browsers may reject capture; gesture still works via bubbling.
      }
    }

    if (lockRef.current !== "horizontal") {
      return;
    }

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();

    if (Math.abs(dx) > 4) {
      movedRef.current = true;
      suppressClickRef.current = true;
    }

    setOffset(clampOffset(startOffsetRef.current + dx));
  }

  function finishPointerGesture(pointerEvent: ReactPointerEvent<HTMLDivElement>) {
    if (activePointerIdRef.current !== pointerEvent.pointerId) {
      return;
    }

    activePointerIdRef.current = null;

    if (lockRef.current === "horizontal") {
      const nextOffset =
        offsetRef.current <= -OPEN_THRESHOLD ? -ACTION_WIDTH : 0;
      setOffset(nextOffset);
      if (movedRef.current) {
        suppressClickRef.current = true;
      }
      try {
        pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
      } catch {
        // ignore
      }
    }

    lockRef.current = "none";
    setIsDragging(false);
  }

  function handleDeleteButtonClick(clickEvent: MouseEvent<HTMLButtonElement>) {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    setDeleteError(null);
    setOffset(0);
    if (isRecurring) {
      setIsRecurrenceDeleteOpen(true);
    } else {
      setIsDeleteOpen(true);
    }
  }

  async function performDelete(scope: RecurrenceDeleteScope = "all") {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteEvent(event.id, {
        scope,
        occurrenceDate: event.occurrenceDate,
      });
      setIsDeleteOpen(false);
      setIsRecurrenceDeleteOpen(false);
      setOffset(0);
      onDeleted?.(event.id);
    } catch (error) {
      console.error(error);
      setDeleteError("We couldn’t delete this event. Please try again.");
      setIsDeleting(false);
    }
  }

  async function handleDeleteConfirm() {
    await performDelete("all");
  }

  return (
    <>
      <div
        ref={rootRef}
        className="relative overflow-hidden rounded-2xl"
        style={{ animationDelay: `${100 + index * 60}ms` }}
      >
        <div
          className="absolute inset-y-0 right-0 z-0 flex w-[88px] items-stretch"
          aria-hidden={offset === 0}
        >
          <button
            type="button"
            onClick={handleDeleteButtonClick}
            aria-label={`Delete ${event.title}`}
            className="flex w-full flex-col items-center justify-center gap-1 bg-accent px-2 text-sm font-bold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <TrashIcon />
            <span>Delete</span>
          </button>
        </div>

        <div
          role="link"
          tabIndex={0}
          aria-label={`View ${event.title}`}
          className="relative z-10 touch-pan-y rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          style={{
            transform: `translateX(${offset}px)`,
            transition: isDragging ? "none" : "transform 180ms ease",
          }}
          onClick={handleCardActivate}
          onKeyDown={(keyboardEvent) => {
            if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
              keyboardEvent.preventDefault();
              handleCardActivate();
            }
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerGesture}
          onPointerCancel={finishPointerGesture}
        >
          <article
            className={[
              "animate-soft-pop rounded-2xl border px-4 py-4 backdrop-blur-sm transition duration-200",
              isNext
                ? "shadow-[0_14px_32px_rgba(184,51,74,0.12)]"
                : "shadow-[var(--shadow)] hover:-translate-y-0.5",
            ].join(" ")}
            style={{
              backgroundColor: categoryStyles.backgroundColor,
              borderColor: categoryStyles.borderColor,
              borderLeftWidth: 5,
              borderLeftColor: categoryStyles.accentColor,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {isNext ? (
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">
                    Up Next
                  </p>
                ) : null}
                <h3
                  className={[
                    "font-bold text-foreground",
                    isNext ? "mt-1 text-xl" : "text-base",
                  ].join(" ")}
                >
                  {event.title}
                </h3>
                <p
                  className="mt-1 text-sm font-semibold"
                  style={{ color: categoryStyles.dateTimeColor }}
                >
                  {dateLabel}
                  {timeLabel ? (
                    <>
                      <span className="mx-1.5 opacity-50" aria-hidden="true">
                        ·
                      </span>
                      <span>{timeLabel}</span>
                    </>
                  ) : null}
                </p>
              </div>
              <MemberBadge member={event.assignedTo} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CategoryBadge
                category={event.category}
                colorMap={categoryColorMap}
              />
              {locationLabel ? (
                <button
                  type="button"
                  onClick={handleLocationClick}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-transparent px-1.5 py-1 text-left text-xs font-medium text-muted transition hover:border-accent/25 hover:bg-white/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                  aria-label={`Open ${locationLabel} in maps`}
                >
                  <LocationIcon />
                  <span className="truncate underline decoration-muted/40 underline-offset-2">
                    {locationLabel}
                  </span>
                </button>
              ) : null}
            </div>

            {notesText ? (
              <p className="mt-3 line-clamp-2 text-sm leading-snug text-muted">
                {notesText}
              </p>
            ) : null}
          </article>
        </div>
      </div>

      {mapLocation ? (
        <MapOpenDialog
          open={isMapOpen}
          location={mapLocation}
          onClose={() => setIsMapOpen(false)}
        />
      ) : null}

      <DeleteConfirmDialog
        open={isDeleteOpen}
        eventTitle={event.title}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => {
          if (!isDeleting) {
            setIsDeleteOpen(false);
            setDeleteError(null);
            setOffset(0);
          }
        }}
        onConfirm={() => void handleDeleteConfirm()}
      />

      <RecurrenceScopeDialog
        open={isRecurrenceDeleteOpen}
        mode="delete"
        eventTitle={event.title}
        isBusy={isDeleting}
        errorMessage={deleteError}
        onCancel={() => {
          if (!isDeleting) {
            setIsRecurrenceDeleteOpen(false);
            setDeleteError(null);
            setOffset(0);
          }
        }}
        onConfirm={(scope) => void performDelete(scope)}
      />
    </>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 6h11" />
      <path d="M8 6V4.5h4V6" />
      <path d="M6.5 6l.6 9h5.8l.6-9" />
      <path d="M8.5 9v4.5M11.5 9v4.5" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5 shrink-0 text-honey"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 2a5.5 5.5 0 0 0-5.5 5.5c0 3.53 4.2 8.64 5.12 9.7a.5.5 0 0 0 .76 0c.92-1.06 5.12-6.17 5.12-9.7A5.5 5.5 0 0 0 10 2Zm0 7.75a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

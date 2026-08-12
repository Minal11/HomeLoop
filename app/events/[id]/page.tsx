"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import CategoryBadge from "@/components/CategoryBadge";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import MapOpenDialog from "@/components/MapOpenDialog";
import MemberBadge from "@/components/MemberBadge";
import { deleteEvent, getEventById } from "@/lib/events";
import type { FamilyEvent } from "@/types/event";
import { formatEventDate, formatTime } from "@/utils/events";
import {
  eventToMapLocation,
  getEventLocationLabel,
} from "@/utils/maps";

type PageState = "loading" | "ready" | "not-found" | "error";

export default function EventDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;

  const [event, setEvent] = useState<FamilyEvent | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    setPageState("loading");

    try {
      const nextEvent = await getEventById(eventId);
      if (!nextEvent) {
        setEvent(null);
        setPageState("not-found");
        return;
      }

      setEvent(nextEvent);
      setPageState("ready");
    } catch (error) {
      console.error(error);
      setPageState("error");
    }
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;

    void getEventById(eventId)
      .then((nextEvent) => {
        if (cancelled) {
          return;
        }

        if (!nextEvent) {
          setEvent(null);
          setPageState("not-found");
          return;
        }

        setEvent(nextEvent);
        setPageState("ready");
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) {
          setPageState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function handleDeleteConfirm() {
    if (!event || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteEvent(event.id);
      router.push("/");
    } catch (error) {
      console.error(error);
      setDeleteError("We couldn’t delete this event. Please try again.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-6 sm:max-w-lg sm:pt-10">
      <header className="animate-fade-up mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl py-1 text-sm font-bold text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        >
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </Link>
      </header>

      {pageState === "loading" ? (
        <LoadingState />
      ) : pageState === "not-found" ? (
        <NotFoundState />
      ) : pageState === "error" ? (
        <ErrorState onRetry={() => void loadEvent()} />
      ) : event ? (
        <EventDetails
          event={event}
          onDelete={() => {
            setDeleteError(null);
            setIsDeleteOpen(true);
          }}
        />
      ) : null}

      {event ? (
        <DeleteConfirmDialog
          open={isDeleteOpen}
          eventTitle={event.title}
          isDeleting={isDeleting}
          errorMessage={deleteError}
          onCancel={() => {
            if (!isDeleting) {
              setIsDeleteOpen(false);
            }
          }}
          onConfirm={() => void handleDeleteConfirm()}
        />
      ) : null}
    </div>
  );
}

function EventDetails({
  event,
  onDelete,
}: {
  event: FamilyEvent;
  onDelete: () => void;
}) {
  const dateLabel = formatEventDate(event);
  const startTimeLabel = event.startTime ? formatTime(event.startTime) : null;
  const endTimeLabel = event.endTime ? formatTime(event.endTime) : null;
  const showEndDate =
    Boolean(event.endDate) && event.endDate !== event.startDate;
  const locationLabel = getEventLocationLabel(event);
  const mapLocation = eventToMapLocation(event);
  const [isMapOpen, setIsMapOpen] = useState(false);

  return (
    <main className="animate-fade-up flex flex-1 flex-col">
      <div className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {event.title}
          </h1>
          <MemberBadge member={event.assignedTo} />
        </div>

        <dl className="mt-6 space-y-4">
          <DetailRow label="Date" value={dateLabel} />
          {startTimeLabel ? (
            <DetailRow label="Start time" value={startTimeLabel} />
          ) : null}
          {showEndDate && event.endDate ? (
            <DetailRow
              label="End date"
              value={new Date(
                `${event.endDate}T00:00:00`,
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            />
          ) : null}
          {endTimeLabel ? (
            <DetailRow label="End time" value={endTimeLabel} />
          ) : null}
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
              Category
            </dt>
            <dd className="mt-2">
              <CategoryBadge category={event.category} />
            </dd>
          </div>
          {locationLabel ? (
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
                Location
              </dt>
              <dd className="mt-1">
                <button
                  type="button"
                  onClick={() => setIsMapOpen(true)}
                  className="text-left text-base font-semibold text-foreground underline decoration-accent/40 underline-offset-2 transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                >
                  {locationLabel}
                </button>
                {event.locationAddress &&
                event.locationAddress !== locationLabel ? (
                  <p className="mt-1 text-sm text-muted">
                    {event.locationAddress}
                  </p>
                ) : null}
              </dd>
            </div>
          ) : null}
          {event.notes ? (
            <DetailRow label="Notes" value={event.notes} />
          ) : null}
        </dl>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={`/events/${event.id}/edit`}
          className="flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white shadow-[0_14px_28px_rgba(184,51,74,0.28)] transition hover:bg-accent-deep"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-2xl border border-accent/35 bg-white/80 px-5 py-3.5 text-base font-bold text-accent transition hover:bg-accent-soft/40"
        >
          Delete
        </button>
        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-2xl border border-surface-border bg-white/70 px-5 py-3.5 text-base font-bold text-foreground transition hover:bg-white"
        >
          Back to Upcoming Events
        </Link>
      </div>

      {mapLocation ? (
        <MapOpenDialog
          open={isMapOpen}
          location={mapLocation}
          onClose={() => setIsMapOpen(false)}
        />
      ) : null}
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <p className="text-sm font-semibold text-muted">Loading event…</p>
      <div className="h-48 animate-pulse rounded-3xl border border-surface-border bg-white/55" />
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="rounded-3xl border border-surface-border bg-surface px-5 py-10 text-center shadow-[var(--shadow)]">
      <p className="font-display text-2xl font-medium text-foreground">
        Event not found
      </p>
      <p className="mt-2 text-sm text-muted">
        This event may have been deleted or the link is incorrect.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-deep"
      >
        Back to Upcoming Events
      </Link>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-surface-border bg-surface px-5 py-10 text-center shadow-[var(--shadow)]">
      <p className="font-display text-2xl font-medium text-foreground">
        We couldn’t load this event.
      </p>
      <p className="mt-2 text-sm text-muted">Please try again in a moment.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-deep"
      >
        Retry
      </button>
    </div>
  );
}

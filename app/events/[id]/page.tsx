"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import CategoryBadge from "@/components/CategoryBadge";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { HeartButton, HeartLink } from "@/components/HeartButton";
import MapOpenDialog from "@/components/MapOpenDialog";
import MemberBadge from "@/components/MemberBadge";
import RecurrenceScopeDialog from "@/components/RecurrenceScopeDialog";
import { deleteEvent, getEventById } from "@/lib/events";
import type { FamilyEvent } from "@/types/event";
import type { RecurrenceDeleteScope } from "@/types/recurrence";
import { formatEventDate, formatTime } from "@/utils/events";
import {
  eventToMapLocation,
  getEventLocationLabel,
} from "@/utils/maps";
import { describeRecurrence, isRecurringRule } from "@/utils/recurrence";
import { formatReminderLabel } from "@/utils/reminders";

type PageState = "loading" | "ready" | "not-found" | "error";

export default function EventDetailsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.id;
  const occurrenceDate = searchParams.get("on");

  const [event, setEvent] = useState<FamilyEvent | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRecurrenceDeleteOpen, setIsRecurrenceDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    setPageState("loading");

    try {
      const nextEvent = await getEventById(eventId, occurrenceDate);
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
  }, [eventId, occurrenceDate]);

  useEffect(() => {
    let cancelled = false;

    void getEventById(eventId, occurrenceDate)
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
  }, [eventId, occurrenceDate]);

  async function performDelete(scope: RecurrenceDeleteScope = "all") {
    if (!event || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteEvent(event.id, {
        scope,
        occurrenceDate: occurrenceDate ?? event.occurrenceDate,
      });
      router.push("/");
    } catch (error) {
      console.error(error);
      setDeleteError("We couldn’t delete this event. Please try again.");
      setIsDeleting(false);
    }
  }

  const editHref = occurrenceDate
    ? `/events/${eventId}/edit?on=${occurrenceDate}`
    : `/events/${eventId}/edit`;

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
          editHref={editHref}
          onDelete={() => {
            setDeleteError(null);
            if (isRecurringRule(event.recurrence)) {
              setIsRecurrenceDeleteOpen(true);
            } else {
              setIsDeleteOpen(true);
            }
          }}
        />
      ) : null}

      {event ? (
        <>
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
            onConfirm={() => void performDelete("all")}
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
              }
            }}
            onConfirm={(scope) => void performDelete(scope)}
          />
        </>
      ) : null}
    </div>
  );
}

function EventDetails({
  event,
  editHref,
  onDelete,
}: {
  event: FamilyEvent;
  editHref: string;
  onDelete: () => void;
}) {
  const dateLabel = formatEventDate(event);
  const startTimeLabel = event.startTime ? formatTime(event.startTime) : null;
  const endTimeLabel = event.endTime ? formatTime(event.endTime) : null;
  const showEndDate =
    Boolean(event.endDate) && event.endDate !== event.startDate;
  const locationLabel = getEventLocationLabel(event);
  const mapLocation = eventToMapLocation(event);
  const reminderLabel = formatReminderLabel(event.reminderOffsetMinutes);
  const recurrenceLabel = describeRecurrence(
    event.recurrence,
    event.seriesId ? event.startDate : event.startDate,
  );
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
          {recurrenceLabel ? (
            <DetailRow label="Repeats" value={recurrenceLabel} />
          ) : null}
          {reminderLabel ? (
            <DetailRow label="Reminder" value={reminderLabel} />
          ) : null}
          {event.notes ? (
            <DetailRow label="Notes" value={event.notes} />
          ) : null}
        </dl>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <HeartLink href={editHref} className="w-full">
          Edit
        </HeartLink>
        <HeartButton
          type="button"
          variant="secondary"
          onClick={onDelete}
          className="w-full"
        >
          Delete
        </HeartButton>
        <HeartLink href="/" variant="secondary" className="w-full">
          Back to Upcoming Events
        </HeartLink>
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
      <HeartLink href="/" size="sm" className="mt-6">
        Back to Upcoming Events
      </HeartLink>
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
      <HeartButton type="button" onClick={onRetry} size="sm" className="mt-6">
        Retry
      </HeartButton>
    </div>
  );
}

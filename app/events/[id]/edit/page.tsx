"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import EventForm, { familyEventToFormValues } from "@/components/EventForm";
import { HeartLink } from "@/components/HeartButton";
import RecurrenceScopeDialog from "@/components/RecurrenceScopeDialog";
import { getEventById, updateEvent } from "@/lib/events";
import type { FamilyEvent, NewFamilyEventInput } from "@/types/event";
import type { RecurrenceEditScope } from "@/types/recurrence";
import { isRecurringRule } from "@/utils/recurrence";

type PageState = "loading" | "ready" | "not-found" | "error";

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.id;
  const occurrenceDate = searchParams.get("on");

  const [event, setEvent] = useState<FamilyEvent | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [pendingInput, setPendingInput] = useState<NewFamilyEventInput | null>(
    null,
  );
  const [scopeOpen, setScopeOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  function detailsHref() {
    return occurrenceDate
      ? `/events/${eventId}?on=${occurrenceDate}`
      : `/events/${eventId}`;
  }

  async function applyUpdate(
    input: NewFamilyEventInput,
    scope: RecurrenceEditScope,
  ) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await updateEvent(eventId, input, {
        scope,
        occurrenceDate: occurrenceDate ?? event?.occurrenceDate,
      });
      setScopeOpen(false);
      setPendingInput(null);
      if (scope === "this") {
        router.push(`/events/${updated.id}`);
      } else if (scope === "future") {
        router.push(
          updated.occurrenceDate
            ? `/events/${updated.id}?on=${updated.startDate}`
            : `/events/${updated.id}`,
        );
      } else {
        router.push(detailsHref());
      }
    } catch (error) {
      console.error(error);
      setSaveError("We couldn’t save this event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(input: NewFamilyEventInput) {
    if (event && isRecurringRule(event.recurrence)) {
      setPendingInput(input);
      setScopeOpen(true);
      return;
    }
    await applyUpdate(input, "all");
  }

  function handleCancel() {
    router.push(detailsHref());
  }

  return (
    <div className="relative mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col overflow-x-clip px-5 pb-6 pt-6 sm:max-w-lg sm:pt-10">
      <header className="animate-fade-up mb-6">
        <Link
          href={detailsHref()}
          className="inline-flex items-center gap-2 rounded-xl py-1 text-sm font-bold text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        >
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Edit Event
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Update the details for your family.
        </p>
      </header>

      {pageState === "loading" ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <p className="text-sm font-semibold text-muted">Loading event…</p>
          <div className="h-40 animate-pulse rounded-3xl border border-surface-border bg-white/55" />
        </div>
      ) : pageState === "not-found" ? (
        <div className="rounded-3xl border border-surface-border bg-surface px-5 py-10 text-center shadow-[var(--shadow)]">
          <p className="font-display text-2xl font-medium text-foreground">
            Event not found
          </p>
          <HeartLink href="/" size="sm" className="mt-6">
            Back to Upcoming Events
          </HeartLink>
        </div>
      ) : pageState === "error" ? (
        <div className="rounded-3xl border border-surface-border bg-surface px-5 py-10 text-center shadow-[var(--shadow)]">
          <p className="font-display text-2xl font-medium text-foreground">
            We couldn’t load this event.
          </p>
          <HeartLink href={detailsHref()} size="sm" className="mt-6">
            Back to event
          </HeartLink>
        </div>
      ) : event ? (
        <EventForm
          initialValues={familyEventToFormValues(event)}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      ) : null}

      {event ? (
        <RecurrenceScopeDialog
          open={scopeOpen}
          mode="edit"
          eventTitle={event.title}
          isBusy={isSaving}
          errorMessage={saveError}
          onCancel={() => {
            if (!isSaving) {
              setScopeOpen(false);
              setPendingInput(null);
              setSaveError(null);
            }
          }}
          onConfirm={(scope) => {
            if (pendingInput) {
              void applyUpdate(pendingInput, scope);
            }
          }}
        />
      ) : null}
    </div>
  );
}

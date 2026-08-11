"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import EventForm, { familyEventToFormValues } from "@/components/EventForm";
import { getEventById, updateEvent } from "@/lib/events";
import type { FamilyEvent, NewFamilyEventInput } from "@/types/event";

type PageState = "loading" | "ready" | "not-found" | "error";

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;

  const [event, setEvent] = useState<FamilyEvent | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");

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

  async function handleSubmit(input: NewFamilyEventInput) {
    await updateEvent(eventId, input);
    router.push(`/events/${eventId}`);
  }

  function handleCancel() {
    router.push(`/events/${eventId}`);
  }

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-6 pt-6 sm:max-w-lg sm:pt-10">
      <header className="animate-fade-up mb-6">
        <Link
          href={`/events/${eventId}`}
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
          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-deep"
          >
            Back to Upcoming Events
          </Link>
        </div>
      ) : pageState === "error" ? (
        <div className="rounded-3xl border border-surface-border bg-surface px-5 py-10 text-center shadow-[var(--shadow)]">
          <p className="font-display text-2xl font-medium text-foreground">
            We couldn’t load this event.
          </p>
          <Link
            href={`/events/${eventId}`}
            className="mt-6 inline-flex rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-deep"
          >
            Back to event
          </Link>
        </div>
      ) : event ? (
        <EventForm
          initialValues={familyEventToFormValues(event)}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import EmptyState from "@/components/EmptyState";
import EventCard from "@/components/EventCard";
import SignOutButton from "@/components/SignOutButton";
import { DEMO_TODAY } from "@/data/events";
import { getEvents } from "@/lib/events";
import type { FamilyEvent } from "@/types/event";
import { getNextEvent, groupEventsByRelativeDay } from "@/utils/events";

type LoadState = "loading" | "ready" | "error";

export default function Home() {
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const loadEvents = useCallback(async () => {
    setLoadState("loading");

    try {
      const nextEvents = await getEvents();
      setEvents(nextEvents);
      setLoadState("ready");
    } catch (error) {
      console.error(error);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getEvents()
      .then((nextEvents) => {
        if (cancelled) {
          return;
        }
        setEvents(nextEvents);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) {
          setLoadState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const nextEvent = getNextEvent(events, DEMO_TODAY);
  const remainingEvents = nextEvent
    ? events.filter((event) => event.id !== nextEvent.id)
    : events;
  const sections = groupEventsByRelativeDay(remainingEvents, DEMO_TODAY);
  const hasEvents = events.length > 0;

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-28 pt-8 sm:max-w-lg sm:pt-12">
      <header className="animate-fade-up flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            HomeLoop
          </h1>
          <p className="mt-2 max-w-xs text-base text-muted sm:text-lg">
            Keep your family in the loop.
          </p>
        </div>
        <SignOutButton />
      </header>

      <main className="mt-8 flex flex-1 flex-col">
        <h2
          className="animate-fade-up font-display text-2xl font-medium tracking-tight text-foreground"
          style={{ animationDelay: "60ms" }}
        >
          Upcoming Events
        </h2>

        {loadState === "loading" ? (
          <LoadingState />
        ) : loadState === "error" ? (
          <ErrorState onRetry={() => void loadEvents()} />
        ) : !hasEvents ? (
          <div className="mt-6">
            <EmptyState href="/events/new" />
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-7">
            {nextEvent ? (
              <section aria-label="Up next">
                <EventCard event={nextEvent} variant="next" index={0} />
              </section>
            ) : null}

            {sections.map((section) => (
              <section
                key={section.key}
                aria-labelledby={`section-${section.key}`}
                className="animate-fade-up"
              >
                <h3
                  id={`section-${section.key}`}
                  className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted"
                >
                  {section.label}
                </h3>
                <ul className="flex list-none flex-col gap-3 p-0">
                  {section.events.map((event, index) => (
                    <li key={event.id}>
                      <EventCard event={event} index={index + 1} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-5 pb-5 pt-10">
        <div className="pointer-events-auto w-full max-w-md sm:max-w-lg">
          <Link
            href="/events/new"
            className="flex w-full items-center justify-center rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white shadow-[0_14px_28px_rgba(184,51,74,0.32)] transition duration-200 hover:bg-accent-deep active:scale-[0.98]"
          >
            + Add Event
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-6 space-y-3" aria-busy="true" aria-live="polite">
      <p className="text-sm font-semibold text-muted">
        Loading your family events…
      </p>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse rounded-2xl border border-surface-border bg-white/55"
        />
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-6 rounded-3xl border border-surface-border bg-surface px-5 py-8 text-center shadow-[var(--shadow)]">
      <p className="font-display text-xl font-medium text-foreground">
        We couldn’t load your family events.
      </p>
      <p className="mt-2 text-sm text-muted">
        Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-deep"
      >
        Retry
      </button>
    </div>
  );
}

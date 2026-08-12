"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
} from "react";

import EmptyState from "@/components/EmptyState";
import EventCard from "@/components/EventCard";
import FamilyOnboarding from "@/components/FamilyOnboarding";
import Heart from "@/components/Heart";
import SignOutButton from "@/components/SignOutButton";
import { getCurrentFamily } from "@/lib/families";
import { getEvents } from "@/lib/events";
import type { FamilyEvent } from "@/types/event";
import { getNextEvent, groupEventsByRelativeDay } from "@/utils/events";

type LoadState = "loading" | "ready" | "error" | "no-family";

const PULL_THRESHOLD_PX = 72;

export default function Home() {
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const isFetchingRef = useRef(false);
  const pullStartYRef = useRef<number | null>(null);
  const pullActiveRef = useRef(false);

  const refreshEvents = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsRefreshing(true);

    try {
      const family = await getCurrentFamily();
      if (!family) {
        setEvents([]);
        setLoadState("no-family");
        return;
      }

      const nextEvents = await getEvents();
      setEvents(nextEvents);
      setLoadState("ready");
    } catch (error) {
      console.error(error);
      setLoadState((current) => (current === "ready" ? current : "error"));
    } finally {
      isFetchingRef.current = false;
      setIsRefreshing(false);
      setPullDistance(0);
      pullActiveRef.current = false;
      pullStartYRef.current = null;
    }
  }, []);

  const reloadHome = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoadState("loading");
    setIsRefreshing(false);

    try {
      const family = await getCurrentFamily();
      if (!family) {
        setEvents([]);
        setLoadState("no-family");
        return;
      }

      const nextEvents = await getEvents();
      setEvents(nextEvents);
      setLoadState("ready");
    } catch (error) {
      console.error(error);
      setLoadState("error");
    } finally {
      isFetchingRef.current = false;
      setPullDistance(0);
      pullActiveRef.current = false;
      pullStartYRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (isFetchingRef.current) {
        return;
      }
      isFetchingRef.current = true;

      try {
        const family = await getCurrentFamily();
        if (cancelled) {
          return;
        }
        if (!family) {
          setEvents([]);
          setLoadState("no-family");
          return;
        }

        const nextEvents = await getEvents();
        if (cancelled) {
          return;
        }
        setEvents(nextEvents);
        setLoadState("ready");
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLoadState("error");
        }
      } finally {
        if (!cancelled) {
          isFetchingRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
      isFetchingRef.current = false;
    };
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshEvents();
      }
    }

    function handleWindowFocus() {
      if (document.visibilityState === "visible") {
        void refreshEvents();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [refreshEvents]);

  function canPullToRefresh() {
    if (typeof window === "undefined") {
      return false;
    }
    if (loadState !== "ready" && loadState !== "error") {
      return false;
    }
    if (isFetchingRef.current || isRefreshing) {
      return false;
    }
    return window.scrollY <= 0;
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (!canPullToRefresh()) {
      pullStartYRef.current = null;
      pullActiveRef.current = false;
      return;
    }

    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    pullActiveRef.current = true;
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    if (!pullActiveRef.current || pullStartYRef.current == null) {
      return;
    }

    if (window.scrollY > 0) {
      pullStartYRef.current = null;
      pullActiveRef.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = event.touches[0]?.clientY ?? pullStartYRef.current;
    const delta = Math.max(0, currentY - pullStartYRef.current);
    const resisted = Math.min(delta * 0.45, 96);
    setPullDistance(resisted);
  }

  function handleTouchEnd() {
    if (!pullActiveRef.current) {
      return;
    }

    const shouldRefresh = pullDistance >= PULL_THRESHOLD_PX;
    pullActiveRef.current = false;
    pullStartYRef.current = null;

    if (shouldRefresh) {
      void refreshEvents();
      return;
    }

    setPullDistance(0);
  }

  if (loadState === "no-family") {
    return <FamilyOnboarding onFamilyReady={() => void reloadHome()} />;
  }

  const now = new Date();
  const nextEvent = getNextEvent(events, now);
  const remainingEvents = nextEvent
    ? events.filter((event) => event.id !== nextEvent.id)
    : events;
  const sections = groupEventsByRelativeDay(remainingEvents, now);
  const hasEvents = events.length > 0;
  const showPullHint = pullDistance > 8;

  return (
    <div
      className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-28 pt-8 sm:max-w-lg sm:pt-12"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {showPullHint || isRefreshing ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center"
          aria-live="polite"
          style={{
            transform: `translateY(${Math.max(pullDistance - 24, isRefreshing ? 8 : 0)}px)`,
            opacity: isRefreshing
              ? 1
              : Math.min(pullDistance / PULL_THRESHOLD_PX, 1),
          }}
        >
          <span className="rounded-full border border-surface-border bg-white/90 px-3 py-1 text-xs font-bold text-muted shadow-[var(--shadow)]">
            {isRefreshing
              ? "Refreshing…"
              : pullDistance >= PULL_THRESHOLD_PX
                ? "Release to refresh"
                : "Pull to refresh"}
          </span>
        </div>
      ) : null}

      <header className="animate-fade-up flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            HomeLoop
            <Heart
              size={18}
              className="ml-2 inline-block translate-y-[-0.15em] opacity-80 animate-heart-float"
            />
          </h1>
          <p className="mt-2 max-w-xs text-base text-muted sm:text-lg">
            Keep your family in the loop.
          </p>
          <nav className="mt-3 flex items-center gap-3">
            <Link
              href="/family"
              className="text-sm font-bold text-accent transition hover:text-accent-deep"
            >
              Family
            </Link>
          </nav>
        </div>
        <SignOutButton />
      </header>

      <main className="mt-8 flex flex-1 flex-col">
        <div
          className="animate-fade-up flex items-center justify-between gap-3"
          style={{ animationDelay: "60ms" }}
        >
          <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">
            Upcoming Events
          </h2>
          <button
            type="button"
            onClick={() => void refreshEvents()}
            disabled={isRefreshing || loadState === "loading"}
            aria-busy={isRefreshing}
            aria-label="Refresh events"
            title="Refresh events"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-white/80 text-muted transition hover:border-accent/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon spinning={isRefreshing} />
          </button>
        </div>

        {loadState === "loading" ? (
          <LoadingState />
        ) : loadState === "error" ? (
          <ErrorState onRetry={() => void reloadHome()} />
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

      <div className="pointer-events-none safe-bottom fixed inset-x-0 bottom-0 z-20 flex justify-center px-5 pt-10">
        <div className="pointer-events-auto w-full max-w-md sm:max-w-lg">
          <Link
            href="/events/new"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white shadow-[0_14px_28px_rgba(184,51,74,0.32)] transition duration-200 hover:bg-accent-deep active:scale-[0.98]"
          >
            + Add Event
            <Heart size={14} className="text-white/90" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={["h-4 w-4", spinning ? "animate-spin" : ""].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16.5 10a6.5 6.5 0 1 1-1.7-4.4" />
      <path d="M16.5 3.5v4h-4" />
    </svg>
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

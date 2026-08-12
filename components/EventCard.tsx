"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";

import CategoryBadge from "@/components/CategoryBadge";
import MapOpenDialog from "@/components/MapOpenDialog";
import MemberBadge from "@/components/MemberBadge";
import type { FamilyEvent } from "@/types/event";
import { formatEventDate, formatTime } from "@/utils/events";
import { eventToMapLocation, getEventLocationLabel } from "@/utils/maps";

type EventCardProps = {
  event: FamilyEvent;
  index?: number;
  variant?: "default" | "next";
};

export default function EventCard({
  event,
  index = 0,
  variant = "default",
}: EventCardProps) {
  const isNext = variant === "next";
  const dateLabel = formatEventDate(event);
  const timeLabel = event.startTime ? formatTime(event.startTime) : null;
  const locationLabel = getEventLocationLabel(event);
  const mapLocation = eventToMapLocation(event);
  const [isMapOpen, setIsMapOpen] = useState(false);

  function handleLocationClick(clickEvent: MouseEvent<HTMLButtonElement>) {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    if (mapLocation) {
      setIsMapOpen(true);
    }
  }

  return (
    <>
      <Link
        href={`/events/${event.id}`}
        aria-label={`View ${event.title}`}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <article
          className={[
            "animate-soft-pop rounded-2xl border px-4 py-4 backdrop-blur-sm transition duration-200",
            isNext
              ? "border-accent/35 bg-white shadow-[0_14px_32px_rgba(184,51,74,0.14)]"
              : "border-surface-border bg-surface shadow-[var(--shadow)] hover:-translate-y-0.5 hover:border-accent/25",
          ].join(" ")}
          style={{ animationDelay: `${100 + index * 60}ms` }}
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
              <p className="mt-1 text-sm font-semibold text-ember">
                {dateLabel}
                {timeLabel ? (
                  <>
                    <span className="mx-1.5 text-muted/50" aria-hidden="true">
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
            <CategoryBadge category={event.category} />
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
        </article>
      </Link>

      {mapLocation ? (
        <MapOpenDialog
          open={isMapOpen}
          location={mapLocation}
          onClose={() => setIsMapOpen(false)}
        />
      ) : null}
    </>
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

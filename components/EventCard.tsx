import CategoryBadge from "@/components/CategoryBadge";
import MemberBadge from "@/components/MemberBadge";
import type { FamilyEvent } from "@/types/event";
import { formatEventDate, formatTime } from "@/utils/events";

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

  return (
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
        {event.location ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <LocationIcon />
            <span>{event.location}</span>
          </span>
        ) : null}
      </div>
    </article>
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

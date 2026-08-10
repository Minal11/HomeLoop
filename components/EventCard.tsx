type EventCardProps = {
  date: string;
  title: string;
  index?: number;
};

export default function EventCard({ date, title, index = 0 }: EventCardProps) {
  return (
    <article
      className="animate-soft-pop rounded-2xl border border-surface-border bg-surface px-4 py-3.5 shadow-[var(--shadow)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-accent/30"
      style={{ animationDelay: `${120 + index * 70}ms` }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-honey"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-wide text-ember">
            {date}
          </p>
          <h3 className="mt-0.5 text-base font-bold text-foreground">
            {title}
          </h3>
        </div>
      </div>
    </article>
  );
}

import EventCard from "@/components/EventCard";

const upcomingEvents = [
  { date: "Aug 14, 11:00 AM", title: "Ziva Vaccination" },
  { date: "Aug 15", title: "Hospital Visit" },
  { date: "Aug 16", title: "Friends Meetup" },
  { date: "Aug 22–23", title: "Workshop" },
  { date: "Aug 28", title: "Pooja" },
  { date: "Aug 29", title: "Birthday Party" },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-8 sm:pt-12">
      <header className="animate-fade-up">
        <p className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          HomeLoop
        </p>
        <p className="mt-2 max-w-xs text-base text-muted sm:text-lg">
          Keep your family in the loop.
        </p>
      </header>

      <main className="mt-8 flex flex-1 flex-col">
        <h2
          className="animate-fade-up font-display text-2xl font-medium tracking-tight text-foreground"
          style={{ animationDelay: "80ms" }}
        >
          Upcoming Events
        </h2>

        <ul className="mt-4 flex list-none flex-col gap-3 p-0">
          {upcomingEvents.map((event, index) => (
            <li key={`${event.date}-${event.title}`}>
              <EventCard date={event.date} title={event.title} index={index} />
            </li>
          ))}
        </ul>

        <div
          className="animate-fade-up mt-8"
          style={{ animationDelay: "520ms" }}
        >
          <button
            type="button"
            className="w-full rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white shadow-[0_12px_26px_rgba(184,51,74,0.3)] transition duration-200 hover:bg-accent-deep active:scale-[0.98]"
          >
            + Add Event
          </button>
        </div>
      </main>
    </div>
  );
}

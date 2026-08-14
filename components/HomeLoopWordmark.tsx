import Heart from "@/components/Heart";

type HomeLoopWordmarkProps = {
  className?: string;
  /** Text size class for the wordmark (Tailwind). */
  textClassName?: string;
  /** Show the accent heart after the name. */
  withHeart?: boolean;
  heartSize?: number;
  heartClassName?: string;
  /** Accessible name; defaults to HomeLoop. */
  label?: string;
  as?: "h1" | "p" | "span";
};

/**
 * Brand wordmark: the leading H is drawn as a little home (roof + H posts).
 */
export default function HomeLoopWordmark({
  className = "",
  textClassName = "font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl",
  withHeart = true,
  heartSize = 18,
  heartClassName = "ml-2 inline-block translate-y-[-0.15em] opacity-80 animate-heart-float",
  label = "HomeLoop",
  as: Tag = "span",
}: HomeLoopWordmarkProps) {
  return (
    <Tag
      className={["inline-flex items-center", textClassName, className]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
    >
      <span aria-hidden="true" className="inline-flex items-baseline">
        <HomeH className="mr-[0.02em] translate-y-[0.02em] text-accent" />
        <span>omeLoop</span>
      </span>
      {withHeart ? <Heart size={heartSize} className={heartClassName} /> : null}
    </Tag>
  );
}

/** Capital H drawn as a home: peaked roof over classic H uprights + crossbar. */
function HomeH({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 28"
      className={["inline-block h-[0.92em] w-[0.72em]", className]
        .filter(Boolean)
        .join(" ")}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Roof */}
      <path d="M11 1.2 1.8 9.4a1.1 1.1 0 0 0 1.45 1.65L11 5.2l7.75 5.85a1.1 1.1 0 1 0 1.45-1.65L11 1.2Z" />
      {/* Left post */}
      <rect x="3.4" y="10.2" width="3.6" height="16.4" rx="1.1" />
      {/* Right post */}
      <rect x="14.9" y="10.2" width="3.6" height="16.4" rx="1.1" />
      {/* Crossbar */}
      <rect x="3.4" y="15.6" width="15.1" height="3.5" rx="1.1" />
    </svg>
  );
}

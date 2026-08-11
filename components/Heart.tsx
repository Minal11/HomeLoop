type HeartProps = {
  className?: string;
  /** Visual size in rem-ish via className; default matches text accents */
  size?: number;
};

/** Decorative heart mark — keep usage sparse. */
export default function Heart({ className = "", size = 14 }: HeartProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={`shrink-0 text-accent ${className}`}
    >
      <path d="M12 21s-6.6-4.35-9.33-8.1C.6 9.9 1.35 5.85 4.8 4.35 6.9 3.45 9.15 4.05 12 6.3c2.85-2.25 5.1-2.85 7.2-1.95 3.45 1.5 4.2 5.55 2.13 8.55C18.6 16.65 12 21 12 21z" />
    </svg>
  );
}

"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import Heart from "@/components/Heart";
import { HeartButton } from "@/components/HeartButton";
import HomeLoopName from "@/components/HomeLoopName";
import { markHomeLoopOnboardingComplete } from "@/lib/onboarding";
import { EVENT_CATEGORIES } from "@/types/event";
import { CATEGORY_BASE_COLORS } from "@/utils/category-colors";

export type HowHomeLoopWorksMode = "first-time" | "replay";

type HowHomeLoopWorksProps = {
  open: boolean;
  mode: HowHomeLoopWorksMode;
  onClose: () => void;
};

type Step = {
  title: string;
  body: string;
  visual: ReactNode;
};

const STEPS: Step[] = [
  {
    title: "Welcome to HomeLoop",
    body: "Keep your family in the loop. Add appointments, activities, celebrations and everything your family needs to remember.",
    visual: <WelcomeVisual />,
  },
  {
    title: "One place for your family",
    body: "Create events, assign them to family members, add locations and set reminders so everyone knows what's coming up.",
    visual: <FeaturesVisual />,
  },
  {
    title: "See what's happening at a glance",
    body: "Categories are color-coded, making appointments, social events, activities and more easy to recognize.",
    visual: <CategoryColorsVisual />,
  },
  {
    title: "Keep everyone in the loop",
    body: "Invite your family so everyone can see and manage the family schedule together.",
    visual: <InviteVisual />,
  },
];

function subscribe() {
  return () => {};
}

export default function HowHomeLoopWorks({
  open,
  mode,
  onClose,
}: HowHomeLoopWorksProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const isFirst = mode === "first-time";
  const isLast = stepIndex === STEPS.length - 1;
  const step = STEPS[stepIndex];

  useEffect(() => {
    if (!open) {
      return;
    }

    const { body } = document;
    const scrollY = window.scrollY;
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;
    const previousLeft = body.style.left;
    const previousRight = body.style.right;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isFirst) {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      body.style.left = previousLeft;
      body.style.right = previousRight;
      window.scrollTo(0, scrollY);
    };
  }, [open, isFirst, onClose]);

  async function finishTour() {
    if (isSaving) {
      return;
    }

    if (!isFirst) {
      onClose();
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await markHomeLoopOnboardingComplete();
      onClose();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save. Please try again.",
      );
      setIsSaving(false);
    }
  }

  if (!open || !isClient || !step) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-[#2a2118]/45 px-0 sm:items-center sm:px-5"
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="safe-bottom flex max-h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border border-surface-border bg-[#fffaf4] shadow-[0_24px_60px_rgba(58,36,18,0.28)] outline-none sm:max-h-[min(92dvh,40rem)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-surface-border/80 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <HomeLoopName
            className="font-display text-lg font-semibold tracking-tight text-foreground"
            withHeart
            heartSize={14}
            heartClassName="ml-1.5 inline-block translate-y-[-0.1em] opacity-80"
          />
          {!isFirst ? (
            <button
              type="button"
              data-heart-burst="off"
              aria-label="Close How HomeLoop Works"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            >
              <CloseIcon />
            </button>
          ) : (
            <span className="h-9 w-9" aria-hidden="true" />
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6">
          <div className="mx-auto mb-5 flex h-28 w-full max-w-xs items-center justify-center">
            {step.visual}
          </div>

          <h2
            id={titleId}
            className="text-center font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            {step.title}
            {stepIndex === 0 ? (
              <Heart
                size={18}
                className="ml-2 inline-block translate-y-[-0.1em] opacity-85"
              />
            ) : null}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-muted sm:text-base">
            {step.body}
          </p>

          <div
            className="mt-6 flex items-center justify-center gap-2"
            aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}
          >
            {STEPS.map((_, index) => (
              <span
                key={index}
                className={[
                  "h-2.5 w-2.5 rounded-full transition",
                  index === stepIndex ? "bg-accent scale-110" : "bg-accent/25",
                ].join(" ")}
              />
            ))}
          </div>

          {errorMessage ? (
            <p role="alert" className="mt-4 text-center text-sm font-semibold text-accent">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-surface-border/80 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          {isLast ? (
            <HeartButton
              type="button"
              className="w-full"
              disabled={isSaving}
              aria-busy={isSaving}
              onClick={() => void finishTour()}
            >
              {isSaving
                ? "Saving…"
                : isFirst
                  ? "Get Started"
                  : "Done"}
            </HeartButton>
          ) : (
            <div className="flex gap-3">
              {stepIndex > 0 ? (
                <HeartButton
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setStepIndex((current) => current - 1)}
                >
                  Back
                </HeartButton>
              ) : (
                <div className="flex-1" aria-hidden="true" />
              )}
              <HeartButton
                type="button"
                className="flex-1"
                onClick={() => setStepIndex((current) => current + 1)}
              >
                Next
              </HeartButton>
            </div>
          )}
          {isLast && stepIndex > 0 ? (
            <button
              type="button"
              data-heart-burst="off"
              onClick={() => setStepIndex((current) => current - 1)}
              className="text-center text-sm font-bold text-muted transition hover:text-foreground"
            >
              Back
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function WelcomeVisual() {
  return (
    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent/15">
      <Heart size={42} className="text-accent animate-heart-float" />
    </div>
  );
}

function FeaturesVisual() {
  return (
    <div className="flex w-full items-center justify-center gap-3">
      <FeatureChip icon={<CalendarIcon />} label="Events" />
      <FeatureChip icon={<PeopleIcon />} label="Family" />
      <FeatureChip icon={<BellIcon />} label="Reminders" />
    </div>
  );
}

function FeatureChip({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex w-[5.5rem] flex-col items-center gap-2 rounded-2xl border border-surface-border bg-white/90 px-2 py-3 shadow-[var(--shadow)]">
      <span className="text-accent">{icon}</span>
      <span className="text-[0.7rem] font-bold text-foreground">{label}</span>
    </div>
  );
}

function CategoryColorsVisual() {
  const samples = EVENT_CATEGORIES.slice(0, 5);
  return (
    <div className="flex w-full max-w-xs flex-wrap items-center justify-center gap-2">
      {samples.map((category) => (
        <span
          key={category}
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold"
          style={{
            backgroundColor: `${CATEGORY_BASE_COLORS[category]}22`,
            borderColor: `${CATEGORY_BASE_COLORS[category]}55`,
            color: CATEGORY_BASE_COLORS[category],
          }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: CATEGORY_BASE_COLORS[category] }}
          />
          {category}
        </span>
      ))}
    </div>
  );
}

function InviteVisual() {
  return (
    <div className="flex h-24 w-full max-w-xs items-center justify-center gap-2 rounded-3xl border border-dashed border-accent/35 bg-accent-soft/30 px-4">
      <PeopleIcon />
      <span className="text-sm font-bold text-foreground">Invite code ready</span>
      <Heart size={14} className="opacity-80" />
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="m6 6 8 8M14 6l-8 8" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="2.5" />
      <circle cx="16" cy="9" r="2" />
      <path d="M3.5 18.5c1.2-2.4 3-3.6 5.5-3.6s4.3 1.2 5.5 3.6" />
      <path d="M14 14.2c1.5-.3 2.9.2 4 1.5.7.8 1.2 1.8 1.5 2.8" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5" />
      <path d="M4.5 16.5h15" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

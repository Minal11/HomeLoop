"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { HeartButton } from "@/components/HeartButton";
import HomeLoopName from "@/components/HomeLoopName";
import { createFamily, joinFamilyByInviteCode } from "@/lib/families";

type Mode = "choose" | "create" | "join";

type FamilyOnboardingProps = {
  /** Called after create/join so the home page can reload family state in place. */
  onFamilyReady?: () => void | Promise<void>;
};

export default function FamilyOnboarding({
  onFamilyReady,
}: FamilyOnboardingProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function finishSuccessfully() {
    if (onFamilyReady) {
      await onFamilyReady();
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createFamily(familyName);
      await finishSuccessfully();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create family.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await joinFamilyByInviteCode(inviteCode);
      await finishSuccessfully();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to join family.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:max-w-lg">
      <header className="animate-fade-up text-center sm:text-left">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Welcome to <HomeLoopName withHeart />
        </h1>
        <p className="mt-2 text-base text-muted sm:text-lg">
          Create your family or join one with an invite code.
        </p>
      </header>

      {mode === "choose" ? (
        <div
          className="animate-fade-up mt-8 space-y-3"
          style={{ animationDelay: "60ms" }}
        >
          <HeartButton
            type="button"
            onClick={() => {
              setMode("create");
              setErrorMessage(null);
            }}
            className="w-full"
          >
            Create Family
          </HeartButton>
          <HeartButton
            type="button"
            variant="secondary"
            onClick={() => {
              setMode("join");
              setErrorMessage(null);
            }}
            className="w-full"
          >
            Join Family
          </HeartButton>
        </div>
      ) : null}

      {mode === "create" ? (
        <form
          className="animate-fade-up mt-8 space-y-5 rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]"
          onSubmit={(event) => void handleCreate(event)}
        >
          <div>
            <h2 className="font-display text-2xl font-medium text-foreground">
              Create your family
            </h2>
            <p className="mt-1 text-sm text-muted">
              You&apos;ll be the owner and can invite others with a code.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="family-name" className="text-sm font-bold text-foreground">
              Family name
            </label>
            <input
              id="family-name"
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              required
              maxLength={80}
              placeholder="Kondawar-Agrekar Family"
              className="w-full rounded-2xl border border-surface-border bg-white/85 px-4 py-3.5 text-base text-foreground outline-none transition placeholder:text-muted/70 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/35"
            />
          </div>
          {errorMessage ? (
            <p role="alert" className="text-sm font-semibold text-accent">
              {errorMessage}
            </p>
          ) : null}
          <HeartButton
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Creating…" : "Create Family"}
          </HeartButton>
          <button
            type="button"
            onClick={() => setMode("choose")}
            className="w-full text-sm font-bold text-muted transition hover:text-foreground"
          >
            Back
          </button>
        </form>
      ) : null}

      {mode === "join" ? (
        <form
          className="animate-fade-up mt-8 space-y-5 rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]"
          onSubmit={(event) => void handleJoin(event)}
        >
          <div>
            <h2 className="font-display text-2xl font-medium text-foreground">
              Join a family
            </h2>
            <p className="mt-1 text-sm text-muted">
              Enter the invite code from a family owner.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="invite-code" className="text-sm font-bold text-foreground">
              Invite code
            </label>
            <input
              id="invite-code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              required
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABCD2345"
              className="w-full rounded-2xl border border-surface-border bg-white/85 px-4 py-3.5 text-base tracking-[0.12em] text-foreground outline-none transition placeholder:text-muted/70 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/35"
            />
          </div>
          {errorMessage ? (
            <p role="alert" className="text-sm font-semibold text-accent">
              {errorMessage}
            </p>
          ) : null}
          <HeartButton
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Joining…" : "Join Family"}
          </HeartButton>
          <button
            type="button"
            onClick={() => setMode("choose")}
            className="w-full text-sm font-bold text-muted transition hover:text-foreground"
          >
            Back
          </button>
          <p className="text-center text-sm text-muted">
            Or open{" "}
            <Link href="/family/join" className="font-bold text-accent hover:text-accent-deep">
              Join Family
            </Link>
          </p>
        </form>
      ) : null}
    </div>
  );
}

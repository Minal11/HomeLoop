"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import Heart from "@/components/Heart";
import { joinFamilyByInviteCode } from "@/lib/families";

export default function JoinFamilyPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await joinFamilyByInviteCode(inviteCode);
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to join family.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:max-w-lg">
      <header className="animate-fade-up">
        <Link
          href="/"
          className="text-sm font-bold text-muted transition hover:text-foreground"
        >
          ← HomeLoop
        </Link>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground">
          Join Family
          <Heart
            size={18}
            className="ml-2 inline-block translate-y-[-0.15em] opacity-80"
          />
        </h1>
        <p className="mt-2 text-base text-muted">
          Enter the invite code from your family owner.
        </p>
      </header>

      <form
        className="animate-fade-up mt-8 space-y-5 rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]"
        style={{ animationDelay: "60ms" }}
        onSubmit={(event) => void handleSubmit(event)}
      >
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
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="w-full rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white transition hover:bg-accent-deep disabled:opacity-70"
        >
          {isSubmitting ? "Joining…" : "Join Family"}
        </button>
      </form>
    </div>
  );
}

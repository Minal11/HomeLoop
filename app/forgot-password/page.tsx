"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { HeartButton } from "@/components/HeartButton";
import HomeLoopWordmark from "@/components/HomeLoopWordmark";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/utils/app-url";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setErrorMessage(null);
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const redirectTo = `${getSiteUrl()}/auth/confirm?next=/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

      if (error) {
        console.error(error);
        // Still show the generic success message for privacy on most failures.
        // Only surface a retry message for obvious delivery/network problems.
        const lower = error.message.toLowerCase();
        if (lower.includes("rate limit") || lower.includes("network")) {
          setErrorMessage(
            "Unable to send a reset email right now. Please try again shortly.",
          );
          return;
        }
      }

      setIsSent(true);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Unable to send a reset email right now. Please try again shortly.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:max-w-lg">
      <header className="animate-fade-up text-center sm:text-left">
        <HomeLoopWordmark as="h1" />
        <p className="mt-2 text-base text-muted sm:text-lg">
          Reset your password
        </p>
      </header>

      <div
        className="animate-fade-up mt-8 rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]"
        style={{ animationDelay: "60ms" }}
      >
        {isSent ? (
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-medium text-foreground">
              Check your email
            </h2>
            <p className="text-sm text-muted">
              If an account exists for this email, we’ve sent password reset
              instructions.
            </p>
            <Link
              href="/login"
              className="inline-flex text-sm font-bold text-accent transition hover:text-accent-deep"
            >
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)} noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-bold text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                placeholder="you@example.com"
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
              {isSubmitting ? "Sending…" : "Send Reset Link"}
            </HeartButton>

            <Link
              href="/login"
              className="inline-flex text-sm font-bold text-muted transition hover:text-foreground"
            >
              ← Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-surface-border bg-white/85 px-4 py-3.5 text-base text-foreground outline-none transition placeholder:text-muted/70 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/35";

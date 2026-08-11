"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import Heart from "@/components/Heart";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/utils/auth-errors";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode | null>(null);

  async function authenticate(mode: Mode) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setActiveMode(mode);
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter your email and password.");
      setIsSubmitting(false);
      setActiveMode(null);
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Please choose a stronger password (at least 6 characters).",
      );
      setIsSubmitting(false);
      setActiveMode(null);
      return;
    }

    try {
      const supabase = getSupabaseClient();

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          console.error(error);
          setErrorMessage(getAuthErrorMessage(error, "signin"));
          return;
        }

        router.replace("/");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (error) {
        console.error(error);
        setErrorMessage(getAuthErrorMessage(error, "signup"));
        return;
      }

      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }

      setInfoMessage(
        "Account created. Please confirm your email, then sign in.",
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(getAuthErrorMessage(null, mode));
    } finally {
      setIsSubmitting(false);
      setActiveMode(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void authenticate("signin");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:max-w-lg">
      <header className="animate-fade-up text-center sm:text-left">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          HomeLoop
          <Heart
            size={18}
            className="ml-2 inline-block translate-y-[-0.15em] opacity-80 animate-heart-float"
          />
        </h1>
        <p className="mt-2 text-base text-muted sm:text-lg">
          Keep your family in the loop.
        </p>
      </header>

      <form
        className="animate-fade-up mt-8 space-y-5 rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]"
        style={{ animationDelay: "60ms" }}
        onSubmit={handleSubmit}
        noValidate
      >
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="text-sm font-bold text-foreground"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-bold text-accent transition hover:text-accent-deep"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
            placeholder="At least 6 characters"
          />
        </div>

        {errorMessage ? (
          <p role="alert" className="text-sm font-semibold text-accent">
            {errorMessage}
          </p>
        ) : null}

        {infoMessage ? (
          <p role="status" className="text-sm font-semibold text-ember">
            {infoMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting && activeMode === "signin"}
            className="w-full rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white shadow-[0_14px_28px_rgba(184,51,74,0.28)] transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting && activeMode === "signin"
              ? "Signing in…"
              : "Sign In"}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            aria-busy={isSubmitting && activeMode === "signup"}
            onClick={() => void authenticate("signup")}
            className="w-full rounded-2xl border border-surface-border bg-white/80 px-5 py-3.5 text-base font-bold text-foreground transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting && activeMode === "signup"
              ? "Creating account…"
              : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-surface-border bg-white/85 px-4 py-3.5 text-base text-foreground outline-none transition placeholder:text-muted/70 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/35";

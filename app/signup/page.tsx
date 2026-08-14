"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import Heart from "@/components/Heart";
import { HeartButton } from "@/components/HeartButton";
import PasswordField from "@/components/PasswordField";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/utils/auth-errors";

const inputClassName =
  "w-full rounded-2xl border border-surface-border bg-white/85 px-4 py-3.5 text-base text-foreground outline-none transition placeholder:text-muted/70 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/35";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter your email and password.");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Please choose a stronger password (at least 6 characters).",
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = getSupabaseClient();
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
        "Account created. Please confirm your email, then log in.",
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(getAuthErrorMessage(null, "signup"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:max-w-lg">
      <header className="animate-fade-up text-center sm:text-left">
        <Link
          href="/"
          data-heart-burst="off"
          className="text-sm font-bold text-muted transition hover:text-foreground"
        >
          ← HomeLoop
        </Link>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Sign Up
          <Heart
            size={18}
            className="ml-2 inline-block translate-y-[-0.15em] opacity-80 animate-heart-float"
          />
        </h1>
        <p className="mt-2 text-base text-muted sm:text-lg">
          Start a shared loop for your family.
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

        <PasswordField
          id="password"
          name="password"
          label="Password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 characters"
        />

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

        <HeartButton
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Signing up…" : "Sign Up"}
        </HeartButton>
      </form>

      <p
        className="animate-fade-up mt-6 text-center text-sm text-muted"
        style={{ animationDelay: "100ms" }}
      >
        Already have an account?{" "}
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-bold text-accent transition hover:text-accent-deep"
        >
          Login
          <Heart size={12} />
        </Link>
      </p>
    </div>
  );
}

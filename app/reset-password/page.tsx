"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { getSupabaseClient } from "@/lib/supabase/client";

type PageState = "checking" | "ready" | "invalid" | "success";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error");
  const [pageState, setPageState] = useState<PageState>(
    linkError === "invalid" ? "invalid" : "checking",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (linkError === "invalid") {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const supabase = getSupabaseClient();
        const code = searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error(error);
            if (!cancelled) {
              setPageState("invalid");
            }
            return;
          }
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (cancelled) {
          return;
        }

        if (error || !user) {
          setPageState("invalid");
          return;
        }

        setPageState("ready");
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setPageState("invalid");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [linkError, searchParams]);

  function validate(): boolean {
    const nextErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      nextErrors.password = "Please enter a new password.";
    } else if (password.length < 6) {
      nextErrors.password =
        "Please choose a stronger password (at least 6 characters).";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your new password.";
    } else if (password && confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setErrorMessage(null);
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error(error);
        setErrorMessage(
          "Unable to update your password. Please request a new reset link.",
        );
        return;
      }

      setPageState("success");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Unable to update your password. Please request a new reset link.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pageState === "checking") {
    return (
      <div className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
        <p className="text-sm font-semibold text-muted">
          Checking your reset link…
        </p>
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="space-y-4 rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
        <h2 className="font-display text-2xl font-medium text-foreground">
          This password reset link is invalid or has expired.
        </h2>
        <p className="text-sm text-muted">
          Request a new link and try again.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-deep"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="space-y-4 rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
        <h2 className="font-display text-2xl font-medium text-foreground">
          Password updated
        </h2>
        <p className="text-sm text-muted">
          Your password has been changed. You can continue to HomeLoop.
        </p>
        <button
          type="button"
          onClick={() => {
            router.replace("/");
            router.refresh();
          }}
          className="w-full rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white transition hover:bg-accent-deep"
        >
          Continue to HomeLoop
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-5 rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]"
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-bold text-foreground">
          New Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
          placeholder="At least 6 characters"
        />
        {fieldErrors.password ? (
          <p role="alert" className="text-sm font-semibold text-accent">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-bold text-foreground"
        >
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClassName}
          placeholder="Re-enter your new password"
        />
        {fieldErrors.confirmPassword ? (
          <p role="alert" className="text-sm font-semibold text-accent">
            {fieldErrors.confirmPassword}
          </p>
        ) : null}
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
        className="w-full rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white shadow-[0_14px_28px_rgba(184,51,74,0.28)] transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:max-w-lg">
      <header className="animate-fade-up mb-8 text-center sm:text-left">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          HomeLoop
        </h1>
        <p className="mt-2 text-base text-muted sm:text-lg">
          Choose a new password
        </p>
      </header>

      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <Suspense
          fallback={
            <div className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
              <p className="text-sm font-semibold text-muted">
                Checking your reset link…
              </p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-surface-border bg-white/85 px-4 py-3.5 text-base text-foreground outline-none transition placeholder:text-muted/70 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/35";

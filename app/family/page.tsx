"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import Heart from "@/components/Heart";
import ShortcutTokensSection from "@/components/ShortcutTokensSection";
import SignOutButton from "@/components/SignOutButton";
import {
  getCurrentFamily,
  getCurrentUserFamilyRole,
  getFamilyMembers,
  regenerateInviteCode,
} from "@/lib/families";
import {
  disablePushNotifications,
  enablePushNotifications,
  getNotificationStatus,
  type NotificationStatus,
} from "@/lib/push";
import type { Family, FamilyMemberRow, FamilyRole } from "@/types/family";

type LoadState = "loading" | "ready" | "error" | "no-family";

function notificationStatusLabel(status: NotificationStatus): string {
  switch (status) {
    case "enabled":
      return "Notifications enabled";
    case "blocked":
      return "Notifications blocked";
    case "unsupported":
      return "Notifications not supported on this device";
    case "disabled":
      return "Notifications not enabled";
    default:
      return "Notifications not enabled";
  }
}

export default function FamilyPage() {
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMemberRow[]>([]);
  const [role, setRole] = useState<FamilyRole | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [regenError, setRegenError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus>("default");
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoadState("loading");
    setRegenError(null);

    try {
      const current = await getCurrentFamily();
      if (!current) {
        setFamily(null);
        setMembers([]);
        setRole(null);
        setLoadState("no-family");
        return;
      }

      const [memberRows, membershipRole] = await Promise.all([
        getFamilyMembers(current.id),
        getCurrentUserFamilyRole(current.id),
      ]);

      setFamily(current);
      setMembers(memberRows);
      setRole(membershipRole);
      setLoadState("ready");
    } catch (error) {
      console.error(error);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const current = await getCurrentFamily();
        if (cancelled) {
          return;
        }
        if (!current) {
          setFamily(null);
          setMembers([]);
          setRole(null);
          setLoadState("no-family");
          return;
        }

        const [memberRows, membershipRole] = await Promise.all([
          getFamilyMembers(current.id),
          getCurrentUserFamilyRole(current.id),
        ]);

        if (cancelled) {
          return;
        }

        setFamily(current);
        setMembers(memberRows);
        setRole(membershipRole);
        setLoadState("ready");
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLoadState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getNotificationStatus()
      .then((status) => {
        if (!cancelled) {
          setNotificationStatus(status);
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCopy() {
    if (!family) {
      return;
    }

    try {
      await navigator.clipboard.writeText(family.inviteCode);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      console.error(error);
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  async function handleRegenerate() {
    if (!family || isRegenerating) {
      return;
    }

    setIsRegenerating(true);
    setRegenError(null);

    try {
      const nextCode = await regenerateInviteCode(family.id);
      setFamily({ ...family, inviteCode: nextCode });
    } catch (error) {
      console.error(error);
      setRegenError(
        error instanceof Error ? error.message : "Unable to regenerate code.",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleEnableNotifications() {
    if (notificationBusy) {
      return;
    }
    setNotificationBusy(true);
    setNotificationError(null);
    try {
      const status = await enablePushNotifications();
      setNotificationStatus(status);
    } catch (error) {
      console.error(error);
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Unable to enable notifications.",
      );
    } finally {
      setNotificationBusy(false);
    }
  }

  async function handleDisableNotifications() {
    if (notificationBusy) {
      return;
    }
    setNotificationBusy(true);
    setNotificationError(null);
    try {
      const status = await disablePushNotifications();
      setNotificationStatus(status);
    } catch (error) {
      console.error(error);
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Unable to disable notifications.",
      );
    } finally {
      setNotificationBusy(false);
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10 pt-6 sm:max-w-lg sm:pt-10">
      <header className="animate-fade-up flex items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm font-bold text-muted transition hover:text-foreground"
          >
            ← HomeLoop
          </Link>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Family
            <Heart
              size={16}
              className="ml-2 inline-block translate-y-[-0.1em] opacity-80"
            />
          </h1>
        </div>
        <SignOutButton />
      </header>

      {loadState === "loading" ? (
        <p className="mt-8 text-sm font-semibold text-muted">Loading family…</p>
      ) : null}

      {loadState === "error" ? (
        <div className="mt-8 rounded-3xl border border-surface-border bg-surface p-5 text-center shadow-[var(--shadow)]">
          <p className="font-display text-xl font-medium text-foreground">
            Couldn&apos;t load family details.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-deep"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loadState === "no-family" ? (
        <div className="mt-8 space-y-4 rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
          <p className="font-display text-xl font-medium text-foreground">
            You&apos;re not in a family yet.
          </p>
          <p className="text-sm text-muted">
            Create a family or join with an invite code to share events.
          </p>
          <Link
            href="/"
            className="block w-full rounded-2xl bg-accent px-5 py-3.5 text-center text-base font-bold text-white hover:bg-accent-deep"
          >
            Create or Join
          </Link>
        </div>
      ) : null}

      {loadState === "ready" && family ? (
        <div className="mt-8 space-y-6">
          <section className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Family name
            </p>
            <h2 className="mt-1 font-display text-2xl font-medium text-foreground">
              {family.name}
            </h2>
          </section>

          <section className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Members
            </p>
            <ul className="mt-3 space-y-3">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3"
                >
                  <span className="font-bold text-foreground">
                    {member.displayName}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Notifications
            </p>
            <p className="mt-2 text-sm text-muted">
              Get a push reminder for family events on this device. Permission
              is only requested when you enable notifications here.
            </p>
            <p className="mt-3 text-sm font-bold text-foreground">
              {notificationStatusLabel(notificationStatus)}
            </p>
            {family.timezone ? (
              <p className="mt-1 text-xs text-muted">
                Family timezone: {family.timezone}
              </p>
            ) : null}
            <div className="mt-4 flex flex-col gap-3">
              {notificationStatus !== "enabled" &&
              notificationStatus !== "unsupported" ? (
                <button
                  type="button"
                  disabled={
                    notificationBusy || notificationStatus === "blocked"
                  }
                  onClick={() => void handleEnableNotifications()}
                  className="w-full rounded-2xl bg-accent px-5 py-3.5 text-base font-bold text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {notificationBusy ? "Working…" : "Enable Notifications"}
                </button>
              ) : null}
              {notificationStatus === "enabled" ? (
                <button
                  type="button"
                  disabled={notificationBusy}
                  onClick={() => void handleDisableNotifications()}
                  className="w-full rounded-2xl border border-surface-border bg-white/80 px-5 py-3.5 text-base font-bold text-foreground transition hover:bg-white disabled:opacity-70"
                >
                  {notificationBusy ? "Working…" : "Disable Notifications"}
                </button>
              ) : null}
              {notificationStatus === "blocked" ? (
                <p className="text-sm text-muted">
                  Notifications are blocked in your browser/PWA settings. Enable
                  them there, then try again.
                </p>
              ) : null}
              {notificationError ? (
                <p role="alert" className="text-sm font-semibold text-accent">
                  {notificationError}
                </p>
              ) : null}
            </div>
          </section>

          <ShortcutTokensSection />

          <section className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Invite family member
            </p>
            <p className="mt-2 text-sm text-muted">
              Share this code. They create a HomeLoop account, then join with
              the code.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 rounded-2xl border border-surface-border bg-white/85 px-4 py-3 text-center text-lg font-bold tracking-[0.18em] text-foreground">
                {family.inviteCode}
              </code>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="rounded-2xl border border-surface-border bg-white/80 px-4 py-3 text-sm font-bold text-foreground transition hover:bg-white"
              >
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Failed"
                    : "Copy"}
              </button>
            </div>
            {role === "owner" ? (
              <button
                type="button"
                disabled={isRegenerating}
                onClick={() => void handleRegenerate()}
                className="mt-3 text-sm font-bold text-accent transition hover:text-accent-deep disabled:opacity-70"
              >
                {isRegenerating ? "Regenerating…" : "Regenerate invite code"}
              </button>
            ) : null}
            {regenError ? (
              <p role="alert" className="mt-2 text-sm font-semibold text-accent">
                {regenError}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

import { HeartButton } from "@/components/HeartButton";
import {
  createShortcutToken,
  listShortcutTokens,
  revokeShortcutToken,
} from "@/lib/shortcuts/tokens";
import type { ShortcutTokenSummary } from "@/types/shortcut";
import { getSiteUrl } from "@/utils/app-url";

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatLastUsed(iso: string | null): string {
  if (!iso) {
    return "Never used";
  }
  try {
    return `Last used ${new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  } catch {
    return "Last used recently";
  }
}

export default function ShortcutTokensSection() {
  const [tokens, setTokens] = useState<ShortcutTokenSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [plaintextToken, setPlaintextToken] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const rows = await listShortcutTokens();
        if (!cancelled) {
          setTokens(rows);
          setLoadError(null);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load Shortcut access.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    if (busy) {
      return;
    }
    setBusy(true);
    setActionError(null);
    setPlaintextToken(null);

    try {
      const created = await createShortcutToken({ name: "iPhone Shortcut" });
      setPlaintextToken(created.token);
      setTokens((current) => [created.summary, ...current]);
    } catch (error) {
      console.error(error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to create Shortcut access.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(tokenId: string) {
    if (busy) {
      return;
    }
    setBusy(true);
    setActionError(null);

    try {
      await revokeShortcutToken(tokenId);
      setTokens((current) => current.filter((token) => token.id !== tokenId));
      setPlaintextToken(null);
    } catch (error) {
      console.error(error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to revoke Shortcut access.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyToken() {
    if (!plaintextToken) {
      return;
    }
    try {
      await navigator.clipboard.writeText(plaintextToken);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      console.error(error);
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  const endpoint = `${getSiteUrl()}/api/shortcuts/events`;

  return (
    <section className="rounded-3xl border border-surface-border bg-surface p-5 shadow-[var(--shadow)]">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
        iPhone Shortcuts
      </p>
      <p className="mt-2 text-sm text-muted">
        Create a personal Shortcut token so your iPhone can add events to this
        family. HomeLoop never stores the plaintext token — copy it once into
        your Shortcut.
      </p>
      <p className="mt-2 break-all text-xs text-muted">
        Endpoint: <code className="font-semibold text-foreground">{endpoint}</code>
      </p>

      <HeartButton
        type="button"
        disabled={busy}
        onClick={() => void handleCreate()}
        className="mt-4 w-full"
      >
        {busy ? "Working…" : "Create Shortcut Access"}
      </HeartButton>

      {plaintextToken ? (
        <div className="mt-4 rounded-2xl border border-accent/30 bg-white/85 p-4">
          <p className="text-sm font-bold text-foreground">
            Copy this token now
          </p>
          <p className="mt-1 text-xs text-muted">
            It will not be shown again after you leave this page. Paste it into
            your iPhone Shortcut as{" "}
            <code className="font-semibold">Authorization: Bearer …</code>
          </p>
          <code className="mt-3 block break-all rounded-xl border border-surface-border bg-[#fffaf4] px-3 py-3 text-xs font-semibold text-foreground">
            {plaintextToken}
          </code>
          <HeartButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleCopyToken()}
            className="mt-3 w-full"
          >
            {copyState === "copied"
              ? "Copied"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy token"}
          </HeartButton>
        </div>
      ) : null}

      {loadError ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-accent">
          {loadError}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-accent">
          {actionError}
        </p>
      ) : null}

      {tokens.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {tokens.map((token) => (
            <li
              key={token.id}
              className="flex items-start justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-bold text-foreground">{token.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Created {formatShortDate(token.createdAt)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatLastUsed(token.lastUsedAt)}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRevoke(token.id)}
                className="shrink-0 rounded-xl border border-accent/35 bg-white/80 px-3 py-2 text-sm font-bold text-accent transition hover:bg-accent-soft/40 disabled:opacity-70"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">No active Shortcut tokens yet.</p>
      )}
    </section>
  );
}

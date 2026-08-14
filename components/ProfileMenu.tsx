"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/utils/auth-errors";

type ProfileMenuProps = {
  className?: string;
};

export default function ProfileMenu({ className }: ProfileMenuProps) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!rootRef.current || !target) {
        return;
      }
      if (!rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error(error);
        setErrorMessage(getAuthErrorMessage(error, "signout"));
        setIsSigningOut(false);
        return;
      }

      setOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage(getAuthErrorMessage(null, "signout"));
      setIsSigningOut(false);
    }
  }

  return (
    <div ref={rootRef} className={["relative", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setErrorMessage(null);
          setOpen((current) => !current);
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-white/85 text-foreground shadow-[var(--shadow)] transition hover:border-accent/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        <ProfileIcon />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Profile menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-surface-border bg-[#fffaf4] py-1.5 shadow-[0_18px_40px_rgba(58,36,18,0.16)]"
        >
          <MenuLink href="/family" onNavigate={() => setOpen(false)}>
            Manage Family
          </MenuLink>
          <MenuLink href="/categories" onNavigate={() => setOpen(false)}>
            Categories
          </MenuLink>
          <MenuLink href="/settings" onNavigate={() => setOpen(false)}>
            Settings
          </MenuLink>

          <div
            role="separator"
            className="my-1.5 border-t border-surface-border"
          />

          <button
            type="button"
            role="menuitem"
            disabled={isSigningOut}
            aria-busy={isSigningOut}
            onClick={() => void handleSignOut()}
            className="flex w-full items-center px-4 py-2.5 text-left text-sm font-bold text-accent transition hover:bg-accent-soft/35 focus-visible:outline-none focus-visible:bg-accent-soft/35 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSigningOut ? "Signing out…" : "Sign Out"}
          </button>

          {errorMessage ? (
            <p
              role="alert"
              className="px-4 pb-2 text-xs font-semibold text-accent"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: string;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex w-full items-center px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-white/80 focus-visible:outline-none focus-visible:bg-white/80"
    >
      {children}
    </Link>
  );
}

function ProfileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 18.5c1.6-2.8 3.9-4.2 6.5-4.2s4.9 1.4 6.5 4.2" />
    </svg>
  );
}

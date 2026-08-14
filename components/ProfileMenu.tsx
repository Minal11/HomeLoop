"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import Heart from "@/components/Heart";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/utils/auth-errors";

type ProfileMenuProps = {
  className?: string;
};

type MenuPosition = {
  top: number;
  right: number;
};

function subscribe() {
  return () => {};
}

function getMenuPosition(button: HTMLButtonElement): MenuPosition {
  const rect = button.getBoundingClientRect();
  return {
    top: rect.bottom + 8,
    right: Math.max(window.innerWidth - rect.right, 12),
  };
}

export default function ProfileMenu({ className }: ProfileMenuProps) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  function openMenu() {
    const button = buttonRef.current;
    if (!button) {
      return;
    }
    setErrorMessage(null);
    setPosition(getMenuPosition(button));
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    setPosition(null);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    }

    function handleReposition() {
      const button = buttonRef.current;
      if (!button) {
        return;
      }
      setPosition(getMenuPosition(button));
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
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

      closeMenu();
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage(getAuthErrorMessage(null, "signout"));
      setIsSigningOut(false);
    }
  }

  const menu =
    open && isClient && position
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Profile menu"
            style={{
              position: "fixed",
              top: position.top,
              right: position.right,
              zIndex: 200,
            }}
            className="w-56 rounded-2xl border border-[#4a342033] bg-white py-1.5 shadow-[0_18px_40px_rgba(58,36,18,0.18)]"
          >
            <MenuLink href="/family" onNavigate={closeMenu}>
              Family
            </MenuLink>
            <MenuLink href="/categories" onNavigate={closeMenu}>
              Categories
            </MenuLink>

            <div
              role="separator"
              className="my-1.5 border-t border-[#4a342033]"
            />

            <button
              type="button"
              role="menuitem"
              disabled={isSigningOut}
              aria-busy={isSigningOut}
              onClick={() => void handleSignOut()}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-[#d6455d] transition hover:bg-[#f5c4cd]/50 focus-visible:outline-none focus-visible:bg-[#f5c4cd]/50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSigningOut ? "Signing out…" : "Sign Out"}
              <Heart size={12} className="text-[#d6455d]" />
            </button>

            {errorMessage ? (
              <p
                role="alert"
                className="px-4 pb-2 text-xs font-semibold text-[#d6455d]"
              >
                {errorMessage}
              </p>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={["relative z-50", className].filter(Boolean).join(" ")}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          if (open) {
            closeMenu();
          } else {
            openMenu();
          }
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-white text-[#2a2118] shadow-[var(--shadow)] transition hover:border-accent/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        <ProfileIcon />
      </button>
      {menu}
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
      className="flex w-full items-center px-4 py-2.5 text-sm font-bold text-[#2a2118] transition hover:bg-[#f3ebe0] focus-visible:outline-none focus-visible:bg-[#f3ebe0]"
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

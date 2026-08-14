"use client";

import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import Heart from "@/components/Heart";

type HeartButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type HeartButtonSize = "md" | "sm";

const VARIANT_CLASS: Record<HeartButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-[0_14px_28px_rgba(184,51,74,0.28)] hover:bg-accent-deep",
  secondary:
    "border border-surface-border bg-white/85 text-foreground hover:bg-white",
  danger: "bg-[#d6455d] text-white hover:bg-[#b8334a]",
  ghost:
    "border border-surface-border bg-white/80 text-muted hover:border-accent/30 hover:text-foreground",
};

const SIZE_CLASS: Record<HeartButtonSize, string> = {
  md: "rounded-2xl px-5 py-3.5 text-base",
  sm: "rounded-xl px-4 py-2.5 text-sm",
};

function heartTone(variant: HeartButtonVariant): string {
  return variant === "primary" || variant === "danger"
    ? "text-white/90"
    : "text-accent";
}

type SharedProps = {
  variant?: HeartButtonVariant;
  size?: HeartButtonSize;
  showHeart?: boolean;
  className?: string;
  children: ReactNode;
};

export type HeartButtonProps = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement>;

export function HeartButton({
  variant = "primary",
  size = "md",
  showHeart = true,
  className = "",
  children,
  type = "button",
  ...props
}: HeartButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 font-bold transition duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:cursor-not-allowed disabled:opacity-70",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <span>{children}</span>
      {showHeart ? (
        <Heart size={size === "sm" ? 12 : 14} className={heartTone(variant)} />
      ) : null}
    </button>
  );
}

export type HeartLinkProps = SharedProps & {
  href: string;
};

export function HeartLink({
  href,
  variant = "primary",
  size = "md",
  showHeart = true,
  className = "",
  children,
}: HeartLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center justify-center gap-2 font-bold transition duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{children}</span>
      {showHeart ? (
        <Heart size={size === "sm" ? 12 : 14} className={heartTone(variant)} />
      ) : null}
    </Link>
  );
}

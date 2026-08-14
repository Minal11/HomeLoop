"use client";

import { HeartLink } from "@/components/HeartButton";
import Heart from "@/components/Heart";

export default function LandingPage() {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-1 flex-col justify-center px-5 py-12 sm:max-w-lg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[12%] -z-10 mx-auto h-56 w-56 rounded-full bg-accent/15 blur-3xl animate-soft-pop"
      />

      <header className="animate-fade-up text-center">
        <p className="font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          HomeLoop
          <Heart
            size={22}
            className="ml-2 inline-block translate-y-[-0.12em] opacity-90 animate-heart-float"
          />
        </p>
        <p className="mx-auto mt-4 max-w-sm text-base text-muted sm:text-lg">
          Shared plans for the people you love — one calm place for the whole
          family.
        </p>
      </header>

      <div
        className="animate-fade-up mt-10 flex flex-col gap-3"
        style={{ animationDelay: "80ms" }}
      >
        <HeartLink href="/login" className="w-full">
          Login
        </HeartLink>
        <HeartLink href="/signup" variant="secondary" className="w-full">
          Sign Up
        </HeartLink>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import EventForm from "@/components/EventForm";
import { getCurrentFamily } from "@/lib/families";
import { createEvent } from "@/lib/events";
import type { NewFamilyEventInput } from "@/types/event";

export default function NewEventPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getCurrentFamily()
      .then((family) => {
        if (cancelled) {
          return;
        }
        if (!family) {
          router.replace("/");
          return;
        }
        setReady(true);
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) {
          router.replace("/");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(input: NewFamilyEventInput) {
    await createEvent(input);
    router.push("/");
  }

  function handleCancel() {
    router.push("/");
  }

  if (!ready) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
        <p className="text-sm font-semibold text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col overflow-x-clip px-5 pb-6 pt-6 sm:max-w-lg sm:pt-10">
      <header className="animate-fade-up mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl py-1 text-sm font-bold text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        >
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Add Event
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Share what’s coming up with the family.
        </p>
      </header>

      <EventForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
}

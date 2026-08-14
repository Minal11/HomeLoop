"use client";

import { useEffect, useState } from "react";

import HomeScreen from "@/components/HomeScreen";
import LandingPage from "@/components/LandingPage";
import { getSupabaseClient } from "@/lib/supabase/client";

type AuthGate = "loading" | "guest" | "user";

export default function Page() {
  const [authGate, setAuthGate] = useState<AuthGate>("loading");

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) {
        return;
      }
      setAuthGate(data.session ? "user" : "guest");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthGate(session ? "user" : "guest");
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (authGate === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:max-w-lg">
        <p className="text-center text-sm font-semibold text-muted">
          Loading HomeLoop…
        </p>
      </div>
    );
  }

  if (authGate === "guest") {
    return <LandingPage />;
  }

  return <HomeScreen />;
}

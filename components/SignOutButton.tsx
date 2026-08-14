"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { HeartButton } from "@/components/HeartButton";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/utils/auth-errors";

export default function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage(getAuthErrorMessage(null, "signout"));
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <HeartButton
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void handleSignOut()}
        disabled={isSigningOut}
        aria-busy={isSigningOut}
      >
        {isSigningOut ? "Signing out…" : "Sign Out"}
      </HeartButton>
      {errorMessage ? (
        <p role="alert" className="max-w-[12rem] text-right text-xs font-semibold text-accent">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

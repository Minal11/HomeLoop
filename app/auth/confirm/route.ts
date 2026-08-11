import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/utils/app-url";

/**
 * Handles Supabase Auth email links (password recovery, confirmations).
 * Exchanges token_hash / PKCE code for a session cookie, then redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"), "/reset-password");

  const redirectTo = new URL(next, origin);
  const errorRedirect = new URL("/reset-password", origin);
  errorRedirect.searchParams.set("error", "invalid");

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(redirectTo);
      }
      console.error("Auth code exchange failed:", error);
      return NextResponse.redirect(errorRedirect);
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });

      if (!error) {
        return NextResponse.redirect(redirectTo);
      }

      console.error("Auth OTP verification failed:", error);
      return NextResponse.redirect(errorRedirect);
    }
  } catch (error) {
    console.error("Auth confirm route failed:", error);
  }

  return NextResponse.redirect(errorRedirect);
}

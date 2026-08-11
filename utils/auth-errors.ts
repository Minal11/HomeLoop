import type { AuthError } from "@supabase/supabase-js";

export function getAuthErrorMessage(
  error: AuthError | Error | null,
  context: "signin" | "signup" | "signout" | "session",
): string {
  if (!error) {
    if (context === "signin") {
      return "Incorrect email or password.";
    }
    if (context === "signup") {
      return "Unable to create account.";
    }
    if (context === "signout") {
      return "Unable to sign out. Please try again.";
    }
    return "Your session has expired. Please sign in again.";
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "Incorrect email or password.";
  }

  if (message.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  if (message.includes("user already registered")) {
    return "An account with this email already exists. Try signing in.";
  }

  if (message.includes("password")) {
    return "Please choose a stronger password (at least 6 characters).";
  }

  if (message.includes("email")) {
    return "Please enter a valid email address.";
  }

  if (context === "signup") {
    return "Unable to create account. Please try again.";
  }

  if (context === "signin") {
    return "Unable to sign in. Please try again.";
  }

  if (context === "signout") {
    return "Unable to sign out. Please try again.";
  }

  return "Your session has expired. Please sign in again.";
}

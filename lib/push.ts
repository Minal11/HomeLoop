import { getSupabaseClient } from "@/lib/supabase/client";

export type NotificationStatus =
  | "unsupported"
  | "blocked"
  | "default"
  | "enabled"
  | "disabled";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!key) {
    throw new Error(
      "Notifications are not configured yet. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY.",
    );
  }
  return key;
}

async function removePushSubscriptionEndpoint(endpoint: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.error("Failed to remove push subscription:", error);
  }
}

/**
 * Drop any existing PushManager subscription so we never reuse one created
 * under a previous VAPID public key (Apple VapidPkHashMismatch).
 */
async function clearExistingPushSubscription(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  const existing = await registration.pushManager.getSubscription();
  if (!existing) {
    return;
  }

  const endpoint = existing.endpoint;
  await existing.unsubscribe();
  await removePushSubscriptionEndpoint(endpoint);
}

export async function getNotificationStatus(): Promise<NotificationStatus> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "unsupported";
  }

  if (Notification.permission === "denied") {
    return "blocked";
  }

  if (Notification.permission === "default") {
    return "default";
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "enabled" : "disabled";
}

export async function enablePushNotifications(): Promise<NotificationStatus> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  if (permission === "denied") {
    return "blocked";
  }
  if (permission !== "granted") {
    return "default";
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;

  // Always clear first after VAPID rotation — never reuse a stale subscription.
  await clearExistingPushSubscription(registration);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      getVapidPublicKey(),
    ) as BufferSource,
  });

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Unable to create a push subscription on this device.");
  }

  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error("Failed to save push subscription:", error);
    throw new Error("Unable to save notification settings.");
  }

  return "enabled";
}

export async function disablePushNotifications(): Promise<NotificationStatus> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "unsupported";
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return Notification.permission === "denied" ? "blocked" : "disabled";
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await removePushSubscriptionEndpoint(endpoint);

  return Notification.permission === "denied" ? "blocked" : "disabled";
}

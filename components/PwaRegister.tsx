"use client";

import { useEffect } from "react";

/**
 * Registers a minimal network-only service worker for Chromium installability.
 * Does not cache authenticated data.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.warn("HomeLoop service worker registration failed:", error);
      }
    };

    void register();
  }, []);

  return null;
}

/* HomeLoop minimal service worker.
 *
 * Purpose: satisfy Chromium installability heuristics without caching
 * authenticated or sensitive Supabase responses.
 *
 * Strategy: network-only for everything. No offline data sync.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass through to the network. Do not cache API, auth, or HTML shells.
  event.respondWith(fetch(event.request));
});

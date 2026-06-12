import { base44 } from "@/api/base44Client";

/**
 * Sends an in-app push notification if the user has push_enabled.
 * Note: True background push (when app is fully closed) requires a backend
 * server with VAPID keys, which is outside Base44's frontend scope.
 * This implementation shows notifications when the service worker is active.
 */
export async function sendPushNotification(userEmail, title, body, url = "/") {
  try {
    const profiles = await base44.entities.UserProfile.filter({ user_email: userEmail });
    const profile = profiles[0];

    if (!profile?.push_enabled) return;

    // If browser Notification is granted and SW is active, show via SW
    if ("serviceWorker" in navigator && Notification.permission === "granted") {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url },
        vibrate: [200, 100, 200],
      });
    }
  } catch {
    // Silently fail — push is best-effort
  }
}
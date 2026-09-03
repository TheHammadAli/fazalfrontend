// Handles push notifications while the tab is closed / not in focus. Runs as a
// service worker (no access to Next.js env vars or the app bundle), so the
// Firebase Web config below is loaded via the compat CDN scripts and inlined
// directly — these values are the public client config, safe to ship as-is.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD0VT2-M9O0OTJ3v64G5tYZWFaSlJoXdcg",
  authDomain: "market-app-notification.firebaseapp.com",
  projectId: "market-app-notification",
  storageBucket: "market-app-notification.firebasestorage.app",
  messagingSenderId: "1042475957024",
  appId: "1:1042475957024:web:3d474c24c131f62b40f545",
});

// Messages carry a `notification` payload (see firebase.service.ts), so the
// browser auto-displays them in the background on its own — no
// onBackgroundMessage handler needed here. Registering one anyway and calling
// showNotification() from it double-shows every push, since both the
// browser's built-in handling and the manual call fire for the same message.
firebase.messaging();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});

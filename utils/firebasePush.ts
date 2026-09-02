import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let messagingInstance: Messaging | null = null;

/** Registering a service worker while the document is still loading/transitioning throws
 *  InvalidStateError in some browsers — wait for the page to be fully settled first. */
function waitForDocumentReady(): Promise<void> {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener("load", () => resolve(), { once: true });
  });
}

/**
 * Registers the messaging service worker and returns an FCM token for this
 * browser, or null if push isn't supported here / permission isn't granted
 * yet. Safe to call repeatedly across sessions — Firebase returns the same
 * token until it needs to rotate, and re-sending an unchanged token to the
 * backend is a harmless no-op upsert.
 */
export async function getPushToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (Notification.permission !== "granted") return null;
  if (!("serviceWorker" in navigator)) return null;

  try {
    if (!(await isSupported())) return null;

    await waitForDocumentReady();
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    if (!messagingInstance) {
      messagingInstance = getMessaging(getFirebaseApp());
    }

    return (
      (await getToken(messagingInstance, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      })) || null
    );
  } catch (err) {
    console.error("[push] failed to get FCM token", err);
    return null;
  }
}

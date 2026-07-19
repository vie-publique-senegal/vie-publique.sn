import type { FirebaseApp } from 'firebase/app';
import type { Messaging } from 'firebase/messaging';

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

/**
 * PERF-3 : aucun import STATIQUE de firebase/* ici — le SDK (~140 KB br) était
 * embarqué dans le bundle d'entrée de 100 % des pages pour une feature (push FCM)
 * que peu d'utilisateurs activent. Tous les `import('firebase/...')` sont
 * dynamiques : le SDK n'est téléchargé qu'au premier appel réel (activation des
 * notifications via useNotifications). Les `import type` sont gratuits (effacés
 * au build). Ne PAS remettre d'import statique en tête de fichier.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const ensureApp = async (): Promise<FirebaseApp> => {
    if (firebaseApp) return firebaseApp;
    const { initializeApp } = await import('firebase/app');
    firebaseApp = initializeApp({
      apiKey: config.public.firebaseApiKey,
      authDomain: config.public.firebaseAuthDomain,
      projectId: config.public.firebaseProjectId,
      storageBucket: config.public.firebaseStorageBucket,
      messagingSenderId: config.public.firebaseMessagingSenderId,
      appId: config.public.firebaseAppId,
      measurementId: config.public.firebaseMeasurementId,
    });
    return firebaseApp;
  };

  /**
   * Wait for SW ready with a timeout to avoid hanging forever
   * when no service worker is registered (e.g. dev mode without PWA_ENABLED).
   */
  const waitForSWReady = (timeoutMs = 10000): Promise<ServiceWorkerRegistration | null> => {
    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn('[Firebase] Service worker ready timeout after', timeoutMs, 'ms');
          resolve(null);
        }, timeoutMs),
      ),
    ]);
  };

  /**
   * Initialize Firebase Messaging AFTER the service worker is ready.
   * Firebase internally looks for a SW when getMessaging() is called.
   * Without waiting, it tries to fetch /firebase-messaging-sw.js which doesn't exist.
   */
  const initMessaging = async (): Promise<Messaging | null> => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('Notification' in window)
    ) {
      console.warn('[Firebase] Messaging prerequisites not met:', {
        window: typeof window !== 'undefined',
        serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
        notification: typeof window !== 'undefined' && 'Notification' in window,
      });
      return null;
    }

    if (messaging) return messaging;

    // Deduplicate concurrent calls
    if (!messagingPromise) {
      messagingPromise = (async (): Promise<Messaging | null> => {
        try {
          const { getMessaging, isSupported } = await import('firebase/messaging');

          // getMessaging() lance en interne une promesse de validation non rattachée :
          // sur un navigateur non supporté (IndexedDB bloqué, navigation privée…),
          // elle rejette en "unhandled rejection" que notre try/catch ne voit pas.
          // isSupported() fait la même validation, de façon capturable.
          const supported = await isSupported().catch(() => false);
          if (!supported) {
            console.warn('[Firebase] Messaging not supported by this browser');
            return null;
          }

          // Quick check: is any SW registered?
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (registrations.length === 0) {
            console.warn(
              '[Firebase] No service worker registered — FCM needs a SW. Is PWA_ENABLED=true?',
            );
            return null;
          }

          const registration = await waitForSWReady();
          if (!registration) return null;

          messaging = getMessaging(await ensureApp());
          return messaging;
        } catch (error) {
          console.error('[Firebase] initMessaging error:', error);
          return null;
        } finally {
          messagingPromise = null;
        }
      })();
    }

    return messagingPromise;
  };

  const getFcmToken = async (): Promise<string | null> => {
    const msg = await initMessaging();
    if (!msg) {
      console.warn('[Firebase] Messaging not available — cannot get FCM token');
      return null;
    }

    try {
      const registration = await waitForSWReady();
      if (!registration) {
        console.warn('[Firebase] SW not ready — cannot get FCM token');
        return null;
      }

      const { getToken } = await import('firebase/messaging');
      const token = await getToken(msg, {
        vapidKey: config.public.firebaseVapidKey,
        serviceWorkerRegistration: registration,
      });

      return token || null;
    } catch (error) {
      console.error('[Firebase] getFcmToken error:', error);
      return null;
    }
  };

  const onForegroundMessage = async (
    callback: (payload: unknown) => void,
  ): Promise<(() => void) | null> => {
    const msg = await initMessaging();
    if (!msg) return null;

    const { onMessage } = await import('firebase/messaging');
    return onMessage(msg, callback);
  };

  return {
    provide: {
      // `app` retiré du provide : aucun consommateur (grep 16/07/2026) et
      // l'exposer forcerait une init eager. Passer par initMessaging/getFcmToken.
      firebase: {
        initMessaging,
        getFcmToken,
        onForegroundMessage,
      },
    },
  };
});

/**
 * Chargement différé des scripts analytics (GA4 via nuxt-gtag + Facebook Pixel).
 *
 * Pourquoi : GTM/gtag consommait ~330 ms de main thread mobile pendant l'hydratation
 * (mesuré au trace, docs/audits/audit-web-vitals-2026-07.md) et contribuait à l'INP
 * terrain de 236 ms. On charge donc les tags à la première interaction OU à l'idle
 * (timeout 3,5 s), le premier des deux. Le page_view initial part à l'initialisation :
 * seuls les rebonds < ~3 s ne sont plus comptés (trade-off accepté).
 *
 * nuxt-gtag est en `initMode: 'manual'` (nuxt.config.ts) — ne pas le repasser en
 * 'auto', ça rechargerait gtag.js dans le chemin critique.
 */
export default defineNuxtPlugin(() => {
  if (process.env.NODE_ENV !== 'production') return;

  const { initialize } = useGtag();
  const config = useRuntimeConfig();
  const fbPixelId = config.public.fbPixelId as string;

  let started = false;
  const start = () => {
    if (started) return;
    started = true;

    // GA4 (gtag.js) — no-op si GTAG_ID absent (module désactivé → mock)
    initialize();

    // Facebook Pixel
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    if (fbPixelId && !w.fbq) {
      /* eslint-disable */
      !(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = true;
        t.src = 'https://connect.facebook.net/en_US/fbevents.js';
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script');
      /* eslint-enable */
      w.fbq?.('init', fbPixelId);
      w.fbq?.('track', 'PageView');
    }
  };

  // Première interaction (once) OU idle avec timeout — le premier déclenche.
  const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
  events.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 3500 });
  } else {
    setTimeout(start, 3500);
  }
});

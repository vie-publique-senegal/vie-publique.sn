/**
 * Détecte si le site tourne DANS le wrapper natif iOS de l'App Store.
 *
 * Fonction pure et synchrone : utilisable dans un `computed` aussi bien que
 * dans un `onMounted`. Renvoie `false` en SSR.
 *
 * Deux signaux indépendants :
 * - le cookie `app-platform` posé par le wrapper (`Settings.swift`, `platformCookie`) ;
 * - le suffixe `PWAShell` que le wrapper ajoute au user-agent.
 * Le cookie peut être effacé, le user-agent non — d'où les deux.
 *
 * ⚠️ Volontairement PAS le TWA Android : il ne pose pas ce cookie et son web
 * push fonctionne. Il ne doit surtout pas tomber dans cette détection.
 */
export const detectNativeIOSApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  // La valeur contient des espaces ("iOS App Store") et peut donc arriver
  // percent-encodée selon la sérialisation — on décode avant de comparer.
  const raw = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('app-platform='))
    ?.slice('app-platform='.length);

  let platform = raw ?? '';
  try {
    platform = decodeURIComponent(platform);
  } catch {
    // Valeur malformée : on garde la chaîne brute plutôt que de jeter.
  }

  return platform.startsWith('iOS') || /PWAShell/.test(navigator.userAgent);
};

/**
 * Détecte si le site est affiché DANS l'app mobile (WebView natif) ou en PWA
 * standalone, afin de masquer les promos "Télécharger l'app" inutiles dans ce contexte.
 * Détection client uniquement (user-agent / display-mode) : vaut `false` en SSR
 * puis se met à jour au montage.
 *
 * Deux niveaux, à ne pas confondre :
 * - `isInApp`        : large — inclut la PWA standalone installée depuis le navigateur.
 * - `isNativeIOSApp` : étroit — uniquement le wrapper WKWebView de l'App Store.
 */
export const useIsInApp = () => {
  const isInApp = ref(false);
  const isNativeIOSApp = ref(false);

  onMounted(() => {
    const ua = navigator.userAgent;
    // PWA standalone (ajouté à l'écran d'accueil via navigateur)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    // WebView natif : iOS WKWebView n'a pas "Safari" dans le UA, Android WebView contient "wv"
    const isWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua) || /\bwv\b/.test(ua);

    isInApp.value = isStandalone || isWebView;
    isNativeIOSApp.value = detectNativeIOSApp();
  });

  return { isInApp, isNativeIOSApp };
};

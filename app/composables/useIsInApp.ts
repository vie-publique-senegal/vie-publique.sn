/**
 * Détecte si le site est affiché DANS l'app mobile (WebView natif) ou en PWA
 * standalone, afin de masquer les promos "Télécharger l'app" inutiles dans ce contexte.
 * Détection client uniquement (user-agent / display-mode) : vaut `false` en SSR
 * puis se met à jour au montage.
 */
export const useIsInApp = () => {
  const isInApp = ref(false);

  onMounted(() => {
    const ua = navigator.userAgent;
    // PWA standalone (ajouté à l'écran d'accueil via navigateur)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    // WebView natif : iOS WKWebView n'a pas "Safari" dans le UA, Android WebView contient "wv"
    const isWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua) || /\bwv\b/.test(ua);

    isInApp.value = isStandalone || isWebView;
  });

  return { isInApp };
};

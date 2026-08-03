<script setup lang="ts">
import { Toaster, toast } from 'vue-sonner';
import { useNotifications } from './composables/useNotifications';

// Push Notifications
const { initState, setupForegroundHandler, validateAndRefreshToken } = useNotifications();

// Le chat historique garde la mise en page du site, mais sans la nav mobile fixe,
// qui mangerait la zone de saisie.
const isChatRoute = (path: string) => path === '/chatbot';

// Le banc d'essai /chat/** est en PLEIN ÉCRAN (comme /carte et /dashboard) : une
// conversation doit tenir dans la fenêtre, saisie comprise. Dans le conteneur du
// site, la bannière appli et le pied de page repoussaient le champ hors de l'écran
// sur mobile.
// (/chat/liste reste une page normale du site : c'est une liste, pas une conversation.)
const isFullscreenRoute = (path: string) =>
  path.startsWith('/carte/') ||
  path.startsWith('/dashboard/') ||
  (path.startsWith('/chat/') && path !== '/chat/liste');

const isChatPage = ref(isChatRoute(useRoute().path));
const isFullscreenPage = ref(isFullscreenRoute(useRoute().path));
watch(
  () => useRoute().path,
  (newPath) => {
    isChatPage.value = isChatRoute(newPath);
    isFullscreenPage.value = isFullscreenRoute(newPath);
  },
);
const links = [
  {
    label: 'Accueil',
    icon: 'i-heroicons-home',
    to: '/',
  },
  {
    label: 'Actualités',
    description: 'Communiqués, Annonces, Articles',
    photo: '/unknown_member.webp',
    icon: 'i-heroicons-newspaper',
    to: '/actualites',
  },
  {
    label: 'Assemblée',
    description: "Suivez l'activité parlementaire",
    icon: 'i-heroicons-building-library',
    to: '/assemblee-nationale',
  },
  {
    label: 'Budget',
    description: 'Analyse et suivi du budget sénégalais',
    icon: 'i-heroicons-currency-dollar',
    to: '/budget-senegal',
  },
  {
    label: 'Documents',
    description: 'Journal officiel, Codes, Rapports OFNAC Cour des comptes...',
    icon: 'i-heroicons-rectangle-stack',
    to: '/documents',
  },
  {
    label: 'Menu',
    description: '',
    icon: 'i-heroicons-bars-3',
    to: '/menu',
  },
];

onMounted(() => {
  if (!import.meta.client || !('serviceWorker' in navigator)) return;

  // Initialize push notification state (synchronous, no SW needed)
  initState();

  // Setup foreground handler (waits for SW internally via async initMessaging)
  setupForegroundHandler();

  // Protection anti-boucle de reload : max 1 reload automatique toutes les 10s
  const RELOAD_GUARD_KEY = 'vpsn-last-reload';
  const canAutoReload = () => {
    const last = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (last && Date.now() - Number(last) < 10_000) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    return true;
  };

  // Handle chunk loading errors (404 after deployment) — force reload avec garde
  window.addEventListener('error', (event) => {
    if (
      event.message?.includes('Loading chunk') ||
      event.message?.includes('Failed to fetch dynamically imported module') ||
      event.message?.includes('Importing a module script failed')
    ) {
      console.warn('[PWA] Chunk loading failed');
      if (canAutoReload()) {
        window.location.reload();
      }
    }
  });

  // Also catch unhandled promise rejections for dynamic imports
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason);
    if (
      reason?.includes('Failed to fetch dynamically imported module') ||
      reason?.includes('Importing a module script failed') ||
      reason?.includes('Loading chunk')
    ) {
      console.warn('[PWA] Dynamic import failed');
      event.preventDefault();
      if (canAutoReload()) {
        window.location.reload();
      }
    }
  });

  // Listen for service worker messages
  navigator.serviceWorker.addEventListener('message', (event) => {
    // Push subscription changed (P15)
    if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
      validateAndRefreshToken();
    }
    // SW mis à jour après déploiement — notifier l'utilisateur au lieu de forcer un reload
    // Le reload immédiat peut afficher un 500 si le serveur est encore en cours de déploiement
    if (event.data?.type === 'SW_UPDATED') {
      toast('Mise à jour disponible', {
        description: 'Une nouvelle version est disponible.',
        action: {
          label: 'Rafraîchir',
          onClick: () => window.location.reload(),
        },
        duration: 30_000,
      });
    }
  });
});
</script>

<template>
  <div>
    <!-- loader quand on change de page -->
    <NuxtLoadingIndicator />

    <!-- Header consolidé avec navigation -->
    <AppHeader :links="links" />

    <!-- App alert online and offline -->
    <ClientOnly>
      <AppLineAlert />
    </ClientOnly>

    <!-- PWA Install Prompt -->
    <!-- <ClientOnly>
      <AppInstallPrompt />
    </ClientOnly> -->

    <!-- Notification Consent Modal -->
    <ClientOnly>
      <NotificationConsentModal :delay="5000" />
    </ClientOnly>

    <Toaster position="bottom-center" />
  </div>
  <UContainer
    v-if="!isFullscreenPage"
    class="px-0 pb-20 sm:px-10 md:px-14 lg:px-28 lg:pb-0 xl:px-40"
  >
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Promo app mobile : visible uniquement côté web (masquée dans l'app/PWA) -->
    <AppMobileAppBanner />

    <AppFooter />

    <!-- Navigation mobile fixe en bas -->
    <AppBottomNav v-show="!isChatPage && !isFullscreenPage" />
  </UContainer>
  <div v-else class="w-full" style="height: calc(100vh - 64px); height: calc(100dvh - 64px)">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
nav ul li a span {
  text-transform: capitalize;
  font-family: 'Quicksand', sans-serif;
  font-weight: 500;
}
</style>

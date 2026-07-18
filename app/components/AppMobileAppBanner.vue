<script setup lang="ts">
const APP_STORE_URL = 'https://apps.apple.com/us/app/vie-publique-s%C3%A9n%C3%A9gal/id6757257552';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=sn.viepublique.app';

// Masqué quand le site est affiché dans l'app mobile / PWA standalone
const { isInApp } = useIsInApp();
</script>

<template>
  <div v-if="!isInApp" class="mt-8 border-t border-gray-100 py-6 dark:border-gray-700">
    <div class="flex flex-col items-center justify-center gap-3 px-4">
      <NuxtLink
        to="/app"
        class="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
      >
        Téléchargez notre appli mobile <span class="font-semibold">Vie Publique Sénégal</span>
      </NuxtLink>

      <div class="flex items-center gap-2">
        <a
          :href="PLAY_STORE_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="transition-transform hover:scale-105"
        >
          <img
            src="/img/google-store.svg"
            alt="Disponible sur Google Play"
            class="h-10 w-auto"
            width="137"
            height="42"
            loading="lazy"
          />
        </a>
        <a
          :href="APP_STORE_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="transition-transform hover:scale-105"
        >
          <img
            src="/img/apple-store.svg"
            alt="Télécharger dans l'App Store"
            class="h-10 w-auto"
            width="135"
            height="40"
            loading="lazy"
          />
        </a>
      </div>
    </div>
  </div>
</template>

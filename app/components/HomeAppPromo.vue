<script setup lang="ts">
const APP_STORE_URL = 'https://apps.apple.com/us/app/vie-publique-s%C3%A9n%C3%A9gal/id6757257552';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=sn.viepublique.app';

const { isInApp } = useIsInApp();
</script>

<template>
  <div v-if="!isInApp" class="my-8">
    <h2 class="mb-4 text-center text-xl font-semibold text-gray-800 dark:text-white">
      Disponible sur mobile
    </h2>

    <NuxtLink
      to="/app"
      class="group block overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 transition-shadow hover:shadow-md dark:bg-gray-800 dark:ring-gray-700"
    >
      <div class="flex flex-col items-center gap-4 p-4 sm:flex-row sm:justify-center">
        <!-- Screenshot light -->
        <img
          src="/mobile/capture%20iphone%20app%20mobile%20light.png"
          alt="App Vie Publique Sénégal"
          class="hidden h-36 w-auto flex-shrink-0 rounded-lg shadow-md sm:block"
          loading="lazy"
        />

        <!-- QR Code - desktop only -->
        <div class="hidden flex-shrink-0 flex-col items-center gap-1 lg:flex">
          <div class="rounded-lg bg-white shadow-sm">
            <img
              src="/qr-code-page-app-vpsn.png"
              alt="QR Code - Télécharger l'app"
              class="h-28 w-28"
              width="112"
              height="112"
              loading="lazy"
            />
          </div>
          <p class="text-[10px] text-gray-400 dark:text-gray-500">Scannez pour télécharger</p>
        </div>

        <!-- Content -->
        <div class="text-center sm:text-left">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            10 000+ documents officiels dans votre poche. Gratuit, sans pub.
          </p>

          <!-- Store buttons -->
          <div class="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <a
              :href="PLAY_STORE_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="transition-transform hover:scale-105"
              @click.stop
            >
              <img
                src="/img/google-store.svg"
                alt="Disponible sur Google Play"
                class="h-11 w-auto"
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
              @click.stop
            >
              <img
                src="/img/apple-store.svg"
                alt="Télécharger dans l'App Store"
                class="h-11 w-auto"
                width="135"
                height="40"
                loading="lazy"
              />
            </a>
          </div>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>

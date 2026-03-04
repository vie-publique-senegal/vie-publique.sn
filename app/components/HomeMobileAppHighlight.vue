<template>
  <UCard :ui="{ body: { padding: 'p-4 sm:p-6' } }" class="relative overflow-hidden border-0 bg-white shadow-sm rounded-lg dark:bg-gray-700">
    <div class="relative flex flex-col lg:flex-row lg:items-end">
      <!-- Texte + boutons -->
      <div class="flex-1 space-y-6 text-center lg:text-left">
        <div
          class="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700 dark:bg-white/10 dark:text-white/80"
        >
          <UIcon name="i-heroicons-device-phone-mobile" class="h-4 w-4" />
          Disponible sur iOS et Android
        </div>

        <div>
          <h2 class="text-3xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Vie Publique<br />
            <span class="text-blue-600 dark:text-blue-400">dans votre poche</span>
          </h2>
          <p class="mx-auto mt-6 max-w-xl text-base text-gray-600 dark:text-white/60 sm:text-lg lg:mx-0">
            Accédez instantanément à des milliers de documents officiels, actualités, activités
            parlementaires... du Sénégal. Une expérience optimisée, même hors-ligne.
          </p>
        </div>

        <!-- Badges stores -->
        <div class="flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
          <a
            href="https://apps.apple.com/ai/app/vie-publique-sénégal/id6757257552"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-transform hover:opacity-90 active:scale-95"
          >
            <img
              src="/images/app-store-badge.svg"
              alt="Télécharger sur l'App Store"
              class="h-12 w-auto sm:h-14"
            />
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=sn.viepublique.app"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-transform hover:opacity-90 active:scale-95"
          >
            <img
              src="/images/google-play-badge.png"
              alt="Disponible sur Google Play"
              class="h-12 w-auto sm:h-14"
            />
          </a>
        </div>
      </div>

      <!-- Image du téléphone -->
      <div class="hidden items-end justify-center lg:flex lg:w-auto">
        <img
          src="/images/homepage.png"
          alt="Application Vie Publique Sénégal"
          class="h-auto w-auto object-contain drop-shadow-2xl lg:h-[380px]"
        />
      </div>
    </div>
  </UCard>
</template>

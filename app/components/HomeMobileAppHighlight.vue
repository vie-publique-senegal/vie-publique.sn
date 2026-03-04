<template>
  <div class="relative overflow-hidden rounded-3xl bg-gray-100 p-8 dark:bg-gray-800 sm:p-12">
    <div
      class="relative flex flex-col items-center gap-10 lg:flex-row lg:justify-between lg:gap-20"
    >
      <div class="flex-1 space-y-8 text-center lg:text-left">
        <div
          class="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-800/60"
        >
          <UIcon name="i-heroicons-device-phone-mobile" class="h-4 w-4" />
          Disponible sur iOS et Android
        </div>

        <div class="min-h-[140px] sm:min-h-0">
          <h2
            class="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-5xl"
          >
            Vie Publique <br class="hidden sm:block" />
            <span class="text-blue-600 dark:text-blue-400">dans votre poche</span>
          </h2>
          <p class="mx-auto mt-6 max-w-xl text-lg text-gray-600 dark:text-gray-400 lg:mx-0">
            Accédez instantanément à des milliers de documents officiels, actualités, activités
            parlementaires... du Sénégal. Une expérience optimisée, même hors-ligne.
          </p>
        </div>

        <div class="flex flex-col items-center justify-center gap-6 sm:flex-row lg:justify-start">
          <UButton
            to="https://onelink.to/a3jrac"
            target="_blank"
            size="xl"
            color="primary"
            class="group w-full justify-center rounded-full px-5 py-4 shadow-xl hover:shadow-2xl sm:w-auto sm:px-10"
          >
            <template #leading>
              <UIcon name="i-heroicons-arrow-down-tray" class="h-5 w-5 sm:h-6 sm:w-6" />
            </template>
            Installer l'application
          </UButton>
        </div>
      </div>

      <div class="group relative flex-shrink-0 lg:mr-8">
        <div
          class="relative overflow-hidden rounded-[2rem] border border-white bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <img
            src="/images/onelink_to_a3jrac.svg"
            alt="QR Code Application Vie Publique Sénégal"
            class="h-44 w-44 transition-opacity duration-300 sm:h-52 sm:w-52"
          />

          <div class="mt-4 text-center">
            <span
              class="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500"
            >
              Scannez le code
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

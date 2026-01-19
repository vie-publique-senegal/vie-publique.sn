// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-11',
  devtools: { enabled: true },
  imports: {
    autoImport: true,
    dirs: [
      'app/composables/**',
      'app/composables/elections/dashboard'
    ],
  },
});

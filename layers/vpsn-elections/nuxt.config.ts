// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-11',

  devtools: { enabled: true },

  // Auto-imports des composables
  imports: {
    dirs: [
      'composables',
      'composables/elections/**',
    ],
  },

  // Auto-imports des composants
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  // Alias pour faciliter les imports
  alias: {
    '#elections': './composables/elections',
  },

  // Configuration TypeScript
  typescript: {
    strict: true,
    typeCheck: false, // Désactiver pour le dev, activer en CI
  },
})

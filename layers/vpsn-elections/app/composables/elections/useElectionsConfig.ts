/**
 * Composable pour accéder à la configuration dynamique des élections
 * Simplifie l'utilisation de app.config.ts dans les composants
 */
export const useElectionsConfig = () => {
  const appConfig = useAppConfig();
  const config = appConfig.vpsnElections;

  return {
    // Configuration complète
    config: computed(() => config),

    // Informations du pays
    country: computed(() => config.country),
    countryName: computed(() => config.country.name),
    countryCode: computed(() => config.country.code),

    // Labels
    labels: computed(() => config.labels),

    // Features
    features: computed(() => config.features),

    // UI texts
    ui: computed(() => config.ui),

    // Helper methods
    getLabel: (key: string) => {
      return config.labels[key as keyof typeof config.labels] || key;
    },

    getElectionTypeLabel: (type: string) => {
      if (type === 'legislative') return config.labels.legislative;
      if (type === 'presidential') return config.labels.presidential;
      if (type === 'locale') return config.labels.locale || 'Locales';
      return type;
    },

    isFeatureEnabled: (feature: string) => {
      return config.features[feature as keyof typeof config.features] ?? false;
    },
  };
};

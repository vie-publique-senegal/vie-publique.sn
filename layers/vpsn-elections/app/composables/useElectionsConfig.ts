/**
 * Composable pour accéder à la configuration du layer vpsn-elections
 *
 * @example
 * ```typescript
 * const { country, labels, features } = useElectionsConfig();
 * console.log(country.name); // "Sénégal"
 * console.log(labels.departments); // "Départements"
 * ```
 */
export const useElectionsConfig = () => {
  const appConfig = useAppConfig();
  const config = appConfig.vpsnElections;

  // Validation (optionnel mais recommandé)
  if (!config) {
    throw new Error('[vpsn-elections] Configuration manquante. Assurez-vous que le layer est bien activé.');
  }

  // Computed properties utiles
  const isCountryConfigured = computed(() => {
    return !!(config.country?.name && config.country?.code);
  });

  const enabledFeatures = computed(() => {
    return Object.entries(config.features || {})
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature);
  });

  const disabledFeatures = computed(() => {
    return Object.entries(config.features || {})
      .filter(([_, enabled]) => !enabled)
      .map(([feature]) => feature);
  });

  // Helpers
  const isFeatureEnabled = (feature: keyof typeof config.features) => {
    return config.features?.[feature] ?? false;
  };

  const getLabel = (key: string) => {
    return config.labels?.[key] ?? key;
  };

  const getApiUrl = (endpoint: string) => {
    const baseUrl = config.api?.baseUrl || '/api/elections';
    return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  };

  return {
    // Configuration brute
    config,

    // Accès direct aux sections
    country: config.country,
    api: config.api,
    labels: config.labels,
    features: config.features,
    ui: config.ui,
    seo: config.seo,

    // Computed properties
    isCountryConfigured,
    enabledFeatures,
    disabledFeatures,

    // Helpers
    isFeatureEnabled,
    getLabel,
    getApiUrl,
  };
};

// Type pour l'autocomplétion
export type ElectionsConfig = ReturnType<typeof useElectionsConfig>;

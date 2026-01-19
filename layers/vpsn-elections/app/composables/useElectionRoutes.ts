/**
 * Composable pour générer les routes d'élections de manière dynamique
 * basé sur la configuration du pays dans app.config.ts
 */
export const useElectionRoutes = () => {
  const appConfig = useAppConfig();
  const countryName = appConfig.vpsnElections?.country?.name || 'Senegal';

  // Convertir le nom du pays en slug (minuscule, sans accents, sans espaces)
  const countrySlug = countryName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/\s+/g, '-'); // Remplacer les espaces par des tirets

  const baseRoute = `/elections-${countrySlug}`;

  return {
    // Route de base
    baseRoute,

    // Routes principales
    home: baseRoute,
    carteElectorale: `${baseRoute}/carte-electorale`,
    guideElectoral: `${baseRoute}/guide-electoral`,
    legislation: `${baseRoute}/legislation`,

    // Route dashboard (avec paramètres)
    dashboard: (type: string, year: number | string) =>
      `${baseRoute}/dashboard/${type}/${year}`,

    // Fonction helper pour construire n'importe quelle sous-route
    buildRoute: (subPath: string) => {
      const cleanPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;
      return `${baseRoute}/${cleanPath}`;
    },
  };
};

export default defineAppConfig({
  vpsnElections: {
    // Configuration du pays
    country: {
      name: 'Sénégal',
      code: 'SN',
    },

    // Configuration des endpoints API
    api: {
      // Base URL pour les API élections (peut être overridden par le projet parent)
      baseUrl: '/api/elections',
    },

    // Labels traduisibles/personnalisables par pays
    labels: {
      // Géographie
      departments: 'Départements',
      regions: 'Régions',
      constituencies: 'Circonscriptions',
      communes: 'Communes',
      diaspora: 'Diaspora',

      // Élections
      presidential: 'Présidentielle',
      legislative: 'Législatives',
      locale: 'Locales',

      // Entités politiques
      coalitions: 'Coalitions',
      candidates: 'Candidats',
      lists: 'Listes électorales',

      // Statuts
      ongoing: 'En Cours',
      scheduled: 'Programmée',
      completed: 'Terminée',

      // Navigation
      results: 'Résultats',
      statistics: 'Statistiques',
      map: 'Carte Électorale',
      guide: "Guide de l'Électeur",
      legislation: 'Législation',
      documents: 'Documents Officiels',
    },

    // Features toggles (activer/désactiver des fonctionnalités)
    features: {
      showDiaspora: true,
      showLocalElections: true,
      showGuide: true,
      showLegislation: true,
      showStatistics: true,
      showMaps: true,
      showDocuments: true,
      showNews: true,
    },

    // Configuration UI
    ui: {
      // Couleur primaire (optionnel, utilise la couleur du projet parent par défaut)
      // primaryColor: '#0EA5E9',

      // Nombre d'items par page
      itemsPerPage: {
        coalitions: 12,
        documents: 12,
        news: 3,
      },

      // Cache duration (en secondes)
      cache: {
        config: 3600, // 1h
        coalitions: 1800, // 30min
        constituencies: 1800, // 30min
        professions: 3600, // 1h
        documents: 3600, // 1h
        guide: 3600, // 1h
      },
    },

    // Configuration SEO
    seo: {
      title: "Élections Sénégal | Plateforme d'Information Électorale",
      description:
        'Accédez à toutes les informations sur les élections au Sénégal : guide électoral, législation, cartographie et résultats.',
      ogImage: '/images/vpsn-share-elections.png',
    },
  },
});

// Type safety pour l'AppConfig
declare module '@nuxt/schema' {
  interface AppConfigInput {
    vpsnElections?: {
      country?: {
        name?: string;
        code?: string;
      };
      api?: {
        baseUrl?: string;
      };
      labels?: Record<string, string>;
      features?: {
        showDiaspora?: boolean;
        showLocalElections?: boolean;
        showGuide?: boolean;
        showLegislation?: boolean;
        showStatistics?: boolean;
        showMaps?: boolean;
        showDocuments?: boolean;
        showNews?: boolean;
      };
      ui?: {
        primaryColor?: string;
        itemsPerPage?: Record<string, number>;
        cache?: Record<string, number>;
      };
      seo?: {
        title?: string;
        description?: string;
        ogImage?: string;
      };
    };
  }
}

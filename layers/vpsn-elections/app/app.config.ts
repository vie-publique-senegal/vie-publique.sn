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

    // Configuration des liens
    // Note: Les liens sont générés dynamiquement via useElectionRoutes()
    // basé sur le nom du pays configuré
    links: {
      // home et autres liens sont générés automatiquement
      // Vous pouvez les override ici si nécessaire
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

      // Textes des tabs
      mapTab: 'Carte',
      resultsTab: 'Résultats',
      documentsTab: 'Documents',
      statsTab: 'Stats',
      guideTab: 'Guide',

      // Placeholders de recherche
      searchPlaceholder: 'Rechercher...',
      searchDepartmentPlaceholder: 'Rechercher un département...',
      searchConstituencyPlaceholder: 'Rechercher une circonscription...',

      // Textes divers
      engaged: 'engagées',
      home: 'Accueil Élections',
      backToHome: 'Accueil Élections',

      // Guide électoral
      guideTitle: 'Guide Électoral - Comment Voter',
      guideDescription: 'Découvrez comment voter aux élections en vidéo, disponible en plusieurs langues nationales.',
      allElections: 'Toutes les élections',
      allLanguages: 'Toutes les langues',
      noVideosAvailable: 'Aucune vidéo disponible pour cette sélection.',

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

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

    // Types d'élections actifs dans l'interface
    // Mettre à false pour masquer un type partout (sélecteur, liste d'années, élection par défaut)
    features: {
      showPresidential: true,
      showLegislative: true,
      showLocale: true,

      // Masquer le sélecteur de type d'élection sur toutes les pages
      // Utile quand un seul type est actif (showPresidential/showLegislative/showLocale)
      // hideTypeFilter: true,

      // Masquer le sélecteur d'année sur toutes les pages de /elections-senegal
      // Quand il n'y a qu'une seule élection par type, le sélecteur d'année devient superflu
      // hideYearFilter: true,
    },

    // Personnalisation du thème visuel du dashboard
    // primaryColor : couleur hex qui remplace la couleur primaire de Nuxt UI sur tout
    // le dashboard électoral (boutons, accents, icônes, textes colorés, etc.)
    // Exemple : '#E63946' pour rouge, '#0EA5E9' pour bleu ciel, '#16A34A' pour vert
    theme: {
      // primaryColor: '#2563EB',
    },

    // Configuration UI
    ui: {
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

      // Note de bas de page sur les sources officielles des données
      officialSourcesNote: 'Toutes les informations sont issues de sources officielles : DGE, Conseil Constitutionnel.',

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
        showPresidential?: boolean;
        showLegislative?: boolean;
        showLocale?: boolean;
        hideTypeFilter?: boolean;
        hideYearFilter?: boolean;
      };
      theme?: {
        primaryColor?: string;
      };
      ui?: {
        officialSourcesNote?: string;
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

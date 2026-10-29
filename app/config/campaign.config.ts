/**
 * Bannière de campagne temporaire (page d'accueil).
 *
 * Source unique des textes, du visuel, de la destination et de la durée de vie.
 *
 * TROIS FAÇONS DE L'ÉTEINDRE, de la plus souple à la plus définitive :
 *  1. Sans déploiement : créer le flag `campaign_parole_aux_jeunes` dans la
 *     collection Directus `vp_feature_flags` et le passer à `enabled: false`
 *     (effet en 5 min, le temps du cache de `/api/features/flags`).
 *  2. Toute seule : la bannière disparaît après `endsAt`, SSR compris.
 *  3. Dans le code : `enabled: false` ci-dessous, ou retirer `<CampaignBanner />`
 *     de `app/pages/index.vue`.
 *
 * La bannière n'est pas fermable : pas de croix, pas de mémorisation par
 * visiteur. C'est le flag Directus qui fait office d'interrupteur.
 */
export interface CampaignBanner {
  /** Identifiant de campagne, aussi utilisé comme valeur `utm_campaign` */
  id: string;
  /**
   * Clé du feature flag. Tant qu'elle n'existe pas dans Directus, la valeur de
   * `DEFAULT_FEATURES` (app/config/features.config.ts) s'applique.
   */
  featureKey: string;
  /** Garde-fou local, prime sur tout le reste */
  enabled: boolean;
  /** Titre de la campagne, très court */
  title: string;
  /** Une phrase, l'accroche */
  question: string;
  /**
   * Ce qui lève le frein principal à participer. UNE seule : l'affiche porte déjà
   * le titre et « Consultation citoyenne », le texte ne répète rien.
   */
  reassurances: string[];
  /** Échéance telle qu'elle est lue par le citoyen */
  deadlineLabel: string;
  /** Fin réelle (ISO) : sert au compte à rebours ET à l'extinction automatique */
  endsAt: string;
  /** Libellé du bouton */
  ctaLabel: string;
  /** Destination, sans paramètres : les UTM sont ajoutés par le composant */
  url: string;
  /**
   * Visuel de campagne, servi depuis `public/` (et non depuis kaddu.org) pour ne
   * pas dépendre d'un autre domaine. Il DOIT être en 16/9 : le cadre l'est aussi,
   * donc l'affiche apparaît entière, sans recadrage.
   * Source : la couverture de la consultation, convertie en webp (62 Ko).
   */
  image: string;
  imageWidth: number;
  imageHeight: number;
  /** Nom du site porteur */
  partnerName: string;
  /** Logos du porteur : le bleu sur fond clair, le blanc sur fond sombre */
  partnerLogoLight: string;
  partnerLogoDark: string;
}

export const CAMPAIGN_BANNER: CampaignBanner = {
  id: 'parole-aux-jeunes-2026-10',
  featureKey: 'campaign_parole_aux_jeunes',
  enabled: true,
  title: 'La parole aux jeunes',
  question: 'Quelle place pour les jeunes dans les décisions publiques ?',
  reassurances: ['Anonyme, sans compte'],
  deadlineLabel: "jusqu'au 31 octobre",
  // Le Sénégal est à UTC+0 : la bannière reste visible toute la journée du 31.
  endsAt: '2026-10-31T23:59:59Z',
  ctaLabel: 'Participez en 2 minutes',
  url: 'https://www.kaddu.org/consultations/la-parole-aux-jeunes',
  image: '/img/campagne-parole-aux-jeunes.webp',
  imageWidth: 960,
  imageHeight: 540,
  partnerName: 'Kaddu',
  partnerLogoLight: '/img/kaddu-logo-bleu.png',
  partnerLogoDark: '/img/kaddu-logo-blanc.png',
};

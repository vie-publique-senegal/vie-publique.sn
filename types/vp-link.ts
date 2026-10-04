/**
 * Liens de la page `/liens` (remplaçante du Linktree, cible du QR code).
 *
 * La forme d'un lien calque une ligne de la future collection Directus `vp_links`
 * (voir `docs/modules/liens/README.md`) : la bascule JSON → CMS ne touchera que
 * l'endpoint `/api/liens`, pas la page.
 */

/**
 * Bloc de la page où le lien s'affiche (valeur du dropdown `section` dans Directus).
 * Ordre à l'écran : featured → app → products → about ; `social` = icônes de l'en-tête.
 */
export type VpLinkSection = 'featured' | 'app' | 'products' | 'about' | 'social';

export interface VpLink {
  id: string | number;
  section: VpLinkSection;
  title: string;
  description?: string | null;
  /** Chemin interne (`/actualites`) ou URL absolue externe. */
  url: string;
  /** Nom d'icône Iconify (`i-heroicons-newspaper`, `i-simple-icons-youtube`…). */
  icon?: string | null;
  /** Visuel remplaçant le bouton standard (badge de store pour la section `app`). */
  image?: string | null;
  /** Nombre d'abonnés (section `social`, issu de `vp_social_stats`). */
  followers?: number | null;
  sort: number;
  status: 'draft' | 'published' | 'archived';
}

export interface VpLinksResponse {
  data: VpLink[];
}

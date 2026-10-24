/**
 * Comment on accède à la fonction : `elected` (mandat électif : maire, présidence…) ou
 * `appointed` (nomination : ministre, préfet, DG…). `null` = catégorie non classée
 * (« Autre ») ou mandat sans catégorie. Porté par la CATÉGORIE, pas par le mandat (G19).
 */
export type MandateType = 'elected' | 'appointed';

/** Catégorie de fonction (référentiel Directus `public_position_categories`). */
export interface PositionCategory {
  slug: string;
  label: string;
  mandate_type: MandateType | null;
}

export interface PublicPersonAppointment {
  id: number;
  position_title: string;
  /** Libellé de catégorie, dérivé de `category.label` (chaîne vide si non classé) */
  position_category: string;
  /** Clé de catégorie, dérivée de `category.slug` (`null` si non classé) */
  position_category_slug?: string | null;
  /** Catégorie relationnelle ; `null` tant que le mandat n'est pas classé */
  category?: PositionCategory | null;
  organization_label: string;
  appointment_date: string;
  end_date?: string | null;
  end_reason?: string | null;
  is_current: boolean;
  predecessor_label?: string | null;
  predecessor?: { id: number; full_name: string; slug: string } | null;
  successor_label?: string | null;
  successor?: { id: number; full_name: string; slug: string } | null;
  source_label?: string | null;
  source_link?: string | null;
  source_document?: { id: number; title: string; slug?: string } | null;
  notes?: string | null;
}

export interface PublicPerson {
  id: number;
  full_name: string;
  slug: string;
  sexe: 'male' | 'female';
  short_bio?: string | null;
  long_bio?: string | null;
  education?: string | null;
  birthdate?: string | null;
  birthplace?: string | null;
  photo?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  linkedin?: string | null;
  website?: string | null;
  current_appointment?: PublicPersonAppointment | null;
}

export interface PublicPersonDetail extends PublicPerson {
  appointments: PublicPersonAppointment[];
}

/**
 * Facette élu / nommé de l'annuaire (sur `current_appointment.category.mandate_type`) :
 * `elected`, `appointed`, `unclassified` (catégorie sans type ou mandat sans catégorie),
 * `all` = pas de filtre. Les non classés restent comptés dans le total (G19).
 */
export type MandateFilter = MandateType | 'unclassified' | 'all';

export const MANDATE_FILTERS: MandateFilter[] = ['elected', 'appointed', 'unclassified', 'all'];

export const isMandateFilter = (value: unknown): value is MandateFilter =>
  typeof value === 'string' && (MANDATE_FILTERS as string[]).includes(value);

/** Libellés affichés de la facette (pluriel, pour les boutons de filtre) */
export const MANDATE_FILTER_LABELS: Record<Exclude<MandateFilter, 'all'>, string> = {
  elected: 'Élus',
  appointed: 'Nommés',
  unclassified: 'Non classés',
};

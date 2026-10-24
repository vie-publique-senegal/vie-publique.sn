export type DecreeRef = { id: number; title: string; slug: string } | null;

export type PersonRef = {
  id: number;
  full_name: string;
  slug: string | null;
  photo: string | null;
} | null;

export type Government = {
  id: number;
  name: string;
  slug: string;
  start_date: string;
  end_date: string | null;
  president: PersonRef;
  prime_minister: PersonRef;
  pm_appointment_decree: DecreeRef;
  formation_decree: DecreeRef;
  notes: string | null;
};

/** Statistiques légères affichées sur chaque carte de l'historique. */
export type GovernmentStatsLite = {
  total: number;
  women: number;
};

export type GovernmentWithStats = Government & {
  stats: GovernmentStatsLite;
};

/** Présidence dérivée dynamiquement des données (jamais codée en dur). */
export type PresidentSummary = {
  slug: string;
  full_name: string;
  count: number;
};

export type GovernmentHistoryResponse = {
  governments: GovernmentWithStats[];
  presidents: PresidentSummary[];
};

/**
 * Membre d'un gouvernement (= une `public_person_appointments`).
 * `position_category` / `position_category_slug` / `end_reason` sont des listes
 * de choix gérées dans Directus : on les type en `string` pour ne PAS figer les
 * valeurs. Toute nouvelle catégorie ajoutée au CMS fonctionne sans changement de code.
 */
export type GovernmentMemberFull = {
  id: number;
  position_title: string;
  organization_label: string;
  position_category: string;
  position_category_slug: string;
  appointment_date: string;
  end_date: string | null;
  end_reason: string | null;
  is_current: boolean;
  person: {
    id: number;
    full_name: string;
    slug: string | null;
    photo: string | null;
    sexe: 'male' | 'female' | null;
  };
};

/** Catégorie de rôle telle que servie par l'API (dérivée dynamiquement). */
export type GovernmentRoleGroup = {
  slug: string;
  label: string;
  members: GovernmentMemberFull[];
};

/** Rôle présent dans le gouvernement (pour construire le filtre `role`). */
export type GovernmentRole = {
  slug: string;
  label: string;
  count: number;
};

export type GovernmentStats = {
  total: number;
  women: number;
  men: number;
  duration_days: number;
};

export type GovernmentPagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type GovernmentDetailResponse = {
  government: Government;
  groups: GovernmentRoleGroup[];
  roles: GovernmentRole[];
  pagination: GovernmentPagination;
  stats: GovernmentStats;
};

/** Liste dynamique des rôles (catégories) telle que définie au CMS. */
export type GovernmentCategory = {
  slug: string;
  label: string;
};

export type GovernmentCategoriesResponse = {
  categories: GovernmentCategory[];
};

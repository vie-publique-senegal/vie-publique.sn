// Vocabulaire des versions de loi de finances, partagé serveur/client
// (importable via #shared/budget-version).
//
// `budget_version.label` ne contient que des sigles (« PLF », « LFI », « LFR »).
// Affichés tels quels, ils sont illisibles pour un visiteur non spécialiste et,
// pire, ils gomment une distinction éditoriale essentielle : un PLF est un
// PROJET en cours d'examen parlementaire, pas une loi adoptée. Toute surface qui
// affiche une année budgétaire doit donc afficher aussi ce statut.

/** Priorité d'affichage : le texte le plus avancé dans la navette l'emporte. */
export const BUDGET_VERSION_PRIORITY = ['LFR', 'LFI', 'PLF'] as const;

export interface BudgetVersionDescription {
  /** Sigle d'origine (`budget_version.label`), vide si inconnu. */
  code: string;
  /** Libellé complet, lisible par un non-spécialiste. */
  label: string;
  /** Statut parlementaire du texte, à afficher à côté de l'année. */
  status: string;
  /** `true` tant que le texte n'est pas voté (projet de loi de finances). */
  isDraft: boolean;
  /**
   * Genre grammatical du libellé, pour accorder les articles côté rédaction
   * (« LE projet de loi de finances » / « LA loi de finances initiale »).
   * Sans lui, chaque page redevine l'accord et finit par écrire
   * « de la projet de loi de finances ».
   */
  gender: 'm' | 'f';
}

const DESCRIPTIONS: Record<string, Omit<BudgetVersionDescription, 'code'>> = {
  PLF: {
    label: 'Projet de loi de finances',
    status: 'En examen au Parlement',
    isDraft: true,
    gender: 'm',
  },
  LFI: {
    label: 'Loi de finances initiale',
    status: 'Texte adopté',
    isDraft: false,
    gender: 'f',
  },
  LFR: {
    label: 'Loi de finances rectificative',
    status: 'Texte adopté',
    isDraft: false,
    gender: 'f',
  },
};

/** Repli neutre : ni « projet », ni « adopté », on n'affirme rien de faux. */
const UNKNOWN: Omit<BudgetVersionDescription, 'code'> = {
  label: 'Loi de finances',
  status: '',
  isDraft: false,
  gender: 'f',
};

/** Décrit une version budgétaire à partir de son sigle Directus. */
export function describeBudgetVersion(code?: string | null): BudgetVersionDescription {
  const normalized = (code || '').trim().toUpperCase();
  return { code: normalized, ...(DESCRIPTIONS[normalized] || UNKNOWN) };
}

/** « Le » / « La » devant le libellé (début de phrase). */
export function budgetVersionArticle(version: BudgetVersionDescription): 'Le' | 'La' {
  return version.gender === 'm' ? 'Le' : 'La';
}

/** « du » / « de la » devant le libellé (complément de nom). */
export function budgetVersionOf(version: BudgetVersionDescription): 'du' | 'de la' {
  return version.gender === 'm' ? 'du' : 'de la';
}

export interface BudgetVersionLike {
  id: number;
  label: string;
  date?: string | null;
}

export interface BudgetYearLike<V extends BudgetVersionLike = BudgetVersionLike> {
  year: number;
  versions: V[];
}

export interface LatestBudget {
  year: number;
  versionId: number;
  versionLabel: string;
}

/**
 * Version à retenir pour un exercice : LFR > LFI > PLF, puis, pour un sigle
 * inconnu, la plus récente par date.
 *
 * ⚠️ Ne PAS remplacer par `versions.find(v => PRIORITY.includes(v.label))` :
 * `versions` est trié par date croissante, donc `find` renvoie la version la
 * plus ANCIENNE dont le sigle est connu, pas la plus prioritaire. Le jour où une
 * LFI votée est publiée à côté du PLF du même exercice, c'est le projet qui
 * s'afficherait par défaut.
 */
export function pickPriorityBudgetVersion<V extends BudgetVersionLike>(
  versions: readonly V[],
): V | undefined {
  if (!versions?.length) return undefined;

  for (const label of BUDGET_VERSION_PRIORITY) {
    const found = versions.find((v) => (v.label || '').trim().toUpperCase() === label);
    if (found) return found;
  }

  // Aucun sigle connu : la date la plus récente fait office de priorité. Si une
  // date manque, on garde l'ordre reçu (l'API trie déjà par date croissante).
  const dated = versions.filter((v) => v.date && !Number.isNaN(Date.parse(v.date)));
  if (dated.length !== versions.length) return versions[versions.length - 1];

  return dated.reduce((a, b) => (Date.parse(b.date!) >= Date.parse(a.date!) ? b : a));
}

/**
 * Dernier exercice publié et sa version prioritaire. Indépendant de l'ordre du
 * tableau reçu : l'année retenue est la plus élevée ayant au moins une version.
 */
export function resolveLatestBudget(years: readonly BudgetYearLike[]): LatestBudget | null {
  const withVersions = (years || []).filter((y) => y?.versions?.length);
  if (!withVersions.length) return null;

  const latestYear = withVersions.reduce((a, b) => (b.year > a.year ? b : a));
  const version = pickPriorityBudgetVersion(latestYear.versions);
  if (!version) return null;

  return {
    year: latestYear.year,
    versionId: version.id,
    versionLabel: version.label,
  };
}

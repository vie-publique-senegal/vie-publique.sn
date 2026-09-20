// server/utils/assembly-questions-search.ts
//
// Recherche plein texte INSENSIBLE AUX ACCENTS sur les questions écrites.
//
// Pourquoi un index maison plutôt qu'un filtre Directus : `_icontains` se traduit
// par un `ILIKE` Postgres, qui ignore la casse mais PAS les diacritiques —
// `?q=defici` ne remontait rien alors que `?q=défici` remontait des résultats.
// L'extension `unaccent` n'est pas activable depuis l'API Directus.
//
// Stratégie : un index en mémoire (id + date + sujet replié + haystack replié),
// mis en cache 1 h via `defineCachedFunction`. La recherche + le tri + la
// pagination se font sur cet index, puis on ne redemande à Directus QUE les
// ~20-50 ids de la page courante (`id._in`) pour récupérer les champs complets.
// La requête Directus reste donc bornée quel que soit le nombre de résultats.
import { readItems } from '@directus/sdk';
import { foldForSearch } from '~~/shared/clean-text';

export interface QuestionIndexEntry {
  id: number | string;
  deputyId: string | number | null;
  questionDate: string | null;
  /** Sujet replié (sans accents, minuscules) — sert au tri alphabétique */
  subjectFolded: string;
  /** Sujet + contenu + nom du député, replié — sert au match */
  haystack: string;
}

const buildQuestionsIndex = async (): Promise<QuestionIndexEntry[]> => {
  const directus = getCmsClient();

  const rows = await directus.request(
    readItems('assembly_question', {
      fields: [
        'id',
        'subject',
        'question_text',
        'question_date',
        'deputy.id',
        'deputy.first_name',
        'deputy.last_name',
      ],
      filter: { status: { _eq: 'published' } },
      limit: -1,
    }),
  );

  interface IndexRow {
    id: number | string;
    subject?: string | null;
    question_text?: string | null;
    question_date?: string | null;
    deputy?: { id?: string | number; first_name?: string; last_name?: string } | null;
  }

  return (rows as IndexRow[]).map((row) => {
    const subjectFolded = foldForSearch(row.subject);
    return {
      id: row.id,
      deputyId: row.deputy?.id ?? null,
      questionDate: row.question_date || null,
      subjectFolded,
      haystack: [
        subjectFolded,
        foldForSearch(row.question_text),
        foldForSearch(row.deputy?.first_name),
        foldForSearch(row.deputy?.last_name),
      ]
        .filter(Boolean)
        .join(' '),
    };
  });
};

/** Index complet des questions publiées, mis en cache 1 h. */
export const getQuestionsSearchIndex = defineCachedFunction(buildQuestionsIndex, {
  maxAge: 60 * 60,
  name: 'assembly-questions-search-index',
  getKey: () => 'v1',
});

const compareEntries = (sortBy: string) => {
  const desc = sortBy.startsWith('-');
  const field = desc ? sortBy.slice(1) : sortBy;

  return (a: QuestionIndexEntry, b: QuestionIndexEntry) => {
    let diff = 0;
    if (field === 'subject') {
      diff = a.subjectFolded.localeCompare(b.subjectFolded);
    } else if (field === 'id') {
      diff = String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
    } else {
      // question_date par défaut ; les dates nulles passent en dernier
      diff = (a.questionDate || '').localeCompare(b.questionDate || '');
    }
    if (diff !== 0) return desc ? -diff : diff;

    // Départage stable sur l'id décroissant : beaucoup de questions partagent
    // la même question_date, sans ce tri secondaire l'ordre des ex æquo varie
    // d'une requête à l'autre (item dupliqué entre deux pages).
    return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
  };
};

export interface QuestionSearchParams {
  /** Terme saisi par l'utilisateur (brut) */
  search?: string;
  /** Restreindre à un député */
  deputyId?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface QuestionSearchResult {
  /** Ids de la page demandée, DANS l'ordre de tri */
  ids: (number | string)[];
  /** Nombre total de questions correspondant aux critères */
  total: number;
}

/**
 * Filtre + trie + pagine sur l'index en mémoire.
 * Tous les mots du terme doivent être présents (ET), sans tenir compte des
 * accents ni de la casse : « defici budget » matche « déficit du budget ».
 */
export const searchQuestions = async (
  params: QuestionSearchParams,
): Promise<QuestionSearchResult> => {
  const { search = '', deputyId = '', sortBy = '-question_date' } = params;
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 50);

  const index = await getQuestionsSearchIndex();
  const tokens = foldForSearch(search).split(/\s+/).filter(Boolean);

  const matches = index.filter((entry) => {
    if (deputyId && String(entry.deputyId) !== String(deputyId)) return false;
    return tokens.every((token) => entry.haystack.includes(token));
  });

  matches.sort(compareEntries(sortBy));

  const offset = (page - 1) * limit;
  return {
    ids: matches.slice(offset, offset + limit).map((entry) => entry.id),
    total: matches.length,
  };
};

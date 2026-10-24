/**
 * Périodes d'exercice d'une fonction (PM, président) dérivées d'une suite de
 * gouvernements. Un même titulaire peut revenir après une interruption
 * (ex. Moustapha Niasse : 1983 puis 2000-2001) : la durée totale est la
 * SOMME des passages, jamais l'écart entre la première et la dernière date.
 */

export type DatedInterval = { start_date: string; end_date: string | null };

const DAY_MS = 86_400_000;

/**
 * Deux gouvernements successifs du même titulaire sont considérés comme un
 * seul passage si le second débute au plus tard ce nombre de jours après la
 * fin du premier (tolère un intérim de quelques jours entre deux décrets).
 */
const CONTIGUITY_DAYS = 31;

/** Durée en jours entre deux dates (end null = aujourd'hui). */
export const durationDays = (start: string, end: string | null): number => {
  const s = Date.parse(start);
  const e = end ? Date.parse(end) : Date.now();
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  return Math.max(0, Math.floor((e - s) / DAY_MS));
};

/**
 * Fusionne des intervalles triés par date de début en passages contigus.
 * Un intervalle sans fin (mandat en cours) absorbe tout ce qui suit.
 */
export const mergePeriods = (intervals: DatedInterval[]): DatedInterval[] => {
  const sorted = [...intervals].sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date));
  const periods: DatedInterval[] = [];
  for (const it of sorted) {
    const last = periods[periods.length - 1];
    if (!last) {
      periods.push({ start_date: it.start_date, end_date: it.end_date });
      continue;
    }
    if (last.end_date === null) continue; // en cours : tout le reste est englobé
    const gapDays = (Date.parse(it.start_date) - Date.parse(last.end_date)) / DAY_MS;
    if (gapDays <= CONTIGUITY_DAYS) {
      if (it.end_date === null || Date.parse(it.end_date) > Date.parse(last.end_date)) {
        last.end_date = it.end_date;
      }
    } else {
      periods.push({ start_date: it.start_date, end_date: it.end_date });
    }
  }
  return periods;
};

/** Somme des durées des passages (jours), après fusion des chevauchements. */
export const totalDurationDays = (intervals: DatedInterval[]): number =>
  mergePeriods(intervals).reduce((sum, p) => sum + durationDays(p.start_date, p.end_date), 0);

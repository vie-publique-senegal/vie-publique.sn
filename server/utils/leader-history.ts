import { readItems } from '@directus/sdk';
import type {
  GovernmentBrief,
  LeaderAppointment,
  LeaderBrief,
  LeaderProfile,
  PresidentialTerm,
  PrimeMinisterGap,
  PrimeMinisterialTerm,
} from '~~/types/leader-history';

const DAY_MS = 86_400_000;

/** Durée en jours entre deux dates (end null = aujourd'hui). */
export const durationDays = (start: string, end: string | null): number => {
  const s = Date.parse(start);
  const e = end ? Date.parse(end) : Date.now();
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  return Math.max(0, Math.floor((e - s) / DAY_MS));
};

const toLeader = (p: any): LeaderBrief | null =>
  p
    ? {
        id: p.id,
        full_name: p.full_name,
        slug: p.slug || generateSlugFromName(p.full_name),
        photo: p.photo ?? null,
      }
    : null;

/**
 * Récupère tous les gouvernements publiés (président + PM), triés du plus
 * ancien au plus récent. Source unique pour dériver présidents et PMs.
 */
export async function fetchGovernmentsAsc(): Promise<GovernmentBrief[]> {
  const directus = getCmsClient();
  const data = await directus.request(
    readItems('governments', {
      fields: [
        'id',
        'name',
        'slug',
        'start_date',
        'end_date',
        'notes',
        'president.id',
        'president.full_name',
        'president.slug',
        'president.photo',
        'prime_minister.id',
        'prime_minister.full_name',
        'prime_minister.slug',
        'prime_minister.photo',
      ],
      filter: { status: { _eq: 'published' }, president: { _nnull: true } },
      sort: ['start_date'],
      limit: -1,
    }),
  );

  return (data as any[])
    .filter((g) => g.president)
    .map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug || generateSlugFromName(g.name),
      start_date: g.start_date,
      end_date: g.end_date ?? null,
      notes: g.notes ?? null,
      president: toLeader(g.president)!,
      prime_minister: toLeader(g.prime_minister),
    }));
}

/** Regroupe les gouvernements par président → mandats présidentiels. */
export function buildPresidentialTerms(govs: GovernmentBrief[]): PresidentialTerm[] {
  const byPresident = new Map<number, PresidentialTerm>();
  for (const g of govs) {
    const pid = g.president.id;
    let term = byPresident.get(pid);
    if (!term) {
      term = {
        president: g.president,
        start_date: g.start_date,
        end_date: g.end_date,
        governments: [],
        prime_ministers: [],
        stats: { governments_count: 0, duration_days: 0, pm_count: 0, periods_without_pm: 0 },
      };
      byPresident.set(pid, term);
    }
    term.governments.push(g);
    term.end_date = g.end_date; // fin du dernier gouvernement
    if (g.prime_minister && !term.prime_ministers.some((p) => p.id === g.prime_minister!.id)) {
      term.prime_ministers.push(g.prime_minister);
    }
  }
  for (const term of byPresident.values()) {
    term.stats = {
      governments_count: term.governments.length,
      duration_days: durationDays(term.start_date, term.end_date),
      pm_count: term.prime_ministers.length,
      periods_without_pm: term.governments.filter((g) => !g.prime_minister).length,
    };
  }
  return Array.from(byPresident.values());
}

/** Regroupe les gouvernements par PM → mandats de PM + périodes sans PM. */
export function buildPrimeMinisterialTerms(govs: GovernmentBrief[]): {
  terms: PrimeMinisterialTerm[];
  gaps: PrimeMinisterGap[];
} {
  const byPm = new Map<number, PrimeMinisterialTerm>();
  const gaps: PrimeMinisterGap[] = [];

  for (const g of govs) {
    if (!g.prime_minister) {
      gaps.push({
        start_date: g.start_date,
        end_date: g.end_date,
        president: g.president,
        governments: [g],
        label: 'Présidence directe (fonction de Premier ministre abolie)',
      });
      continue;
    }
    const id = g.prime_minister.id;
    let term = byPm.get(id);
    if (!term) {
      term = {
        prime_minister: g.prime_minister,
        president: g.president,
        start_date: g.start_date,
        end_date: g.end_date,
        governments: [],
        presidents: [],
        stats: { governments_count: 0, duration_days: 0 },
      };
      byPm.set(id, term);
    }
    term.governments.push(g);
    term.end_date = g.end_date;
    if (!term.presidents.some((p) => p.id === g.president.id)) {
      term.presidents.push(g.president);
    }
  }
  for (const term of byPm.values()) {
    term.stats = {
      governments_count: term.governments.length,
      duration_days: durationDays(term.start_date, term.end_date),
    };
  }
  return { terms: Array.from(byPm.values()), gaps };
}

/** Profil biographique complet d'une personnalité par slug. */
export async function fetchLeaderProfile(slug: string): Promise<LeaderProfile | null> {
  const directus = getCmsClient();
  const data = await directus.request(
    readItems('public_persons', {
      fields: [
        'id',
        'full_name',
        'slug',
        'sexe',
        'photo',
        'short_bio',
        'long_bio',
        'birthdate',
        'birthplace',
        'education',
        'website',
        'facebook',
        'twitter',
        'instagram',
        'tiktok',
        'linkedin',
      ],
      filter: { status: { _eq: 'published' }, slug: { _eq: slug } },
      limit: 1,
    }),
  );
  const p = (data as any[])[0];
  if (!p) return null;
  return {
    id: p.id,
    full_name: p.full_name,
    slug: p.slug,
    sexe: p.sexe === 'female' ? 'female' : p.sexe === 'male' ? 'male' : null,
    photo: p.photo ?? null,
    short_bio: p.short_bio ?? null,
    long_bio: p.long_bio ?? null,
    birthdate: p.birthdate ?? null,
    birthplace: p.birthplace ?? null,
    education: p.education ?? null,
    website: p.website ?? null,
    facebook: p.facebook ?? null,
    twitter: p.twitter ?? null,
    instagram: p.instagram ?? null,
    tiktok: p.tiktok ?? null,
    linkedin: p.linkedin ?? null,
  };
}

/** Nomination officielle (décret) la plus ancienne pour une fonction donnée. */
export async function fetchLeaderAppointment(
  personId: number,
  categorySlug: string,
): Promise<LeaderAppointment | null> {
  const directus = getCmsClient();
  const data = await directus.request(
    readItems('public_person_appointments', {
      fields: [
        'appointment_date',
        'end_date',
        'end_reason',
        'source_label',
        'source_excerpt',
        'notes',
        'source_document.id',
        'source_document.title',
        'source_document.slug',
      ],
      filter: {
        status: { _eq: 'published' },
        person: { _eq: personId },
        position_category_slug: { _eq: categorySlug },
      },
      sort: ['appointment_date'],
      limit: 1,
    }),
  );
  const a = (data as any[])[0];
  if (!a) return null;
  return {
    appointment_date: a.appointment_date ?? null,
    end_date: a.end_date ?? null,
    end_reason: a.end_reason ?? null,
    source_label: a.source_label ?? null,
    source_excerpt: a.source_excerpt ?? null,
    notes: a.notes ?? null,
    source_document: a.source_document
      ? {
          id: a.source_document.id,
          title: a.source_document.title,
          slug: a.source_document.slug ?? null,
        }
      : null,
  };
}

/** Navigation prev/next dans une liste de mandats ordonnée chronologiquement. */
export function leaderNav(
  slugs: { slug: string; full_name: string }[],
  currentSlug: string,
): {
  prev: { slug: string; full_name: string } | null;
  next: { slug: string; full_name: string } | null;
} {
  const i = slugs.findIndex((s) => s.slug === currentSlug);
  return {
    prev: i > 0 ? slugs[i - 1] : null,
    next: i >= 0 && i < slugs.length - 1 ? slugs[i + 1] : null,
  };
}

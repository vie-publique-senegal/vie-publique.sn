/**
 * Couche géo du module Collectivités territoriales.
 *
 * Assemble, depuis le référentiel générique Directus, la liste des 558
 * collectivités de base (553 communes + 5 villes) :
 *   - `geo_entities`                    identité stable (id, slug, niveau)
 *   - `geo_entity_versions`             état EN VIGUEUR (`valid_to IS NULL`) :
 *                                       nom courant, rattachement, chef-lieu
 *   - `geo_demographic_observations`    population (RGPH 2023)
 *   - `public_entity_profiles`          contact institutionnel + visuels
 *   - `public_person_appointments`      maire en fonction (`municipality`)
 *
 * `geo_entities` est une collection GÉNÉRIQUE : aucun champ propre aux
 * collectivités n'y est lu ni attendu. Le rattachement département/région est
 * reconstitué en remontant la chaîne `parent` des versions en vigueur
 * (commune → arrondissement → département → région), une commune pouvant être
 * rattachée directement à son département.
 *
 * Ce que le référentiel ne porte PAS (et qui vaut donc `null`, jamais inventé) :
 * superficie, géométrie, budget, conseil municipal. Les maires restent `null`
 * tant que les phases 2-3 de l'import (`schemas/collectivites/PLAN-DE-TRAVAIL.md`)
 * ne sont pas déroulées : le câblage est en place, il se remplira tout seul.
 *
 * Dégradation : chaque requête est isolée. Une panne sur la population ou les
 * profils omet la donnée, elle ne fait jamais échouer l'annuaire (cf. CLAUDE.md).
 */
import { readItems } from '@directus/sdk';
import { slugifyGeoName } from '#shared/geo-name';
import type { CommuneGeo } from '~/types/collectivite';

/** Niveaux du référentiel qui constituent une collectivité de base. */
const COLLECTIVITE_LEVELS = ['commune', 'ville'] as const;

/** Profondeur max de remontée parent (commune → arrondissement → dept → région). */
const MAX_PARENT_DEPTH = 8;

interface EntityRow {
  id: number;
  slug: string | null;
  level: string;
  name_current: string | null;
}
interface VersionRow {
  entity: number;
  name: string | null;
  parent: number | null;
  chef_lieu: number | null;
}
interface ObservationRow {
  entity: number;
  population: number | null;
  year: number | null;
}
interface ProfileRow {
  entity: number | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  cover_image: string | null;
}
interface AppointmentRow {
  municipality: number | null;
  position_category: string | null;
  position_title: string | null;
  appointment_date: string | null;
  person: {
    id: number;
    full_name: string | null;
    slug: string | null;
    photo: string | null;
    sexe: string | null;
  } | null;
}

/** Catégories de mandat exposées par la fiche commune. */
const MAIRE = 'Maire';
const SECRETAIRE_MUNICIPAL = 'Secrétaire municipal';

/**
 * Slug public d'une commune : le nom seul quand il est unique parmi les 558,
 * suffixé du département sinon (10 homonymes, ex. `velingara-kolda`).
 *
 * Choix assumé : on n'utilise PAS le `slug` Directus (`commune-<nom>-<dept>`),
 * dont le préfixe de niveau alourdit l'URL sans rien apporter au lecteur
 * (convention d'URL, CLAUDE.md). La règle ne dépend que du jeu de données
 * complet, pas de l'ordre des lignes : elle est donc stable d'un build à l'autre.
 */
const buildPublicSlugs = (rows: { nom: string; departement: string }[]): string[] => {
  const occurrences = new Map<string, number>();
  for (const row of rows) {
    const base = slugifyGeoName(row.nom);
    occurrences.set(base, (occurrences.get(base) ?? 0) + 1);
  }
  return rows.map((row) => {
    const base = slugifyGeoName(row.nom);
    return occurrences.get(base) === 1 ? base : `${base}-${slugifyGeoName(row.departement)}`;
  });
};

/**
 * Liste complète des collectivités, prête à consommer côté front.
 * Mise en cache : le référentiel bouge à l'échelle du découpage administratif,
 * pas de la minute.
 */
export const getCommunesGeo = defineCachedFunction(
  async (): Promise<CommuneGeo[]> => {
    const directus = getCmsClient();

    /** Requête isolée : un échec omet la donnée au lieu de casser l'annuaire. */
    const safeRequest = async <T>(scope: string, request: () => Promise<T>, fallback: T) => {
      try {
        return await request();
      } catch (error) {
        reportServerError(error, `collectivites-geo/${scope}`);
        return fallback;
      }
    };

    const [entities, versions, observations, profiles, appointments] = await Promise.all([
      safeRequest<EntityRow[]>(
        'entities',
        () =>
          directus.request(
            readItems('geo_entities', {
              fields: ['id', 'slug', 'level', 'name_current'],
              filter: { status: { _eq: 'published' } },
              limit: -1,
            }),
          ) as Promise<EntityRow[]>,
        [],
      ),
      safeRequest<VersionRow[]>(
        'versions',
        () =>
          directus.request(
            readItems('geo_entity_versions', {
              fields: ['entity', 'name', 'parent', 'chef_lieu'],
              filter: { status: { _eq: 'published' }, valid_to: { _null: true } },
              limit: -1,
            }),
          ) as Promise<VersionRow[]>,
        [],
      ),
      safeRequest<ObservationRow[]>(
        'observations',
        () =>
          directus.request(
            readItems('geo_demographic_observations', {
              fields: ['entity', 'population', 'year'],
              filter: { status: { _eq: 'published' }, population: { _nnull: true } },
              sort: ['year'],
              limit: -1,
            }),
          ) as Promise<ObservationRow[]>,
        [],
      ),
      safeRequest<ProfileRow[]>(
        'profiles',
        () =>
          directus.request(
            readItems('public_entity_profiles', {
              fields: ['entity', 'address', 'phone', 'email', 'website', 'logo', 'cover_image'],
              filter: { status: { _eq: 'published' }, entity: { _nnull: true } },
              limit: -1,
            }),
          ) as Promise<ProfileRow[]>,
        [],
      ),
      safeRequest<AppointmentRow[]>(
        'appointments',
        () =>
          directus.request(
            readItems('public_person_appointments', {
              fields: [
                'municipality',
                'position_category',
                'position_title',
                'appointment_date',
                'person.id',
                'person.full_name',
                'person.slug',
                'person.photo',
                'person.sexe',
              ],
              filter: {
                status: { _eq: 'published' },
                is_current: { _eq: true },
                municipality: { _nnull: true },
                position_category: { _in: [MAIRE, SECRETAIRE_MUNICIPAL] },
                person: { status: { _eq: 'published' } },
              },
              limit: -1,
            }),
          ) as Promise<AppointmentRow[]>,
        [],
      ),
    ]);

    if (!entities.length || !versions.length) return [];

    const entityById = new Map(entities.map((entity) => [entity.id, entity]));
    const versionByEntity = new Map(versions.map((version) => [version.entity, version]));
    // Une entité est chef-lieu dès qu'une version en vigueur la désigne comme tel
    // (chef-lieu de région, de département ou d'arrondissement).
    const chefLieuIds = new Set(
      versions.map((version) => version.chef_lieu).filter((id): id is number => Boolean(id)),
    );

    // Observation la plus récente par entité (les lignes sont triées par année).
    const observationByEntity = new Map<number, ObservationRow>();
    for (const observation of observations)
      observationByEntity.set(observation.entity, observation);

    const profileByEntity = new Map<number, ProfileRow>();
    for (const profile of profiles) {
      if (profile.entity) profileByEntity.set(profile.entity, profile);
    }

    const mayorByEntity = new Map<number, AppointmentRow>();
    const clerkByEntity = new Map<number, AppointmentRow>();
    for (const appointment of appointments) {
      if (!appointment.municipality || !appointment.person) continue;
      const target =
        appointment.position_category === SECRETAIRE_MUNICIPAL ? clerkByEntity : mayorByEntity;
      target.set(appointment.municipality, appointment);
    }

    /** Mandat courant → bloc d'affichage, ou `null` si la personne manque. */
    const toOfficial = (appointment: AppointmentRow | undefined) =>
      appointment?.person
        ? {
            id: appointment.person.id,
            nom: appointment.person.full_name ?? '',
            slug: appointment.person.slug ?? null,
            photo: appointment.person.photo ?? null,
            sexe: appointment.person.sexe ?? null,
            fonction: appointment.position_title ?? null,
            depuis: appointment.appointment_date ?? null,
          }
        : null;

    /** Ancêtres de l'entité, du plus proche au plus lointain. */
    const ancestorsOf = (entityId: number): EntityRow[] => {
      const ancestors: EntityRow[] = [];
      let current: number | null = entityId;
      for (let depth = 0; depth < MAX_PARENT_DEPTH && current; depth += 1) {
        const parentId: number | null = versionByEntity.get(current)?.parent ?? null;
        if (!parentId) break;
        const parent = entityById.get(parentId);
        if (!parent) break;
        ancestors.push(parent);
        current = parentId;
      }
      return ancestors;
    };

    const bases = entities
      .filter((entity) => (COLLECTIVITE_LEVELS as readonly string[]).includes(entity.level))
      .map((entity) => {
        const version = versionByEntity.get(entity.id);
        const ancestors = ancestorsOf(entity.id);
        return {
          entity,
          nom: version?.name || entity.name_current || '',
          region: ancestors.find((a) => a.level === 'region')?.name_current ?? '',
          departement: ancestors.find((a) => a.level === 'departement')?.name_current ?? '',
          arrondissement: ancestors.find((a) => a.level === 'arrondissement')?.name_current ?? null,
        };
      })
      .filter((base) => Boolean(base.nom))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

    const slugs = buildPublicSlugs(bases);

    return bases.map((base, index) => {
      const observation = observationByEntity.get(base.entity.id);
      const profile = profileByEntity.get(base.entity.id);

      return {
        id: base.entity.id,
        slug: slugs[index]!,
        nom: base.nom,
        type: base.entity.level === 'ville' ? 'Ville' : 'Commune',
        region: base.region,
        departement: base.departement,
        arrondissement: base.arrondissement,
        chefLieu: chefLieuIds.has(base.entity.id),
        population: observation?.population ?? null,
        populationAnnee: observation?.year ?? null,
        maire: toOfficial(mayorByEntity.get(base.entity.id)),
        secretaireMunicipal: toOfficial(clerkByEntity.get(base.entity.id)),
        contact:
          profile && (profile.address || profile.phone || profile.email || profile.website)
            ? {
                adresse: profile.address ?? null,
                telephone: profile.phone ?? null,
                email: profile.email ?? null,
                siteWeb: profile.website ?? null,
              }
            : null,
        logo: profile?.logo ?? null,
        photoCouverture: profile?.cover_image ?? null,
      } satisfies CommuneGeo;
    });
  },
  {
    name: 'collectivites-communes-geo',
    maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 : 0,
    getKey: () => 'all',
  },
);

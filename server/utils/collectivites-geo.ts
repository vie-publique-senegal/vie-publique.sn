/**
 * Couche géo du module Collectivités territoriales.
 *
 * Assemble, depuis le référentiel générique Directus, la liste des 558
 * collectivités de base (553 communes + 5 villes) :
 *   - `geo_entities`                    identité stable (id, slug, niveau) et
 *                                       contact institutionnel + visuels
 *   - `geo_entity_versions`             état EN VIGUEUR (`valid_to IS NULL`) :
 *                                       nom courant, rattachement, chef-lieu
 *   - `geo_demographic_observations`    population (RGPH 2023)
 *   - `public_person_appointments`      maire en fonction (`municipality`)
 *
 * Le contact institutionnel vivait dans une collection dédiée
 * `public_entity_profiles`, reliée par un m2o unique. Il est désormais porté par
 * `geo_entities` elle-même (`contact_*`, `logo`, `cover_image`) : une requête de
 * moins, et plus de jointure à tenir. Le rattachement département/région reste
 * reconstitué en remontant la chaîne `parent` des versions en vigueur
 * (commune → arrondissement → département → région), une commune pouvant être
 * rattachée directement à son département.
 *
 * Ce que le référentiel ne porte PAS (et qui vaut donc `null`, jamais inventé) :
 * superficie, géométrie, budget, conseil municipal. Un maire ou un contact
 * absent de la base reste `null` : le câblage est en place, la fiche se remplit
 * d'elle-même dès que la donnée est saisie.
 *
 * Dégradation : chaque requête est isolée. Une panne sur la population ou les
 * mandats omet la donnée, elle ne fait jamais échouer l'annuaire (cf. CLAUDE.md).
 */
import { readItems } from '@directus/sdk';
import { slugifyGeoName } from '#shared/geo-name';
import type { CommuneGeo, DepartementGeo, RegionGeo } from '~~/types/collectivite';

/** Niveaux du référentiel qui constituent une collectivité de base. */
const COLLECTIVITE_LEVELS = ['commune', 'ville'] as const;

/** Profondeur max de remontée parent (commune → arrondissement → dept → région). */
const MAX_PARENT_DEPTH = 8;

interface EntityRow {
  id: number;
  slug: string | null;
  level: string;
  name_current: string | null;
  contact_address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_website: string | null;
  logo: string | null;
  cover_image: string | null;
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
 * Slug public d'une région — le nom suffit : les 14 régions sont uniques et
 * stables. L'homonymie avec une commune ou un département du même nom (Thiès,
 * Kaolack…) est sans conséquence, les trois vivent sous des segments distincts.
 */
const regionSlugOf = (region: string): string => (region ? slugifyGeoName(region) : '');

/** Clé d'identité d'un département : le nom seul ne suffit pas, la région fait partie de l'identité. */
const departementKey = (row: { region: string; departement: string }): string =>
  `${row.region}|${row.departement}`;

/**
 * Slug public d'un département — même règle que les communes : le nom seul quand
 * il est unique parmi les 46, suffixé de la région sinon. Deux départements
 * homonymes de deux régions restent donc deux pages distinctes, jamais fusionnées.
 */
const buildDepartementSlugs = (
  rows: { region: string; departement: string }[],
): Map<string, string> => {
  const cles = [...new Set(rows.filter((row) => row.departement).map(departementKey))];

  const occurrences = new Map<string, number>();
  for (const cle of cles) {
    const base = slugifyGeoName(cle.split('|')[1] ?? '');
    occurrences.set(base, (occurrences.get(base) ?? 0) + 1);
  }

  return new Map(
    cles.map((cle) => {
      const [region = '', departement = ''] = cle.split('|');
      const base = slugifyGeoName(departement);
      return [cle, occurrences.get(base) === 1 ? base : `${base}-${slugifyGeoName(region)}`];
    }),
  );
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

    const [entities, versions, observations, appointments] = await Promise.all([
      safeRequest<EntityRow[]>(
        'entities',
        () =>
          directus.request(
            readItems('geo_entities', {
              fields: [
                'id',
                'slug',
                'level',
                'name_current',
                'contact_address',
                'contact_phone',
                'contact_email',
                'contact_website',
                'logo',
                'cover_image',
              ],
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

    const mayorByEntity = new Map<number, AppointmentRow>();
    const clerkByEntity = new Map<number, AppointmentRow>();
    for (const appointment of appointments) {
      if (!appointment.municipality || !appointment.person) continue;
      const target =
        appointment.position_category === SECRETAIRE_MUNICIPAL ? clerkByEntity : mayorByEntity;
      target.set(appointment.municipality, appointment);
    }

    /**
     * Mandat courant → bloc d'affichage, ou `null` si la personne manque.
     *
     * Un mandat **sans nom de personne** (la fiche existe en base mais son
     * `full_name` est vide) vaut `null`, pas un bloc anonyme : sans ça, la fiche
     * affichait un avatar vide sous « Maire » et ouvrait un onglet « Le maire »
     * qui n'avait rien à montrer. Un trou annoncé (« pas encore renseigné »)
     * vaut mieux qu'un bloc qui fait semblant d'être rempli.
     */
    const toOfficial = (appointment: AppointmentRow | undefined) => {
      const nom = appointment?.person?.full_name?.trim();
      if (!appointment?.person || !nom) return null;

      return {
        id: appointment.person.id,
        nom,
        slug: appointment.person.slug ?? null,
        photo: appointment.person.photo ?? null,
        sexe: appointment.person.sexe ?? null,
        fonction: appointment.position_title ?? null,
        depuis: appointment.appointment_date ?? null,
      };
    };

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
    const departementSlugs = buildDepartementSlugs(bases);

    return bases.map((base, index) => {
      const observation = observationByEntity.get(base.entity.id);
      const entity = base.entity;

      return {
        id: base.entity.id,
        slug: slugs[index]!,
        nom: base.nom,
        type: base.entity.level === 'ville' ? 'Ville' : 'Commune',
        region: base.region,
        regionSlug: regionSlugOf(base.region),
        departement: base.departement,
        departementSlug: base.departement ? (departementSlugs.get(departementKey(base)) ?? '') : '',
        arrondissement: base.arrondissement,
        chefLieu: chefLieuIds.has(base.entity.id),
        population: observation?.population ?? null,
        populationAnnee: observation?.year ?? null,
        maire: toOfficial(mayorByEntity.get(base.entity.id)),
        secretaireMunicipal: toOfficial(clerkByEntity.get(base.entity.id)),
        contact:
          entity.contact_address ||
          entity.contact_phone ||
          entity.contact_email ||
          entity.contact_website
            ? {
                adresse: entity.contact_address ?? null,
                telephone: entity.contact_phone ?? null,
                email: entity.contact_email ?? null,
                siteWeb: entity.contact_website ?? null,
              }
            : null,
        logo: entity.logo ?? null,
        photoCouverture: entity.cover_image ?? null,
      } satisfies CommuneGeo;
    });
  },
  {
    // Suffixe de version : le cache SWR persiste sur disque entre deux
    // démarrages (cf. CLAUDE.md). La forme du payload n'a pas changé avec la
    // reprise du contact sur `geo_entities`, mais sa SOURCE si : sans bump, une
    // instance déjà chaude continuerait de servir les valeurs lues dans
    // `public_entity_profiles`, collection désormais supprimée.
    name: 'collectivites-communes-geo-v5',
    maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 : 0,
    getKey: () => 'all',
  },
);

/**
 * Les 46 départements, agrégés depuis les collectivités de base.
 *
 * Dérivé, pas lu : le référentiel porte bien des entités de niveau
 * `departement`, mais elles ne sont chargées ici que pour reconstituer le
 * rattachement (cf. en-tête). Les agrégats sont donc ceux des communes
 * réellement publiées, ce qui est aussi ce que la page affiche.
 *
 * Pas de cache propre : `getCommunesGeo` en a déjà un, et l'agrégation de 558
 * lignes ne justifie pas une seconde entrée à invalider.
 */
export const getDepartementsGeo = async (): Promise<DepartementGeo[]> => {
  const communes = await getCommunesGeo();
  const parSlug = new Map<string, DepartementGeo>();

  for (const commune of communes) {
    if (!commune.departementSlug) continue;

    let departement = parSlug.get(commune.departementSlug);
    if (!departement) {
      departement = {
        slug: commune.departementSlug,
        nom: commune.departement,
        region: commune.region,
        regionSlug: commune.regionSlug,
        nbCollectivites: 0,
        population: null,
        populationAnnee: null,
        avecPopulation: 0,
        avecMaire: 0,
      };
      parSlug.set(commune.departementSlug, departement);
    }

    departement.nbCollectivites += 1;
    if (commune.maire) departement.avecMaire += 1;

    // Le cumul ne porte que sur les populations connues : il reste sincère tant
    // qu'on affiche à côté sur combien de collectivités il est calculé.
    if (commune.population !== null) {
      departement.population = (departement.population ?? 0) + commune.population;
      departement.avecPopulation += 1;
      departement.populationAnnee = Math.max(
        departement.populationAnnee ?? 0,
        commune.populationAnnee ?? 0,
      );
    }
  }

  return [...parSlug.values()]
    .map((departement) => ({
      ...departement,
      populationAnnee: departement.populationAnnee || null,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
};

/**
 * Les 14 régions, agrégées depuis les collectivités de base — même statut que
 * `getDepartementsGeo` : dérivé, jamais lu tel quel, et sans cache propre
 * (`getCommunesGeo` en a déjà un).
 *
 * `nbDepartements` se compte sur les départements réellement rattachés aux
 * collectivités publiées, pas sur le référentiel entier : c'est ce que la page
 * énumère juste en dessous.
 */
export const getRegionsGeo = async (): Promise<RegionGeo[]> => {
  const communes = await getCommunesGeo();
  const parSlug = new Map<string, RegionGeo & { departements: Set<string> }>();

  for (const commune of communes) {
    if (!commune.regionSlug) continue;

    let region = parSlug.get(commune.regionSlug);
    if (!region) {
      region = {
        slug: commune.regionSlug,
        nom: commune.region,
        nbDepartements: 0,
        nbCollectivites: 0,
        population: null,
        populationAnnee: null,
        avecPopulation: 0,
        avecMaire: 0,
        departements: new Set<string>(),
      };
      parSlug.set(commune.regionSlug, region);
    }

    region.nbCollectivites += 1;
    if (commune.departementSlug) region.departements.add(commune.departementSlug);
    if (commune.maire) region.avecMaire += 1;

    if (commune.population !== null) {
      region.population = (region.population ?? 0) + commune.population;
      region.avecPopulation += 1;
      region.populationAnnee = Math.max(region.populationAnnee ?? 0, commune.populationAnnee ?? 0);
    }
  }

  return [...parSlug.values()]
    .map(({ departements, ...region }) => ({
      ...region,
      nbDepartements: departements.size,
      populationAnnee: region.populationAnnee || null,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
};

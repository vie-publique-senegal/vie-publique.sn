import { readItems, readField } from '@directus/sdk';
import type {
  Government,
  GovernmentMemberFull,
  GovernmentRole,
  GovernmentRoleGroup,
  GovernmentStats,
} from '~~/types/government';

/** Normalise une chaîne (sans accents, minuscule) pour une recherche tolérante. */
const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * API : détail d'un gouvernement par son slug.
 * 1. Lit le gouvernement (avec décrets) ;
 * 2. Lit ses membres via `public_person_appointments` filtrés sur `government.slug`,
 *    en excluant `presidence` / `premier_ministre` (déjà rendus depuis le gouvernement) ;
 * 3. Groupe DYNAMIQUEMENT par `position_category_slug` ; l'ordre des groupes suit
 *    les choix du champ Directus (aucune catégorie n'est codée en dur) ;
 * 4. Applique recherche `q`, filtre `role` et pagination côté serveur.
 *
 * Query params (tous optionnels) : `q`, `role`, `page`, `pageSize`.
 */
export default defineCachedEventHandler(
  async (event) => {
    const slug = getRouterParam(event, 'slug');

    if (!slug) {
      throw createError({ statusCode: 400, message: 'Slug manquant' });
    }

    const query = getQuery(event);
    const q = normalize(String(query.q ?? ''));
    const roleFilter = String(query.role ?? '').trim();

    try {
      const directus = getCmsClient();

      // 1. Gouvernement par slug
      const govData = await directus
        .request(
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
              'pm_appointment_decree.id',
              'pm_appointment_decree.title',
              'pm_appointment_decree.slug',
              'formation_decree.id',
              'formation_decree.title',
              'formation_decree.slug',
            ],
            filter: {
              status: { _eq: 'published' },
              slug: { _eq: slug },
            },
            limit: 1,
          }),
        )
        .catch((error) => {
          console.error('Erreur Directus détail gouvernement:', error);
          throw createError({
            statusCode: error.errors?.[0]?.extensions?.code || 500,
            message: error.errors?.[0]?.message || 'Erreur interne du serveur',
          });
        });

      const g = (govData as any[])[0];

      if (!g) {
        throw createError({
          statusCode: 404,
          message: 'Gouvernement introuvable',
        });
      }

      const government: Government = {
        id: g.id,
        name: g.name,
        slug: g.slug || generateSlugFromName(g.name),
        start_date: g.start_date,
        end_date: g.end_date ?? null,
        notes: g.notes ?? null,
        president: g.president
          ? {
              id: g.president.id,
              full_name: g.president.full_name,
              slug: g.president.slug ?? null,
              photo: g.president.photo ?? null,
            }
          : null,
        prime_minister: g.prime_minister
          ? {
              id: g.prime_minister.id,
              full_name: g.prime_minister.full_name,
              slug: g.prime_minister.slug ?? null,
              photo: g.prime_minister.photo ?? null,
            }
          : null,
        pm_appointment_decree: g.pm_appointment_decree
          ? {
              id: g.pm_appointment_decree.id,
              title: g.pm_appointment_decree.title,
              slug: g.pm_appointment_decree.slug,
            }
          : null,
        formation_decree: g.formation_decree
          ? {
              id: g.formation_decree.id,
              title: g.formation_decree.title,
              slug: g.formation_decree.slug,
            }
          : null,
      };

      // 2. Membres du gouvernement (président & PM exclus : rendus depuis le gouvernement).
      const membersData = await directus
        .request(
          readItems('public_person_appointments', {
            fields: [
              'id',
              'position_title',
              'organization_label',
              'position_category',
              'position_category_slug',
              'appointment_date',
              'end_date',
              'end_reason',
              'is_current',
              'person.id',
              'person.full_name',
              'person.slug',
              'person.photo',
              'person.sexe',
            ],
            filter: {
              status: { _eq: 'published' },
              government: { slug: { _eq: slug } },
              position_category_slug: { _nin: ['presidence', 'premier_ministre'] },
            },
            sort: ['position_category_slug', 'person.full_name'],
            limit: -1,
          }),
        )
        .catch((error) => {
          console.error('Erreur Directus membres gouvernement:', error);
          throw createError({
            statusCode: error.errors?.[0]?.extensions?.code || 500,
            message: error.errors?.[0]?.message || 'Erreur interne du serveur',
          });
        });

      const allMembers: GovernmentMemberFull[] = (membersData as any[])
        .filter((m) => m.person)
        .map((m) => ({
          id: m.id,
          position_title: m.position_title || '',
          organization_label: m.organization_label || '',
          position_category: m.position_category || '',
          position_category_slug: m.position_category_slug || '',
          appointment_date: m.appointment_date,
          end_date: m.end_date ?? null,
          end_reason: m.end_reason ?? null,
          is_current: Boolean(m.is_current),
          person: {
            id: m.person.id,
            full_name: m.person.full_name,
            slug: m.person.slug ?? null,
            photo: m.person.photo ?? null,
            sexe: m.person.sexe === 'female' ? 'female' : m.person.sexe === 'male' ? 'male' : null,
          },
        }));

      // 3. Ordre + libellés des catégories depuis la métadonnée Directus (dynamique).
      let choices: Array<{ text?: string; value: string }> = [];
      try {
        const field: any = await directus.request(
          (readField as any)('public_person_appointments', 'position_category_slug'),
        );
        choices = field?.meta?.options?.choices ?? [];
      } catch (error) {
        console.error('Erreur Directus readField position_category_slug:', error);
      }
      const orderIndex = new Map<string, number>();
      const labelBySlug = new Map<string, string>();
      choices.forEach((c, i) => {
        orderIndex.set(c.value, i);
        if (c.text) labelBySlug.set(c.value, c.text);
      });
      const sortBySlugOrder = (a: string, b: string) =>
        (orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER);

      // 4. Stats globales (sur l'ensemble des membres, avant filtres).
      const start = new Date(government.start_date).getTime();
      const end = government.end_date
        ? new Date(government.end_date).getTime()
        : Date.now();
      const durationDays = Math.max(
        0,
        Math.floor((end - start) / (1000 * 60 * 60 * 24)),
      );
      const stats: GovernmentStats = {
        total: allMembers.length,
        women: allMembers.filter((m) => m.person.sexe === 'female').length,
        men: allMembers.filter((m) => m.person.sexe === 'male').length,
        duration_days: durationDays,
      };

      // 5. Rôles présents (pour le filtre) — dérivés des données, ordonnés via le CMS.
      const roleCount = new Map<string, number>();
      for (const m of allMembers) {
        const s = m.position_category_slug || 'autres';
        roleCount.set(s, (roleCount.get(s) ?? 0) + 1);
      }
      // Libellé lisible d'un rôle : on privilégie `position_category` (libellé
      // humain stocké sur la donnée), puis le texte du choix CMS, puis le slug.
      const roleLabel = (s: string): string => {
        const fromData = allMembers.find(
          (m) => m.position_category_slug === s,
        )?.position_category;
        if (fromData && fromData.trim()) return fromData;
        const fromCms = labelBySlug.get(s);
        if (fromCms && fromCms.trim()) return fromCms;
        return s;
      };
      const roles: GovernmentRole[] = Array.from(roleCount.entries())
        .sort((a, b) => sortBySlugOrder(a[0], b[0]))
        .map(([s, count]) => ({ slug: s, label: roleLabel(s), count }));

      // 6. Filtrage (rôle + recherche) côté serveur.
      let filtered = allMembers;
      if (roleFilter) {
        filtered = filtered.filter((m) => m.position_category_slug === roleFilter);
      }
      if (q) {
        filtered = filtered.filter((m) =>
          normalize(`${m.person.full_name} ${m.position_title}`).includes(q),
        );
      }

      // 7. Pas de pagination serveur : tous les membres sont renvoyés, le filtrage
      //    (recherche, rôle) est effectué côté client pour une réactivité instantanée.
      const total = filtered.length;

      // 8. Groupes dynamiques (ordre des choix CMS).
      const groupMap = new Map<string, GovernmentMemberFull[]>();
      for (const m of filtered) {
        const s = m.position_category_slug || 'autres';
        const arr = groupMap.get(s) ?? [];
        arr.push(m);
        groupMap.set(s, arr);
      }
      const groups: GovernmentRoleGroup[] = Array.from(groupMap.keys())
        .sort(sortBySlugOrder)
        .map((s) => ({
          slug: s,
          label: roleLabel(s),
          members: groupMap.get(s) ?? [],
        }));

      return {
        government,
        groups,
        roles,
        pagination: { page: 1, pageSize: total || 1, total },
        stats,
      };
    } catch (error: any) {
      if (error?.statusCode) {
        throw error;
      }
      console.error('Erreur API détail gouvernement:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Une erreur est survenue lors de la récupération du gouvernement',
      });
    }
  },
  {
    maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 : 0, // 30 min en prod, pas de cache en dev
    getKey: (event) =>
      buildCacheKey(`government-detail-${getRouterParam(event, 'slug')}`, getQuery(event)),
    name: 'government-detail',
  },
);

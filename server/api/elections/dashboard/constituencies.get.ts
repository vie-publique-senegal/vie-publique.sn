import { readItems } from '@directus/sdk';
import { isMunicipalConstituencyType } from '#shared/election-constituency';

export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient() as any;
    const query = getQuery(event);
    const year = query.year ? parseInt(query.year as string) : null;
    const type = query.type as string;

    if (!year || !type) {
      throw createError({
        statusCode: 400,
        message: 'Missing required parameters: year and type',
      });
    }

    try {
      const elections = await directus.request(
        (readItems as any)('elections', {
          fields: ['id'],
          filter: {
            year: { _eq: year },
            type: { _eq: type },
            status: { _nin: ['draft', 'archived'] },
          },
          sort: ['-election_date', '-id'],
          limit: 1,
        }),
      );

      const electionId = elections[0]?.id;

      if (!electionId) {
        return [];
      }

      const [allConstituencies, geoSnapshot] = await Promise.all([
        directus.request(
          (readItems as any)('election_constituencies', {
            fields: [
              'id',
              'name',
              'slug',
              'type',
              'nationale_type',
              'seats',
              // Identité et hiérarchie via le référentiel versionné
              ...GEO_UNIT_FIELDS,
            ],
            limit: -1,
            sort: ['id'],
          }),
        ),
        getGeoSnapshot(),
      ]);

      const departments = allConstituencies.filter(
        (c: any) => c.type === 'national' && c.nationale_type === 'departement',
      );
      // Circonscriptions municipales : communes ET villes (locales), rattachées à leur
      // département de la même façon. Les villes ne comptent pas dans `communes_count`.
      const municipalities = allConstituencies.filter(
        (c: any) => c.type === 'national' && isMunicipalConstituencyType(c.nationale_type),
      );

      // Hiérarchie commune → département via l'instantané : on remonte au premier ANCÊTRE
      // de niveau `departement` (le parent immédiat d'une commune est son arrondissement
      // dans 497 cas sur 553), puis on retraduit cette entité en circonscription.
      const deptIdByGeoEntity = new Map<number, number>();
      departments.forEach((d: any) => {
        const entityId = geoEntityIdOf(d);
        if (entityId !== null) deptIdByGeoEntity.set(entityId, d.id);
      });
      const departmentOf = (c: any) => {
        const deptEntity = geoSnapshot.ancestorOfLevel(geoEntityIdOf(c), 'departement');
        return deptEntity ? (deptIdByGeoEntity.get(deptEntity.id) ?? null) : null;
      };

      const deptMunicipalitiesMap = new Map<string, any[]>();
      municipalities.forEach((municipality: any) => {
        const deptId = departmentOf(municipality);
        if (deptId) {
          if (!deptMunicipalitiesMap.has(deptId)) {
            deptMunicipalitiesMap.set(deptId, []);
          }
          deptMunicipalitiesMap.get(deptId)?.push(municipality);
        }
      });

      const lists = await directus.request(
        (readItems as any)('election_electoral_lists', {
          fields: [
            'id',
            'constituency.id',
            'constituency.type',
            'constituency.nationale_type',
            'coalition',
          ],
          filter: {
            election: { _eq: electionId },
            is_substitute: { _eq: false },
            status: { _eq: 'published' },
          },
          limit: -1,
        }),
      );

      const deptCoalitionsMap = new Map<string, Set<string>>();

      lists.forEach((list: any) => {
        if (!list.constituency || !list.coalition) return;

        const cId = list.constituency.id;
        const constitDef = allConstituencies.find((c: any) => c.id === cId);
        if (!constitDef) return;

        let targetDeptId = null;

        if (
          (constitDef.type === 'national' && constitDef.nationale_type === 'departement') ||
          constitDef.type === 'diaspora'
        ) {
          targetDeptId = constitDef.id;
        } else if (
          constitDef.type === 'national' &&
          isMunicipalConstituencyType(constitDef.nationale_type)
        ) {
          targetDeptId = departmentOf(constitDef);
        }

        if (targetDeptId) {
          const isDeptList =
            constitDef.type === 'national' && constitDef.nationale_type === 'departement';

          if (!isDeptList) {
            if (!deptCoalitionsMap.has(targetDeptId)) {
              deptCoalitionsMap.set(targetDeptId, new Set());
            }
            deptCoalitionsMap.get(targetDeptId)?.add(`${list.constituency.id}-${list.coalition}`);
          }
        }
      });

      const results = departments
        .map((dept: any) => {
          const attachedMunicipalities = deptMunicipalitiesMap.get(dept.id) || [];
          const uniqueCoalitions = deptCoalitionsMap.get(dept.id) || new Set();
          const geo = resolveGeoUnit(dept, geoSnapshot);

          return {
            id: dept.id,
            name: geo?.name || dept.name,
            slug: dept.slug ?? null,
            geo_slug: geoSlugOf(geo),
            type: dept.type,
            region: geo?.region?.name ?? null,
            seats: dept.seats,
            communes_count: attachedMunicipalities.filter((m) => m.nationale_type === 'commune')
              .length,
            coalitions_count: uniqueCoalitions.size,
          };
        })
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      const search = query.search as string;
      if (search) {
        const lowercaseSearch = search.toLowerCase();
        return results.filter((dept: any) => {
          const matchDept = dept.name.toLowerCase().includes(lowercaseSearch);
          const attachedMunicipalities = deptMunicipalitiesMap.get(dept.id) || [];
          const matchCommune = attachedMunicipalities.some((c) =>
            c.name.toLowerCase().includes(lowercaseSearch),
          );
          return matchDept || matchCommune;
        });
      }

      return results;
    } catch (error: any) {
      console.error('Error fetching constituencies:', error);
      throw createError({
        statusCode: 500,
        message: error.message || 'Failed to fetch constituencies',
      });
    }
  },
  {
    maxAge: 60 * 30,
    name: 'elections-dashboard-constituencies-v4',
    getKey: (event) => {
      const query = getQuery(event);
      return `constituencies-${query.year}-${query.type}-${query.search || 'none'}`;
    },
  },
);

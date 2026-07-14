import { readItems } from '@directus/sdk';

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

      const allConstituencies = await directus.request(
        (readItems as any)('election_constituencies', {
          fields: [
            'id', 'name', 'type', 'nationale_type', 'seats',
            // Identité et hiérarchie via le référentiel geo_*
            'geo_department.id', 'geo_department.name', 'geo_department.slug',
            'geo_department.region.name', 'geo_department.region.slug',
            'geo_municipality.department',
          ],
          limit: -1,
        }),
      );

      const departments = allConstituencies.filter((c: any) => c.type === 'national' && c.nationale_type === 'departement');
      const communes = allConstituencies.filter((c: any) => c.type === 'national' && c.nationale_type === 'commune');

      // Hiérarchie commune → département via geo_municipality.department (id geo_departments)
      const deptIdByGeoDept = new Map<number, number>();
      departments.forEach((d: any) => {
        if (d.geo_department?.id) deptIdByGeoDept.set(d.geo_department.id, d.id);
      });
      const departmentOf = (c: any) =>
        c?.geo_municipality?.department ? deptIdByGeoDept.get(c.geo_municipality.department) ?? null : null;

      const deptCommunesMap = new Map<string, any[]>();
      communes.forEach((commune: any) => {
        const deptId = departmentOf(commune);
        if (deptId) {
          if (!deptCommunesMap.has(deptId)) {
            deptCommunesMap.set(deptId, []);
          }
          deptCommunesMap.get(deptId)?.push(commune);
        }
      });

      const lists = await directus.request(
        (readItems as any)('election_electoral_lists', {
          fields: ['id', 'constituency.id', 'constituency.type', 'constituency.nationale_type', 'coalition'],
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

        if ((constitDef.type === 'national' && constitDef.nationale_type === 'departement') || constitDef.type === 'diaspora') {
          targetDeptId = constitDef.id;
        } else if (constitDef.type === 'national' && constitDef.nationale_type === 'commune') {
          targetDeptId = departmentOf(constitDef);
        }

        if (targetDeptId) {
          const isDeptList = (constitDef.type === 'national' && constitDef.nationale_type === 'departement');

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
          const attachedCommunes = deptCommunesMap.get(dept.id) || [];
          const uniqueCoalitions = deptCoalitionsMap.get(dept.id) || new Set();
          const geo = resolveGeoUnit(dept);

          return {
            id: dept.id,
            name: geo?.name || dept.name,
            type: dept.type,
            region: geo?.region?.name ?? null,
            seats: dept.seats,
            communes_count: attachedCommunes.length,
            coalitions_count: uniqueCoalitions.size,
          };
        })
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      const search = query.search as string;
      if (search) {
        const lowercaseSearch = search.toLowerCase();
        return results.filter((dept: any) => {
          const matchDept = dept.name.toLowerCase().includes(lowercaseSearch);
          const attachedCommunes = deptCommunesMap.get(dept.id) || [];
          const matchCommune = attachedCommunes.some(c => c.name.toLowerCase().includes(lowercaseSearch));
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
    name: "elections-dashboard-constituencies-v2",
    getKey: (event) => {
      const query = getQuery(event);
      return `constituencies-${query.year}-${query.type}-${query.search || 'none'}`;
    },
  }
);

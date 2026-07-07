import { readItems } from "@directus/sdk";

export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient() as any;
    const query = getQuery(event);
    const year = query.year ? parseInt(query.year as string) : null;
    const type = query.type as string;
    const constituencyId = query.constituency_id;
    const search = query.search as string;

    if (!year || !type) {
      return {
        data: [],
        meta: { count: 0 }
      };
    }

    try {
      let electionId = null;
      const elections = await directus.request(
        (readItems as any)("elections", {
          fields: ["id", "year", "type", "election_date"],
          filter: {
            year: { _eq: year },
            type: { _eq: type },
            status: { _nin: ["draft", "archived"] },
          },
          sort: ["-election_date", "-id"],
          limit: 1,
        })
      );
      electionId = elections[0]?.id;

      if (!electionId) {
        return {
          data: [],
          meta: {
            electionId: null,
            count: 0,
            message: `Aucune élection trouvée pour ${type} ${year}`
          }
        };
      }

      let coalitionIds: number[] = [];
      const listsFilter: any = {
        election: { _eq: electionId },
        status: { _eq: "published" },
      };

      if (constituencyId) {
        listsFilter.constituency = { _eq: constituencyId };
      }

      const lists = await directus.request(
        (readItems as any)("election_electoral_lists", {
          fields: ["coalition"],
          filter: listsFilter,
          limit: -1,
        })
      );
      coalitionIds = [...new Set(lists.map((l: any) => l.coalition))].filter(Boolean) as number[];

      if (coalitionIds.length === 0) {
        return {
          data: [],
          meta: {
            electionId,
            count: 0
          }
        };
      }

      const filter: any = {
        id: { _in: coalitionIds }
      };

      if (search) {
        filter._or = [
          // Les noms vivent sur l'entité politique
          { political_entity: { name: { _icontains: search } } },
          { political_entity: { acronym: { _icontains: search } } },
          // L'identité de la tête de liste vit sur sa person
          { head_of_list: { person: { first_name: { _icontains: search } } } },
          { head_of_list: { person: { last_name: { _icontains: search } } } }
        ];
      }

      const coalitions = await directus.request(
        (readItems as any)("election_coalition", {
          fields: [
            "id",
            "logo",
            "color",
            "voix",
            "pourcentage",
            "sieges",
            "sieges_departement",
            "sieges_national",
            "list_order",
            "bulletin",
            "round_2_voix",
            "round_2_pourcentage",
            "head_of_list.id",
            "head_of_list.profession",
            ...PERSON_IDENTITY_FIELDS.map((f) => `head_of_list.person.${f}`),
            ...ENTITY_IDENTITY_FIELDS.map((f) => `political_entity.${f}`),
          ],
          filter,
          sort: ["list_order", "political_entity.name"],
          limit: -1,
        })
      );

      // Identité de la tête de liste via sa person (fallback legacy)
      // Identité de la coalition via son entité politique (fallback legacy)
      const mergedCoalitions = (coalitions as any[]).map((c: any) => ({
        ...mergeEntityIdentity(c),
        head_of_list: c.head_of_list ? mergePersonIdentity(c.head_of_list) : c.head_of_list,
      }));

      return {
        data: mergedCoalitions,
        meta: {
          electionId,
          count: coalitions.length
        }
      };
    } catch (error: any) {
      console.error("Error in coalitions.get:", error);
      return {
        data: [],
        error: error.message
      };
    }
  },
  {
    maxAge: 60 * 30,
    name: "elections-dashboard-coalitions",
    getKey: (event) => {
      const query = getQuery(event);
      return `coalitions-${query.year}-${query.type}-${query.constituency_id || 'all'}-${query.search || 'none'}`;
    },
  }
);

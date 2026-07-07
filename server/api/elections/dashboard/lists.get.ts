import { readItems } from "@directus/sdk";

const toSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const normalizeCandidate = (rawCandidate: any) => {
  // L'identité vient de la person liée (fallback sur les champs legacy du candidat)
  const candidate = mergePersonIdentity(rawCandidate);
  const fallbackSlug = toSlug(`${candidate?.first_name || ""} ${candidate?.last_name || ""}`) || `candidat-${candidate?.id || "inconnu"}`;
  const shortBio = typeof candidate?.short_bio === "string" ? candidate.short_bio : (typeof candidate?.biography === "string" ? candidate.biography : null);
  const longBio = typeof candidate?.long_bio === "string" ? candidate.long_bio : null;

  return {
    ...candidate,
    slug: typeof candidate?.slug === "string" && candidate.slug ? candidate.slug : fallbackSlug,
    short_bio: shortBio,
    long_bio: longBio,
  };
};

export default defineCachedEventHandler(
  async (event) => {
    const directus = getCmsClient() as any;
    const query = getQuery(event);
    const coalitionId = query.coalitionId as string;
    const year = query.year ? parseInt(query.year as string) : null;
    const type = query.type as string;
    const constituencyId = query.constituencyId as string;

    if (!coalitionId && !constituencyId) {
      throw createError({
        statusCode: 400,
        statusMessage: "ID de coalition ou de circonscription requis",
      });
    }

    if (!year || !type) {
       return { data: [] };
    }

    try {
      let electionId = null;
      const elections = await directus.request(
        (readItems as any)("elections", {
          fields: ["id", "election_date"],
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
        return { data: [] };
      }

      const targetConstituencyIds: (string | number)[] = [];

      if (constituencyId) {
        targetConstituencyIds.push(constituencyId);

        const children = await directus.request(
          (readItems as any)("election_constituencies", {
              fields: ['id'],
              filter: { parent: { _eq: constituencyId } }
          })
        );
        if (children && children.length > 0) {
          targetConstituencyIds.push(...children.map((c: any) => c.id));
        }
      }

      const filter: any = {
        status: { _eq: "published" },
        election: { _eq: electionId }
      };

      if (coalitionId) {
          filter.coalition = { _eq: coalitionId };
      }

      if (targetConstituencyIds.length > 0) {
          filter.constituency = { _in: targetConstituencyIds };
      }

      const listFieldsBase = [
        "id",
        "name",
        "type",
        "is_substitute",
        "constituency.id",
        "constituency.name",
        "constituency.type",
        "constituency.nationale_type",
        "coalition.id",
        "coalition.color",
        "coalition.logo",
        ...ENTITY_IDENTITY_FIELDS.map((f) => `coalition.political_entity.${f}`),
      ];
      const candidateFields = [
        "*",
        { person: PERSON_IDENTITY_FIELDS },
      ];

      const readLists = async () =>
        directus.request(
          (readItems as any)("election_electoral_lists", {
            fields: [
              ...listFieldsBase,
              { candidates: candidateFields },
            ],
            filter,
            sort: ["type", "is_substitute", "name"],
            limit: -1,
          })
        );

      let lists: any[] = [];

      lists = await readLists();

      // Programmes de la participation (election_programs) : exposés sur coalition.programs,
      // et en compat sur candidate.documents (le profil présidentiel lit encore cette clé).
      const listCoalitionIds = [
        ...new Set((lists || []).map((l: any) => l?.coalition?.id).filter(Boolean)),
      ];
      const programsByCoalition = new Map<number, any[]>();
      if (listCoalitionIds.length > 0) {
        try {
          const programs = await directus.request(
            (readItems as any)("election_programs", {
              fields: ["id", "language", "version", "participation", "document.id", "document.file", "document.title", "document.slug"],
              filter: {
                participation: { _in: listCoalitionIds },
                status: { _eq: "published" },
              },
              limit: -1,
            })
          );
          for (const program of programs as any[]) {
            const key = program.participation;
            if (!programsByCoalition.has(key)) programsByCoalition.set(key, []);
            programsByCoalition.get(key)?.push(program);
          }
        } catch (programsError: any) {
          console.error("Error fetching participation programs:", programsError?.message || programsError);
        }
      }

      // Identité de la coalition via son entité politique (fallback legacy)
      const normalizedLists = (lists || []).map((list: any) => {
        const programs = programsByCoalition.get(list?.coalition?.id) || [];
        return {
          ...list,
          coalition: list?.coalition
            ? { ...mergeEntityIdentity(list.coalition), programs }
            : list?.coalition,
          candidates: Array.isArray(list?.candidates)
            ? list.candidates.map((c: any) => ({
                ...normalizeCandidate(c),
                documents: programs[0]?.document ?? null,
              }))
            : [],
        };
      });

      return {
        data: normalizedLists,
      };
    } catch (error: any) {
      console.error("Error in dashboard lists.get:", error);
      return { data: [], error: error.message };
    }
  }
);

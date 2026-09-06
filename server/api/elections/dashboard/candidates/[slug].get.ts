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
    const routeSlug = getRouterParam(event, "slug");
    const query = getQuery(event);
    const year = query.year ? parseInt(query.year as string, 10) : null;
    const type = typeof query.type === "string" ? query.type : null;

    if (!routeSlug || !year || !type) {
      throw createError({
        statusCode: 400,
        statusMessage: "Parametres slug, year et type requis",
      });
    }

    try {
      const elections = await directus.request(
        (readItems as any)("elections", {
          fields: ["id", "name", "year", "type", "status", "election_date"],
          filter: {
            year: { _eq: year },
            type: { _eq: type },
          },
          sort: ["-election_date", "-id"],
          limit: 1,
        })
      );

      const election = elections?.[0] || null;
      if (!election?.id) {
        return { data: null };
      }

      // Le M2O legacy `documents` a été supprimé : le programme vient de la participation
      // (election_programs de la coalition), voir plus bas.
      const candidateFields = [
        "*",
        { person: PERSON_IDENTITY_FIELDS },
      ];

      const readLists = async () =>
        directus.request(
          (readItems as any)("election_electoral_lists", {
            fields: [
              "id",
              "name",
              "type",
              "is_substitute",
              "constituency.id",
              "constituency.name",
              "coalition.id",
              "coalition.color",
              "coalition.logo",
              ...ENTITY_IDENTITY_FIELDS.map((f) => `coalition.political_entity.${f}`),
              { candidates: candidateFields },
            ],
            filter: {
              election: { _eq: election.id },
              status: { _eq: "published" },
            },
            sort: ["is_substitute", "type", "name"],
            limit: -1,
          })
        );

      let lists: any[] = [];

      lists = await readLists();

      const normalizedSlug = toSlug(routeSlug);
      const matches: any[] = [];

      for (const list of lists || []) {
        const candidates = Array.isArray(list?.candidates) ? list.candidates : [];
        for (const rawCandidate of candidates) {
          const candidate = normalizeCandidate(rawCandidate);
          // Match strict sur le slug fusionné (slug person si liée, sinon slug candidat legacy).
          // Pas de compat sur l'ancien slug candidat : les deux espaces de slugs se chevauchent
          // (le slug candidat d'une personne peut être le slug person d'une autre).
          if (toSlug(candidate.slug || "") === normalizedSlug) {
            matches.push({ candidate, list });
          }
        }
      }

      if (!matches.length) {
        return { data: null };
      }

      matches.sort((a, b) => {
        if (a.list?.is_substitute === b.list?.is_substitute) {
          return (a.candidate?.position || 999) - (b.candidate?.position || 999);
        }
        return a.list?.is_substitute ? 1 : -1;
      });

      const bestMatch = matches[0];

      // Programmes de la participation (election_programs de la coalition)
      let programs: any[] = [];
      const coalitionId = bestMatch.list?.coalition?.id;
      if (coalitionId) {
        try {
          programs = await directus.request(
            (readItems as any)("election_programs", {
              fields: ["id", "language", "version", "document.id", "document.file", "document.title", "document.slug"],
              filter: {
                participation: { _eq: coalitionId },
                status: { _eq: "published" },
              },
              limit: -1,
            })
          );
        } catch (programsError: any) {
          console.error("Error fetching participation programs:", programsError?.message || programsError);
        }
      }

      // Compat : l'ancienne clé `documents` du candidat (M2O legacy supprimé) reste servie
      // avec le document du premier programme de la participation.
      bestMatch.candidate.documents = programs[0]?.document ?? null;

      return {
        data: {
          election,
          candidate: bestMatch.candidate,
          programs,
          // Identité de la coalition via son entité politique (fallback legacy)
          coalition: bestMatch.list?.coalition ? mergeEntityIdentity(bestMatch.list.coalition) : null,
          list: {
            id: bestMatch.list?.id,
            name: bestMatch.list?.name,
            type: bestMatch.list?.type,
            is_substitute: !!bestMatch.list?.is_substitute,
            constituency: bestMatch.list?.constituency || null,
          },
        },
      };
    } catch (error: any) {
      console.error("Error in dashboard candidate profile:", error);
      return { data: null, error: error?.message || "unknown" };
    }
  },
  {
    maxAge: 60 * 10,
    name: "elections-dashboard-candidate-profile",
    getKey: (event) => {
      const query = getQuery(event);
      const slug = getRouterParam(event, "slug") || "unknown";
      return `candidate-profile-${query.type}-${query.year}-${slug}`;
    },
  }
);

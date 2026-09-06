/**
 * Lecture de l'identité des candidats via election_persons, avec fallback legacy.
 *
 * Une candidature (election_candidates) référence une personne (election_persons) via `person`.
 * Tant que les champs identité legacy du candidat existent encore dans un environnement (cas de
 * la prod avant leur suppression), la person fait foi et les champs legacy servent de fallback.
 * Le contrat de réponse des API est inchangé (mêmes clés au même endroit), la clé `person`
 * exposée est réduite à { id, slug }.
 *
 * `profession` n'est volontairement PAS fusionnée : c'est une donnée par scrutin, elle reste
 * celle de la candidature.
 */

/** Champs à demander sur la relation `person` d'un candidat. */
export const PERSON_IDENTITY_FIELDS = [
  "id",
  "slug",
  "first_name",
  "last_name",
  "gender",
  "birthdate",
  "birthplace",
  "photo",
  "short_bio",
  "long_bio",
  "facebook",
  "twitter",
  "linkedin",
];

/** Champs d'identité remplacés par la valeur de la person quand elle existe. */
const MERGED_FIELDS = [
  "first_name",
  "last_name",
  "gender",
  "birthdate",
  "birthplace",
  "photo",
  "short_bio",
  "long_bio",
  "facebook",
  "twitter",
  "linkedin",
];

/**
 * Fusionne l'identité d'un candidat : person prioritaire, fallback sur les champs legacy.
 * Le slug de la person (clé durable) remplace le slug candidat quand il existe.
 * Sans person liée (candidature non backfillée), le candidat est renvoyé tel quel.
 */
export function mergePersonIdentity<T extends Record<string, unknown>>(candidate: T): T {
  if (!candidate || typeof candidate !== "object") return candidate;
  const person =
    candidate.person && typeof candidate.person === "object"
      ? (candidate.person as Record<string, unknown>)
      : null;
  if (!person) return candidate;

  const merged: Record<string, unknown> = { ...candidate };
  for (const field of MERGED_FIELDS) {
    merged[field] = person[field] ?? candidate[field] ?? null;
  }
  if (typeof person.slug === "string" && person.slug) {
    merged.slug = person.slug;
  }
  merged.person = { id: person.id, slug: person.slug ?? null };
  return merged as T;
}

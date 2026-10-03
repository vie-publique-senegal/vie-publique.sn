/**
 * Lecture de l'identité des coalitions via election_political_entities, avec fallback legacy.
 *
 * Une coalition (election_coalition) référence une entité politique (election_political_entities)
 * via `political_entity`. Tant que les champs identité legacy de la coalition existent encore
 * dans un environnement (cas de la prod avant leur suppression), l'identité existe aux deux endroits :
 * - name / acronym / type / description : l'entité fait foi, les champs legacy de la coalition
 *   servent de fallback ;
 * - logo / color : la valeur de la participation (coalition) est un override, fallback sur
 *   l'entité (symétrique inversé des autres champs).
 * Le contrat de réponse des API est inchangé, la clé `political_entity` exposée est réduite
 * à { id, slug }.
 */

/** Champs à demander sur la relation `political_entity` d'une coalition. */
export const ENTITY_IDENTITY_FIELDS = [
  "id",
  "slug",
  "name",
  "acronym",
  "type",
  "description",
  "logo",
  "color",
];

/** Champs remplacés par la valeur de l'entité quand elle existe (fallback legacy coalition). */
const ENTITY_PRIORITY_FIELDS = ["name", "acronym", "type", "description"];

/** Champs où la participation (coalition) est un override, fallback sur l'entité. */
const PARTICIPATION_OVERRIDE_FIELDS = ["logo", "color"];

/**
 * Fusionne l'identité d'une coalition : entité prioritaire pour name/acronym/type/description,
 * participation prioritaire pour logo/color. Sans entité liée (coalition non backfillée), la coalition
 * est renvoyée telle quelle.
 */
export function mergeEntityIdentity<T extends Record<string, unknown>>(coalition: T): T {
  if (!coalition || typeof coalition !== "object") return coalition;
  const entity =
    coalition.political_entity && typeof coalition.political_entity === "object"
      ? (coalition.political_entity as Record<string, unknown>)
      : null;
  if (!entity) return coalition;

  const merged: Record<string, unknown> = { ...coalition };
  for (const field of ENTITY_PRIORITY_FIELDS) {
    merged[field] = entity[field] ?? coalition[field] ?? null;
  }
  for (const field of PARTICIPATION_OVERRIDE_FIELDS) {
    merged[field] = coalition[field] ?? entity[field] ?? null;
  }
  merged.political_entity = { id: entity.id, slug: entity.slug ?? null };
  return merged as T;
}

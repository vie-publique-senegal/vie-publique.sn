import { readItems } from '@directus/sdk';

/**
 * Couvertures des documents cités par une réponse du chat.
 *
 * L'API RAG ne renvoie pas d'image, mais son `external_id` EST l'identifiant
 * Directus du document : on retrouve `cover_image` ici, en une seule requête
 * pour toutes les sources d'une réponse, sans toucher au RAG.
 *
 * `GET /api/chat/covers?ids=14058,123` → `{ "14058": "<uuid>", "123": null }`
 *
 * Dégradation : en cas d'échec CMS on LÈVE (pas de `{}` en 200, qui serait mis
 * en cache) ; le client affiche alors les tuiles icône, comme pour un document
 * sans couverture.
 */
const MAX_IDS = 12;

function lireIds(brut: unknown): string[] {
  const ids = String(brut ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id));
  // Triés et uniques : la clé de cache ne dépend pas de l'ordre des sources.
  return [...new Set(ids)].sort((a, b) => Number(a) - Number(b)).slice(0, MAX_IDS);
}

export default defineCachedEventHandler(
  async (event) => {
    const ids = lireIds(getQuery(event).ids);
    if (!ids.length) return {};

    try {
      const lignes = await getCmsClient().request(
        readItems('documents', {
          fields: ['id', 'cover_image'],
          filter: { id: { _in: ids }, status: { _eq: 'published' } },
          limit: MAX_IDS,
        }),
      );

      const couvertures: Record<string, string | null> = Object.fromEntries(
        ids.map((id) => [id, null]),
      );
      for (const ligne of lignes as Array<{ id: number | string; cover_image?: string | null }>) {
        couvertures[String(ligne.id)] = ligne.cover_image ?? null;
      }
      return couvertures;
    } catch (error) {
      reportServerError(error, 'api/chat/covers', { ids });
      throw createError({
        statusCode: 502,
        statusMessage: 'Couvertures indisponibles',
      });
    }
  },
  {
    maxAge: 60 * 60,
    name: 'chat-covers',
    getKey: (event) => `chat-covers-${lireIds(getQuery(event).ids).join('-')}`,
  },
);

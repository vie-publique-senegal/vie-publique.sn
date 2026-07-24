import { readItems } from '@directus/sdk';

/**
 * Proxy des fichiers documents `/docs/<uuid-fichier>/<nom>.<ext>` vers les assets CMS.
 *
 * Remplace l'ancienne routeRule proxy `/docs/**` (nuxt.config), qui ne permettait que
 * des headers STATIQUES : impossible d'y déclarer, fichier par fichier, la page
 * `/documents/<id>/<slug>` comme canonique. Sans canonique, Google traite le PDF et sa
 * page comme des doublons sans URL choisie (GSC « Page en double sans URL canonique
 * sélectionnée par l'utilisateur », ~2 900 URLs au 2026-07-18). L'en-tête
 * `Link: <…>; rel="canonical"` est le seul mécanisme de canonique pour un contenu
 * non-HTML.
 *
 * ⚠️ Ne PAS revenir à une routeRule proxy + middleware : le handler des routeRules est
 * enregistré AVANT les middlewares serveur dans Nitro (runtime/internal/app.mjs), un
 * middleware ne s'exécute donc jamais sur une route proxifiée par routeRule.
 */
const FILE_ID_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;

interface DocumentRef {
  id: number;
  slug: string | null;
  title: string | null;
}

const getDocumentByFileId = defineCachedFunction(
  async (fileId: string): Promise<DocumentRef | null> => {
    const rows = (await getCmsClient().request(
      readItems('documents', {
        fields: ['id', 'slug', 'title'],
        filter: { file: { _eq: fileId }, status: { _eq: 'published' } },
        limit: 1,
      }),
    )) as DocumentRef[];
    return rows?.[0] ?? null;
  },
  { maxAge: 86400, name: 'docs-canonical-by-file', getKey: (fileId: string) => fileId },
);

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || '';
  const config = useRuntimeConfig();

  let canonical: string | null = null;
  const match = path.match(FILE_ID_RE);
  if (match && (event.method === 'GET' || event.method === 'HEAD')) {
    try {
      const doc = await getDocumentByFileId(match[1]);
      const slug = doc?.slug || (doc?.title ? generateSlugFromName(doc.title) : '');
      if (doc && slug) {
        const siteUrl = config.public.siteUrl || 'https://www.vie-publique.sn';
        canonical = `${siteUrl}/documents/${doc.id}/${slug}`;
      }
    } catch (error) {
      // Dégradation propre : le fichier est servi normalement, juste sans canonique.
      reportServerError(error, 'docs-proxy-canonical', { path });
    }
  }

  const cmsBase = config.cmsApiUrl || 'https://cms.vie-publique.sn';
  return proxyRequest(event, `${cmsBase}/assets/${path}`, {
    onResponse(evt) {
      // Même politique de cache que l'ancienne routeRule.
      setResponseHeader(evt, 'cache-control', 'max-age=86400');
      if (canonical) {
        setResponseHeader(evt, 'Link', `<${canonical}>; rel="canonical"`);
      }
    },
  });
});

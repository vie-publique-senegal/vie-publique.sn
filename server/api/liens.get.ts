import { getSocialNetworkMeta } from '#shared/social-networks';
import type { SocialStatsResponse } from '~~/types/social-stat';
import type { VpLink, VpLinksResponse } from '~~/types/vp-link';
import links from '../data/liens.json';

/**
 * Liens de la page `/liens` (remplaçante du Linktree).
 * GET /api/liens
 *
 * - Liens produits : `server/data/liens.json` (sans cache : le JSON est embarqué
 *   dans le build, un cache Nitro ne ferait que masquer une modification en dev).
 * - Réseaux sociaux : `vp_social_stats` via `/api/social-stats` (même source et
 *   mêmes chiffres que la home, déjà caché 30 min). Si le CMS est injoignable, on
 *   retombe sur les entrées `social` du JSON, sans nombre d'abonnés.
 *
 * Bascule des liens produits vers Directus : voir `docs/modules/liens/README.md`.
 */
export default defineEventHandler(async (): Promise<VpLinksResponse> => {
  const jsonLinks = (links as VpLink[]).filter((link) => link.status === 'published');
  let socials = jsonLinks.filter((link) => link.section === 'social');

  try {
    const { data } = await $fetch<SocialStatsResponse>('/api/social-stats');
    if (data.length > 0) {
      socials = data
        .filter((stat) => stat.display && stat.link)
        .map(
          (stat): VpLink => ({
            id: `social-${stat.id}`,
            section: 'social',
            title: stat.name,
            url: stat.link,
            icon: getSocialNetworkMeta(stat.name).icon,
            followers: stat.followers || null,
            sort: stat.order ?? 0,
            status: 'published',
          }),
        );
    }
  } catch (error) {
    reportServerError(error, 'api/liens', { step: 'social-stats' });
  }

  const data = [...jsonLinks.filter((link) => link.section !== 'social'), ...socials].sort(
    (a, b) => a.sort - b.sort,
  );

  return { data };
});

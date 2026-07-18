/**
 * Réécrit le HTML riche venant de Directus avant rendu `v-html` (PERF-12).
 *
 * Problème constaté au RUM Cloudflare (16/07/2026, Debug View LCP) : les images
 * insérées dans l'éditeur rich text pointent directement sur
 * `https://cms.vie-publique.sn/assets/<uuid>.jpg` → elles contournent le proxy
 * `/cms/` (pas de cache Cloudflare, pas de WebP, JPEG/PNG original parfois en Mo,
 * LCP mesurés jusqu'à 38 s) et n'ont ni `loading="lazy"` ni `decoding="async"`.
 *
 * Ce que fait la réécriture — UNIQUEMENT sur les balises <img> (les liens <a>
 * vers des PDF/fichiers CMS ne sont pas touchés) :
 * - URL absolue CMS ou déjà proxifiée → `/cms/<uuid>?width=800&format=webp&quality=80`
 *   (800 px couvre la colonne de lecture `max-w-3xl` ; Directus n'agrandit pas
 *   les images plus petites)
 * - GIF/SVG : proxy sans transformation (préserver animation et vectoriel,
 *   même règle que le provider `cms-image.ts`)
 * - ajoute `loading="lazy"` et `decoding="async"` si absents (images de contenu,
 *   jamais le LCP du haut de page → lazy toujours correct ici)
 *
 * Coût : une regex sur quelques dizaines de Ko, ~µs — amorti par le SWR HTML
 * (rendu serveur caché) et un `computed` côté client.
 */
export function rewriteCmsContent(html?: string | null): string {
  if (!html || !html.includes('<img')) return html ?? '';

  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    let out = tag.replace(
      /src="(?:https?:\/\/cms\.vie-publique\.sn\/assets\/|\/cms\/)([a-f0-9][a-f0-9-]{34}[a-f0-9])((?:\.[a-z0-9]+)?)[^"]*"/i,
      (_match, id: string, ext: string) => {
        const skipTransform = /^\.(gif|svg)$/i.test(ext);
        return skipTransform
          ? `src="/cms/${id}"`
          : `src="/cms/${id}?width=800&format=webp&quality=80"`;
      },
    );
    if (!/\bloading=/i.test(out)) {
      out = out.replace(/<img/i, '<img loading="lazy"');
    }
    if (!/\bdecoding=/i.test(out)) {
      out = out.replace(/<img/i, '<img decoding="async"');
    }
    return out;
  });
}

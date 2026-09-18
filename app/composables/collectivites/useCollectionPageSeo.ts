import type { MaybeRefOrGetter } from 'vue';

/** Item de l'`ItemList` : le nom affiché et l'URL absolue de sa page. */
export interface CollectionPageItem {
  name: string;
  url: string;
}

export interface CollectionPageSeoOptions {
  /** Clé du `<script>` JSON-LD (`ld-regions`, `ld-departement`…). */
  key: string;
  title: MaybeRefOrGetter<string>;
  description: MaybeRefOrGetter<string>;
  /** URL canonique absolue de la page. */
  url: MaybeRefOrGetter<string>;
  /**
   * Ce que la page affiche RÉELLEMENT : sans recherche la liste entière, les
   * résultats sinon. Le JSON-LD ne décrit pas autre chose que la page.
   */
  items: () => CollectionPageItem[];
  /**
   * Plafond d'items sérialisés. `numberOfItems` reste le total : c'est un
   * échantillon, l'exhaustivité de l'indexation passe par le sitemap. Lister les
   * 558 collectivités alourdirait le HTML de ~40 Ko sans bénéfice.
   */
  maxItems?: number;
  /** Mots-clés ajoutés à ceux du site. */
  keywords?: string[];
  /**
   * Vrai quand la page est une vue filtrée : `noindex, follow` (règle SEO §10),
   * le canonical ramenant les signaux sur la page propre.
   */
  noindexWhen?: () => boolean;
}

/**
 * SEO + JSON-LD des pages de listing du module (annuaire, hubs régions et
 * départements, fiches région et département).
 *
 * Les cinq pages émettaient le même bloc de ~50 lignes : mêmes balises OG, même
 * nœud `CollectionPage`, même `useHead`. Seuls changeaient le titre, l'URL et la
 * liste. Le mutualiser évite qu'une correction (un `inLanguage`, un
 * `twitterCard`) ne soit appliquée qu'à une page sur cinq.
 *
 * ⚠️ Pas de `BreadcrumbList` ici : `<AppBreadcrumb>` en est la source UNIQUE
 * (cf. CLAUDE.md §SEO). Ce composable n'émet que le nœud d'entité de la page.
 */
export function useCollectionPageSeo(options: CollectionPageSeoOptions) {
  const { siteName, siteUrl, themeColor, keywords } = useSiteMetadata();

  const pageTitle = computed(() => toValue(options.title));
  const pageDescription = computed(() => toValue(options.description));
  const pageUrl = computed(() => toValue(options.url));

  useSeoMeta({
    title: pageTitle,
    ogTitle: pageTitle,
    description: pageDescription,
    ogDescription: pageDescription,
    ogUrl: pageUrl,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    ...(options.keywords && { keywords: [...keywords, ...options.keywords].join(', ') }),
  });

  const collectionPageSchema = computed(() => {
    const items = options.items();
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: pageTitle.value,
      description: pageDescription.value,
      url: pageUrl.value,
      inLanguage: 'fr-SN',
      isPartOf: { '@type': 'WebSite', name: siteName, url: siteUrl },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: items.length,
        itemListElement: (options.maxItems ? items.slice(0, options.maxItems) : items).map(
          (item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            url: item.url,
          }),
        ),
      },
    };
  });

  useHead({
    htmlAttrs: { lang: 'fr-SN' },
    link: [{ rel: 'canonical', href: pageUrl }],
    meta: [
      {
        name: 'robots',
        content: () => (options.noindexWhen?.() ? 'noindex, follow' : 'index, follow'),
      },
      { name: 'theme-color', content: themeColor },
    ],
    script: [
      {
        key: options.key,
        type: 'application/ld+json',
        innerHTML: computed(() => JSON.stringify(collectionPageSchema.value)),
      },
    ],
  });

  return { pageTitle, pageDescription, pageUrl };
}

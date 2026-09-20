import type { CommuneGeo } from '~~/types/collectivite';
import { formatNumber } from '#shared/format';
import { getCommuneTabPath, type CommuneTab } from './communeTabs';

// SEO + JSON-LD partagés par la fiche commune et ses onglets routés.
// Chaque onglet a son propre titre/description/canonical (indexable séparément),
// mais réémet le même nœud d'entité GovernmentOrganization (la mairie) : cf.
// docs/guidelines/design.md - pas de BreadcrumbList ici, <AppBreadcrumb> l'émet déjà.
//
// Rien n'est inventé : les champs absents du référentiel sont simplement omis du
// JSON-LD plutôt que remplis d'une valeur par défaut.
export function useCommuneSeo(commune: CommuneGeo, tab: CommuneTab) {
  const { siteName, siteUrl, themeColor } = useSiteMetadata();

  const pageUrl = `${siteUrl}${getCommuneTabPath(commune.slug, tab)}`;
  const libelleType = commune.type === 'Ville' ? 'ville' : 'commune';

  const pageTitle =
    tab.key === 'apercu'
      ? `${commune.nom} - ${commune.type} du Sénégal (${commune.region})`
      : `${tab.label} - ${commune.nom} (${commune.region})`;

  const contexte = `${libelleType} du département de ${commune.departement}, région de ${commune.region}`;
  const habitants =
    commune.population !== null
      ? `, ${formatNumber(commune.population)} habitants au recensement ${commune.populationAnnee}`
      : '';
  const maire = commune.maire ? ` Maire : ${commune.maire.nom}.` : '';

  const pageDescription =
    tab.key === 'apercu'
      ? `${commune.nom}, ${contexte}${habitants}.${maire}`
      : `${tab.label} de ${commune.nom} (${contexte}).${maire}`;

  const imageAbsolue = commune.photoCouverture
    ? `${siteUrl}${useCmsImage(commune.photoCouverture)}`
    : undefined;

  useSeoMeta({
    title: pageTitle,
    ogTitle: pageTitle,
    description: pageDescription,
    ogDescription: pageDescription,
    ogUrl: pageUrl,
    ogType: 'website',
    ...(imageAbsolue && {
      ogImage: imageAbsolue,
      twitterImage: imageAbsolue,
      twitterCard: 'summary_large_image',
    }),
  });

  const mairieSchema = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    name: `Mairie de ${commune.nom}`,
    url: commune.contact?.siteWeb || pageUrl,
    ...(commune.contact?.telephone && { telephone: commune.contact.telephone }),
    ...(commune.contact?.email && { email: commune.contact.email }),
    ...(imageAbsolue && { image: imageAbsolue }),
    address: {
      '@type': 'PostalAddress',
      ...(commune.contact?.adresse && { streetAddress: commune.contact.adresse }),
      addressLocality: commune.nom,
      addressRegion: commune.region,
      addressCountry: 'SN',
    },
    ...(commune.maire && {
      employee: { '@type': 'Person', name: commune.maire.nom, jobTitle: 'Maire' },
    }),
    areaServed: commune.nom,
    parentOrganization: { '@type': 'GovernmentOrganization', name: 'République du Sénégal' },
  };

  useHead({
    htmlAttrs: { lang: 'fr-SN' },
    link: [{ rel: 'canonical', href: pageUrl }],
    meta: [
      { name: 'robots', content: 'index, follow' },
      { name: 'theme-color', content: themeColor },
      { property: 'og:site_name', content: siteName },
    ],
    script: [
      {
        key: 'ld-mairie',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(mairieSchema),
      },
    ],
  });

  return { pageUrl, pageTitle, pageDescription };
}

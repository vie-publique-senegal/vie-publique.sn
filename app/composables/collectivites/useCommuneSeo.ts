import type { Commune } from '~~/types/collectivite';
import { formatNumber } from '#shared/communes';
import { getCommuneTabPath, type CommuneTab } from './communeTabs';

// SEO + JSON-LD partagés par la fiche commune et ses onglets routés.
// Chaque onglet a son propre titre/description/canonical (indexable séparément),
// mais réémet le même nœud d'entité GovernmentOrganization (la mairie) : cf.
// docs/guidelines/design.md - pas de BreadcrumbList ici, <AppBreadcrumb> l'émet déjà.
export function useCommuneSeo(commune: Commune, tab: CommuneTab) {
  const { siteName, siteUrl, themeColor } = useSiteMetadata();

  const pageUrl = `${siteUrl}${getCommuneTabPath(commune.slug, tab)}`;
  const pageTitle =
    tab.key === 'apercu'
      ? `${commune.nom} - Commune du Sénégal (${commune.region})`
      : `${tab.label} - ${commune.nom} (${commune.region})`;
  const pageDescription =
    tab.key === 'apercu'
      ? `Fiche complète de la commune de ${commune.nom} (${commune.region}) : maire ${commune.maire.nom}, ${formatNumber(commune.population)} habitants, budget, conseil municipal et documents.`
      : `${tab.label} de la commune de ${commune.nom} (${commune.region}) : maire ${commune.maire.nom}.`;

  useSeoMeta({
    title: pageTitle,
    ogTitle: pageTitle,
    description: pageDescription,
    ogDescription: pageDescription,
    ogImage: commune.photoCouverture,
    ogUrl: pageUrl,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterImage: commune.photoCouverture,
  });

  const mairieSchema = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    name: `Mairie de ${commune.nom}`,
    url: commune.mairie.siteWeb || pageUrl,
    telephone: commune.mairie.telephone,
    email: commune.mairie.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: commune.mairie.adresse,
      addressLocality: commune.nom,
      addressRegion: commune.region,
      addressCountry: 'SN',
    },
    location: {
      '@type': 'Place',
      geo: {
        '@type': 'GeoCoordinates',
        latitude: commune.latitude,
        longitude: commune.longitude,
      },
    },
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

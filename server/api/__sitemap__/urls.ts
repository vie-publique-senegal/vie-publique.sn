import { defineSitemapEventHandler } from '#imports';
import { readItems } from '@directus/sdk';

export default defineSitemapEventHandler(async () => {
  const urls: any[] = [];

  const toISODate = (date: string | null | undefined): string | undefined => {
    if (!date) return undefined;
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  };

  try {
    const directus = getCmsClient();

    // 1. Documents
    const documents = await directus.request(
      readItems('documents', {
        fields: ['slug', 'id', 'date_updated', 'publish_date'],
        filter: {
          status: { _eq: 'published' },
        },
        limit: -1,
        sort: ['-publish_date'],
      }),
    );

    for (const doc of documents) {
      const lastmod = toISODate(doc.date_updated) || toISODate(doc.publish_date);
      urls.push({
        loc: `/documents/${doc.id}/${doc.slug}`,
        ...(lastmod && { lastmod }),
        changefreq: 'monthly',
        priority: 0.7,
      });
    }

    // 2. Actualités et Conseil des ministres
    const news = await directus.request(
      readItems('news', {
        fields: ['slug', 'id', 'date_updated', 'date_published', 'category.name'],
        filter: {
          status: { _eq: 'published' },
        },
        limit: -1,
        sort: ['-date_published'],
      }),
    );

    for (const item of news) {
      let path = `/actualites/${item.id}/${item.slug}`;
      let priority = 0.8;

      if (item.category?.name === 'Conseil des ministres') {
        path = `/conseil-des-ministres/${item.id}/${item.slug}`;
        priority = 0.9;
      }

      const lastmod = toISODate(item.date_updated) || toISODate(item.date_published);
      urls.push({
        loc: path,
        ...(lastmod && { lastmod }),
        changefreq: 'weekly',
        priority: priority,
      });
    }

    // 3. Députés
    try {
      const deputies = await directus.request(
        readItems('assembly_deputy', {
          fields: ['id', 'first_name', 'last_name', 'date_updated'],
          limit: -1,
          sort: ['last_name'],
        }),
      );

      const slugify = (text: string) => {
        return text
          .toString()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '')
          .replace(/--+/g, '-');
      };

      for (const deputy of deputies) {
        const fullName = `${deputy.first_name} ${deputy.last_name}`;
        const slug = slugify(fullName);
        const lastmod = toISODate(deputy.date_updated);
        urls.push({
          loc: `/assemblee-nationale/deputes/${deputy.id}/${slug}`,
          ...(lastmod && { lastmod }),
          changefreq: 'monthly',
          priority: 0.6,
        });
      }
    } catch (sitemapError) {
      console.warn('Erreur sitemap députés:', sitemapError);
    }
    // 4. Projets Publics
    try {
      // Pages dashboards (PRES et PIP)
      urls.push(
        { loc: '/projets-publics-senegal/pres', changefreq: 'weekly', priority: 0.8 },
        { loc: '/projets-publics-senegal/pip', changefreq: 'weekly', priority: 0.8 },
      );

      // Fiches projets
      const publicProjects = await directus.request(
        readItems('public_project', {
          fields: ['slug', 'date_updated'],
          filter: {
            status: { _eq: 'published' },
          },
          limit: -1,
        }),
      );

      for (const project of publicProjects) {
        const lastmod = toISODate(project.date_updated);
        urls.push({
          loc: `/projets-publics-senegal/${project.slug}`,
          ...(lastmod && { lastmod }),
          changefreq: 'monthly',
          priority: 0.7,
        });
      }
    } catch (sitemapError) {
      console.warn('Erreur sitemap projets publics:', sitemapError);
    }

    // 5. Pages archives par année
    try {
      const yearsData = await directus.request(
        readItems('documents', {
          fields: ['publish_date'],
          filter: { status: { _eq: 'published' }, publish_date: { _nnull: true } },
          groupBy: ['year(publish_date)'],
          aggregate: { countDistinct: 'id' },
          limit: -1,
        }),
      );

      const categories = ['journal-officiel', 'rapports-audit', 'strategies', 'codes', 'budget'];

      // Page index archives
      urls.push({
        loc: '/documents/annee',
        changefreq: 'monthly',
        priority: 0.6,
      });

      for (const item of yearsData as any[]) {
        const year = item.publish_date_year;
        if (!year) continue;

        // Page année globale
        urls.push({
          loc: `/documents/annee/${year}`,
          changefreq: 'monthly',
          priority: 0.5,
        });

        // Pages année par catégorie
        for (const cat of categories) {
          urls.push({
            loc: `/documents/${cat}/annee/${year}`,
            changefreq: 'monthly',
            priority: 0.5,
          });
        }
      }
    } catch (sitemapError) {
      console.warn('Erreur sitemap archives années:', sitemapError);
    }

    // 6. Élections — pages par onglet
    try {
      const elections = (await directus.request(
        readItems('elections' as any, {
          fields: ['id', 'slug', 'type', 'status', 'election_date', 'pv_upload_active'],
          filter: { status: { _nin: ['draft', 'archived'] } },
          limit: -1,
        }),
      )) as any[];

      for (const election of elections) {
        const lastmod = toISODate(election.election_date);
        const base = `/elections-senegal/${election.slug}`;
        const isCompleted = election.status === 'completed';
        const isLegislative = String(election.type).includes('legislative');

        const tabs: { tab: string; priority: number }[] = isCompleted
          ? [
              { tab: 'resultats', priority: 0.9 },
              { tab: 'candidats', priority: 0.8 },
              { tab: 'documents', priority: 0.7 },
            ]
          : [
              { tab: 'candidats', priority: 0.8 },
              { tab: 'resultats', priority: 0.8 },
              { tab: 'carte', priority: 0.7 },
              { tab: 'documents', priority: 0.7 },
              { tab: 'guide', priority: 0.6 },
            ];

        if (election.pv_upload_active) tabs.push({ tab: 'pvs', priority: 0.6 });
        if (isLegislative) tabs.push({ tab: 'statistiques', priority: 0.7 });

        for (const { tab, priority } of tabs) {
          urls.push({
            loc: `${base}/${tab}`,
            ...(lastmod && { lastmod }),
            changefreq: isCompleted ? 'monthly' : 'weekly',
            priority,
          });
        }

        const changefreq = isCompleted ? 'monthly' : 'weekly';
        const isLocale = String(election.type) === 'locale';

        // 6b. Présidentielle / législatives : fiches candidat et pages coalition
        // (routes /candidats/[candidateSlug] et /candidats/coalition/[coalitionSlug]).
        if (!isLocale) {
          try {
            const lists = (await directus.request(
              readItems('election_electoral_lists' as any, {
                fields: ['coalition.political_entity.slug', 'candidates.person.slug'],
                filter: { election: { _eq: election.id }, status: { _eq: 'published' } },
                limit: -1,
              }),
            )) as any[];

            const coalitionSlugs = new Set<string>();
            const candidateSlugs = new Set<string>();
            for (const list of lists) {
              const coalitionSlug = list.coalition?.political_entity?.slug;
              if (coalitionSlug) coalitionSlugs.add(coalitionSlug);
              for (const candidate of list.candidates || []) {
                const personSlug = candidate?.person?.slug;
                if (personSlug) candidateSlugs.add(personSlug);
              }
            }

            for (const slug of coalitionSlugs) {
              urls.push({
                loc: `${base}/candidats/coalition/${slug}`,
                ...(lastmod && { lastmod }),
                changefreq,
                priority: 0.6,
              });
            }
            for (const slug of candidateSlugs) {
              urls.push({
                loc: `${base}/candidats/${slug}`,
                ...(lastmod && { lastmod }),
                changefreq,
                priority: 0.6,
              });
            }
          } catch (sitemapError) {
            console.warn(
              `Erreur sitemap candidats/coalitions (élection ${election.slug}):`,
              sitemapError,
            );
          }
        }

        // 6c. Locales : pages circonscription (route /candidats/circonscription/[constituencySlug]),
        // limitées aux départements ayant au moins une liste publiée.
        if (isLocale) {
          try {
            const lists = (await directus.request(
              readItems('election_electoral_lists' as any, {
                fields: ['constituency.id'],
                filter: { election: { _eq: election.id }, status: { _eq: 'published' } },
                limit: -1,
              }),
            )) as any[];

            const constituencyIds = [
              ...new Set(lists.map((l) => l.constituency?.id).filter(Boolean)),
            ];

            if (constituencyIds.length > 0) {
              const constituencies = (await directus.request(
                readItems('election_constituencies' as any, {
                  fields: ['id', 'slug', 'type', 'nationale_type'],
                  filter: { id: { _in: constituencyIds } },
                  limit: -1,
                }),
              )) as any[];

              for (const constituency of constituencies) {
                if (
                  constituency.type === 'national' &&
                  constituency.nationale_type === 'departement' &&
                  constituency.slug
                ) {
                  urls.push({
                    loc: `${base}/candidats/circonscription/${constituency.slug}`,
                    ...(lastmod && { lastmod }),
                    changefreq,
                    priority: 0.5,
                  });
                }
              }
            }
          } catch (sitemapError) {
            console.warn(
              `Erreur sitemap circonscriptions (élection ${election.slug}):`,
              sitemapError,
            );
          }
        }
      }
    } catch (sitemapError) {
      console.warn('Erreur sitemap élections:', sitemapError);
    }

    // 8. Pages statiques : Laissées à l'auto-découverte de Nuxt Sitemap
    // Le module @nuxtjs/seo va automatiquement inclure toutes les pages du dossier /pages
  } catch (error) {
    console.error('Erreur génération sitemap:', error);
  }

  return urls;
});

# Historique des gouvernements — SEO

> À lire avec les règles SEO globales du projet : `docs/seo/seo-pages-detail-audit.md`,
> `docs/seo/seo-indexation-rapide.md` et `CLAUDE.md` SEO.
> **Toujours vérifier le HTML SSR de prod** (`curl -A "facebookexternalhit/1.1"`) avant de
> conclure à un bug — `@nuxtjs/seo` absolutise les og:image relatives et fournit des
> fallbacks globaux.

---

## Objectif

- `/gouvernement-senegal/historique` → référence n°1 sur « historique gouvernements Sénégal »
- `/gouvernement-senegal/<slug>` → référence n°1 sur chaque gouvernement individuel
  (ex : « Gouvernement Sonko I membres »)

---

## Ce qui est implémenté

### Page historique (`app/pages/gouvernement-senegal/historique.vue`)

Toutes les meta sont définies **en scope setup** (jamais dans `watch`/`onMounted`) → rendu SSR.

- **`<title>`** : `"Historique des gouvernements du Sénégal depuis 1960 | Vie Publique Sénégal"`
- **meta description** : phrase descriptive, de Senghor à Bassirou Diomaye Faye
- **canonical** : `https://www.vie-publique.sn/gouvernement-senegal/historique`
- **Open Graph** : `og:type=website`, og:title, og:description, og:url, og:image (`/nomination-3.png`)
- **Twitter** : `summary_large_image`
- **robots** : `index, follow`
- **keywords** : `historique gouvernements sénégal`, `gouvernements sénégal depuis 1960`,
  `premiers ministres sénégal`, `présidents sénégal`, noms des présidents historiques

**JSON-LD :**

```json
{
  "@type": "ItemList",
  "name": "Historique des gouvernements du Sénégal",
  "numberOfItems": <nb gouvernements>,
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Gouvernement Sonko I", "url": "…" },
    …
  ]
}
```

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "position": 1, "name": "Accueil" },
    { "position": 2, "name": "Annuaires" },
    { "position": 3, "name": "Gouvernement du Sénégal" },
    { "position": 4, "name": "Historique" }
  ]
}
```

> ⚠️ **Known issue** : les deux `<script type="application/ld+json">` utilisent `children`
> au lieu de `innerHTML`. En production, cela peut créer des nœuds dupliqués à l'hydratation
> (voir règle 6 CLAUDE.md). À migrer vers `innerHTML` + `key` unique si le test Rich Results
> affiche des doublons.

---

### Page détail (`app/pages/gouvernement-senegal/[slug].vue`)

Toutes les meta sont définies avec des **getters réactifs** (données chargées en async).

- **`<title>`** : `"<Nom du gouvernement> - Composition du gouvernement | Vie Publique Sénégal"`
- **meta description** : dynamique — cite président, PM, période
- **canonical** : `https://www.vie-publique.sn/gouvernement-senegal/<slug>`
- **Open Graph** : `og:type=website`, image `nomination-3.png` (statique — pas de cover par gouvernement)
- **Twitter** : `summary_large_image`
- **robots** : `index, follow`

**JSON-LD :**

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "<Nom du gouvernement>",
  "url": "https://www.vie-publique.sn/gouvernement-senegal/<slug>",
  "foundingDate": "<start_date>",
  "dissolutionDate": "<end_date>",
  "areaServed": { "@type": "Country", "name": "Sénégal" },
  "member": [
    { "@type": "Person", "name": "…", "jobTitle": "…", "gender": "Male|Female", "url": "…" }
  ]
}
```

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "position": 1, "name": "Accueil" },
    { "position": 2, "name": "Annuaires" },
    { "position": 3, "name": "Gouvernement du Sénégal" },
    { "position": 4, "name": "<Nom du gouvernement>" }
  ]
}
```

> ⚠️ **Known issue identique** : `children` au lieu de `innerHTML`, et pas de `key` sur les
> entrées `script`. La page utilise `useSchemaOrg` / JSON-LD inline — vérifier que le nœud
> `Organization` n'est pas en doublon au test Rich Results.

> ⚠️ **Double BreadcrumbList potentiel** : la page injecte un `BreadcrumbList` en JSON-LD brut
> **ET** utilise `<AppBreadcrumb>` (qui émet son propre nœud via `useSchemaOrg`). Selon la
> règle 7 de CLAUDE.md, le JSON-LD brut de breadcrumb en page est redondant → à retirer par
> opportunité pour laisser AppBreadcrumb seul.

---

## Contraintes de slug

Les slugs des gouvernements suivent la convention du projet :

- minuscules, sans accents, sans espaces → tirets simples
- stable une fois indexé (si changé, prévoir un `routeRules` redirect 301 dans `nuxt.config.ts`)
- Ex : `"Gouvernement Sonko I"` → `"sonko-i"`

---

## Sitemap

> **Implémenté** — section 9 « Gouvernements » dans `server/api/__sitemap__/urls.ts`.

- Page historique `/gouvernement-senegal/historique` : `priority 0.85`, `changefreq monthly`.
- Chaque gouvernement publié `/gouvernement-senegal/<slug>` : `lastmod = date_updated`.
- Le gouvernement **en cours** (`end_date` null) est plus prioritaire et plus fréquent
  (`priority 0.8`, `changefreq weekly`) ; les gouvernements **clos** sont stables
  (`priority 0.6`, `changefreq yearly`).
- Les pages index `/gouvernement-senegal` restent auto-découvertes par `@nuxtjs/seo`.

```typescript
// Section 9 : Gouvernements
urls.push({
  loc: '/gouvernement-senegal/historique',
  changefreq: 'monthly',
  priority: 0.85,
});

const governments = await directus.request(
  readItems('governments', {
    fields: ['slug', 'date_updated', 'end_date'],
    filter: { status: { _eq: 'published' }, slug: { _nnull: true } },
    limit: -1,
  }),
);
for (const gov of governments) {
  if (!gov.slug) continue;
  const lastmod = toISODate(gov.date_updated);
  urls.push({
    loc: `/gouvernement-senegal/${gov.slug}`,
    ...(lastmod && { lastmod }),
    changefreq: gov.end_date === null ? 'weekly' : 'yearly',
    priority: gov.end_date === null ? 0.8 : 0.6,
  });
}
```

---

## Indexation rapide

1. Publier le gouvernement (`status = published`).
2. Vérifier le HTML SSR :
   ```bash
   curl -sL -A "facebookexternalhit/1.1" https://www.vie-publique.sn/gouvernement-senegal/<slug> \
     | grep -iE 'og:|twitter:|canonical|robots'
   ```
3. Vérifier le JSON-LD :
   ```bash
   curl -sL https://www.vie-publique.sn/gouvernement-senegal/<slug> \
     | grep -o '<script type="application/ld+json"'
   # → doit afficher 2 balises (Organization + BreadcrumbList)
   ```
4. Vérifier la présence dans `https://www.vie-publique.sn/sitemap.xml`.
5. Soumettre dans **Google Search Console** (Inspection d'URL → Demander l'indexation).
6. Tester les rich results : <https://search.google.com/test/rich-results>
7. Valider l'aperçu social (debuggers Facebook / Twitter / LinkedIn).

---

## Diagnostics fréquents

| Symptôme | Cause probable | Vérification |
| --- | --- | --- |
| og:image absente ou cassée | `nomination-3.png` non dans `/public/` | `ls public/nomination-3.png` |
| Title absent dans le partage social | `useSeoMeta` dans un computed tardif | Vérifier `curl` du HTML SSR |
| JSON-LD en doublon au test Rich Results | `children` au lieu de `innerHTML`, ou pas de `key` | DevTools → éléments `<script>` |
| Double BreadcrumbList | JSON-LD brut page + AppBreadcrumb | `curl -s <url> | grep BreadcrumbList | wc -l` → doit être 1 |
| Double `<h1>` | Titre dans la barre mobile sticky + titre desktop | `curl -s <url> | grep -o "<h1" | wc -l` → doit être 1 |

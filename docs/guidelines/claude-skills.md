# Skills Claude Code — lesquels, quand, pourquoi

> Doc canonique des **skills** installés dans le projet (répertoires `.claude/skills/` +
> `.agents/skills/`, verrou `skills-lock.json` — tout est versionné dans git, donc chaque
> contributeur Claude Code en profite). Pour les **serveurs MCP** (accès aux services :
> Directus, Sentry, Cloudflare, GA…), voir [`mcp-servers.md`](./mcp-servers.md).
>
> ⚠️ **Règle de précédence** : les skills apportent des bonnes pratiques _génériques_.
> En cas de contradiction avec [`/CLAUDE.md`](../../CLAUDE.md) ou un doc canonique du projet,
> **le projet fait foi** (ex. : JSON-LD brut avec `innerHTML`, PAS `useSchemaOrg` ; palette
> dark « Dim » slate à ne pas changer ; breadcrumb = `AppBreadcrumb` uniquement).

## C'est quoi un skill ?

Un skill = un paquet de connaissances/consignes que Claude Code charge **à la demande** quand
la tâche correspond à sa description (on peut aussi le forcer : « utilise le skill X »).
Gérés par le CLI [`npx skills`](https://skills.sh/) :

```bash
npx skills check     # vérifier les mises à jour
npx skills update    # mettre à jour tous les skills
npx skills add <owner/repo@skill>   # en ajouter un (sans -g = scope projet, versionné)
```

## Skills installés (2026-07) — quand utiliser lequel

### Stack (chargés quasi systématiquement en dev)

| Skill | Source | Quand / pourquoi |
| --- | --- | --- |
| **`nuxt`** | `antfu/skills` (core team Nuxt) | Tout dev Nuxt : routes serveur Nitro, `useFetch`/`useAsyncData`, middleware, rendu hybride, auto-imports. Complète nos patterns SSR (cf. § listes paginées de CLAUDE.md). |
| **`vue`** | `antfu/skills` (core team Vue) | Écriture de SFC : `defineProps`/`defineEmits`/`defineModel`, réactivité, watchers, `Transition`/`Teleport`/`Suspense`. |
| **`nuxt-ui`** | `nuxt/ui` (officiel) | Création/modification d'UI avec les composants `U*` (UCard, UButton…) : props, slots, theming Tailwind. ⚠️ Skill ciblant **Nuxt UI v4** — vérifier la compat avec notre version avant d'appliquer une API nouvelle ; et notre [`design.md`](./design.md) (sobriété, palette) prime sur ses suggestions de style. |

### Qualité web — suite `addyosmani/web-quality-skills`

| Skill | Quand / pourquoi |
| --- | --- |
| **`web-quality-audit`** | Point d'entrée : audit global d'une page/du site (perf + a11y + SEO + bonnes pratiques, type Lighthouse). L'utiliser d'abord, puis approfondir avec un skill spécialisé. |
| **`core-web-vitals`** | Chantier prioritaire : notre baseline mobile est en **échec** (LCP 3,6 s, CLS 0,16, TTFB 1,3 s — [`audits/audit-web-vitals-2026-07.md`](../audits/audit-web-vitals-2026-07.md)). À invoquer pour tout travail LCP/INP/CLS (items PERF de l'audit complet). |
| **`performance`** | Perf de chargement au sens large (bundles, images, fonts, lazy-loading) quand le sujet dépasse les 3 métriques CWV. Protocole de mesure : [`infra/mesure-performance.md`](../infra/mesure-performance.md). |
| **`accessibility`** | Audits/correctifs WCAG 2.2 : contrastes, navigation clavier, lecteurs d'écran, ARIA. Sert les items A11Y de [`audits/audit-complet-2026-07.md`](../audits/audit-complet-2026-07.md). |
| **`seo`** | SEO **technique on-page** générique (meta, structured data, sitemap). ⚠️ Toujours croiser avec les règles SEO de CLAUDE.md (§ SEO & Open Graph) qui priment : vérif HTML SSR prod avant conclusion, JSON-LD `innerHTML`, 1 H1, `useCleanText`… |

### SEO spécialisés

| Skill | Source | Quand / pourquoi |
| --- | --- | --- |
| **`seo-audit`** | `coreyhaines31/marketingskills` | Audit SEO orienté **marketing/contenu** : « pourquoi je ne ranke pas », baisse de trafic, santé SEO globale, priorisation. Complémentaire de nos audits techniques ([`seo/seo-audit.md`](../seo/seo-audit.md)). |
| **`seo-geo`** | `resciencelab/opc-skills` | **GEO** (Generative Engine Optimization) : visibilité dans ChatGPT/Perplexity/Gemini/Claude, schema markup, AI Overviews. Cohérent avec notre stratégie `llms.txt` ([`seo/llms-txt.md`](../seo/llms-txt.md)) et notre canal IA (~550 sessions/sem, cf. baseline GA4). |

### Quel skill SEO pour quelle question ?

- « La page X est mal indexée / partage cassé / meta KO » → règles **CLAUDE.md** d'abord
  (diagnostic SSR), puis skill **`seo`** pour les bonnes pratiques génériques.
- « Audit SEO global / le trafic baisse / priorisation » → **`seo-audit`**.
- « Visibilité dans les moteurs IA, llms.txt, AI Overviews » → **`seo-geo`**.
- « Score Lighthouse / page experience » → **`web-quality-audit`** puis **`core-web-vitals`**.

## Maintenance

- **Ajout** : `npx skills add <owner/repo@skill>` (sans `-g`), puis ajouter une ligne dans ce doc.
- **Mise à jour** : `npx skills update` (le hash de `skills-lock.json` change → commit).
- **Revue** : les skills s'exécutent avec les permissions de l'agent — relire le `SKILL.md`
  d'un nouveau skill avant de l'adopter (dossier `.claude/skills/<nom>/`).
- **Suppression** : retirer les dossiers dans `.claude/skills/` et `.agents/skills/` + l'entrée
  de `skills-lock.json`, et mettre à jour ce doc.

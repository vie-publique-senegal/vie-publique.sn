# Stratégie de cache — HTML (SWR) & API

_Doc canonique du cache applicatif. Créé le 16/07/2026 (mise en place du SWR HTML, PERF-7).
Baseline perf : [`../audits/audit-web-vitals-2026-07.md`](../audits/audit-web-vitals-2026-07.md) ·
protocole de mesure : [`../infra/mesure-performance.md`](../infra/mesure-performance.md) ·
chantier `getCacheMaxAge()` dev/prod : [`todo-cache-optimization.md`](./todo-cache-optimization.md)._

## 1. Les 4 couches (qui cache quoi)

| Couche | Quoi | Où c'est configuré | Piège |
| --- | --- | --- | --- |
| **1. Cloudflare (edge)** | images `/cms/**`, PDF `/docs/**`, assets `/_nuxt/**` | Cache Rule (dashboard) — cf. [`../infra/cloudfare.md`](../infra/cloudfare.md) | Le HTML reste `DYNAMIC` (voulu) : ne PAS cacher le HTML au edge sans mécanisme de purge |
| **2. Nitro SWR HTML** | le HTML rendu des pages chaudes | `routeRules` dans `nuxt.config.ts` (`swr: <secondes>`) | s'additionne à la couche 3 pour la fraîcheur ; vérifier la pagination `?page=` après tout changement (CLAUDE.md § listes) |
| **3. Nitro API handlers** | réponses des `/api/**` (données Directus) | `defineCachedEventHandler({ maxAge })` dans `server/api/**` | en dev, le cache **persiste sur disque entre redémarrages** (`.nuxt/cache/nitro/`, cf. CLAUDE.md) |
| **4. Navigateur** | assets `immutable` 1 an ; `/api/**` en `no-cache` (blanket) | `routeRules` headers | le `no-cache` API est volontaire (fraîcheur), gain faible à le raffiner |

**Fraîcheur pire-cas d'une page = TTL SWR (couche 2) + maxAge API (couche 3)** : le HTML peut
être re-rendu à partir d'une réponse API elle-même encore cachée.

## 2. Valeurs actuelles (16/07/2026)

| Page | SWR HTML | maxAge API | Fraîcheur pire-cas |
| --- | --- | --- | --- |
| Home `/` | 120 s | 5 min (news, featured, dossiers, podcasts, gouvernement) | ~7 min |
| `/actualites` liste / détail | 120 s / 300 s | 5 min / **1 h** (`news/[id]`) | ~7 min / **~1 h** |
| `/documents/**` (hub, listings, détail) | 600 s | 5 min (détail) · 1 h (related) | ~15 min |
| `/dossiers` liste / détail | 300 s / 600 s | 5 min | ~10-15 min |
| `/conseil-des-ministres` liste / détail | 300 s / 600 s | 5 min / **1 h** (`news/[id]`) | ~10 min / **~1 h** |
| Assemblée (députés, questions, votes) | — | **1 h** partout | ~1 h |
| Personnalités, podcasts | — | 5 min | 5 min |
| Annuaire sites publics | — | 24 h (Directus `websites` — migré 16/07/2026, QUAL-8) | 24 h |

Aucun handler API n'a de `staleMaxAge` : à expiration, **le premier visiteur paie la latence
Directus complète** (et un 500 si Directus est down à ce moment-là, hors dégradation propre).

## 3. Précos (valeurs recommandées et pourquoi)

> Une préco = un changement mesurable. Dérouler dans l'ordre, re-mesurer entre chaque
> (protocole : [`../infra/mesure-performance.md`](../infra/mesure-performance.md) §5).

### P1 — `staleMaxAge: 86400` (24 h) sur tous les handlers cachés — **la plus rentable**

**Valeur** : `staleMaxAge: 86400` partout où il y a un `maxAge` (93 handlers), sans toucher aux `maxAge`.
**Pourquoi 24 h** : `staleMaxAge` ne change PAS la fraîcheur nominale (le `maxAge` continue de
déclencher la revalidation) ; il autorise seulement Nitro à **servir la copie périmée pendant
qu'il revalide en arrière-plan** au lieu de faire attendre le visiteur. 24 h couvre une panne
Directus d'une journée : le site continue de servir du contenu (légèrement daté) au lieu de
tomber. C'est le pattern SWR appliqué à la couche API — gain : plus AUCUN visiteur ne paie la
latence Directus, et une résilience gratuite.

### P2 — Détails news : `maxAge` 1 h → **15 min** (`news/[id]`)

**Pourquoi 15 min** : les corrections éditoriales (titre, coquille) arrivent surtout dans
l'heure qui suit la publication — 1 h de cache les fige trop longtemps. 15 min + `staleMaxAge`
24 h (P1) garde le même coût Directus (revalidation en fond) avec une fraîcheur 4× meilleure.
Ne PAS descendre sous 5 min : inutile (le SWR HTML de 300-600 s redevient le facteur limitant).

### P3 — Étendre le SWR HTML à l'Assemblée : `swr: 600`

**Valeur** : `'/assemblee-nationale': { swr: 600 }` + `'/assemblee-nationale/**': { swr: 600 }`.
**Pourquoi 600 s** : les données sous-jacentes sont cachées 1 h — un SWR de 10 min n'ajoute que
~17 % de latence de fraîcheur pire-cas, pour un rendu SSR économisé sur des pages lourdes
(listes de députés, votes). **Pré-requis** : avoir validé en prod le SWR des pages chaudes
(pagination `?page=` correcte, pas d'effet de bord PWA) pendant ~1 semaine.

### P4 — Personnalités & podcasts : `swr: 300`

**Pourquoi 300 s** : mêmes caractéristiques que les dossiers (API 5 min, contenu froid) —
aligner par cohérence une fois P3 validée. Fraîcheur pire-cas ~10 min, acceptable pour un
annuaire.

### P5 — Référentiels quasi-statiques : `maxAge` 5 min → **24 h**

**Cibles** : `documents/types`, `documents/years`, `documents/families`, `news/categories`,
`dossiers/types`. **Pourquoi 24 h** : ces listes changent quelques fois par an (nouvelle
catégorie, nouvelle année). Les cacher 5 min = ~288 requêtes Directus/jour chacune pour rien.
Avec P1 (`staleMaxAge`), même une modification rare apparaît en ≤ 24 h sans latence visiteur.
_(`years` bascule au 1ᵉʳ janvier : avec 24 h de cache, la nouvelle année apparaît dans la
journée — acceptable ; sinon 6 h.)_

### P6 — `/api/websites` : cacher + migrer (QUAL-8) — ✅ fait le 16/07/2026

Migration Directus complète (collection `websites`, 470 items, `readItems` + cache 24 h +
dégradation propre, `papaparse` désinstallé) —
détail : [`../audits/audit-complet-2026-07.md`](../audits/audit-complet-2026-07.md) § QUAL-8.

### P7 (optionnel, seulement si besoin métier) — Purge à la publication

Si un jour le « visible en ~7 min » de la home ne suffit plus (breaking news) : Flow Directus
à la publication → webhook vers une route de purge du cache Nitro (`useStorage('cache')`) +
éventuellement purge ciblée Cloudflare. **Ne pas construire ça préventivement** — aucun cas
d'usage constaté à ce jour.

## 4. Barème pour un NOUVEL endpoint (règle de pouce)

| Type de donnée | `maxAge` reco | SWR HTML de la page | Exemple |
| --- | --- | --- | --- |
| Listing « chaud » (contenu publié au fil de l'eau) | 5 min | 120-300 s | news, documents |
| Détail d'un contenu | 15 min | 300-600 s | `news/[id]`, `documents/[id]` |
| Données de module semi-statiques | 1 h | 600 s | assemblée, budget |
| Référentiels (types, catégories, années) | 24 h | — | `documents/types` |
| Config / flags | 5 min | — | `features/flags` |

Toujours : `staleMaxAge: 86400`, `getCacheMaxAge()` pour le différentiel dev/prod
([`todo-cache-optimization.md`](./todo-cache-optimization.md)), dégradation propre
(`reportServerError`, jamais de 500 global), et **bumper le `name` du handler** quand la
structure de réponse change (sinon l'ancien cache ressert l'ancien format).

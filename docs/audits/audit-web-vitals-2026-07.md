# Audit Web Vitals / PageSpeed — juillet 2026

_Date : 16/07/2026. Sources : [analyse PageSpeed Insights partagée](https://pagespeed.web.dev/analysis/https-www-vie-publique-sn/kemtc5ez17?form_factor=mobile) (données terrain CrUX 16/06 → 13/07/2026) + trace de performance locale (Chrome DevTools MCP, émulation mobile 412px, CPU ×4, Slow 4G) + vérification du HTML SSR de prod._

> Les **pistes de correction détaillées** vivent dans [`audit-complet-2026-07.md`](./audit-complet-2026-07.md) (items PERF-x) — ce doc est la **baseline chiffrée** à re-mesurer après chaque fix, comme les KPI Cloudflare dans [`../infra/cloudfare.md`](../infra/cloudfare.md).

## 1. KPI terrain (CrUX, p75, vrais utilisateurs — la référence Google)

### Mobile — page d'accueil ❌ Core Web Vitals ÉCHOUÉS

| KPI | p75 | Seuil « bon » | Statut | % bon / moyen / mauvais |
| --- | --- | --- | --- | --- |
| **LCP** | **3,6 s** | ≤ 2,5 s | 🔴 | 53 / 25 / 22 |
| **INP** | **236 ms** | ≤ 200 ms | 🟠 | 69 / 20 / 11 |
| **CLS** | **0,16** | ≤ 0,10 | 🟠 | 55 / 33 / 12 |
| FCP | 3,6 s | ≤ 1,8 s | 🔴 | 37 / 28 / 35 |
| TTFB | 1,3 s | ≤ 0,8 s | 🟠 | 56 / 28 / 16 |

### Desktop — page d'accueil ❌ (LCP limite) / Origine desktop ✅

| KPI | Page (p75) | Origine (p75) |
| --- | --- | --- |
| LCP | 2,6 s 🟠 | 2,1 s 🟢 |
| INP | 81 ms 🟢 | 72 ms 🟢 |
| CLS | 0,03 🟢 | 0,08 🟢 |
| FCP | 2,3 s 🟠 | 1,9 s 🟠 |
| TTFB | 1,1 s 🟠 | 0,7 s 🟢 |

**Lecture** : le problème est **mobile** (le public cible, réseaux SN). Desktop passe presque. Les 3 leviers terrain : **FCP/LCP mobile 3,6 s** (rendu initial trop tard), **TTFB 1,3 s** (HTML non caché en edge — `Cf-Cache-Status: DYNAMIC`), **CLS 0,16** (shifts tardifs non visibles en lab, cf. §2).

## 2. Diagnostic lab (trace locale mobile, CPU ×4 + Slow 4G)

- **LCP lab = 1 659 ms dont 1 517 ms (91 %) de _render delay_** — le LCP est le `<h1>` texte, présent dans le HTML SSR : ce n'est PAS le serveur (TTFB lab 142 ms), c'est le **chemin critique de rendu** qui retarde la peinture.
- **Chaîne critique confirmée dans le HTML de prod** : `HTML → entry.css → @import fonts.googleapis.com (Poppins 5 graisses) → fonts.gstatic.com`, **zéro preconnect**. C'est exactement [PERF-2](./audit-complet-2026-07.md#perf-2--fonts-google-en-import-bloquant). Latence max de chaîne mesurée : **1 970 ms**.
- **~20 chunks JS en modulepreload** sur le chemin critique (bundle d'entrée lourd → PERF-3 Firebase, PERF-8 carto, PERF-9 Shiki).
- **Tiers sur le main thread** : Google Tag Manager **328 ms**, Facebook **108 ms** (contribue à l'INP mobile 236 ms sur des CPU modestes).
- **CLS lab ≈ 0,01 vs terrain 0,16** : les shifts se produisent chez les vrais utilisateurs (fonts qui swappent sur réseau lent, contenu async qui pousse la mise en page). Piste : `size-adjust`/fallback font metrics une fois les fonts self-hostées, et vérifier les blocs async de la home (skeletons dimensionnés).

## 3. Pistes priorisées (impact terrain estimé)

| # | Action | KPI visé | Réf |
| --- | --- | --- | --- |
| 1 | **Self-host des fonts** (`@nuxt/fonts`, 3 graisses max) — tue l'`@import` bloquant et le swap tardif | FCP/LCP −300 à 800 ms, CLS | PERF-2 |
| 2 | **SWR / cache edge du HTML** des pages stables (home, listings) — aujourd'hui `Cf-Cache-Status: DYNAMIC` sur `/` | TTFB 1,3 s → <0,5 s | PERF-7 |
| 3 | **Dégraisser le bundle d'entrée** (Firebase lazy, d3 mort, pdfjs dynamique) | LCP render delay, INP | PERF-3/4/5 |
| 4 | **Différer GTM/Facebook** (chargement à l'interaction ou `requestIdleCallback`) | INP 236 ms → <200 ms | — |
| 5 | Images CMS en WebP/AVIF | LCP pages détail | PERF-6 |
| 6 | Réactiver une mesure RUM (web-vitals → GA4) pour suivre ces KPI en continu | tous | PERF-11 |

## 4. Re-mesure

> Protocole récurrent complet (cadences, checklist mensuelle, journal des relevés) :
> [`../infra/mesure-performance.md`](../infra/mesure-performance.md) — **c'est là que vivent les
> relevés successifs**, ce doc-ci reste la baseline du 16/07/2026.

- **Terrain (CrUX)** : fenêtre glissante de 28 j → attendre ~3-4 semaines après un fix pour voir l'effet p75. Relancer sur <https://pagespeed.web.dev> (ou API `runPagespeed` — ⚠️ le quota anonyme partagé est souvent épuisé en journée, prévoir une clé API Google si on automatise).
- **Lab (immédiat)** : trace Chrome DevTools MCP en émulation mobile (CPU ×4, Slow 4G) — vérifier que le _render delay_ LCP chute et que `fonts.googleapis.com` disparaît de la chaîne critique.
- Vérif rapide de la chaîne fonts : `curl -s https://www.vie-publique.sn/_nuxt/entry.*.css | grep -c '@import'` doit tomber à 0 après le fix PERF-2.

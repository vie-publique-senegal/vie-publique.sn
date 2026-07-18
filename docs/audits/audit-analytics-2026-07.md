# Baseline Analytics (GA4 + Search Console) — juillet 2026

> **Rôle** : photo de référence de l'audience (GA4, **9→15/07/2026**, propriété `439183057`)
> et de la visibilité Google (Search Console, **16/06→13/07/2026**, propriété
> `sc-domain:vie-publique.sn`) pour mesurer l'effet des correctifs au fil du temps.
> À re-relever **toutes les 3-4 semaines** ou après un correctif majeur.
> Pendant edge/CDN : section KPI de [`infra/cloudfare.md`](../infra/cloudfare.md).

## Méthode de relevé

**GA4** — MCP `google-analytics` (setup : [`guidelines/mcp-servers.md`](../guidelines/mcp-servers.md) §4),
`run_report` sur `property_id: 439183057`, plage 7 jours glissants :

1. **Trafic/jour** : dimension `date`, métriques `activeUsers, sessions, screenPageViews` ;
2. **Canaux** : dimension `sessionDefaultChannelGroup`, métriques `sessions, activeUsers` ;
3. **Moteurs organiques** : dimension `sessionSource` filtrée `sessionDefaultChannelGroup = Organic Search` ;
4. **Sources IA** : idem filtré `= AI Assistant` ;
5. **Top pages** : dimension `pagePath`, métriques `screenPageViews, activeUsers`.

**Search Console** — pas de MCP officiel : API REST avec le **même service account**
(`ga-mcp-readonly@vie-publique-sn`, ajouté en « Utilisateur restreint » dans GSC, scope OAuth
`webmasters.readonly`, API *Search Console* activée sur le projet GCP). Endpoint
`POST /webmasters/v3/sites/sc-domain%3Avie-publique.sn/searchAnalytics/query`, plage **28 jours
finissant à J-3** (les données GSC ont ~2-3 jours de retard) :

1. **Totaux/jour** : `dimensions: ["date"]` ;
2. **Top requêtes** : `dimensions: ["query"], rowLimit: 10` ;
3. **Top pages** : `dimensions: ["page"], rowLimit: 10`.

**Bing Webmaster Tools** — API JSON avec clé (`bing_api_key` dans le `.env` local, non committé ;
clé générée dans Bing WT → Settings → API access). Endpoints
`https://ssl.bing.com/webmaster/api.svc/json/<Méthode>?apikey=…&siteUrl=https://vie-publique.sn/` :

1. **`GetRankAndTrafficStats`** : clics/impressions par jour ;
2. **`GetCrawlStats`** : pages crawlées, codes HTTP vus par bingbot et surtout **`InIndex`**
   (nombre de pages dans l'index Bing — LE KPI de la dédup BING-1) ;
3. **`GetQueryStats` / `GetPageStats`** : top requêtes/pages (lignes par période, à agréger).

## Baseline 09→15/07/2026

### Trafic quotidien

- **780 à 2 760 visiteurs actifs/jour** (moyenne ~1 500, creux le week-end) ;
- ~12 700 sessions et ~36 000 pages vues sur 7 jours ;
- Croisement Cloudflare : ~10k « uniques »/jour au edge vs ~1,5k ici → **~85 % du trafic
  edge est du bot** ; GA4 est propre (le crawl HeadlessChrome massif du 14/07 n'y apparaît pas).

### Canaux d'acquisition (sessions / 7 j)

| Canal | Sessions | Part | Lecture |
| --- | --- | --- | --- |
| Organic Search | 8 414 | **66 %** | Moteur principal du site |
| Direct | 1 626 | 13 % | — |
| Unassigned | 1 562 | 12 % | ⚠️ À investiguer (tagging/referrer) |
| **AI Assistant** | 547 | 4,3 % | GEO/llms.txt : en faire un axe de suivi |
| Organic Social | 360 | 2,8 % | Angle mort — checklist diffusion RSS/réseaux à dérouler |
| Referral | 102 | 0,8 % | — |
| Email | 64 | 0,5 % | — |

### Moteurs organiques — **baseline du suivi BING-1/BING-7**

| Moteur | Sessions / 7 j | Part organique |
| --- | --- | --- |
| Google | 7 933 | 95,4 % |
| **Bing** | **370** | **4,4 %** |
| Yahoo / DDG / Ecosia / Qwant | ~40 | < 0,5 % |

> Les fixes BING-1 (301 partout, terminés le 14/07) et la décision BING-7 (archives.sn)
> doivent se lire ICI : **si Bing dépasse durablement ~400-450 sessions/sem, la récupération
> est en cours.** Re-mesurer à partir de mi-août 2026.

### Sources IA (sessions / 7 j)

ChatGPT **519** (95 %) · Perplexity 10 · Gemini 9 · Claude 5 · Copilot 4.

### Top pages (7 j)

| Page | Vues | Visiteurs | Lecture |
| --- | --- | --- | --- |
| `/` | 4 450 | 1 637 | — |
| `/documents/journal-officiel-senegal` | 3 538 | 448 | **8 vues/visiteur = power users pro** → cible idéale RSS JO + notifications |
| `/documents/public` | 2 749 | 615 | — |
| `/recherche` | 2 601 | 315 | **~8 recherches/visiteur** → remonte la priorité du fix Typesense accents/synonymes (audit recherche 2026-07) |
| `/actualites` | 1 288 | 466 | — |
| `/dossiers/revision-constitution-senegal-2026` | 1 045 | 634 | Le format `/dossiers` prouve sa valeur sur l'actualité chaude |
| `/documents/13845/proposition-loi-17-2026-…` | 735 | 434 | — |
| `/documents/13846/projet-de-loi-15-2026-code-du-travail` | 613 | 305 | — |

## Baseline Search Console 16/06→13/07/2026 (28 j)

### Totaux

- **50 338 clics**, **1,29 M impressions**, CTR ~3,9 %, **position moyenne 5,6–6,4** ;
- ~1 000–2 400 clics/jour (creux le week-end, cohérent avec GA4).

### Top requêtes

| Requête | Clics | Impressions | Position |
| --- | --- | --- | --- |
| vie publique sn (marque) | 540 | 634 | **1,0** |
| revision constitution senegal | 482 | 1 665 | 1,8 |
| journal officiel senegal | 280 | 511 | 2,4 |
| abdou mbow | 215 | 3 786 | 4,6 |
| **révision constitutionnelle** | 125 | **14 230** | 5,5 |

> 💡 **Opportunité n°1** : « révision constitutionnelle » = 14 230 impressions pour 125 clics
> (CTR 0,9 %) en position 5,5. Chaque place gagnée sur cette requête vaut des centaines de
> clics/mois — travailler le title/snippet du dossier et sa fraîcheur.

### Top pages

| Page | Clics | Impressions | Position |
| --- | --- | --- | --- |
| `/dossiers/revision-constitution-senegal-2026` | **5 228** | 73 281 | 3,5 |
| `/documents/13845/proposition-loi-17-2026-…` | 2 507 | 32 160 | 4,0 |
| `/documents/13846/…code-du-travail-senegal` | 1 545 | 11 542 | 3,8 |
| `/` | 1 127 | 22 949 | 7,9 |
| `/docs/…reglement-interieur…pdf` (PDF direct) | 695 | 6 484 | 4,7 |

> Le format **`/dossiers` est le champion SEO du site** : la page dossier fait 2× les clics du
> document brut sur le même sujet. Les **PDF rankent aussi en direct** dans Google (à garder en
> tête pour la décision BING-7 / archives.sn).

## Baseline Bing Webmaster Tools — relevée le 16/07/2026

### Trafic

- **~310 clics/sem** (55-63/j en semaine), ~1 000 impressions/j ;
- **1 308 clics cumulés sur 485 jours** : la quasi-totalité date des ~4 dernières semaines →
  confirme l'« invisibilité Bing » janvier→mi-juin (BING-7) et la **récupération en cours
  depuis le 17 juin**. Requêtes dominées par la marque (« vie publique sénégal ») — le trafic
  documentaire n'est pas encore revenu (il est encore sur archives.sn).

### Crawl / index — les KPI de la dédup BING-1

| KPI (jour du relevé) | Valeur | Lecture |
| --- | --- | --- |
| **`InIndex`** | **23 886 pages** | ~2× les ~12,6k URLs réelles = la duplication www/non-www pas encore purgée. **Doit fondre vers ~12-13k** à mesure que Bing digère les 301 (fixes des 02 et 14/07) |
| `Code301` vu par bingbot | ~450/j | Bing rencontre bien les redirections permanentes ✅ |
| `Code302` | **0** | Plus aucune redirection temporaire ✅ (avant les fixes, c'était la cause de BING-1) |
| `Code4xx` | 3 100-5 200/j | ⚠️ Élevé — bingbot crawle beaucoup d'URLs mortes (vieux slugs ? spam /recherche ?) → à investiguer dans le dashboard Bing WT |
| `Code5xx` | ~6/j | Sain |
| Pages crawlées | 3 500-7 200/j | — |

## Baseline Backlinks — relevée le 17/07/2026 (scan Ahrefs gratuit)

| KPI | Valeur | Détail |
| --- | --- | --- |
| Groupes de liens entrants | **190** | scan gratuit Ahrefs Site Explorer (`http+https`, subdomains) |
| Meilleurs référents | **fr.wikipedia.org (DR 97)** | articles _Dakar_ et _Sine Saloum_, en **référence bibliographique** |
| Pages ciblées | `/documents/4884/JO-3656-du-19-janvier-1964`, `/documents/7565/loi-n-84-22…` | le corpus documentaire attire les citations |
| Nature | `NOFOLLOW` (systématique sur Wikipédia) | pas de jus direct, mais **signal d'entité/E-E-A-T** — synergie avec le `sameAs` Wikidata (Q140571616) posé le 16/07 |

**Sources de relevé (cadence trimestrielle — les backlinks bougent lentement)** :

1. **Ahrefs Webmaster Tools (gratuit, à activer)** : vérifier vie-publique.sn via GSC/DNS sur
   <https://ahrefs.com/webmaster-tools> → rapport backlinks complet du site sans abonnement
   (l'abonnement payant ne sert qu'à analyser les concurrents — pas nécessaire).
2. **GSC → Liens** (UI uniquement — ce rapport n'existe PAS dans l'API Search Console, aucun
   outil ne peut le requêter) : échantillonné et en retard, mais gratuit.
3. **Bing Webmaster Tools** : rapport backlinks gratuit, accessible par API (utilisable dans
   les relevés automatisés).

**Lecture stratégique** : être cité en source par Wikipédia valide la stratégie « URLs stables +
textes officiels de référence » (conventions d'URL CLAUDE.md) et pèse dans le dossier BING-7
(archives.sn) : c'est vie-publique.sn que Wikipédia référence. Encourager ces citations
(exactitude des métadonnées de documents, permanence des URLs) plutôt que chercher des liens.

## Checklist des prochains relevés

- [ ] **Mi-août 2026** : sessions Bing (attendu : > 400-450/sem si BING-1/7 portent leurs fruits) ;
- [ ] Part du canal **AI Assistant** (croissance attendue ; ChatGPT restera-t-il ~95 % ?) ;
- [ ] `/recherche` après le fix Typesense (le volume d'usage doit se maintenir, la satisfaction
      se lira dans les vues/visiteur des pages de destination) ;
- [ ] **Organic Social** après déroulé de la checklist diffusion RSS (`docs/modules/rss/flux-rss.md`) ;
- [ ] Élucider le canal **Unassigned** (12 %) ;
- [ ] Ratio GA4 vs uniques Cloudflare (part de bots stable ?) ;
- [ ] **GSC** : clics/28 j (baseline 50,3k) et position moyenne (5,6-6,4) — effet attendu des
      fixes JSON-LD/SEO et de la fraîcheur des dossiers ;
- [ ] **GSC** : position de « révision constitutionnelle » (baseline 5,5 — l'opportunité n°1) ;
- [ ] **Bing `InIndex`** : baseline **23 886** → attendu **~12-13k** une fois les 301 digérés
      (si stable > 20k à mi-août, investiguer) ;
- [ ] **Bing 4xx crawlés** : baseline 3-5k/j — identifier la source dans Bing WT ;
- [ ] **Bing clics/sem** : baseline ~310 — la vraie récupération se lira sur les requêtes
      **documentaires** (hors marque), aujourd'hui captées par archives.sn (décision BING-7).
- [ ] **Backlinks (trimestriel, prochain ~octobre 2026)** : baseline 190 groupes (Ahrefs) —
      activer Ahrefs Webmaster Tools gratuit d'ici là ; surveiller de nouveaux référents de
      presse/institutionnels.

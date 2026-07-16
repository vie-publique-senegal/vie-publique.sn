# Baseline Analytics GA4 — juillet 2026

> **Rôle** : photo de référence de l'audience (relevée les **9→15 juillet 2026**, propriété GA4
> `439183057`) pour mesurer l'effet des correctifs au fil du temps. À re-relever **toutes les
> 3-4 semaines** ou après un correctif majeur, via le MCP `google-analytics`
> (setup : [`guidelines/mcp-servers.md`](../guidelines/mcp-servers.md) §4).
> Pendant edge/CDN : section KPI de [`infra/cloudfare.md`](../infra/cloudfare.md).

## Méthode de relevé (MCP)

`run_report` sur `property_id: 439183057`, plage 7 jours glissants :

1. **Trafic/jour** : dimension `date`, métriques `activeUsers, sessions, screenPageViews` ;
2. **Canaux** : dimension `sessionDefaultChannelGroup`, métriques `sessions, activeUsers` ;
3. **Moteurs organiques** : dimension `sessionSource` filtrée `sessionDefaultChannelGroup = Organic Search` ;
4. **Sources IA** : idem filtré `= AI Assistant` ;
5. **Top pages** : dimension `pagePath`, métriques `screenPageViews, activeUsers`.

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

## Checklist des prochains relevés

- [ ] **Mi-août 2026** : sessions Bing (attendu : > 400-450/sem si BING-1/7 portent leurs fruits) ;
- [ ] Part du canal **AI Assistant** (croissance attendue ; ChatGPT restera-t-il ~95 % ?) ;
- [ ] `/recherche` après le fix Typesense (le volume d'usage doit se maintenir, la satisfaction
      se lira dans les vues/visiteur des pages de destination) ;
- [ ] **Organic Social** après déroulé de la checklist diffusion RSS (`docs/modules/rss/flux-rss.md`) ;
- [ ] Élucider le canal **Unassigned** (12 %) ;
- [ ] Ratio GA4 vs uniques Cloudflare (part de bots stable ?).

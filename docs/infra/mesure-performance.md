# Protocole de mesure performance — cycle « mesurer → corriger → re-mesurer »

_Créé le 16/07/2026. Doc canonique du suivi perf. Baseline chiffrée :
[`../audits/audit-web-vitals-2026-07.md`](../audits/audit-web-vitals-2026-07.md).
Pistes de correction : items PERF de [`../audits/audit-complet-2026-07.md`](../audits/audit-complet-2026-07.md)._

## 1. Principe

On ne « fait pas un audit » une fois : on suit une **boucle**.

```text
Baseline (terrain CrUX + lab) ──► Fix (1 item PERF à la fois)
        ▲                                   │
        │                          Vérif lab immédiate (local)
        │                                   │
   Relevé J+28 (CrUX)  ◄────────── Déploiement prod
```

- **Lab** (trace locale) = effet **immédiat** d'un fix, sur une machine/un réseau contrôlés.
- **Terrain** (CrUX) = la vérité Google (Core Web Vitals, SEO), mais fenêtre glissante de
  **28 jours** → un fix déployé n'est pleinement visible qu'au bout d'un mois.
- Ne jamais conclure sur le lab seul (cf. CLS : 0,01 en lab vs 0,16 terrain).

## 2. Les sources et leur cadence

| Source | Quoi (KPI) | Cadence | Comment | Où noter |
| --- | --- | --- | --- | --- |
| **PageSpeed Insights / CrUX** | LCP, INP, CLS, FCP, TTFB p75 (mobile ET desktop, page `/` + origine) | **Mensuel** + J+28 après chaque fix perf déployé | <https://pagespeed.web.dev> sur `https://www.vie-publique.sn` ; ⚠️ l'API `runPagespeed` anonyme est souvent en quota 429 → utiliser le site (ou une clé API Google si on automatise) | §4 ci-dessous |
| **Trace lab locale** | LCP breakdown (render delay !), chaîne réseau critique, main thread des tiers, CLS lab | **Avant/après chaque fix perf**, en local puis sur prod | MCP Chrome DevTools : `emulate` (412px mobile, CPU ×4, Slow 4G) puis `performance_start_trace` | comparaison dans la PR du fix |
| **Cloudflare** | Cache hit ratio (≥ 75 %), bande passante origine, requêtes/j, menaces WAF, santé edge (301, HIT, HSTS, h3) | **Hebdo** (plan Free = fenêtre courte) | MCP `cloudflare-graphql` (requête toute prête) + batterie `curl` — les deux dans [`cloudfare.md`](./cloudfare.md) § « KPI à suivre » | [`cloudfare.md`](./cloudfare.md) |
| **GA4** | Visiteurs, engagement, pages d'entrée, devices (part mobile → pondère la prio perf mobile) | **Mensuel** | MCP GA (⚠️ ADC Google à finaliser) ou dashboard GA4 ; croiser avec « visiteurs uniques » Cloudflare (GA ne voit pas les bots) | relevé mensuel §4 |
| **Google Search Console** | Rapport « Signaux Web essentiels » (groupes d'URLs Bon/À améliorer/Mauvais), couverture d'indexation | **Mensuel** | GSC → Expérience → Signaux Web essentiels (mobile d'abord) | relevé mensuel §4 |
| **Sentry** | Nouvelles erreurs / régressions après déploiement | **Continu** (alertes) + revue lors du relevé mensuel | MCP `sentry` ou dashboard — périmètre erreurs uniquement ([`sentry.md`](./sentry.md)) | issues Sentry |
| **Uptime Kuma** | Disponibilité, latence des sondes | **Continu** (alertes) | kuma.vpsn.cloud ([`monitoring.md`](./monitoring.md)) | — |

> **RUM actif : Cloudflare Web Analytics** (découvert déjà en place le 16/07/2026 — beacon
> injecté par le proxy, invisible en curl). Dashboard : zone Cloudflare → Analytics → Web
> analytics. C'est la source la plus rapide entre deux fenêtres CrUX : LCP/INP/CLS p75 en
> quasi temps réel, ventilés par URL/navigateur/pays, avec **Debug View** qui nomme les
> éléments fautifs (c'est lui qui a révélé PERF-12, les images rich text non optimisées).
> L'ajouter au relevé **hebdo** (avec les KPI Cloudflare §2) : % bon LCP/INP/CLS + p75.
> ⚠️ Plan Free = rétention courte : relever régulièrement, ne pas espérer d'historique long.

## 3. La session d'audit mensuelle (~30 min, checklist)

1. **PageSpeed** mobile + desktop sur `/` → relever les 5 KPI p75 dans le tableau §4.
2. **GSC → Signaux Web essentiels** : nb d'URLs mobiles « Mauvais / À améliorer » (et le motif
   dominant : LCP ? CLS ?).
3. **Cloudflare** (MCP GraphQL) : cache hit ratio, requêtes/j, menaces — comparer à la baseline
   de [`cloudfare.md`](./cloudfare.md) ; investiguer tout pic (cf. précédent HeadlessChrome Azure).
4. **GA4** : tendance visiteurs + part mobile.
5. **Sentry** : nouvelles issues non triées ?
6. Reporter le relevé dans §4, cocher/décocher les PERF-x dans
   [`audit-complet-2026-07.md`](../audits/audit-complet-2026-07.md), décider du **prochain fix**
   (un seul à la fois).

## 4. Journal des relevés (terrain, mobile `/` — p75 CrUX)

> Ajouter une ligne par relevé. Baseline détaillée (desktop, %, lab) :
> [`audit-web-vitals-2026-07.md`](../audits/audit-web-vitals-2026-07.md).

| Date | LCP | INP | CLS | FCP | TTFB | CWV | Fixs déployés depuis le relevé précédent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 16/07/2026 | 3,6 s 🔴 | 236 ms 🟠 | 0,16 🟠 | 3,6 s 🔴 | 1,3 s 🟠 | ❌ | — (baseline) |

> **Déployés le 16/07/2026** (à créditer au relevé de mi-août) : PERF-2 (suppression `@import`
> fonts — vérifié : 0 réf. Google Fonts en prod), gtag/pixel FB à l'idle (vérifié : script hors
> HTML initial, `dataLayer` alimenté à l'idle ; pixel FB plus chargé du tout — son ID était
> vide, il tournait à vide), SWR HTML PERF-7 (vérifié : TTFB `/` 312 ms → **111 ms** dès le
> 2ᵉ hit, HTML identique, pagination `?page=` disjointe), QUAL-8 annuaire → Directus.
> Attendu au prochain relevé : FCP/LCP mobile nettement sous 3 s, TTFB ≤ 0,8 s, INP ≤ 200 ms.

## 5. Protocole avant/après pour CHAQUE fix perf

1. **Avant** : trace lab locale sur la page cible (mobile, CPU ×4, Slow 4G) → noter LCP,
   render delay, chaîne critique.
2. Implémenter le fix (1 item PERF par PR).
3. **Après (local)** : `npm run build` + `node .output/server/index.mjs`, re-tracer → l'effet
   attendu doit être visible (ex. PERF-2 : `fonts.googleapis.com` disparaît de la chaîne
   critique, render delay en baisse).
4. Déployer, re-tracer sur **prod** (les headers edge/CDN changent le résultat).
5. **J+28** : relevé CrUX (§4) — c'est lui qui valide (ou pas) le fix.

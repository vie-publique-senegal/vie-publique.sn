# Configuration Cloudflare - Vie Publique Sénégal

_Date : 09/07/2026_

## Objectifs

- Améliorer les performances du site
- Renforcer la sécurité
- Conserver un excellent référencement (SEO)
- Permettre l'accès aux moteurs IA (ChatGPT, Gemini, Copilot, Claude, Perplexity...)
- Limiter les faux positifs et éviter de bloquer des utilisateurs légitimes

---

# DNS

## Nameservers

**Configuration retenue**

```
heidi.ns.cloudflare.com
ryan.ns.cloudflare.com
```

**Statut**

✅ Migration OVH → Cloudflare terminée.

---

## DNSSEC

**Configuration retenue**

```
Désactivé
```

**Pourquoi**

- recommandé lors de la migration
- évite les erreurs de validation DNSSEC
- pourra être réactivé ultérieurement directement depuis Cloudflare

---

# SSL / TLS

## Encryption mode

**Configuration retenue**

```
Full (Strict)
```

**Pourquoi**

- chiffrement de bout en bout
- validation du certificat de l'origine
- niveau de sécurité recommandé en production

---

## Edge Certificate

Configuration automatique Cloudflare.

```
Universal SSL
```

- certificat automatique
- renouvellement automatique
- couvre :

```
vie-publique.sn
*.vie-publique.sn
```

---

# Cache

## Caching Level

```
Standard
```

Conserve le comportement recommandé par Cloudflare.

---

## Browser Cache TTL

```
4 heures
```

Laisse le navigateur conserver les ressources statiques.

---

## Development Mode

```
Désactivé
```

À activer uniquement lors du développement.

---

## Always Online

```
Désactivé
```

Pas nécessaire actuellement.

---

## Cache Rules

**`cache-images-pdf`** (déployée le 14/07/2026) :

```
Si : URI Path wildcard /cms/* OU URI Path wildcard /docs/*
Alors : Eligible for cache (Edge TTL non défini = respecte le Cache-Control de l'origine)
```

Pourquoi : Cloudflare ne cache par défaut que les URLs **avec extension de fichier
connue**. Les images CMS (`/cms/<uuid>`, sans extension) restaient en `DYNAMIC` —
chaque affichage traversait Coolify → proxy Nitro → Directus, malgré le
`Cache-Control: public, max-age=2592000` déjà envoyé. Les PDF (`/docs/**.pdf`)
étaient déjà cachés grâce à leur extension ; la condition `/docs/*` est un filet
pour d'éventuels fichiers sans extension.

⚠️ Ne PAS élargir à `/medias/*` : ce sont des **pages HTML** (annuaire des médias),
pas des assets.

Vérifié le 14/07/2026 : `/cms/<uuid>` passe de `DYNAMIC` à `MISS` → `HIT`.

```bash
curl -sI "https://www.vie-publique.sn/cms/<uuid>" | grep -i cf-cache-status
```

---

# Sécurité

## WAF

```
Activé
```

Utilisation des règles managées Cloudflare.

Objectifs :

- SQL Injection
- XSS
- scanners
- bots malveillants
- exploits connus

---

## DDoS Protection

```
Activée
```

Protection automatique Cloudflare.

---

## Bot Fight Mode

```
OFF
```

Pourquoi :

- éviter les faux positifs
- les règles WAF sont suffisantes actuellement

À réévaluer si du trafic malveillant apparaît.

---

# AI Crawl Control

## Block AI Bots

Configuration retenue

```
Do not block (allow crawlers)
```

---

## Mixed purpose crawlers

Configuration retenue

```
Mixed purpose crawlers will continue to be allowed
```

---

### Pourquoi

Vie Publique est une plateforme de diffusion d'information publique.

Objectifs :

- indexation Google
- Google AI
- Gemini
- ChatGPT
- Claude
- Copilot
- Perplexity
- Facebook / WhatsApp / LinkedIn Preview

Le bénéfice de visibilité est largement supérieur au coût du crawl.

---

# Analytics

## Activés

- HTTP Analytics
- Security Analytics
- AI Crawl Analytics
- Performance Analytics

---

# Résultats observés après migration

## SSL

✅ Certificat Cloudflare actif

---

## HTTPS

✅ Full (Strict)

---

## Always Use HTTPS

✅ **Activé** (14/07/2026 — SSL/TLS → Edge Certificates).

Le saut `http→https` est servi en **301 par le edge Cloudflare** : les requêtes HTTP
n'atteignent plus l'origine. Remplace le 307/302 temporaire de Traefik/Coolify — c'était
le dernier résidu de l'issue SEO **BING-1** (Bing traite les redirections temporaires
sans transférer les signaux). Chaîne complète documentée dans
[`docs/guidelines/dns-redirections-domaines.md`](../guidelines/dns-redirections-domaines.md).

---

## DNS

✅ Propagation terminée

---

## Redirection

```
https://vie-publique.sn
    ↓
https://www.vie-publique.sn
```

Fonctionnelle.

---

## Sous-domaines

Validation :

- www
- cms
- admin
- n8n
- autres sous-domaines

Tous opérationnels.

---

# KPI à suivre

## Santé edge — baseline du 14/07/2026 (vérifiable par curl, sans dashboard)

| Contrôle | Valeur au 14/07/2026 | Attendu |
| --- | --- | --- |
| `http://vie-publique.sn` | **301** → `https://vie-publique.sn/` (servi au edge) | 301 (jamais 302/307) |
| `https://vie-publique.sn` | **301** → `https://www.vie-publique.sn/` | 301 |
| HTML `/` | `DYNAMIC` | `DYNAMIC` (normal : pas de cache HTML, SWR Nitro à l'origine) |
| Image `/cms/<uuid>` | **HIT** | HIT (via Cache Rule `cache-images-pdf`) |
| PDF `/docs/**.pdf` | **HIT** (Age ~20 h) | HIT |
| Asset `/_nuxt/*.js` | **HIT** (Age ~5 h) | HIT |
| HSTS | `max-age=31536000; includeSubDomains` | présent |
| HTTP/3 | `alt-svc: h3` | présent |

Batterie de re-contrôle (une URL de chaque famille suffit) :

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" "http://vie-publique.sn/"
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" "https://vie-publique.sn/"
curl -sI "https://www.vie-publique.sn/" | grep -iE 'cf-cache-status|alt-svc|strict-transport'
curl -sI "https://www.vie-publique.sn/cms/<uuid-image>" | grep -i cf-cache-status
curl -sI "https://www.vie-publique.sn/docs/<uuid>/<nom>.pdf" | grep -i cf-cache-status
```

## KPI dashboard / API (fenêtre courte sur plan Free → relever régulièrement)

> Le MCP `cloudflare-dns-analytics` ne lit PAS ces métriques (DNS uniquement). Le suivi
> depuis Claude Code passe par le serveur MCP officiel **`cloudflare-graphql`**
> (déclaré dans `.mcp.json` — OAuth via `/mcp` requis), qui interroge l'API GraphQL
> Analytics. Dashboard : zone → Analytics & Logs.

| KPI | Où | Baseline (10→14/07/2026, via MCP GraphQL) | Interprétation |
| --- | --- | --- | --- |
| **Cache hit ratio** (requêtes) | GraphQL / Analytics → Traffic | **53–63 %/j avant la Cache Rule** ; **75 %** le 14/07 (jour du déploiement, journée partielle) | Doit se stabiliser ≥ 75 % ; une rechute = règle cassée ou nouvelle famille d'URLs non cachée |
| **Bande passante servie par CF** | GraphQL / Analytics → Traffic | 64–74 %/j en cache ; volume total **77–200 GB/j**, dont **22–45 GB/j restant sur l'origine** | Mesure la charge épargnée à Coolify ; l'egress origine doit baisser avec la règle images |
| **Requêtes totales / jour** | GraphQL / Analytics | **~230k–440k/j** (pic à 584k le 14/07 en cours de journée) | Baseline de trafic ; pic anormal = crawl/attaque |
| **Visiteurs uniques / jour** | GraphQL / Analytics | **8,5k–10,4k/j** | Cohérence avec GA4 (qui ne voit pas les bots) |
| **Menaces bloquées (WAF)** | GraphQL (`threats`) / Analytics → Security | **0,6k–14,3k/j** — pic à 14 342 le 13/07 | Très variable ; surveiller les faux positifs et investiguer les pics (13/07 ?) |
| **Top crawlers IA** (ChatGPT-User, Claude SearchBot, PerplexityBot…) | AI Crawl Control (dashboard) | _à relever au dashboard_ | Confirmer que les bots IA autorisés consomment bien `llms.txt` et le contenu |

Requête GraphQL du relevé (à réutiliser tel quel au prochain check, via le MCP `cloudflare-graphql`) :

```graphql
query {
  viewer {
    zones(filter: { zoneTag: "bee4ae2dbd779242be2e6800d8830c83" }) {
      httpRequests1dGroups(limit: 7, filter: { date_geq: "<J-4>", date_leq: "<J>" }, orderBy: [date_ASC]) {
        dimensions { date }
        sum { requests cachedRequests bytes cachedBytes threats pageViews }
        uniq { uniques }
      }
    }
  }
}
```

---

# Optimisations prévues (phase 2)

- ✅ Cache Rules ciblées (fait 14/07/2026 : `cache-images-pdf`)
- Rate Limiting API
- ✅ Cache des PDF (déjà effectif par extension `.pdf`, vérifié HIT 14/07/2026)
- ✅ Optimisation des assets Nuxt (déjà effectif : `/_nuxt/*` HIT + immutable, vérifié 14/07/2026)
- ✅ Compression et cache des images (fait 14/07/2026 via la Cache Rule `/cms/*`)
- Firewall Rules personnalisées si nécessaire
- Monitoring des faux positifs WAF

---

# Décisions retenues

| Élément | Valeur |
|---------|--------|
| DNS | Cloudflare |
| DNSSEC | Désactivé |
| SSL | Full (Strict) |
| Universal SSL | ✅ |
| WAF | ✅ |
| DDoS | ✅ |
| Bot Fight Mode | OFF |
| AI Bots | Autorisés |
| Mixed Crawlers | Autorisés |
| Always Use HTTPS | ✅ (301 au edge, 14/07/2026) |
| Cache Rules | `cache-images-pdf` (`/cms/*` + `/docs/*`, 14/07/2026) |
| Browser Cache TTL | 4 h |
| Development Mode | OFF |
| Always Online | OFF |

---

## Prochaine étape

Laisser Cloudflare collecter des métriques pendant **48 à 72 heures**, puis analyser :

- efficacité du cache ;
- trafic IA ;
- blocs WAF ;
- éventuels faux positifs ;
- optimisation des règles de cache et de sécurité.

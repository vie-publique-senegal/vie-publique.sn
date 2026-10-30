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

## Certificats d'ORIGINE (ACME / Let's Encrypt) — incident 09/2026

> ⚠️ **Ne pas confondre deux certificats distincts.** L'**Edge Certificate** ci-dessus
> (navigateur ↔ Cloudflare) est géré et renouvelé par Cloudflare : il est presque toujours
> « Active ». Le **certificat d'origine** (Cloudflare ↔ serveur), lui, est émis par Let's Encrypt
> via Traefik sur chaque VPS. En **Full (strict)**, un certificat d'origine expiré = **erreur 526**
> alors que la page « Edge Certificates » reste verte. **Regarder l'edge ne diagnostique jamais une 526.**

### Règle de diagnostic (faire ceci AVANT toute hypothèse)

Interroger **l'origine en direct**, jamais via Cloudflare : sur un hôte protégé par Access, une
requête anonyme reçoit un 302 de connexion et n'atteint jamais le serveur — ni 526, ni information
utile. (IPs d'origine : Vaultwarden « Infra VP », jamais dans le repo.)

```bash
echo | openssl s_client -connect <IP_ORIGINE>:443 -servername <hote>.vie-publique.sn 2>/dev/null \
  | openssl x509 -noout -issuer -dates
```

Balayage de tous les hôtes d'un serveur (à relancer lors du prochain incident) :

```bash
check() { out=$(echo | openssl s_client -connect $2:443 -servername $1 2>/dev/null \
  | openssl x509 -noout -enddate -issuer 2>/dev/null)
  [ -z "$out" ] && { echo "$1 -> PAS DE REPONSE TLS"; return; }
  end=$(echo "$out" | grep notAfter | cut -d= -f2)
  echo "$1 -> expire dans $(( ($(date -d "$end" +%s) - $(date +%s)) / 86400 )) j ($end)"; }
check cms.vie-publique.sn <IP_PROD>
```

### Incident du 14/09/2026

`n8n.vie-publique.sn` en **526**. Cause : certificat d'origine Let's Encrypt **expiré le 13/09**,
émis le 15/06 et **jamais renouvelé depuis la mise derrière Cloudflare**. Le balayage du 18/09 a
révélé que le problème touchait **6 hôtes**, découverts par hasard — aucune alerte n'existait.

| Hôte | Serveur | État au 18/09/2026 |
| --- | --- | --- |
| `sign`, `pass` | PROD (Coolify) | ❌ expirés (01/09, 12/09) |
| `n8n` | VPS n8n | ❌ expiré (13/09) |
| `test` | PROD (Coolify) | ❌ expiré (06/09) — bloqué au edge (403), invisible |
| `admin`, `ragflow` | PROD (Coolify) | ❌ **certificat par défaut Traefik** (jamais obtenu / conteneur arrêté) |
| `changedetection` | VPS n8n | ⚠️ expire le 30/09 |
| `coolify` | PROD (Coolify) | ⚠️ expire le 11/10 |
| `cms`, `flowise`, `open-webui`, `search`, `v2`, `vie-publique.sn` | PROD (Coolify) | ✅ 41-63 j, renouvellement actif |

### Causes racines — différentes selon le serveur

1. **Serveur PROD (Coolify) — Cloudflare Access bloque la validation HTTP-01.**
   Corrélation nette : **tous** les hôtes SANS Access se renouvellent (`cms`, `search`, `v2`,
   `flowise`, `open-webui`, le site), **tous** ceux AVEC Access échouent (`pass`, `sign`,
   `coolify`). Access intercepte `/.well-known/acme-challenge/*` et sert sa page de connexion
   à Let's Encrypt. _(« Always Use HTTPS » n'est PAS en cause : Cloudflare exempte ce chemin
   de la redirection 301 — c'est bien pourquoi les hôtes sans Access fonctionnent.)_

2. **VPS n8n — `tlschallenge` incompatible avec le proxy.** Le `docker-compose` du template
   Hostinger utilise `--certificatesresolvers.mytlschallenge.acme.tlschallenge=true`
   (TLS-ALPN-01), qui exige une connexion TLS directe sur le port 443. Derrière le proxy
   Cloudflare, c'est Cloudflare qui répond : la validation est **structurellement impossible**,
   Access ou pas. Concerne `n8n` **et** `changedetection` (même resolver).

### Correctifs

| # | Action | Statut |
| --- | --- | --- |
| 1 | **Access → app `ACME challenge`** : destinations `.well-known/acme-challenge/*` sur `sign`, `pass`, `coolify`, `n8n` + politique **Bypass / Everyone**. Débloque HTTP-01 pour tous les hôtes protégés. Sans risque : ce chemin ne porte qu'un jeton temporaire. | ✅ 19/09/2026 |
| 2 | **VPS n8n → passer en DNS-01** (voir encadré) : répare `n8n` + `changedetection`. | ⏳ **À FAIRE** (échéance `changedetection` : 30/09) |
| 3 | Redéployer `pass` dans Coolify pour relancer la demande ; `sign` et `coolify` suivront seuls. | ⏳ à vérifier |
| 4 | `admin` / `ragflow` : lire les journaux ACME du proxy Coolify (`docker logs coolify-proxy 2>&1 \| grep -i acme`) — probablement conteneurs arrêtés. | ⏳ à faire |
| 5 | **Sondes d'expiration de certificat dans Uptime Kuma** (cf. [`monitoring.md`](./monitoring.md)) — le vrai correctif de fond : 6 certificats cassés découverts par hasard. | ⏳ à faire |

**DNS-01 sur le VPS n8n** — dans le service `traefik` du `docker-compose.yml`, remplacer la ligne
`tlschallenge` (garder le nom `mytlschallenge` pour ne pas toucher aux labels des services) :

```yaml
      - --certificatesresolvers.mytlschallenge.acme.dnschallenge=true
      - --certificatesresolvers.mytlschallenge.acme.dnschallenge.provider=cloudflare
      - --certificatesresolvers.mytlschallenge.acme.dnschallenge.resolvers=1.1.1.1:53,1.0.0.1:53
    environment:
      - CF_DNS_API_TOKEN=${CF_DNS_API_TOKEN}   # token « Edit zone DNS » limité à vie-publique.sn
```

Avec DNS-01, Traefik prouve la propriété du domaine via l'API Cloudflare : **rien ne transite par
le serveur**, donc ni le proxy ni Access ne peuvent casser le renouvellement. ⚠️ Figer aussi la
version de l'image (`image: traefik` sans tag) : les labels n8n utilisent `headers.SSLRedirect` /
`SSLHost` / `STSPreload`, **supprimés dans Traefik v3** — une montée de version implicite casserait
le routage.

### Contournement temporaire en place — À RETIRER

**Configuration Rule `n8n ssl`** : `(http.host eq "n8n.vie-publique.sn")` → **SSL: Full**
(déployée le 18/09/2026). Elle fait accepter un certificat expiré et rétablit le service, mais
**Cloudflare ne valide plus l'identité de l'origine** pour cet hôte. À supprimer dès le correctif 2
appliqué. Ne **jamais** régler ce contournement au niveau de la zone : les autres hôtes doivent
rester en Full (strict).

### Point de sécurité connexe

Les origines répondent **directement sur leur IP publique** (vérifié : `curl --resolve` sur l'IP
renvoie 200 sans passer par Cloudflare). Conséquence : **Cloudflare Access et le WAF sont
contournables** par qui connaît l'IP. Correctif : restreindre 80/443 aux
[plages IP Cloudflare](https://www.cloudflare.com/ips/) dans le pare-feu Hostinger (compatible
avec HTTP-01 comme avec DNS-01, la validation arrivant via Cloudflare ou par DNS). ⏳ à faire.

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
Respect Existing Headers
```

_(Changé le 17/07/2026 — était « 4 heures ».)_

**Pourquoi** : la valeur « 4 heures » **écrase les en-têtes `Cache-Control` envoyés par
l'origine** sur toutes les réponses cachables. Conséquence constatée : le `no-cache` posé
par Nitro sur `/sw.js` (routeRule) était réécrit en `max-age=14400` → chaque mise à jour du
service worker (donc de la PWA et des apps mobiles) mettait **jusqu'à 4 h** à atteindre les
utilisateurs. Avec « Respect Existing Headers », c'est l'application qui décide : assets
`/_nuxt/**` et images `/cms/**` gardent leur `max-age` long explicite (routeRules), `sw.js`
son `no-cache`, et le HTML n'est pas caché navigateur (correct pour du SSR/SWR).
⚠️ Corollaire : toute nouvelle ressource statique doit définir son `Cache-Control` côté
app (routeRules) — Cloudflare n'ajoute plus de valeur par défaut.

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

### Anomalies investiguées le 14-15/07/2026 (via MCP GraphQL)

- **Pic de menaces du 13/07 (14,3k)** : scan bloqué majoritairement **US** (11,8k) + FR (2,2k).
  Absorbé par le WAF, rien à faire — vérifier qu'il ne se répète pas chaque semaine.
- **Trafic du 14/07 (584k req, +30 % vs pic précédent)** : **311k requêtes** (53 % du jour)
  d'un **HeadlessChrome/146** depuis une flotte d'IPs **Azure** (40.x/20.x/4.x, ~6-7k req/IP,
  NON bloqué). Motif : rechargement complet des pages ~2 750×/j (mêmes assets statiques en
  boucle, tous servis en cache HIT → impact origine faible, ~1 requête HTML/30 s).
  **Ni Googlebot ni Bingbot** (eux se déclarent dans leur UA ; volumes normaux : 3,7k chacun).
  À surveiller ; si ça persiste ou pollue les stats (GA4/uniques), créer une règle WAF
  **Managed Challenge** sur `http.user_agent contains "HeadlessChrome"` — sans risque SEO :
  les crawlers légitimes n'envoient jamais cet UA.

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
| Browser Cache TTL | Respect Existing Headers (17/07/2026 — « 4 h » écrasait le no-cache de sw.js) |
| Development Mode | OFF |
| Always Online | OFF |
| Access — app `ACME challenge` | Bypass / Everyone sur `.well-known/acme-challenge/*` (19/09/2026) — sans elle, Access casse le renouvellement Let's Encrypt des hôtes protégés |
| Configuration Rule `n8n ssl` | SSL **Full** sur `n8n.vie-publique.sn` (18/09/2026) — ⚠️ **contournement temporaire**, à retirer après le passage en DNS-01 |

---

## Prochaine étape

Laisser Cloudflare collecter des métriques pendant **48 à 72 heures**, puis analyser :

- efficacité du cache ;
- trafic IA ;
- blocs WAF ;
- éventuels faux positifs ;
- optimisation des règles de cache et de sécurité.

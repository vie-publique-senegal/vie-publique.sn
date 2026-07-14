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

# KPI à suivre (48 à 72h)

## Performance

- Cache Hit Ratio
- Temps de réponse
- Bande passante économisée

---

## Sécurité

- WAF Blocks
- Faux positifs
- Pays d'origine
- Top IP
- Top Paths

---

## IA

- ChatGPT-User
- Googlebot
- Claude SearchBot
- BingBot
- PerplexityBot
- MistralAI-User

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

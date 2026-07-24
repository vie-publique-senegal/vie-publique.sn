# Backups des bases de données (Coolify → Cloudflare R2)

> Doc canonique des sauvegardes de bases planifiées dans Coolify, stockées sur Cloudflare R2.
> Mise en place initiale : 2026-07-23 sur l'instance de **test** (`coolify.vpsn.cloud`),
> à reproduire sur l'instance de **prod**.

## Pourquoi R2 (et pas un S3 AWS)

- **Compatible S3** : Coolify n'y voit qu'un endpoint S3 standard.
- **Egress gratuit** (restauration/rapatriement sans frais) + **10 Go/mois gratuits** en classe
  Standard — très au-delà du besoin (dump Directus de démo ≈ 1,3 Mo).
- Compte Cloudflare déjà en place (DNS/CDN du site) : rien de nouveau à facturer/gérer.
- Résilience : les dumps sortent de l'infra Hostinger — un crash serveur n'emporte pas les backups.

⚠️ Rester en classe **Standard** : les autres classes (Infrequent Access) ne comptent PAS dans le
tier gratuit et facturent dès le premier octet + frais de récupération.

## Mise en place (une fois par instance Coolify)

### 1. Côté Cloudflare (dashboard → R2)

1. Créer un bucket (test : `coolify-backups-test` ; prod : prévoir un bucket dédié, ex.
   `coolify-backups-prod`). Location `Automatic` (Western Europe), classe `Standard`.
2. R2 → **Manage API Tokens** → **Create Account API token** (⚠️ PAS « User API token » : un token
   utilisateur meurt avec le compte qui l'a créé ; le token Account est fait pour le
   service-à-service) :
   - Permissions : **Object Read & Write** ;
   - Scope : **Apply to specific buckets only** → le seul bucket de backup (jamais « all buckets ») ;
   - TTL : Forever.
3. Copier immédiatement (affichés une seule fois) : **Access Key ID**, **Secret Access Key**,
   endpoint `https://<account_id>.r2.cloudflarestorage.com`.

### 2. Côté Coolify (menu **S3 Storages** → + Add)

| Champ | Valeur |
| --- | --- |
| Endpoint | `https://<account_id>.r2.cloudflarestorage.com` |
| Bucket | nom du bucket R2 |
| Region | **`auto`** (⚠️ une vraie région AWS fait échouer la signature R2) |
| Access Key / Secret | ceux du token R2 |

Cliquer **Validate Connection** → le badge **« Usable »** doit apparaître.

### 3. Par base à sauvegarder (Projet → ressource → onglet **Backups**)

- Frequency : `0 3 * * *` (quotidien 3h UTC), Timeout 3600.
- **S3 Enabled** ✓ + sélectionner le storage ; laisser **Disable Local Backup** décoché
  (le local sert aux restaurations rapides, S3 à la sécurité).
- **Rétention — ne PAS laisser à 0** (0 = illimité → le disque local finit par se remplir) :
  **Local « Number of backups to keep » = 7**, **S3 = 30** (les autres champs à 0 ; la première
  limite atteinte déclenche le nettoyage).
- **Save** puis **Backup Now** → l'exécution doit passer en `success` avec la taille du dump.

Cas particulier : une base **interne à un stack service** (ex. le postgres du stack Directus)
se configure au même endroit (cliquer le conteneur base DANS le service). Ces bases ne sont PAS
visibles dans « Databases » ni via l'API `/api/v1/databases/*` (404) — c'est normal.

### 4. Vérifier (un backup jamais vérifié n'est pas un backup)

1. Coolify → Executions : `success` + taille plausible.
2. Dashboard Cloudflare → R2 → bucket → **Objects** : le fichier dump du jour est présent.
   (Le `success` Coolify couvre dump **et** upload S3, mais vérifier au moins la première fois.)
3. Idéalement, tester une restauration une fois (`pg_restore` dans un conteneur jetable).

## État des lieux

| Instance | Base | Backup | Depuis |
| --- | --- | --- | --- |
| TEST | postgres (postgis 16) du stack `directus-demo-kaddu` (projet KADDU SN, `admin-demo.kaddu.sn`) | ✅ quotidien 3h UTC → R2 `coolify-backups-test` | 2026-07-23 |
| TEST | postgres 17 standalone (projet Maodo TEST) | ❌ aucun | — |
| TEST | postgres du stack Directus TEST `cms.vpsn.cloud` | ❌ aucun (stack `degraded:unhealthy` au 2026-07-23) | — |
| PROD | — | **à faire** (reproduire cette doc) | — |

## Pièges connus

- **Region ≠ `auto`** → échec de signature S3 côté R2.
- **Rétention 0** = illimité (piège du formulaire Coolify, valeur par défaut).
- L'API/MCP Coolify ne permet PAS de vérifier la config backup d'une base interne à un service
  (endpoints backups = bases standalone uniquement) → vérification via l'UI.
- Les MCP Cloudflare du projet ne listent pas les objets R2 ; la vérification du contenu du
  bucket se fait au dashboard (ou métriques `r2OperationsAdaptiveGroups` via MCP
  cloudflare-graphql, souvent rate-limité).

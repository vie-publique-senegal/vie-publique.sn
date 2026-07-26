# Migration stockage assets : MinIO → Cloudflare R2 (INFRA-9)

> Chantier actif. Résout [INFRA-9](./securite-infra-2026-07.md) (MinIO figé) et
> [INFRA-2](./securite-infra-2026-07.md) (ports 9000/9001 exposés), et donne enfin une
> sauvegarde implicite des uploads (données hors infra Hostinger).
> Pièges R2 déjà documentés : [`backups-coolify.md`](./backups-coolify.md).

## Contexte / pourquoi

- **MinIO open-source est mort** : dernière release communautaire `RELEASE.2025-10-15`
  (patch CVE-2025-62506, High 8.1), dépôt GitHub **archivé le 25/04/2026**. Plus aucun
  patch de sécurité ne sortira (CVE-2026-33322 JWT/OIDC n'est corrigée que dans AIStor payant).
- Version en prod : `RELEASE.2025-04-22T22-12-26Z` → vulnérable à CVE-2025-62506
  (escalade de privilèges, nécessite des credentials valides + accès réseau — d'où l'urgence
  de dé-exposer les ports en attendant la migration).
- **Volume mesuré le 26/07/2026** (API Directus `files?aggregate`) : **16 821 fichiers,
  82,9 Go**. Coût R2 estimé : (82,9 − 10 gratuits) × 0,015 $ ≈ **1,1 $/mois**, egress gratuit.

## Pourquoi rien ne change côté site (invariants)

- Les URLs publiques (`/docs/<uuid>/<slug>.pdf`, `/cms/<uuid>?format=webp`) contiennent
  l'**UUID Directus** (`directus_files.id`), stocké en **PostgreSQL** — pas une référence MinIO.
- Le frontend ne parle jamais au stockage : proxy Nuxt → Directus `/assets/<uuid>` → driver S3.
  Changer le backend S3 est invisible pour Directus tant que les **clés d'objets**
  (`filename_disk`, ex. `3e5e1acb-….webp`) sont copiées à l'identique.
- Les transformations d'images (`?format=webp&quality=80`) sont générées par Directus et
  cachées dans le même bucket (`filename_disk__<transform>`) : copiées avec le reste, et de
  toute façon **régénérées à la volée** si absentes.
- Donc : **aucun changement d'URL, aucun changement d'ID, aucune retouche en base**. La seule
  modification est côté env Directus (`STORAGE_S3_*`).

## Étape 0 — Mitigation immédiate (avant même la migration)

Dans le compose Coolify du stack cms : **supprimer les mappings de ports `9000:9000` et
`9001:9001`** de MinIO (Directus y accède en interne via `http://minio:9000`). Redéployer,
vérifier que le site sert toujours images et PDF. _(= INFRA-2, 15 min, réversible.)_

## Étape 1 — Mesurer l'existant (référence pour la vérification finale)

Deux mesures qui doivent se recouper :

```bash
# a) Ce que Directus connaît (source de vérité) — depuis le poste dev
curl -s "$CMS_API_URL/files?aggregate%5Bcount%5D=id&aggregate%5Bsum%5D=filesize" \
  -H "Authorization: Bearer $CMS_API_KEY"
# → 2026-07-26 : {"count":{"id":"16821"},"sum":{"filesize":"82905073812"}}

# b) Ce que MinIO contient réellement — terminal du conteneur minio (Coolify → Terminal)
# ⚠️ `find` n'existe PAS dans l'image minio/minio — utiliser du/ls :
du -sh /data/*                          # taille par bucket (surplus normal vs Directus : métadonnées xl + cache transforms)
ls /data/directus-bucket | wc -l        # nombre d'objets (1 objet = 1 répertoire xl à la racine du bucket)
```

> ⚠️ **Constaté 2026-07-26 : le MinIO prod héberge d'AUTRES buckets** — `docuseal-bucket`
> (utilisé par DocuSeal), `jors-todo`, `test-bucket`. La bascule Directus→R2 ne suffit donc
> PAS pour décommissionner MinIO : inventorier ces buckets (taille, service consommateur),
> migrer aussi `docuseal-bucket` vers un bucket R2 dédié (changer la config S3 de DocuSeal),
> et vérifier si `jors-todo`/`test-bucket` sont morts (→ supprimer) avant l'étape 6.
>
> ⚠️ **Ne JAMAIS migrer en copiant `/data`** : depuis 2022 MinIO stocke chaque objet en
> répertoire `xl` (métadonnées + parts), ce n'est PAS une arborescence de fichiers plats.
> La copie doit passer par l'**API S3** (rclone) qui restitue les objets propres.
> Écart attendu entre (a) et (b) : le cache de transformations d'images (`__…` suffixés)
> compte dans (b) mais pas dans `directus_files` — normal.

## Étape 2 — Côté Cloudflare (dashboard → R2)

1. Créer le bucket `directus-assets-prod` — Location **Automatic** (Western Europe hint),
   classe **Standard** (⚠️ pas Infrequent Access, cf. pièges backups).
2. **Manage API Tokens → Create Account API token** (PAS « User API token ») :
   Object Read & Write, **scopé sur ce seul bucket**, TTL Forever.
3. Noter (affichés une seule fois) : Access Key ID, Secret Access Key, endpoint
   `https://<account_id>.r2.cloudflarestorage.com`.

## Étape 3 — Copie initiale (site en ligne, aucun impact)

Sur la **VM prod** (rclone accède à MinIO en localhost tant que l'étape 0 n'a pas retiré les
ports ; sinon lancer rclone dans le réseau Docker du stack : `docker run --rm
--network <réseau_du_stack_cms> -v /root/.config/rclone:/config/rclone rclone/rclone …`).

```bash
# /root/.config/rclone/rclone.conf
[minio]
type = s3
provider = Minio
access_key_id = <MINIO_ROOT_USER>
secret_access_key = <MINIO_ROOT_PASSWORD>
endpoint = http://localhost:9000

[r2]
type = s3
provider = Cloudflare
access_key_id = <R2_ACCESS_KEY>
secret_access_key = <R2_SECRET_KEY>
endpoint = https://<account_id>.r2.cloudflarestorage.com
acl = private
```

```bash
rclone sync minio:directus-bucket r2:directus-assets-prod \
  --progress --transfers 16 --checkers 32 --s3-chunk-size 64M
# 82,9 Go : compter quelques heures selon l'upload de la VM. Relançable sans risque (sync = idempotent).
```

## Étape 4 — Bascule (fenêtre de quelques minutes)

1. **Geler les uploads** (ne rien téléverser dans Directus pendant la bascule — prévenir l'équipe).
2. Re-synchroniser le delta : `rclone sync minio:directus-bucket r2:directus-assets-prod --progress` (rapide).
3. **Vérifier l'intégrité** : `rclone check minio:directus-bucket r2:directus-assets-prod --one-way`
   → doit finir sur `0 differences`.
4. Dans Coolify, modifier l'env du service **Directus** :

   | Variable | Valeur |
   | --- | --- |
   | `STORAGE_S3_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
   | `STORAGE_S3_BUCKET` | `directus-assets-prod` |
   | `STORAGE_S3_KEY` / `STORAGE_S3_SECRET` | token R2 |
   | `STORAGE_S3_REGION` | `auto` (⚠️ même piège que les backups : une région AWS casse la signature) |
   | `STORAGE_S3_FORCE_PATH_STYLE` | `true` |

5. Redéployer Directus. **Ne PAS toucher au service MinIO tout de suite** (rollback).

## Étape 5 — Vérification (checklist)

- [ ] PDF existant : <https://www.vie-publique.sn/docs/2686292b-5cd6-4ac3-b2ea-a60c891b02c9/rapport-annuel-2025-mairie-khombole-senegal.pdf> → 200, contenu identique.
- [ ] Image existante + transform : <https://www.vie-publique.sn/cms/3e5e1acb-5f18-42b8-96df-d554f8345e74?format=webp&quality=80> → 200 (peut être régénérée au 1er hit, léger délai normal).
- [ ] **Upload neuf** dans Directus (admin) → le fichier apparaît dans le bucket R2 (dashboard →
  Objects) et s'affiche sur le site.
- [ ] Comptes : nombre d'objets R2 ≥ 16 821 et ≥ compte `xl.meta` relevé à l'étape 1.
- [ ] Rien dans Sentry / logs Directus (`AccessDenied`, `SignatureDoesNotMatch` = région ou path style).
- [ ] Laisser tourner **7 jours** avant l'étape 6.

## Étape 6 — Décommissionnement MinIO

1. Stopper le service MinIO dans le compose (le laisser commenté 2-4 semaines, données en place).
2. Après validation durable : supprimer le service + le volume `/data` (les objets vivent sur R2,
   la base des métadonnées est dans PostgreSQL, sauvegardée via
   [`backups-coolify.md`](./backups-coolify.md)).
3. Mettre à jour [`infra/README.md`](./README.md) (tableau stack + schéma de flux),
   [`supervision-infra.md`](./supervision-infra.md) (retirer la sonde `/minio/health/ready`),
   cocher INFRA-2/INFRA-9 dans [`plan-remediation.md`](./plan-remediation.md), puis archiver ce doc.

## Après migration — sauvegarde des assets (à décider)

La durabilité R2 (11 « 9 », réplication multi-machines) protège contre la panne matérielle,
**pas** contre une suppression accidentelle (purge Directus, erreur admin) ni une compromission
du compte Cloudflare — et R2 n'offre pas de versioning d'objets à la S3. Mitigations :

1. **2FA sur le compte Cloudflare** + token R2 scoped au seul bucket (déjà la règle backups).
2. **Copie de secours indépendante** (mensuelle suffit, les assets sont surtout additifs) :
   `rclone sync r2:directus-assets-prod <autre-remote>` en cron — vers Backblaze B2
   (~0,5 $/mois pour 83 Go) ou un disque hors Cloudflare. À mettre en place après la bascule.

Même sans (2), on reste au-dessus de la situation actuelle : aujourd'hui les uploads vivent
sur **un seul disque VPS**, sans aucune sauvegarde dédiée (snapshot VM hebdo uniquement).

## Rollback

Tant que MinIO n'est pas supprimé : remettre les anciennes `STORAGE_S3_*` dans Coolify et
redéployer Directus. Les uploads faits pendant la période R2 devront être re-synchronisés en
sens inverse (`rclone sync r2:… minio:…`) — d'où le gel des uploads pendant la bascule et la
fenêtre d'observation avant suppression.

## Ce qu'on ne perd PAS (résumé)

| Élément | Impact |
| --- | --- |
| UUID des fichiers (`directus_files.id`) | inchangés (PostgreSQL) |
| URLs publiques `/docs/...` et `/cms/...` | inchangées → **zéro impact SEO** |
| Transformations d'images (`?format=webp…`) | copiées, sinon régénérées à la volée |
| Métadonnées (titre, dossier Directus, tags) | inchangées (PostgreSQL) |
| Historique / liens entrants | inchangés |

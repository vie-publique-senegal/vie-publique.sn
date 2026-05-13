# Document de Livraison Dev → Prod — Système d'upload de PVs

> Procédure opérationnelle pour déployer en production le système d'upload de PVs (National + Diaspora) sans régression.


### Données / CMS (Directus)

1. Collection `election_pvs` disponible avec ses champs.
2. Champ `pv_upload_active` présent dans `elections`.
3. Rôle `Observateur electoral` configuré.
4. Permissions testées en lecture/écriture/upload.

---

## 2) Checklist de configuration Directus

### Collection `election_pvs`

Champs minimums à vérifier :

- Communs : `election`, `user_created`, `tour`, `status`, `image`
- Source : `source` (`national` | `diaspora`)
- National : `region`, `department`, `municipality`, `bureau`
- Diaspora : `country`, `diplomatic_representation`, `locality`

### Structure de la collection `election_pvs`

La structure complète (métadonnées, champs, relations, conditions) est maintenue dans le dépôt dédié Directus :

- https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_pvs_schema.json

Procédure recommandée :

1. Télécharger le JSON de schéma depuis le lien ci-dessus.
2. Ouvrir Directus avec l'extension `Schema Management Module`.
3. Importer le fichier JSON dans le module.
4. Appliquer le schéma puis vérifier les permissions du rôle `Observateur electoral`.

Cette approche évite les écarts de configuration manuelle entre dev, staging et prod.

### Permissions du rôle `Observateur electoral`

Le rôle `Observateur electoral` doit être associé à la permission/policy `Upload PVs`.
Ce sont les droits configurés dans `Upload PVs` qui doivent porter les permissions sur les collections ci-dessous.

- `elections` : lecture
- `election_map_national` : lecture
- `election_map_diaspora` : lecture
- `election_pvs` : lecture + création
- `directus_files` : upload(création) + lecture (pour voir les fichiers uploadés)

### Activation d'une élection

- Dans `elections`, mettre `pv_upload_active = true` pour l'élection ciblée.

Sans ce flag, l'onglet PVs ne s'affiche pas dans le dashboard.

---

## 3) Variables d'environnement (prod)

Minimum requis :

```env
CMS_API_URL=https://votre-instance-directus.tld
```

Vérifier que :

1. L'URL est accessible depuis l'environnement de prod.
2. Les cookies httpOnly fonctionnent bien sur le domaine final.
3. Aucune politique proxy/CDN ne bloque les uploads images (20MB max).

---

## 4) Tester en production

1. Ouvrir une élection avec `pv_upload_active = true`.
2. Vérifier la présence de l'onglet PVs.
3. Tester une connexion observateur.
4. Uploader 1 PV National (fichier de test).
5. Uploader 1 PV Diaspora (fichier de test).
6. Vérifier les deux entrées dans Directus.
7. Vérifier l'affichage côté dashboard après refresh.

---

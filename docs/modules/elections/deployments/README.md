# 🚀 Déploiements du module électoral

Chaque évolution du module électoral (schéma CMS, règle métier, nouvelle fonctionnalité) est documentée dans un fichier versionné de ce dossier.

## Convention

- **Nom de fichier** : `YYYY-MM-<sujet>.md` (ex. `2026-08-refonte-candidats-persons.md`) ;
- **Un fichier = une évolution déployable**, rédigé AVANT le déploiement et validé avec lui ; il décrit ce qui doit être fait sur l'environnement cible, sans dépendre de documents de travail externes ;
- ne pas modifier un fichier déjà déployé : une correction ultérieure = un nouveau fichier ;
- **Création de collections** : par **import de schéma JSON** via le module Schema Management Module (marketplace Directus), fichiers JSON maintenus dans un repo dédié et référencés depuis le fichier de déploiement ;
- **Champs à ajouter sur des collections existantes** : procédure **manuelle pas-à-pas** décrite dans le fichier de déploiement ;
- les scripts sont réservés aux opérations de **données** (backfills, migrations de contenu) et vivent dans le repo dédié [vpsn-scripts](https://github.com/vie-publique-senegal/vpsn-scripts), dossier `elections/` — aucun script ne vit dans ce repo applicatif.

## Contenu attendu

Chaque fichier suit ce plan :

1. **Contexte** - pourquoi cette évolution ;
2. **Changements de schéma** - collections/champs Directus à créer ou modifier (type, interface, options, relations) ;
3. **Migration de données** - étapes ordonnées, valeurs par défaut, compatibilité ascendante ;
4. **Impacts applicatifs** - API serveur, composables, types et pages touchés ;
5. **Checklist de déploiement** - ordre des opérations CMS → API → front, vérifications post-déploiement.

## Historique

| Date | Évolution | Fichier |
|------|-----------|---------|
| (antérieur) | Migration vers le schéma électoral générique | [../elections-deployment.md](../elections-deployment.md) |
| (antérieur) | Module d'upload des PVs | [../pvs-upload-deploiement.md](../pvs-upload-deploiement.md) |
| 2026-07 | Migration prod des identités pérennes (persons + entités politiques) - plan en 5 phases fondé sur un audit de la prod | [2026-07-migration-prod.md](./2026-07-migration-prod.md) |
| 2026-07 | Migration prod unifiée de la géographie, de la carte électorale et des résultats (référentiel geo, fichiers électoraux, bureaux, résultats par circonscription) - plan en 6 phases fondé sur un audit de la prod | [2026-07-migration-prod-geographie-cartes.md](./2026-07-migration-prod-geographie-cartes.md) |

> Les deux fichiers antérieurs prédatent cette convention et restent à leur emplacement d'origine. Les évolutions futures du module seront versionnées ici.

# 🚀 Déploiements du module électoral

Chaque évolution du module électoral (schéma CMS, règle métier, nouvelle fonctionnalité) est documentée dans un fichier versionné de ce dossier.

## Convention

- **Nom de fichier** : `YYYY-MM-<sujet>.md` (ex. `2026-08-refonte-candidats-persons.md`) ;
- **Un fichier = une évolution déployable**, rédigé AVANT le déploiement et validé avec lui ; il décrit ce qui doit être fait sur l'environnement cible, sans dépendre de documents de travail externes ;
- ne pas modifier un fichier déjà déployé : une correction ultérieure = un nouveau fichier ;
- **Le schéma est scripté**, au même titre que les données, et vit dans le repo [vpsn-scripts](https://github.com/vie-publique-senegal/vpsn-scripts) :
  - les collections que le module possède sont versionnées dans `elections/schemas/` et posées par `tools/directus-schema/import-schema.mjs` ;
  - les champs ajoutés à des collections partagées sont versionnés dans `elections/schema-patches/` et posés par `tools/directus-schema/apply-field-patch.mjs` ;
  - les gestes qui ne créent pas un objet (lever une contrainte d'unicité, poser un rôle et ses permissions) ont leur propre script dans `elections/`.

  Les définitions sont **exportées du dev**, jamais saisies à la main. L'import JSON un par un via le *Schema Management Module* et la création de champs au clavier dans l'admin **ne sont plus la procédure** : c'est ce qui avait fait diverger dev, staging et prod. L'extension n'est plus un prérequis de déploiement.
- les scripts de **données** (backfills, migrations de contenu) vivent dans le même repo, dossier `elections/` — aucun script ne vit dans ce repo applicatif ;
- **la procédure exécutable de bout en bout** est le [RUNBOOK](https://github.com/vie-publique-senegal/vpsn-scripts/blob/main/elections/RUNBOOK.md) de ce dossier : schéma puis données, avec les attendus de chaque étape. Les fichiers de ce dossier-ci disent le *pourquoi* et les arbitrages ; le RUNBOOK dit *quoi taper*.

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
| 2026-07 | Migration prod des identités pérennes (persons + entités politiques) - plan en 5 phases fondé sur un audit de la prod | [2026-07-migration-prod-identites-perennes.md](./2026-07-migration-prod-identites-perennes.md) |
| 2026-07 | Migration prod unifiée de la géographie, de la carte électorale et des résultats (référentiel géographique versionné, fichiers électoraux, bureaux, résultats par circonscription) - plan en 6 phases fondé sur un audit de la prod, révisé le 2026-07-29 pour cibler `geo_entities` | [2026-07-migration-prod-geographie-cartes.md](./2026-07-migration-prod-geographie-cartes.md) |

> Les deux fichiers antérieurs prédatent cette convention et restent à leur emplacement d'origine. Les évolutions futures du module seront versionnées ici.

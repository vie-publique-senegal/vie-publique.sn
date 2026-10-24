# Migration prod - Identités pérennes (persons + political entities)

> **Statut** : 📋 Plan validé, à exécuter
> **Règle d'or** : le token prod du `.env` est en **lecture seule**. Toutes les écritures se font via un token d'écriture temporaire créé pour l'opération puis révoqué.

## 1. Contexte

La refonte du modèle de données électoral sépare l'identité pérenne de la donnée par scrutin : une **personne** (`election_persons`) porte l'identité d'un candidat à travers les élections, une **entité politique** (`election_political_entities`) porte celle d'une coalition/d'un parti - la candidature (`election_candidates`) et la coalition (`election_coalition`) deviennent des **participations** à un scrutin. Le code applicatif lit l'identité via ces collections pérennes. Ce document décrit la mise à niveau de la prod, en 5 phases ordonnées : chaque phase est un prérequis de la suivante.

**Convention schéma** : le schéma est **scripté** et versionné dans le repo [vpsn-scripts](https://github.com/vie-publique-senegal/vpsn-scripts) — `elections/schemas/` pour les collections, `elections/schema-patches/` pour les champs ajoutés aux collections existantes. La séquence exécutable est le [RUNBOOK](https://github.com/vie-publique-senegal/vpsn-scripts/blob/main/elections/RUNBOOK.md) ; la section 3 ci-dessous en documente le *contenu* et le *pourquoi*.

> Ce document a été rédigé quand les collections s'importaient à la main via le *Schema Management Module* et que les champs se créaient au clavier dans l'admin. Ce n'est plus la procédure : les définitions sont exportées du dev et posées par script, précisément parce que la saisie manuelle avait fait diverger dev, staging et prod. Les descriptions de champs de la section 3 restent valables comme **spécification** — elles décrivent ce que le correctif versionné contient.

### État de la prod constaté (audit du 2026-07-06)

- Collections absentes : `election_persons`, `election_political_entities`, `election_programs` ;
- Champs absents : `election_candidates.person` · `election_coalition.political_entity`, `round_2_voix`, `round_2_pourcentage` · `elections.slug`, `pv_upload_active` ;
- ⚠️ **Statuts** : en prod, la quasi-totalité des candidats est en `draft` (7 273 draft / 22 published, dont 162 des 165 élus). La bonne pratique est de filtrer sur `published` (c'est ce que fait le code, notamment la page des élus) : ces `draft` sont à **basculer en `published`** - opération intégrée à la phase 2 (4.2, étape 1), obligatoirement avant le déploiement du code ;
- La collection `election_pvs` (module PV) n'existe pas en prod - hors périmètre de cette migration, à traiter avec le module PV.

## 2. Phase 0 - Prérequis

1. **Sauvegarde de la base prod** (dump SQL) avant toute modification de schéma ;
2. Vérifier dans l'admin prod (Settings → Extensions/Marketplace) que **Schema Management Module** (`directus-extension-schema-management-module`) est installé ; sinon l'installer depuis le marketplace

## 3. Phase 1 - Schéma

### 3.1 Import des nouvelles collections

Les collections se posent par script, depuis [`elections/`](https://github.com/vie-publique-senegal/vpsn-scripts/tree/main/elections) du repo vpsn-scripts — commandes et attendus dans le [RUNBOOK](https://github.com/vie-publique-senegal/vpsn-scripts/blob/main/elections/RUNBOOK.md).

Les collections concernées ici sont `election_persons`, `election_political_entities` et
`election_programs` (le même dossier porte aussi celles du volet 2 — l'import est commun,
il crée ce qui manque et rien d'autre). **Aucun ordre à respecter** : le script crée toutes
les collections d'abord, puis toutes les relations, ce qui supprime la contrainte d'ordre
des clés étrangères qui gouvernait l'import manuel.

Notes :

- `election_programs` porte deux relations vers des collections existantes : `document` → `documents` et `participation` → `election_coalition`. Elles doivent être présentes après import - sinon les créer manuellement (M2O, on delete SET NULL) ;
- l'alias O2M `participations` sur `election_political_entities` n'apparaîtra qu'après la création du champ `political_entity` (3.2) - c'est normal ;
- il n'existe pas d'alias `programs` sur l'entité : les programmes sont rattachés à la **participation** (`election_coalition`).

### 3.2 Champs ajoutés aux collections existantes

Les champs sont posés par script à partir du correctif versionné dans [`elections/schema-patches/`](https://github.com/vie-publique-senegal/vpsn-scripts/tree/main/elections/schema-patches) — voir le [RUNBOOK](https://github.com/vie-publique-senegal/vpsn-scripts/blob/main/elections/RUNBOOK.md).

Le correctif est **recopié du dev** : les réglages ci-dessous décrivent ce qu'il contient,
ils n'ont plus à être saisis. Un champ déjà présent est signalé et laissé en place. Le
script refuse de tourner si la collection cible n'existe pas — un correctif complète, il
ne crée pas.

Ce que le correctif pose :

**`election_candidates.person`** (créer en premier, après 3.1) :

1. Type « Many to One », clé `person`, collection liée `election_persons` ;
2. Interface : dropdown M2O, template d'affichage `{{first_name}} {{last_name}}`, lien activé ;
3. Nullable (les candidatures existantes n'en ont pas encore), **Required : oui** (bloque uniquement les nouvelles saisies) ;
4. Relation : « on delete » = SET NULL ; renseigner le champ inverse (O2M) sur `election_persons` avec la clé `candidacies` (interface liste O2M) ;
5. Note du champ : « Personne candidate (identité pérenne) - requis pour toute nouvelle candidature ».

**`election_coalition.political_entity`** :

1. Type « Many to One », clé `political_entity`, collection liée `election_political_entities` ;
2. Interface : dropdown M2O, template `{{name}}`, lien activé ;
3. Nullable, Required : non ;
4. Relation : « on delete » = SET NULL ; champ inverse (O2M) sur `election_political_entities` avec la clé `participations` ;
5. Note : « Entité politique pérenne (identité) - la coalition devient la participation ».

**`election_coalition.round_2_voix`** : type Integer, interface Input, nullable, note « Voix obtenues au second tour (présidentielle) ».

**`election_coalition.round_2_pourcentage`** : type Float, interface Input, nullable, note « Pourcentage au second tour (présidentielle) ».

**`elections.slug`** : type Text, interface Input avec options **slugify** et **trim** activées, nullable, affichage Raw.

**`elections.pv_upload_active`** : type Boolean (special cast-boolean), interface Toggle, nullable.

### 3.3 Vérifications de fin de phase 1

- Les 3 nouvelles collections apparaissent et sont vides ;
- Les permissions du rôle public/API prod couvrent les nouvelles collections en lecture ;
- Le front prod existant (code actuel, pré-déploiement) fonctionne toujours - la phase est purement additive ;
- Les **dry-runs** des deux scripts de la phase 2 passent sans erreur (voir 4.1).

## 4. Phase 2 - Backfill des données (persons et entités politiques)

### 4.1 Validation par dry-run

Les deux scripts (repo [vpsn-scripts](https://github.com/vie-publique-senegal/vpsn-scripts), dossier `elections/`) sont en **dry-run par défaut** (aucune écriture sans `--execute`) : le dry-run est le geste de validation. ⚠️ Il **échoue en 403 tant que la phase 1 n'est pas faite** - les champs `person` et `political_entity` n'existent pas encore, c'est attendu.

L'exécution réelle utilise un **token d'écriture temporaire créé par l'admin**, révoqué après l'opération.

⚠️ Les IDs (élections, candidats, coalitions) **diffèrent entre environnements** : aucun fichier de fusions préparé ailleurs n'est réutilisable. Générer les propositions par dry-run contre la prod et les faire **valider éditorialement** avant application.

### 4.2 Opérations, dans l'ordre

1. **Normalisation des statuts candidats** : basculer en `published` les 7 273 candidats en `draft` (le code déployé en phase 3 filtre sur `published`, notamment la page des élus — sans cette bascule elle serait quasi vide). Via l'admin : collection `election_candidates`, filtre `status = draft`, sélection de tous les résultats, édition groupée `status → published` ; ou en une requête batch avec le token temporaire. Les candidats `archived` ne sont pas touchés ;
2. **Backfill persons** (`backfill-persons.mjs`) : dry-run → CSV de revue → fichier de fusions avec les **IDs prod** → validation éditoriale → `--execute`. Règles : jamais de fusion intra-élection (mêmes noms = homonymes) ; fusion inter-élections uniquement sur validation (candidats 2024 concernés : Amadou Ba, Anta Babacar Ngom, Déthié Fall, Papa Djibril Fall, Thierno Alassane Sall ; Daouda Ndiaye volontairement non fusionné). Les candidats archivés sont exclus. Attendu : environ une person par candidature non archivée, moins les fusions ;
3. **Backfill entités politiques** (`backfill-political-entities.mjs`) : dry-run → CSV de revue → fichier de fusions IDs prod → validation → `--execute`. Règles : matching par **tête de liste normalisée**, jamais par nom seul (les graphies divergent - Benno Bokk Yaakaar existe sous 3 formes ; compléter au besoin par une passe sur les graphies proches). Canoniser les noms des entités fusionnées. Une coalition législative et un parti présidentiel portés par la même personne ne se fusionnent pas sans validation explicite ;
4. **Programme électoral** : créer à la main (admin) l'entrée `election_programs` du programme présidentiel présent en prod - document 11626 « Livre programme Diomaye Président - Élection présidentielle 2024 » → `participation` = la coalition présidentielle 2024 de Bassirou Diomaye Faye (la retrouver par sa tête de liste, jamais par nom), `language` = `french`, `status` = `published`.

### 4.3 Vérifications de fin de phase 2

- 0 candidat en `draft` ; 0 candidat non archivé sans `person` ; 0 coalition publiée sans `political_entity` ;
- 0 slug dupliqué (persons et entités) ;
- Archiver les rapports d'exécution (`elections/reports/` dans le repo vpsn-scripts, dossier local non versionné) avec le fichier de fusions utilisé.

## 5. Phase 3 - Déploiement du code

Merge de la branche vers `develop` puis déploiement prod. Deux contraintes d'ordre :

- le code demande les relations `person` et `political_entity` : si ces champs n'existent pas dans le schéma, Directus répond 403 et les dashboards se vident silencieusement → phase 1 obligatoirement avant phase 3 ;
- le code lit l'identité des candidats **uniquement via la person** et le nom des coalitions via l'entité (`political_entity.name`) → phase 2 obligatoirement avant phase 3, sinon identités et noms seraient vides.

⚠️ Le module **Assemblée** est concerné : les pages députés affichent la coalition via l'entité politique. Le backfill des entités doit couvrir les coalitions de toutes les législatures affichées, pas seulement 2024.

Vérifications post-déploiement : dashboards des élections 2024 identiques à avant ; fiches candidats accessibles (le slug public est celui de la person) ; page des élus complète (**165 élus**, publiés à la phase 2) ; recherche de coalitions par nom canonique ; carte des résultats avec noms et couleurs ; fiches députés avec nom de coalition ; fiche du candidat présidentiel Bassirou Diomaye Faye avec son programme (onglet Programme).

## 6. Phase 4 - Réglages de saisie CMS

Manuellement dans l'admin prod.

**Candidats** - pour chacun des 9 champs identité legacy de `election_candidates` (`first_name`, `last_name`, `gender`, `birthdate`, `birthplace`, `photo`, `biography`, `facebook`, `twitter`) :

1. Passer le champ en **lecture seule** (Readonly) ;
2. Retirer le flag **Required** s'il est posé (encore le cas en prod sur `first_name`, `last_name`, `gender`) - un champ à la fois readonly et required bloque la création de candidature ;
3. Vérifier que `person` est bien Required (posé en phase 1) ;
4. Test : créer une candidature de test en draft - seuls `person` et les champs de candidature (profession, position, etc.) doivent être exigés - puis la supprimer.

**Coalitions** - même traitement : `name`, `acronym`, `type`, `description` en **lecture seule** (l'identité s'édite sur l'entité politique) ; `political_entity` en **Required** ; `logo` et `color` restent éditables (overrides d'affichage propres à la participation, prioritaires sur ceux de l'entité).

## 7. Phase 5 - Suppression des champs legacy (scriptée, après déploiement et rodage)

> **Cette phase fait partie de la migration** : tant qu'elle n'est pas faite, l'environnement n'est pas migré. Elle est scriptée depuis le 07/08/2026 :
>
> Le script et la procédure sont dans [`elections/`](https://github.com/vie-publique-senegal/vpsn-scripts/tree/main/elections) — voir la section « nettoyage legacy » du [RUNBOOK](https://github.com/vie-publique-senegal/vpsn-scripts/blob/main/elections/RUNBOOK.md), suivie du contrôle de conformité qui doit annoncer 0 écart.
>
> La liste des champs n'est pas écrite dans le script : elle est **calculée** en comparant l'environnement au **dev**, qui fait référence — le schéma valide est celui du dev. Le script exige un périmètre explicite et affiche chaque colonne avant d'y toucher.
>
> ⚠️ **L'ordre n'est pas négociable** : les backfills lisent ces champs (`biography` alimente `short_bio` de la person, `region`/`parent` la hiérarchie des circonscriptions) et le code déployé doit avoir cessé de les lire. Les supprimer avant, c'est perdre l'identité des candidats et des coalitions sans destination de repli.
>
> Joué sur staging le 07/08/2026 : 18 champs retirés, conformité au dev vérifiée à 0 écart.

**Préconditions** : phases 1 à 4 faites, code déployé et rodé - l'ancien code lit encore ces champs, ne rien supprimer avant le déploiement. Sauvegarde de la base immédiatement avant : cette phase est la **seule non réversible**. Suppression via l'admin (Settings → Data Model), un champ à la fois :

- `election_candidates` : les 9 champs identité legacy (liste de la phase 4) + le M2O `documents` (vide, remplacé par `election_programs` sur la participation) ;
- `election_coalition` : `name`, `acronym`, `type`, `description`.

Ne pas supprimer : `profession` (donnée par scrutin, comportement cible), `logo`/`color` de `election_coalition` (overrides de participation), ni aucun champ de résultat.

## 8. Récapitulatif de l'ordre

| Phase | Quoi | Outil | Réversible |
|-------|------|-------|------------|
| 0 | Sauvegarde + module Schema Management | admin prod | - |
| 1 | Import JSON des 3 collections + 6 champs manuels | module + admin | oui (additif) |
| 2 | Backfills persons/entités (dry-run → validation → exécution) + programme | scripts de données + admin, token temporaire | oui (collections nouvelles) |
| 3 | Merge + déploiement du code | CI/CD | oui (revert) |
| 4 | Readonly/required sur les champs legacy (candidats et coalitions) | admin | oui (meta) |
| 5 | Suppression des champs legacy | admin | **non** (sauvegarde avant) |

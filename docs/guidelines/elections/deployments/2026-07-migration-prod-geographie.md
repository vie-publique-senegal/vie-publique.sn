# Migration prod — Géographie et cartes (fichiers électoraux, bureaux, résultats)

> **Règle d'or** : le token prod du `.env` est en **lecture seule**. Toutes les écritures se font via un token d'écriture temporaire créé pour l'opération puis révoqué.

## 1. Contexte

La refonte géographique sort les contours de circonscription de Directus (fichiers GeoJSON statiques versionnés avec le code), normalise les bureaux de vote (aujourd'hui éclatés en deux collections sans FK circonscription) et les résultats par circonscription dans un modèle où le **fichier / carte électorale** devient une entité pérenne, partagée entre élections. Ce document décrit la mise à niveau de la prod en 3 phases ordonnées. L'état actuel de la prod (section 2) reflète les chiffres réels au moment de la rédaction, pas des extrapolations depuis le dev.

**Convention schéma** : les 3 nouvelles collections se créent par **import de schéma JSON** (module Schema Management Module, marketplace Directus). Les champs à ajouter aux collections existantes suivent une **procédure manuelle pas-à-pas** (section 4.2).

## 2. État actuel de la prod

### 2.1 Schéma — rien n'est encore posé

| Élément | État constaté |
|---|---|
| Collections `election_electoral_files`, `election_polling_stations`, `election_constituency_results` | **absentes** |
| Champs `election_constituencies.slug` / `.code` / `.population` | **absents** |
| Champs `elections.electoral_file_national` / `.electoral_file_diaspora` | **absents** |
| Option `region` sur `election_constituencies.nationale_type` | **absente** |

### 2.2 Volumétrie et périmètre réel

| Collection | Lignes prod | Détail |
|---|---|---|
| `elections` | **2** | id 1 = Législatives du 17 novembre 2024 (`legislative`), id 11 = Présidentielle 2024 (`presidential`, `election_date` 2024-03-24) — **ce sont les 2 seules élections en prod à ce jour**, ce qui simplifie la migration (pas de bruit d'élections de test comme en dev) |
| `carte` | **46** | **100 % rattachées à l'élection législative (id 1)** — 0 ligne présidentielle. `population` renseignée sur les 46/46. `winning_list` **null sur les 46/46** (la tête de liste nationale n'est jamais dans ce champ — `winning_list` n'a de sens qu'au niveau communal/local) |
| `election_map_national` | **15 633** | 100 % rattachées à l'élection législative ; **46 départements distincts** |
| `election_map_diaspora` | **807** | 100 % rattachées à l'élection législative ; **50 pays distincts** |
| `election_constituencies` | **55** | 46 départements (`nationale_type=departement`) + 1 « Territoire National » + 8 zones diaspora ; **0 ligne avec `parent` renseigné** ; **aucun doublon** (à la différence du dev — sans objet ici) |


## 3. Phase 0 — Prérequis

1. **Sauvegarde de la base prod** (dump SQL) avant toute modification de schéma ;
2. Vérifier dans l'admin prod (Settings → Extensions/Marketplace) que **Schema Management Module** (`directus-extension-schema-management-module`) est installé;
3. Créer un **token d'écriture temporaire** pour l'opération; le révoquer une fois la phase 2 terminée.

## 4. Phase 1 — Schéma

### 4.1 Import des 3 nouvelles collections (Schema Management Module)

Importer, dans cet ordre (dépendances : `election_polling_stations` référence `election_electoral_files` ; `election_constituency_results` référence `elections`/`election_constituencies`/`election_coalition`, déjà existantes) :

| Ordre | Collection | Fichier JSON |
|-------|------------|--------------|
| 1 | `election_electoral_files` | [election_electoral_files.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_electoral_files.json) |
| 2 | `election_polling_stations` | [election_polling_stations.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_polling_stations.json) | (repo `vpsn-directus-collections`)
| 3 | `election_constituency_results` | [election_constituency_results.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_constituency_results.json) | (repo `vpsn-directus-collections`) |

Schémas de référence (détail champ par champ) :

**`election_electoral_files`** — fichier/carte électorale, entité pérenne :

| Champ | Type | Contraintes |
|---|---|---|
| `name` | string | requis |
| `scope` | string (dropdown `national`/`diaspora`) | requis |
| `year` | integer | requis |
| `revision_date` | date | nullable |
| `document` | M2O → `documents` | nullable, on delete SET NULL |
| `notes` | text | nullable |

**`election_polling_stations`** — bureaux de vote (fusion national + diaspora) :

| Champ | Type | Contraintes |
|---|---|---|
| `electoral_file` | M2O → `election_electoral_files` | requis, on delete NO ACTION |
| `constituency` | M2O → `election_constituencies` | requis, on delete NO ACTION |
| `polling_place` | string | requis |
| `office_number` | string | requis |
| `voters` | integer | nullable |
| `municipality` | string | nullable (national) |
| `implantation` | string | nullable (national) |
| `country` | string | nullable (diaspora) |
| `locality` | string | nullable (diaspora) |
| `diplomatic_representation` | string | nullable (diaspora) |

**`election_constituency_results`** — Résultat d'une élection dans une circonscription :

| Champ | Type | Contraintes |
|---|---|---|
| `election` | M2O → `elections` | requis, on delete NO ACTION |
| `constituency` | M2O → `election_constituencies` | requis, on delete NO ACTION |
| `winning_coalition` | M2O → `election_coalition` | nullable, on delete SET NULL |
| `winning_list` | M2O → `election_electoral_lists` | nullable, on delete SET NULL |
| `voters` | integer | nullable |
| `seat` | integer | nullable |
| `participation_10h` / `_12h` / `_14h` / `_17h` | decimal | nullables |

### 4.2 Champs à créer manuellement sur les collections existantes

Dans l'admin prod : Settings → Data Model → collection → « Create Field ». **Avant chaque création**, vérifier que le champ n'existe pas déjà.

**`election_constituencies.slug`** : type string, interface Input, **unique**, nullable. Note : « Identifiant durable, clé de jointure des contours GeoJSON ».

**`election_constituencies.code`** : type string, interface Input, **unique**, nullable. Note : « Code officiel (pcode OCHA/ANSD) quand il existe ».

**`election_constituencies.population`** : type integer, interface Input, nullable. Note : « Population du territoire (donnée pérenne, indépendante du scrutin) ».

**Option `region` sur `election_constituencies.nationale_type`** : ajouter le choix `region` (« Région ») au dropdown existant — changement de meta uniquement, aucun risque (le champ et sa colonne existent déjà).

**`elections.electoral_file_national`** : type M2O vers `election_electoral_files`, nullable, on delete SET NULL, interface Select Dropdown, template `{{name}} ({{year}})`.

**`elections.electoral_file_diaspora`** : idem.

*(optionnel, confort admin)* : `display_template` de `election_constituencies` = `{{name}}`.

### 4.3 Vérifications de fin de phase 1

- Les 3 nouvelles collections apparaissent et sont vides ;
- Les permissions du rôle public/API prod couvrent les nouvelles collections en lecture (sinon 403 silencieux côté front) ;
- `GET /items/election_constituencies?filter[nationale_type][_eq]=region` → liste vide (pas encore de régions, normal à ce stade) ;
- Les **dry-runs** des 3 scripts de la phase 2 passent sans erreur 403 (voir 5.1) ;
- Le front prod existant (code actuel, pré-déploiement) fonctionne toujours — la phase est purement additive.

## 5. Phase 2 — Backfill des données

### 5.1 Validation par dry-run

Les 3 scripts (`scripts/elections/`) sont en **dry-run par défaut** (aucune écriture sans `--execute`) : le dry-run est le geste de validation, il échoue en 403 tant que la phase 1 n'est pas faite. L'exécution réelle utilise un **token d'écriture temporaire**, révoqué après l'opération.

### 5.2 Opérations, dans l'ordre

**Étape 1 — Référentiel des circonscriptions** (`backfill-constituencies.mjs`) :

```bash
node scripts/elections/backfill-constituencies.mjs            # dry-run
node scripts/elections/backfill-constituencies.mjs --execute  # exécution
```

Crée les 14 régions, pose le `parent` des 46 départements vers leur région, génère les `slug` (46 départements + 14 régions + 1 Territoire National + 8 zones diaspora = **69 slugs attendus**), pose les `code` (pcodes déjà tabulés dans le script depuis la source OCHA COD-AB v02, réutilisables tels quels — pas de nouvelle recherche de source nécessaire). Contrôles bloquants : exactement 14 régions créées, 0 ligne publiée sans slug, 0 slug dupliqué, 46 départements avec parent. Volumétrie finale attendue : **55 + 14 = 69 lignes**.

**Étape 2 — Fichiers électoraux + bureaux** (`backfill-polling-stations.mjs`) :

```bash
node scripts/elections/backfill-polling-stations.mjs            # dry-run + CSV de revue
node scripts/elections/backfill-polling-stations.mjs --execute  # exécution
```

Crée les 2 lignes `election_electoral_files` (scope national/diaspora, year 2024) : diaspora avec `document = 8102` (Carte électorale des Sénégalais de l'étranger) ; national avec `document` **laissé vide** ( à renseigner plus tard dans l'admin, le champ est nullable et n'empêche pas la création de la ligne). Rattache les élections 1 (législatives) **et** 11 (présidentielle) aux mêmes 2 lignes — résolution par type + année, jamais par ID —, puis copie les bureaux : **15 633** nationaux (matching département texte → circonscription, 46/46 attendu, bloquant si un seul non résolu) et **807** diaspora. Contrôles bloquants : volumétrie source/cible identique par scope, 0 bureau sans circonscription, sommes `voters` identiques à la source.

**Étape 3 — Résultats législatives + population** (`backfill-constituency-results.mjs`) :

```bash
node scripts/elections/backfill-constituency-results.mjs            # dry-run
node scripts/elections/backfill-constituency-results.mjs --execute  # exécution
```

Copie 1:1 les **46 lignes** `carte` (législatives) vers `election_constituency_results`, pose la `population` sur les 46 départements du référentiel.

**Étape 4 — Résultats présidentielle (entièrement manuelle)** :

`carte` ne contient **aucune ligne présidentielle en prod**.

1. Créer les 46 lignes `election_constituency_results` (`election` = 11, `constituency` = chacun des 46 départements du référentiel) — `winning_coalition`, `winning_list`, `voters`, `seat`, `participation_*` laissés à `null` à la création ;
2. Filtrer `election_constituency_results` sur `election.type=presidential` (46 lignes attendues) et patcher `winning_coalition` circonscription par circonscription à partir des résultats officiels de la présidentielle 2024 (la participation présidentielle correspondante existe déjà dans `election_coalition` en prod) ;
3. `winning_list` reste `null` ; `voters`/`seat`/`participation_*` à compléter si la donnée officielle est disponible, sinon laissés `null` ;
4. Contrôle : 46/46, 0 doublon (election=11, constituency).

### 5.3 Vérifications de fin de phase 2

- `election_constituencies` : 69 lignes, 14 régions, 46 départements avec parent, 0 slug dupliqué ;
- `election_electoral_files` : 2 lignes (national + diaspora, year 2024), les 2 élections prod rattachées aux 2 mêmes lignes ;
- `election_polling_stations` : 16 440 lignes (15 633 + 807), 0 sans circonscription ;
- `election_constituency_results` : 92 lignes (46 législatives + 46 présidentielle), 0 doublon (election, constituency) ;
- Archiver les rapports d'exécution (`scripts/elections/reports/`) et les CSV de revue des étapes 2 et 4.

## 6. Phase 3 — Déploiement du code

Merge de la branche vers `develop` puis déploiement prod. L'ordre schéma → données → code n'est pas strictement bloquant côté lecture ici : les 17 endpoints concernés retombent sur les collections legacy (`carte`, `election_map_national`, `election_map_diaspora`) tant que la résolution élection → fichier électoral échoue (FK non renseignée ou nouvelles collections vides) — le code est donc **déployable dès la fin de la phase 1**, avant même le backfill. Il est cependant recommandé de dérouler phase 1 → phase 2 → phase 3 dans cet ordre pour éviter toute période de double lecture et bénéficier immédiatement de la carte présidentielle non vide.

Le déploiement embarque : les fichiers GeoJSON statiques (`public/geo/senegal-departements.geojson` — 46 polygones complets, mis à jour en place — et `public/geo/senegal-communes-contours.geojson` — nouveau), l'utilitaire de résolution `server/utils/electionElectoralFile.ts`, les 17 endpoints basculés avec fallback, les composables carte adaptés, et le front unifié (page carte-electorale pilotée par révision, composant `ElectionUnifiedMap`, `ElectionDiasporaZones`).

**Vérifications post-déploiement** :

1. Dashboards des 2 élections 2024 identiques à avant (onglets carte et résultats) ;
2. Page carte électorale (`/elections-senegal/carte-electorale`) : révision 2024, badges des 2 élections, lien vers le document diaspora 8102 ; pas de lien national tant que `document` n'est pas renseigné (attendu, champ laissé vide à l'étape 2) ;
3. **La carte électorale de la présidentielle n'est plus vide** — critère de succès principal ;
4. Onglets nationale/diaspora/résumé, drill-down département et pays, chaîne `pvs-upload` complète ;
5. Fallback : si une étape de la phase 2 a été sautée, vérifier qu'aucun endpoint ne casse (retour silencieux sur `carte`/`election_map_*`, `console.warn` journalisé — à surveiller dans les logs prod juste après déploiement) ;

## 7. Récapitulatif de l'ordre

| Phase | Quoi |
|-------|------|
| 0 | Sauvegarde + vérification module Schema Management |
| 1 | Import JSON des 3 collections + 6 champs manuels |
| 2 | 4 backfills (référentiel → fichiers/bureaux → résultats législatives → résultats présidentielle depuis le dev) |
| 3 | Merge + déploiement du code (déployable dès la phase 1, recommandé après la phase 2) |

## 8. Checklist

- [ ] Phase 0 : sauvegarde + Schema Management Module vérifié
- [ ] Phase 1 : 3 collections importées + 6 champs manuels + vérifications (4.3)
- [ ] Phase 2, étape 1 : référentiel (69 lignes, 14 régions, 46 parents)
- [ ] Phase 2, étape 2 : fichiers électoraux (diaspora document=8102, national document laissé vide) + 16 440 bureaux
- [ ] Phase 2, étape 3 : 46 résultats législatives + 46 populations
- [ ] Phase 2, étape 4 (manuelle, admin) : 46 résultats présidentielle créés puis patchés circonscription par circonscription à partir des résultats officiels
- [ ] Phase 3 : déploiement code + vérifications post-déploiement (section 6)

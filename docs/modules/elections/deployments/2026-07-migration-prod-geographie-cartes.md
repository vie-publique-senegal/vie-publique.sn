# Migration prod — Géographie, carte électorale et résultats par circonscription (plan unifié)

> **Statut** : prêt à exécuter, phase par phase, chaque phase validée avant lancement.
> **Révisé le 2026-07-29** : la cible du référentiel géographique est le **référentiel versionné** `geo_entities` et ses collections associées, en place et vérifié en développement. Les parties fichier électoral, bureaux de vote et résultats sont inchangées.
> **Rédigé le** : 2026-07-16, sur la base d'un audit en lecture seule exécuté le jour même directement contre la prod, et de simulations en lecture seule des résolutions de données (chaque résolution de nom rejouée contre les données prod réelles avant écriture du plan).

---

## 1. Objectif et périmètre

Aligner la prod sur le modèle géographique et cartographique cible, déjà en place et vérifié sur l'environnement de développement :

| Objet métier | Avant (prod actuelle) | Après |
|---|---|---|
| Référentiel géographique | Inexistant — `election_constituencies` porte des champs texte dénormalisés (`region`) et une hiérarchie jamais renseignée (`parent`) | Référentiel **versionné** : `geo_entities` (identité stable), `geo_entity_versions` (état daté, seule table portant la hiérarchie), `geo_events` / `geo_event_entities` (décrets fondateurs), `geo_entity_names` (graphies), `geo_demographic_observations` (population) — référencé par `election_constituencies` via la FK unique `geo_entity` |
| Circonscriptions | 55 lignes sans slug ni rattachement géographique | 608 lignes (46 départements + 553 communes + 8 zones diaspora + 1 Territoire National) avec `slug` unique, clé publique des URLs et de la jointure des contours |
| Contours | Polygones dupliqués par élection dans `carte.Position` | Fichiers GeoJSON statiques versionnés dans le repo (`public/geo/senegal-departements.geojson`, `public/geo/communes-senegal.geojson`), joints par le **slug de l'entité géographique** |
| Carte électorale (lieux et bureaux de vote) | `election_map_national` (15 633) + `election_map_diaspora` (807), rattachées à une seule élection — la page carte électorale de la présidentielle 2024 est vide | `election_electoral_files` (fichier électoral pérenne, décliné national/diaspora, partagé entre scrutins) + `election_polling_stations` (16 440 bureaux) — les deux élections 2024 partagent le même fichier |
| Résultats par circonscription | `carte` (46 lignes, législatives 2024 uniquement) | `election_constituency_results` (gagnant, sièges, indicateurs de participation et de dépouillement, second tour) + `election_constituency_coalition_results` (classement complet des coalitions, à remplir quand les données seront sourcées) |

**Principe cardinal de cette migration : aucune donnée n'est importée depuis l'environnement de développement.** La prod migre ses propres données vers les bonnes collections (copie interne), complétées par le référentiel géographique, importé séparément par sa chaîne dédiée depuis les textes officiels. Tout champ dont la prod ne possède pas la donnée (document officiel du fichier électoral, résultats de la présidentielle, indicateurs détaillés, classements par coalition, périodes de révision) **reste vide et sera rempli éditorialement** — jamais copié depuis le dev.

Hors périmètre de ce plan : la suppression des collections `carte`, `election_map_national` et `election_map_diaspora` (décommissionnement ultérieur, après période d'observation et vérification qu'aucune lecture résiduelle ne subsiste) ; la migration du modèle candidats/coalitions, qui a son propre plan ([2026-07-migration-prod-identites-perennes.md](./2026-07-migration-prod-identites-perennes.md)) — voir la dépendance en phase E.

## 2. Principes de sécurité

- **Le token prod du `.env` est en lecture seule** : il sert aux audits et aux dry-runs. Les écritures se font avec un token dédié fourni au moment de l'exécution.
- **Chaque phase est compatible ascendante** : le site en prod continue de fonctionner à l'identique entre deux phases (les phases A à D sont purement additives, seuls des champs et collections que le code en place ne lit pas sont créés).
- **Dry-run d'abord** : chaque script s'exécute par défaut en dry-run (aucune écriture) et affiche exactement ce qu'il créerait ; l'exécution réelle exige le drapeau `--execute`.
- **Sauvegarde avant toute écriture sur des lignes existantes** : export JSON préalable des collections modifiées (`election_constituencies`, `elections`) — les créations dans des collections neuves n'écrasent rien par construction.
- **Scripts idempotents** : rejouables sans doublon (les lignes déjà présentes sont sautées) ; un re-dry-run après exécution doit annoncer 0 changement.
- **Résolutions bloquantes** : aucune correspondance de nom résolue en silence — toute ligne non résolue (département inconnu, pays hors table) arrête le script **avant** la première écriture.
- Flux : le schéma va du dev vers la prod (imports JSON + champs manuels documentés) ; les données prod restent la référence et ne bougent que de collection en collection au sein de la prod.

## 3. État de la prod (audit en lecture seule du 2026-07-16)

Volumétrie et faits vérifiés le jour de la rédaction :

- `elections` : 2 lignes — id 1 (législatives du 17 novembre 2024) et id 11 (présidentielle 2024), toutes deux `completed`. Pas de champs `electoral_file_national`/`electoral_file_diaspora`.
- `election_constituencies` : 55 lignes, toutes `published` — 46 départements (`nationale_type=departement`), 8 zones diaspora, 1 « Territoire national ». Ni `slug`, ni FK géographique au schéma ; `parent` existe mais n'est renseigné nulle part ; `region` (texte libre) existe. ⚠️ **`name` porte une contrainte SQL d'unicité** (voir phase A — à lever avant la création des communes, qui comportent des homonymes inter-départements).
- `carte` : 46 lignes, 100 % rattachées aux législatives (élection 1) — **aucune donnée présidentielle**. `Position`, `constituencie` et `coalition_gagnante` remplis sur les 46 ; `winning_list` et les 4 champs de participation horaire null partout ; `population` remplie sur les 46 ; `seat` sur 31. Sommes : 7 033 854 électeurs, 15 633 bureaux.
- `election_map_national` : 15 633 lignes (élection 1 uniquement), 46 départements distincts, somme `voters` = 7 033 854.
- `election_map_diaspora` : 807 lignes (élection 1 uniquement), 50 pays distincts, somme `voters` = 338 040.
- `election_coalition` : pas de champ `election` (le rattachement d'une coalition à son scrutin passe par `election_electoral_lists.election`) ; les colonnes `round_2_voix`/`round_2_pourcentage` n'existent pas encore en prod (périmètre du plan candidats/coalitions).
- Aucune des collections cibles n'existe : les 6 collections du référentiel versionné (`geo_entities`, `geo_entity_versions`, `geo_events`, `geo_event_entities`, `geo_entity_names`, `geo_demographic_observations`), `election_electoral_files`, `election_polling_stations`, `election_constituency_results`, `election_constituency_coalition_results`.
- Documents : la collection `documents` contient notamment les arrêtés 2024 de la carte électorale (ids 8102, 8132, 8142, tous `published`) — voir phase C pour leur usage éditorial.

## 4. Prérequis (avant la phase A)

1. **Scripts et données** : par convention d'équipe, aucun script ne vit dans le repo applicatif — les scripts d'exploitation électoraux et leurs données sources vivent dans le repo [vpsn-scripts](https://github.com/vie-publique-senegal/vpsn-scripts), dossier `elections/` (mode d'emploi dans son README ; les commandes s'exécutent depuis la racine de ce repo). Un runbook d'exécution condensé accompagne ce plan : `elections/MIGRATION-PROD.md` dans ce même repo. Sont utilisés par ce plan :
   - `backfill-polling-stations.mjs` — prêt : la résolution des départements passe par les graphies du référentiel (la graphie « BIRKILANE » des bureaux prod ne correspond pas au nom « Birkelane » du référentiel) ;
   - `backfill-constituency-results.mjs` — prêt : copie 1:1 seule (la population n'est plus stockée nulle part : elle est la somme des observations communales, calculée à la lecture) ;

   **Le peuplement du référentiel géographique lui-même n'appartient pas à ce repo** : entités, versions, événements fondateurs, graphies et observations de population sont produits et importés par la chaîne dédiée du référentiel géographique (extraction des décrets, arbitrages, `import-decoupage.mjs` et `import-population.mjs`). La phase B s'appuie sur un référentiel déjà importé en production par cette chaîne.
2. **Exports JSON de schéma** : les 7 collections à importer sont dans le repo [vpsn-directus-collections](https://github.com/vie-publique-senegal/vpsn-directus-collections) (liens et ordre d'import en phase A).
3. **Token prod avec droits d'écriture** disponible pour les phases B à D (créations d'items) et un accès admin Directus pour les phases A et E (schéma, permissions, réglages d'interface).
4. **Sauvegardes initiales** : export JSON des 55 lignes `election_constituencies` et des 2 lignes `elections`.

## 5. Vue d'ensemble des phases

| Phase | Contenu | Impact front en place |
|---|---|---|
| A | Schéma : import des collections (référentiel versionné, carte électorale, résultats) + champs manuels + levée de la contrainte d'unicité sur `election_constituencies.name` + permissions | Aucun (additif) |
| B | Données — référentiel versionné : 745 entités et leurs versions en vigueur, événements fondateurs, graphies, 553 observations de population ; création des 553 circonscriptions communales ; slugs et FK `geo_entity` | Aucun (le code en place ne lit ni les slugs ni la FK) |
| C | Données — fichier électoral 2024 (2 lignes) + 16 440 bureaux + rattachement des 2 élections | Aucun (collections non lues par le code en place) |
| D | Données — 46 résultats législatives (copie interne de `carte`) | Aucun |
| E | Déploiement du code (exige A-D **et** la migration candidats/coalitions) + réglages de saisie CMS | Bascule de lecture — vérifications complètes |
| F | Nettoyage : suppression des champs legacy `region` et `parent` de `election_constituencies` (après observation) | Aucun si E est stable |

Ordre strict A → B → C → D → E → F. Chaque phase est validée avant lancement et vérifiée avant de passer à la suivante.

## 6. Phase A — Schéma

### 6.1 Import des 7 collections (Schema Management Module)

Importer les schémas JSON, **dans cet ordre** (dépendances de FK) :

| Ordre | Collection | Fichier JSON | Points notables |
|-------|------------|--------------|-----------------|
| 1 | `geo_entities` | JSON du repo de schémas | Identité stable : `slug` (unique), `level`, `country`, `name_current`, `official_code`, `notes`. Inclut le dossier Directus « Geography » |
| 2 | `geo_events` puis `geo_event_entities` | JSON du repo de schémas | Décrets fondateurs (`slug`, `type`, `effective_date`, `signature_date`, `publication_date_jo`, `reason`, `source_document` → `documents`) et rôle des entités dans l'événement. À importer avant les versions, qui les référencent |
| 3 | `geo_entity_versions`, `geo_entity_names`, `geo_demographic_observations` | JSON du repo de schémas | L'état daté (`name`, `parent`, `chef_lieu`, `ville`, `valid_from`/`valid_to`, `valid_from_precision`, `source_event`, `uk`, `open_key`), les graphies (`name`, `name_normalized`, `source`, `uk`) et la population (`year`, `observation_type`, `source_edition`, `population`, `male`, `female`, `households`, `compounds`, `extra_indicators`, `uk`) |
| 4 | `election_electoral_files` | [election_electoral_files.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_electoral_files.json) | `name`, `scope` (national/diaspora), `year`, `revision_type`, `period_start`, `period_end`, `document` (M2O nullable → `documents`), `notes` |
| 5 | `election_polling_stations` | [election_polling_stations.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_polling_stations.json) | `polling_place`, `office_number`, `voters`, `municipality`, `implantation`, `country`, `locality`, `diplomatic_representation` + FK `electoral_file` et `constituency` |
| 6 | `election_constituency_results` | [election_constituency_results.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_constituency_results.json) | FK `election`, `constituency`, `winning_coalition`, `winning_list` + `voters`, `seat`, participations horaires + les indicateurs (`voters_count`, `null_ballots`, `valid_votes`, `participation_rate`, `winning_votes`, `winning_percentage`) + les 7 champs de second tour (`round_2_*`, dont la FK `round_2_winning_coalition`) |
| 7 | `election_constituency_coalition_results` | [election_constituency_coalition_results.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_constituency_coalition_results.json) | FK `result` (→ `election_constituency_results`, NO ACTION) et `coalition` (→ `election_coalition`, NO ACTION), `round`, `votes`, `percentage` |

Notes :

- les fichiers de la carte électorale et des résultats portent des relations vers des collections existantes (`documents`, `elections`, `election_constituencies`, `election_coalition`, `election_electoral_lists`) : vérifier après chaque import que ces relations sont bien présentes — sinon les créer manuellement (M2O, on delete SET NULL, sauf les deux FK de `election_constituency_coalition_results` qui sont en NO ACTION).
- `geo_entities.official_code` (accueil d'une future codification officielle) reste **vide** : aucune codification n'est posée à ce stade. Voir `docs/modules/elections/elections-model.md` section 5️⃣bis pour l'état du référentiel.

Vérifications après import : toutes les collections existent et sont vides ; chaque FK a un `schema` non nul (contrainte SQL réelle, pas une simple meta) ; le front prod est inchangé.

### 6.2 Champs manuels sur les collections existantes

Sur `elections` (Settings → Data Model) :

- `electoral_file_national` : M2O nullable → `election_electoral_files`, on delete SET NULL ;
- `electoral_file_diaspora` : idem.

Sur `election_constituencies` :

- `slug` : string, **unique**, nullable ;
- `geo_entity` : M2O nullable vers `geo_entities`, **on delete RESTRICT**. L'interface Directus ne propose pas cette valeur : passer par l'API en renvoyant le **bloc de schéma complet**, une modification partielle d'une relation supprimant la contrainte au lieu de la modifier. Interface recommandée : liste déroulante au gabarit `{{level}} ({{name_current}})`, qui lève l'ambiguïté entre une commune et l'arrondissement homonyme à la saisie.

### 6.3 Levée de la contrainte d'unicité sur `election_constituencies.name`

La prod porte une contrainte SQL d'unicité sur `name`. Les 553 communes comportent des homonymes inter-départements (Mlomp, Médina Gounass, Dinguiraye, Missirah, Vélingara…) : **la phase B échouerait**. Vérifier ensuite que le champ n'est plus marqué unique et que l'admin accepte toujours l'édition d'un nom. L'unicité de l'identité publique est désormais portée par `slug` (unique, posé en phase B).

### 6.4 Permissions

Donner au rôle public (celui qui sert les API du site) la **lecture** sur les nouvelles collections — dont `geo_entities`, `geo_entity_versions` et `geo_demographic_observations`, les trois que l'instantané serveur interroge ; `geo_entity_names`, `geo_events` et `geo_event_entities` ne sont lues par aucun endpoint, à l'identique des permissions d'`election_constituencies`. Sans cela, les endpoints renverront des réponses vides sans erreur visible après la bascule (les erreurs 403 de Directus sont avalées par les handlers). Vérification : un GET anonyme sur chaque collection répond 200.

## 7. Phase B — Référentiel géographique versionné

Exécution depuis la racine du repo `vpsn-scripts`, le fichier `elections/.env` pointant la prod
avec le token d'écriture (section prod active, les autres commentées). Trois étapes, dans cet
ordre : le référentiel, puis les circonscriptions communales, puis le rattachement.

**Principe inchangé** : aucune donnée n'est copiée depuis un autre environnement. La production
constitue son référentiel depuis les sources versionnées (décrets et recensement) et ses propres
lignes.

### 7.1 Peuplement du référentiel (chaîne du référentiel géographique, hors de ce repo)

Ce peuplement est réalisé par la chaîne dédiée du référentiel géographique, pas par les scripts
électoraux. Il est un **prérequis** de la suite, et son contenu attendu est le suivant, dans cet
ordre :

1. **Les événements fondateurs** (`geo_events`) : le décret de référence qui republie l'état
   complet du découpage, puis les textes de modification postérieurs. Chacun porte sa date
   d'effet, sa date de signature, sa date de publication au Journal officiel et son
   `source_document` — **aucune donnée sans source** ;
2. **Les 745 entités** (`geo_entities`) : 14 régions, 46 départements, 127 arrondissements,
   553 communes, 5 villes. `slug` construit à la création sous la forme
   `<niveau>-<nom>-<département parent>` et **jamais recalculé** ; `name_current` en graphie du
   Journal officiel ; `official_code` laissé vide ;
3. **Les versions en vigueur** (`geo_entity_versions`) : une par entité, `valid_to` nul, portant
   le `parent` — c'est la seule table qui porte la hiérarchie. Plus les versions fermées des
   entités déjà modifiées par un texte postérieur ;
4. **Les graphies** (`geo_entity_names`) : les libellés du Journal officiel, ceux du recensement,
   et ceux des fichiers électoraux. C'est ce qui permettra aux imports futurs de résoudre les
   variantes sans arbitrage (voir [elections-geo-resolution.md](../elections-geo-resolution.md)) ;
5. **La population** (`geo_demographic_observations`) : 553 observations, une par commune,
   recensement 2023. **Aucune observation aux niveaux département et région** : leur population
   est la somme de leurs communes, calculée à la lecture.

Contrôles bloquants : 745 entités et 745 versions en vigueur, une par entité ; 0 entité sans
version ; chaque version pointe un événement, chaque événement un document ; la chaîne
ascendante de chaque commune atteint une région ; population totale 18 154 015 ; 0 slug dupliqué.

### 7.2 Création des circonscriptions communales

La production ne compte que 55 circonscriptions (46 départements et 9 lignes électorales). Les
**553 circonscriptions communales** sont à créer : `type=national`, `nationale_type=commune`,
`slug` unique (slugification du nom, suffixé du département pour les homonymes), `name` en
graphie de la source.

Contrôles bloquants : 608 circonscriptions au total, 608 slugs uniques.

### 7.3 Rattachement des circonscriptions au référentiel

Pose de la FK `geo_entity` sur les 599 circonscriptions géographiques, par résolution du nom, avec le script de rattachement du repo de scripts.

**Règle de résolution** : sur le triplet **(niveau, nom normalisé, parent)**. Une recherche par
nom seul est un défaut — 151 graphies normalisées désignent plusieurs entités de niveaux
différents, et 5 noms de communes sont de vrais homonymes entre départements. Ordre d'essai :
égalité normalisée sur `name_current`, puis sur `geo_entity_names`, puis **arrêt et remontée du
cas** — jamais de résolution silencieuse, jamais de correspondance codée en dur.

**Descente hiérarchique obligatoire** : traiter les départements d'abord, puis les communes
qualifiées par le département *résolu*. Une seule graphie de département non résolue fait
échouer toutes ses communes : 2 graphies de département non résolues suffisent à en bloquer 22.

Les 9 lignes diaspora et Territoire National ne reçoivent **aucune** FK : ce ne sont pas des
lieux. Ne toucher ni `region` ni `parent` (champs legacy, supprimés en phase F).

Contrôles bloquants : 599 circonscriptions rattachées, 9 à null, 0 non résolue ; le niveau de
l'entité correspond au `nationale_type` sur 100 pour cent des lignes ; aucune entité rattachée à
deux circonscriptions ; re-dry-run à 0 changement.

### 7.4 Contours

Les contours sont des fichiers versionnés du repo applicatif, indexés sur le **slug de l'entité
géographique** : `senegal-departements.geojson` (46 features) et `communes-senegal.geojson`
(553 features, dont 4 en géométrie `Point` faute de limite cartographiée). Rien à faire en base.

Contrôle : toute circonscription dont le `geo_slug` n'est pas nul trouve un contour — 0 manquant,
dont 4 servis par un point cliquable.

## 8. Phase C — Fichier électoral 2024 et bureaux de vote

Script `backfill-polling-stations.mjs` (la résolution des départements passe par les graphies du référentiel, cf. prérequis). Actions :

1. **Créer les 2 lignes `election_electoral_files`** (si absentes — recherche par `scope` + `year`) : « Fichier électoral 2024 — national » et « … — diaspora », `year=2024`, statut `published`. Les champs `revision_type`, `period_start`, `period_end`, `notes` et **`document` restent vides** : à compléter éditorialement (voir 8.1).
2. **Rattacher les 2 élections 2024** (résolues par `type` + `year`, jamais par ID) aux 2 fichiers via `electoral_file_national`/`electoral_file_diaspora`, uniquement si la FK est null. Les deux scrutins partagent le même fichier : c'est ce qui rend la page carte électorale de la présidentielle enfin servie.
3. **Copier les 15 633 bureaux nationaux** (`election_map_national`, élection 1) vers `election_polling_stations` : FK `electoral_file` (fichier national) + FK `constituency` résolue par le texte `department` normalisé (+ alias — « BIRKILANE » → circonscription « BIRKELANE ») ; champs repris tels quels (`polling_place`, `office_number`, `voters`, `municipality`, `implantation`). Les collections sources ne sont **jamais modifiées**.
4. **Copier les 807 bureaux diaspora** (`election_map_diaspora`, élection 1) : FK `constituency` résolue par la table pays → zone embarquée dans le script (50 pays couverts, vérifié par simulation) ; champs repris (`polling_place`, `office_number`, `voters`, `country`, `locality`, `diplomatic_representation`).

Contrôles bloquants : 16 440 bureaux créés ; sommes `voters` identiques source/cible (7 033 854 national, 338 040 diaspora) ; répartition par circonscription cohérente (46 départements, 8 zones) ; re-dry-run = 0 changement.

### 8.1 Documents officiels (tâche éditoriale, hors script)

Le champ `document` des 2 fichiers est nullable et reste vide au backfill. Tâche éditoriale à faire ensuite : retrouver les arrêtés officiels portant la carte électorale 2024 dans la collection `documents` de la prod (candidats identifiés à l'audit : ids 8102, 8132, 8142) et rattacher le bon document à chaque fichier (national et diaspora). Si le document voulu n'existe pas dans la collection, les PDF officiels sont disponibles sur le site de la DGE et peuvent y être ajoutés :

- carte nationale : <https://dge.sn/wp-content/uploads/2024/10/Carte_electorale_2024.pdf>
- carte de l'étranger : <https://dge.sn/wp-content/uploads/2024/10/Carte_electorale_etranger_2024.pdf>

## 9. Phase D — Résultats par circonscription

Script `backfill-constituency-results.mjs`. Copie interne 1:1 des 46 lignes `carte` (législatives 2024) vers `election_constituency_results` : FK `election` et `constituency` reprises telles quelles (ce sont déjà des IDs prod), `winning_coalition` = `carte.coalition_gagnante`, `winning_list`, `voters`, `seat` et participations horaires repris tels quels (en prod : `winning_list` et participations null, `seat` rempli sur 31 lignes — c'est l'existant, on ne complète rien). Un couple (élection, circonscription) déjà présent est sauté.

Contrôles bloquants : 46 lignes créées ; 46/46 avec `winning_coalition` ; sommes `voters` identiques à `carte` ; re-dry-run = 0 changement.

Ce qui reste volontairement vide après cette phase (remplissage éditorial, aucune source en base) :

- **résultats de la présidentielle 2024** : la prod n'a aucune donnée de résultats présidentielle par circonscription — les lignes seront saisies dans le CMS quand les chiffres officiels par département auront été sourcés (la carte des résultats de la présidentielle reste vide d'ici là, comme aujourd'hui) ;
- **indicateurs détaillés** (`voters_count`, `null_ballots`, `valid_votes`, `participation_rate`, `winning_votes`, `winning_percentage`) et champs de second tour ;
- **`election_constituency_coalition_results`** : la collection reste vide — les classements complets par coalition exigent de sourcer les données officielles avant toute saisie.

## 10. Phase E — Déploiement du code et réglages CMS

### 10.1 Dépendance : migration du modèle candidats/coalitions

Le code à déployer lit l'identité des candidats via `election_persons` et celle des coalitions via `election_political_entities` : **les phases schéma et données de [2026-07-migration-prod-identites-perennes.md](./2026-07-migration-prod-identites-perennes.md) doivent avoir été exécutées en prod avant le déploiement** (c'est la même branche de code). Les phases A à D du présent plan et celles de l'autre plan sont indépendantes entre elles et peuvent se dérouler dans n'importe quel ordre ; seul le déploiement du code exige que **tout** soit en place.

### 10.2 Déploiement

Déployer la branche. Le code bascule la lecture sur les nouvelles collections :

- résultats et participation lus depuis `election_constituency_results` (le contrat de réponse des endpoints est conservé ; les contours viennent des GeoJSON statiques joints par slug) ;
- bureaux de vote lus depuis `election_polling_stations` via le fichier électoral (les pages carte électorale de la présidentielle et des législatives affichent le même fichier partagé) ;
- hiérarchie et identité géographiques résolues via les FK `geo_*` (le code **exige** le référentiel peuplé — c'est la raison de l'ordre strict des phases).

Les caches Nitro ont été renversionnés côté code : pas de purge manuelle nécessaire.

Vérifications après déploiement (au minimum) : l'onglet carte et l'onglet résultats du dashboard des législatives 2024 (46 départements colorés, popups avec gagnant) ; la page carte électorale — vues nationale et diaspora — pour **les deux scrutins 2024** (mêmes totaux : 15 633 bureaux / 7 033 854 électeurs, 807 / 338 040) ; le drill-down d'un département ; les endpoints de statistiques par département et par pays ; la page d'upload des PV ; aucune erreur d'hydratation en console au refresh.

### 10.3 Réglages de saisie CMS (admin Directus, manuel)

- Sur `election_constituencies` : `name` et `slug` en lecture seule **conditionnelle** (conditions Directus : verrouillés quand une des 3 FK geo est remplie — ils restent éditables pour les 9 lignes diaspora/Territoire national et à la création) ; note de guidage sur les 3 FK geo (« poser la FK en dernier à la création ») ; sur `region` et `parent` : lecture seule + note « Legacy — destiné à la suppression ».
- Ne poser **aucun** `required` sur ces champs (un champ readonly+required bloque la création de lignes).

## 11. Phase F — Nettoyage des champs legacy (après observation)

Après une période d'observation de la phase E sans régression :

1. Export de sauvegarde des 608 lignes `election_constituencies` (avec `region` et `parent`).
2. Vérifier qu'aucun code déployé ne lit plus `region` ni `parent` (le code de la branche ne les référence plus).
3. Supprimer les 2 champs `region` et `parent` de `election_constituencies` (admin Directus, Settings → Data Model).

Le décommissionnement des collections `carte`, `election_map_national` et `election_map_diaspora` n'est **pas** couvert par ce plan : il fera l'objet d'une procédure dédiée (vérification zéro lecture résiduelle par grep et logs, sauvegarde complète, puis suppression), après une période d'observation plus longue.

## 12. Récapitulatif des vérifications de bout en bout

| Vérification | Valeur attendue |
|---|---|
| `election_constituencies` | 608 lignes, 608 slugs uniques, 599 FK `geo_entity` posées, 9 lignes sans FK |
| `geo_entities` / `geo_entity_versions` | 745 entités / 745 versions en vigueur (une par entité) |
| `geo_demographic_observations` | 553 observations, population totale 18 154 015 |
| `election_electoral_files` | 2 lignes (national + diaspora, 2024), rattachées aux 2 élections |
| `election_polling_stations` | 16 440 (15 633 national + 807 diaspora) ; sommes voters 7 033 854 / 338 040 |
| `election_constituency_results` | 46 lignes (législatives 2024), 46 gagnants |
| `election_constituency_coalition_results` | 0 ligne (remplissage éditorial ultérieur) |
| Jointure contours | 46/46 features départementales et 553/553 features communales résolues par le slug du référentiel |
| Re-dry-run de chaque script | 0 changement |

---

**Auteur** : Vie Publique Sénégal

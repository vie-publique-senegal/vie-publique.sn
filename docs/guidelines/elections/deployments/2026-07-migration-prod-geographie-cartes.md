# Migration prod — Géographie, carte électorale et résultats par circonscription (plan unifié)

> **Statut** : prêt à exécuter, phase par phase, chaque phase validée avant lancement.
> **Rédigé le** : 2026-07-16, sur la base d'un audit en lecture seule exécuté le jour même directement contre la prod, et de simulations en lecture seule des résolutions de données (chaque résolution de nom rejouée contre les données prod réelles avant écriture du plan).

---

## 1. Objectif et périmètre

Aligner la prod sur le modèle géographique et cartographique cible, déjà en place et vérifié sur l'environnement de développement :

| Objet métier | Avant (prod actuelle) | Après |
|---|---|---|
| Référentiel géographique (régions, départements, communes) | Inexistant — `election_constituencies` porte des champs texte dénormalisés (`region`) et une hiérarchie jamais renseignée (`parent`) | 3 collections dédiées `geo_regions` / `geo_departments` / `geo_municipalities` à hiérarchie typée, référencées par `election_constituencies` via 3 FK |
| Circonscriptions | 55 lignes sans slug ni rattachement géographique | 608 lignes (46 départements + 553 communes + 8 zones diaspora + 1 Territoire National) avec `slug` unique, clé publique des URLs et de la jointure des contours |
| Contours | Polygones dupliqués par élection dans `carte.Position` | Fichiers GeoJSON statiques versionnés dans le repo (`public/geo/senegal-departements.geojson`, `public/geo/senegal-communes-contours.geojson`), joints par `slug` |
| Carte électorale (lieux et bureaux de vote) | `election_map_national` (15 633) + `election_map_diaspora` (807), rattachées à une seule élection — la page carte électorale de la présidentielle 2024 est vide | `election_electoral_files` (fichier électoral pérenne, décliné national/diaspora, partagé entre scrutins) + `election_polling_stations` (16 440 bureaux) — les deux élections 2024 partagent le même fichier |
| Résultats par circonscription | `carte` (46 lignes, législatives 2024 uniquement) | `election_constituency_results` (gagnant, sièges, indicateurs de participation et de dépouillement, second tour) + `election_constituency_coalition_results` (classement complet des coalitions, à remplir quand les données seront sourcées) |

**Principe cardinal de cette migration : aucune donnée n'est importée depuis l'environnement de développement.** La prod migre ses propres données vers les bonnes collections (copie interne), complétées uniquement par deux sources versionnées dans le repo de scripts : le fichier ANSD 2023 des communes et la table d'alias de graphies géographiques. Tout champ dont la prod ne possède pas la donnée (document officiel du fichier électoral, résultats de la présidentielle, indicateurs détaillés, classements par coalition, périodes de révision) **reste vide et sera rempli éditorialement** — jamais copié depuis le dev.

Hors périmètre de ce plan : la suppression des collections `carte`, `election_map_national` et `election_map_diaspora` (décommissionnement ultérieur, après période d'observation et vérification qu'aucune lecture résiduelle ne subsiste) ; la migration du modèle candidats/coalitions, qui a son propre plan ([2026-07-migration-prod.md](./2026-07-migration-prod.md)) — voir la dépendance en phase E.

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
- Aucune des 7 collections cibles n'existe : `geo_regions`, `geo_departments`, `geo_municipalities`, `election_electoral_files`, `election_polling_stations`, `election_constituency_results`, `election_constituency_coalition_results`.
- Documents : la collection `documents` contient notamment les arrêtés 2024 de la carte électorale (ids 8102, 8132, 8142, tous `published`) — voir phase C pour leur usage éditorial.

## 4. Prérequis (avant la phase A)

1. **Scripts et données** : par convention d'équipe, aucun script ne vit dans le repo applicatif — les scripts d'exploitation électoraux et leurs données sources vivent dans le repo [vpsn-scripts](https://github.com/vie-publique-senegal/vpsn-scripts), dossier `elections/` (mode d'emploi dans son README ; les commandes s'exécutent depuis la racine de ce repo). Un runbook d'exécution condensé accompagne ce plan : `elections/MIGRATION-PROD.md` dans ce même repo. Sont utilisés par ce plan :
   - `backfill-geo-referential-prod.mjs` — prêt (dry-run vérifié ; échoue proprement en 403 tant que la phase A n'est pas faite, c'est attendu) ;
   - `backfill-geo-municipalities-ansd.mjs` — prêt (dry-run vérifié) ;
   - `backfill-polling-stations.mjs` — prêt : la résolution des départements passe par la table d'alias (la graphie « BIRKILANE » des bureaux prod ne correspond plus au nom « BIRKELANE » du référentiel après renommage) ;
   - `backfill-constituency-results.mjs` — prêt : copie 1:1 seule (la population départementale vit sur `geo_departments`, posée en phase B) ;
   - `elections/data/communes_senegal_2023.json` (source ANSD 2023, 553 communes) et `elections/data/geo-name-aliases.json` (table d'alias des graphies, départements et communes).
2. **Exports JSON de schéma** : les 7 collections à importer sont dans le repo [vpsn-directus-collections](https://github.com/vie-publique-senegal/vpsn-directus-collections) (liens et ordre d'import en phase A).
3. **Token prod avec droits d'écriture** disponible pour les phases B à D (créations d'items) et un accès admin Directus pour les phases A et E (schéma, permissions, réglages d'interface).
4. **Sauvegardes initiales** : export JSON des 55 lignes `election_constituencies` et des 2 lignes `elections`.

## 5. Vue d'ensemble des phases

| Phase | Contenu | Impact front en place |
|---|---|---|
| A | Schéma : import des 7 collections + champs manuels + levée de la contrainte d'unicité sur `election_constituencies.name` + permissions | Aucun (additif) |
| B | Données — référentiel géographique : 14 régions, 46 départements, 553 communes ; slugs et FK sur les circonscriptions ; renommage Birkelane | Aucun (le code en place ne lit ni les slugs ni les FK) |
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
| 1 | `geo_regions` | [geo_regions.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/geo_regions.json) | Inclut le dossier Directus « Geography ». `name`, `population`, statut/audit |
| 2 | `geo_departments` | [geo_departments.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/geo_departments.json) | Mêmes champs + `region` (M2O requis → `geo_regions`, RESTRICT) |
| 3 | `geo_municipalities` | [geo_municipalities.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/geo_municipalities.json) | `name`, `slug` (unique), `code`, `population` + `department` (M2O requis → `geo_departments`, RESTRICT). Le slug est conservé à ce niveau : des communes homonymes existent dans des départements différents |
| 4 | `election_electoral_files` | [election_electoral_files.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_electoral_files.json) | `name`, `scope` (national/diaspora), `year`, `revision_type`, `period_start`, `period_end`, `document` (M2O nullable → `documents`), `notes` |
| 5 | `election_polling_stations` | [election_polling_stations.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_polling_stations.json) | `polling_place`, `office_number`, `voters`, `municipality`, `implantation`, `country`, `locality`, `diplomatic_representation` + FK `electoral_file` et `constituency` |
| 6 | `election_constituency_results` | [election_constituency_results.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_constituency_results.json) | FK `election`, `constituency`, `winning_coalition`, `winning_list` + `voters`, `seat`, participations horaires + les indicateurs (`voters_count`, `null_ballots`, `valid_votes`, `participation_rate`, `winning_votes`, `winning_percentage`) + les 7 champs de second tour (`round_2_*`, dont la FK `round_2_winning_coalition`) |
| 7 | `election_constituency_coalition_results` | [election_constituency_coalition_results.json](https://github.com/vie-publique-senegal/vpsn-directus-collections/blob/main/election_constituency_coalition_results.json) | FK `result` (→ `election_constituency_results`, NO ACTION) et `coalition` (→ `election_coalition`, NO ACTION), `round`, `votes`, `percentage` |

Notes :

- les fichiers 4 à 7 portent des relations vers des collections existantes (`documents`, `elections`, `election_constituencies`, `election_coalition`, `election_electoral_lists`) : vérifier après chaque import que ces relations sont bien présentes — sinon les créer manuellement (M2O, on delete SET NULL, sauf les deux FK de `election_constituency_coalition_results` qui sont en NO ACTION).

Vérifications après import : les 7 collections existent et sont vides ; chaque FK a un `schema` non nul (contrainte SQL réelle, pas une simple meta) ; le front prod est inchangé.

### 6.2 Champs manuels sur les collections existantes

Sur `elections` (Settings → Data Model) :

- `electoral_file_national` : M2O nullable → `election_electoral_files`, on delete SET NULL ;
- `electoral_file_diaspora` : idem.

Sur `election_constituencies` :

- `slug` : string, **unique**, nullable ;
- `geo_region`, `geo_department`, `geo_municipality` : M2O nullables vers les 3 collections geo.

### 6.3 Levée de la contrainte d'unicité sur `election_constituencies.name`

La prod porte une contrainte SQL d'unicité sur `name`. Les 553 communes comportent des homonymes inter-départements (Mlomp, Médina Gounass, Dinguiraye, Missirah, Vélingara…) : **la phase B échouerait**. Vérifier ensuite que le champ n'est plus marqué unique et que l'admin accepte toujours l'édition d'un nom. L'unicité de l'identité publique est désormais portée par `slug` (unique, posé en phase B).

### 6.4 Permissions

Donner au rôle public (celui qui sert les API du site) la **lecture** sur les 7 nouvelles collections, à l'identique des permissions d'`election_constituencies`. Sans cela, les endpoints renverront des réponses vides sans erreur visible après la bascule (les erreurs 403 de Directus sont avalées par les handlers). Vérification : un GET anonyme sur chaque collection répond 200.

## 7. Phase B — Référentiel géographique

Deux scripts, exécutés dans cet ordre, depuis la racine du repo `vpsn-scripts` — le fichier `elections/.env` pointant la prod avec le token d'écriture (section prod active, les autres commentées).

### 7.1 `backfill-geo-referential-prod.mjs` (régions, départements, enrichissement des circonscriptions)

Le script embarque ses tables de référence (noms, rattachements, slugs attendus) et n'invente rien : les populations départementales proviennent de `carte.population` (donnée prod existante, déplacée au bon endroit), les populations régionales restent vides, les populations communales viendront de l'ANSD (7.2).

Actions, dans l'ordre :

1. **Créer les 14 `geo_regions`** (graphie accentuée : Dakar, Diourbel, Fatick, Kaffrine, Kaolack, Kédougou, Kolda, Louga, Matam, Saint-Louis, Sédhiou, Tambacounda, Thiès, Ziguinchor), `population` null, statut `published`.
2. **Renommer la circonscription « BIRKILANE » en « BIRKELANE »** (graphie officielle du département — sauvegarde de la ligne avant modification). C'est le seul renommage : les 45 autres noms prod correspondent déjà, à la normalisation près, au référentiel.
3. **Créer les 46 `geo_departments`** : nom repris de la circonscription prod correspondante (égalité normalisée + table d'alias), FK `region` posée d'après la table de rattachement embarquée, `population` copiée depuis `carte.population` de la ligne carte du département.
4. **Enrichir les 55 circonscriptions existantes** :
   - poser `slug` sur les 46 départements (slugification du nom : `dakar`, `birkelane`, `medina-yoro-foulah`…) — ces slugs sont la clé de jointure des 46 features de `public/geo/senegal-departements.geojson` ;
   - poser `slug` sur les 8 zones diaspora (`afrique-australe`, `afrique-centre`, `afrique-nord`, `afrique-ouest`, `amerique-oceanie`, `asie-moyen-orient`, `europe-du-sud`, `europe-ouest-centre-nord`) et sur « Territoire national » (`territoire-national`) ;
   - poser `geo_department` sur les 46 lignes départementales. Les 9 lignes diaspora/Territoire national ne reçoivent **aucune** FK geo (ce ne sont pas des unités administratives).
   - Ne toucher ni `region` ni `parent` (champs legacy, supprimés en phase F — ne jamais les remplir).

Contrôles bloquants de fin de script : 14 régions, 46 départements ; 55 slugs posés, tous uniques ; `geo_department` rempli sur exactement 46 lignes, les 3 FK null sur les 9 autres ; chaque `slug` des 46 features du GeoJSON départemental résout vers une circonscription.

### 7.2 `backfill-geo-municipalities-ansd.mjs` (communes)

Crée les communes depuis la source ANSD 2023 (`data/communes_senegal_2023.json`) : **553 `geo_municipalities`** (nom, slug, population ANSD, FK `department` résolue par égalité normalisée + table d'alias `data/geo-name-aliases.json`) et **553 `election_constituencies`** (`type=national`, `nationale_type=commune`, slug identique, FK `geo_municipality`). Les collisions de slug entre communes homonymes sont résolues par suffixe du département (`<commune>-<departement>`). Idempotent, résolution bloquante (un département ANSD non résolu arrête tout avant écriture).

Contrôles bloquants : 553 + 553 créées ; population totale = 18 152 795 (total RGPH 2023) ; 0 doublon de slug sur l'ensemble des 608 circonscriptions ; exactement une FK geo par ligne communale ; re-dry-run = 0 changement.

Note sur les contours : `public/geo/senegal-communes-contours.geojson` compte 539 features — certaines communes du référentiel n'ont pas encore de contour versionné (aucune source ouverte au niveau communal à ce jour) ; c'est attendu et sans impact (la carte n'affiche simplement pas ces polygones). Contrôle : chaque feature du fichier résout par `slug` vers une circonscription communale.

## 8. Phase C — Fichier électoral 2024 et bureaux de vote

Script `backfill-polling-stations.mjs` (la résolution des départements passe par la table d'alias, cf. prérequis). Actions :

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

Le code à déployer lit l'identité des candidats via `election_persons` et celle des coalitions via `election_political_entities` : **les phases schéma et données de [2026-07-migration-prod.md](./2026-07-migration-prod.md) doivent avoir été exécutées en prod avant le déploiement** (c'est la même branche de code). Les phases A à D du présent plan et celles de l'autre plan sont indépendantes entre elles et peuvent se dérouler dans n'importe quel ordre ; seul le déploiement du code exige que **tout** soit en place.

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
| `election_constituencies` | 608 lignes, 608 slugs uniques, 46 `geo_department` + 553 `geo_municipality`, 9 lignes sans FK geo |
| `geo_regions` / `geo_departments` / `geo_municipalities` | 14 / 46 / 553 |
| Population communale totale | 18 152 795 |
| `election_electoral_files` | 2 lignes (national + diaspora, 2024), rattachées aux 2 élections |
| `election_polling_stations` | 16 440 (15 633 national + 807 diaspora) ; sommes voters 7 033 854 / 338 040 |
| `election_constituency_results` | 46 lignes (législatives 2024), 46 gagnants |
| `election_constituency_coalition_results` | 0 ligne (remplissage éditorial ultérieur) |
| Jointure contours | 46/46 features départementales et 539/539 features communales résolues par slug |
| Re-dry-run de chaque script | 0 changement |

---

**Auteur** : Vie Publique Sénégal

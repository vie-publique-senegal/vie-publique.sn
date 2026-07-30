# Carte électorale, fichier électoral et résultats - architecture

**Dernière mise à jour** : 2026-07-29

> Comment le site modélise et sert la géographie électorale du Sénégal : le fichier
> électoral (et sa carte électorale), les bureaux de vote, les circonscriptions,
> les contours cartographiques et les résultats par circonscription.

## 1. Concepts métier

Au Sénégal, le **fichier électoral** est le registre des électeurs tenu par la
Direction de l'Automatisation des Fichiers (DAF). Il est périodiquement mis à jour
par des **révisions** (ordinaires ou exceptionnelles). Chaque révision fixe, par
arrêté, une **carte électorale** : la liste des lieux de vote et des bureaux de vote,
avec leurs électeurs inscrits. Deux cartes distinctes sont produites : une pour le
territoire **national**, une pour la **diaspora** (les Sénégalais de l'étranger).

Point structurant : **la carte électorale n'appartient pas à un scrutin**. Plusieurs
élections peuvent se tenir sur la même révision - la présidentielle de mars 2024 et
les législatives de novembre 2024 ont utilisé le même fichier. Le modèle du site
reflète cette réalité : les élections *pointent* une révision, elles ne la portent pas.

Les **résultats**, en revanche, appartiennent à un scrutin : le site conserve, pour
chaque élection et chaque circonscription, la coalition arrivée en tête (« gagnant
seul » - le détail des voix par coalition et circonscription n'est pas modélisé).

## 2. Modèle de données (CMS Directus)

| Collection | Rôle | Cycle de vie |
|---|---|---|
| `election_electoral_files` | Une ligne = un fichier électoral (une révision × un scope). Champs : `name`, `scope` (`national`/`diaspora`), `year`, `revision_date`, `document` (M2O → `documents`, l'arrêté officiel consultable), `notes` | Pérenne, partagé entre élections |
| `elections` | Les scrutins. Deux FK nullables pointent la révision utilisée : `electoral_file_national` et `electoral_file_diaspora` | Par scrutin |
| `election_polling_stations` | Une ligne = un bureau de vote d'un fichier électoral. FK `electoral_file` + FK `constituency` (département au national, zone à l'étranger). Textes descriptifs conservés : `municipality`, `implantation` (national), `country`, `locality`, `diplomatic_representation` (diaspora) | Par fichier électoral |
| `election_constituencies` | Les circonscriptions : 46 départements, 553 communes, 8 zones de la diaspora et Territoire National. Champs propres : `slug` (clé d'URL publique), `name` (graphie des fichiers électoraux), `nationale_type`, `seats`. Identité affichée (nom, population, hiérarchie parent/région) **déléguée au référentiel géographique versionné** via la FK unique `geo_entity`, résolue par `resolveGeoUnit()` (voir section 2.1) | Pérenne (change aux redécoupages) |
| `election_constituency_results` | Une ligne = le résultat d'une élection dans une circonscription : FK `election` + `constituency`, `winning_coalition` (la participation gagnante), `winning_list`, `voters`, `seat`, relevés horaires `participation_10h/12h/14h/17h`. Unicité métier : 1 ligne par (élection, circonscription) | Par élection × circonscription |
| `election_constituency_coalition_results` | Détail du classement complet : une ligne = le score d'une coalition dans une circonscription pour un tour (FK `result` → `election_constituency_results`, `coalition`, `round`, `votes`, `percentage`). Saisie éditoriale au fil de l'eau, peut être vide sans que ce soit une erreur | Par élection × circonscription × coalition × tour |

Ce que ce modèle garantit :

- **une révision saisie une fois** sert toutes les élections qui s'y rattachent;
- les bureaux sont **rattachés au référentiel par FK** (plus de jointures par chaîne
  de caractères sur des noms de départements) ;
- les résultats sont **normalisés** par circonscription et reliés aux entités
  politiques via la participation gagnante (`election_coalition` → `political_entity`).

### 2.1 Le référentiel géographique versionné

L'identité géographique ne vit pas dans le module électoral : elle est déléguée à un
référentiel générique, versionné dans le temps, que les circonscriptions référencent par
la seule FK `election_constituencies.geo_entity` (599 lignes sur 608).

| Collection | Rôle |
|---|---|
| `geo_entities` | 745 entités : 14 régions, 46 départements, 127 arrondissements, 553 communes, 5 villes. Identité stable : `slug`, `level`, `name_current` (nom en vigueur, dénormalisé), `country` |
| `geo_entity_versions` | L'état **daté** de chaque entité : `name`, `parent`, `chef_lieu`, `ville`, `valid_from`/`valid_to`, `source_event`. Version en vigueur = `valid_to` nul. **Seule table qui porte la hiérarchie** |
| `geo_events` / `geo_event_entities` | Les textes fondateurs (décrets) de chaque changement. Non lus par le site |
| `geo_entity_names` | Les graphies alternatives, par source (voir [elections-geo-resolution.md](./elections-geo-resolution.md)). Non lue par le site |
| `geo_demographic_observations` | Population par entité, année et source. **Niveau commune uniquement** (553 lignes, recensement 2023) |

Trois conséquences structurantes :

- **la population d'un département ou d'une région est la somme de ses communes**, calculée
  à la lecture, jamais stockée ;
- **le parent d'une commune est son arrondissement** dans 497 cas sur 553. Les endpoints
  n'exposent jamais l'arrondissement : `resolveGeoUnit()` remonte au **premier ancêtre de
  niveau département**, et à la région au-dessus ;
- **les 9 lignes purement électorales** (8 zones de diaspora, Territoire National) n'ont pas
  d'entité géographique : leur `geo_entity` est nul et leur identité vient de leurs propres
  champs. Ce repli est permanent, et c'est aussi lui qui fait fonctionner le code sur un
  environnement où le référentiel n'est pas déployé.

`geo_entities` n'expose **aucune relation inverse** : ni la hiérarchie ni la population ne sont
lisibles par expansion Directus. La lecture passe par un **instantané mis en cache**
(`server/utils/geoSnapshot.ts`), construit en 3 requêtes (entités, versions en vigueur,
observations) et exploité en mémoire.

## 3. Contours cartographiques (fichiers statiques)

Les polygones ne sont **pas stockés dans le CMS** : ce sont des GeoJSON statiques
versionnés dans `public/geo/`, joints aux données par le **slug de l'entité géographique**
(propriété `slug` de chaque feature, exposée par les API sous la clé `geo_slug`).

| Fichier | Contenu | Propriétés |
|---|---|---|
| `senegal-departements.geojson` | Les **46 départements** du découpage actuel (Keur Massar inclus, créé en 2021) | `slug`, `name`, `level`, `parent` (slug de région), `code` (pcode) |
| `communes-senegal.geojson` | Les **553 communes** : 549 polygones et 4 points | `slug`, `name`, `level`, `parent` (slug de département), `country`, `source`, `match_method`, `precision`, `note` |
| `communes-senegal-labels.geojson` | 553 points d'étiquetage (point d'inaccessibilité du polygone), calque de libellés des cartes génériques | `slug`, `name`, `level`, `parent` |
| `senegal-regions.geojson` | Les 14 régions (fond des cartes génériques) | `code`, `name` |

Provenance et limites :

- les contours communaux viennent d'**OpenStreetMap** (complétés par GADM pour 4 communes
  absentes d'OSM), nettoyés topologiquement et simplifiés avec mapshaper : **0 chevauchement,
  0 trou, 0 géométrie invalide**, union des surfaces 197 853 km² pour un pays de 196 712 km² ;
- les **pcodes** (`code`) des régions et départements viennent du référentiel humanitaire
  OCHA COD-AB (v02, 2024) ;
- **4 communes n'ont pas de limite cartographiée** — Sibassor (Kaolack), Ndombo Sandjiry
  (Dagana), Guédé Chantier (Podor), Samine (Goudomp). Elles portent une géométrie `Point`
  (leur chef-lieu) et `precision: approx_point`. La carte les affiche en **point cliquable**
  avec mention explicite, jamais en polygone : elles sont exclues du calque de remplissage.
  Pour Sibassor, la seule limite disponible était celle de l'arrondissement homonyme, écartée
  à dessein plutôt que de publier un polygone faux ;
- un redécoupage administratif = une mise à jour de ces fichiers (versionnée en git) + les
  nouvelles entités et versions du référentiel.

## 4. Lecture API

### 4.1 Bureaux de vote - résolution par fichier électoral

Les endpoints bureaux (`/api/elections/map/*`, `/api/elections/diaspora/*`,
`/api/elections/pvs-upload/*`) lisent `election_polling_stations` en résolvant la
source ainsi (util partagé `server/utils/electionElectoralFile.ts`) :

1. paramètre **`electoral_file`** explicite (prioritaire) - utilisé par la page carte
   électorale pilotée par révision ;
2. sinon paramètre **`election`** : lecture de la FK `electoral_file_national` ou
   `electoral_file_diaspora` de l'élection ;
3. sinon (aucun paramètre) : **le fichier publié le plus récent** du scope demandé ;
4. si la résolution échoue (élection sans FK, environnement non migré) : **fallback**
   sur les collections legacy `election_map_national` / `election_map_diaspora`,
   comportement identique à l'ancien système, avec un warn journalisé.

Endpoints principaux :

- `GET /api/elections/electoral-files` : les révisions publiées (paires
  national + diaspora par année), leurs élections rattachées et leurs arrêtés -
  alimente la page carte électorale ;
- `GET /api/elections/map/national?groupBy=department` : stats par département
  (électeurs, bureaux, lieux, communes) + `slug`/`population`/`region` du référentiel ;
  `groupBy=municipality&department=X` : stats par commune d'un département ;
  `department=X` seul : liste des bureaux du département ;
- `GET /api/elections/map/summary` : totaux national + diaspora ;
- `GET /api/elections/diaspora/zones` : les 8 circonscriptions de l'étranger avec
  agrégats ; `GET /api/elections/diaspora/countries?zone=<slug>` : les pays d'une
  zone ; `country-stats`/`country-details` : le détail d'un pays ;
- `GET /api/elections/pvs-upload/regions|departments` : la hiérarchie vient du
  **référentiel** — les entités de niveau région, puis les circonscriptions dont l'entité
  descend de la région demandée (résolution dans l'instantané, la hiérarchie n'étant pas
  filtrable côté Directus). L'étape « département » renvoie le **nom de la circonscription**,
  pas celui du référentiel : sa valeur est réinjectée comme filtre à l'étape suivante.

### 4.2 Résultats

- `GET /api/carte/result?election=<id>` : les lignes `election_constituency_results`
  de l'élection. Clés de réponse historiques conservées pour le front :
  `coalition_gagnante` (identité fusionnée via l'entité politique de la participation),
  `constituencie` (avec `slug`, `geo_slug`, `nationale_type`, `region`, `parent` — le nom,
  la hiérarchie et la population résolus via `resolveGeoUnit()` contre l'instantané, pas des
  champs directs de `election_constituencies`), `winning_list` (candidats avec identité
  fusionnée via leur person). **Les polygones ne sont plus servis** : le front joint les
  contours statiques par `constituencie.geo_slug` ;
- `GET /api/carte?election=<id>` : électeurs/bureaux/lieux/population par
  circonscription (bureaux et lieux **recalculés** par agrégation des
  `election_polling_stations` du fichier de l'élection - plus de valeurs dénormalisées) ;
- `GET /api/elections/participation` : relevés horaires de participation par
  département (paramètre `election` optionnel) ;
- `GET /api/elections/results/constituency/[slug]?election=<id>` : classement complet
  des coalitions pour une circonscription (source `election_constituency_coalition_results`,
  complète le « gagnant seul » déjà exposé par `/api/carte/result`) ; réponse
  `{ constituency, round1: [...], round2: [...] | null }`, vide si la collection n'a
  pas été saisie pour cette circonscription.

Si une élection n'a aucune ligne de résultat (environnement non migré), ces trois
endpoints retombent sur la collection legacy `carte` à l'identique.

## 5. Front

### 5.1 Page carte électorale (`/elections-senegal/carte-electorale`)

Pilotée par **révision** (pas par élection) :

- l'URL canonique est `?revision=<année>` ; les anciens liens `?type=&year=` sont
  résolus vers la révision correspondante puis réécrits ;
- s'il n'existe qu'une révision publiée, pas de sélecteur : une **fiche de révision**
  (année, date de révision, électeurs/bureaux/lieux, scrutins rattachés, liens vers
  les arrêtés) ; le sélecteur apparaît dès la deuxième révision ;
- les **arrêtés officiels** sont des liens internes vers leurs pages documents
  (`/documents/<id>/<slug>`), pas des téléchargements directs ;
- onglets : **Nationale** (carte unifiée mode bureaux + vue liste), **Diaspora**
  (grille des 8 zones puis tableau des pays), **Résumé** (totaux).

Les pages de détail (`nationale/<département>`, `diaspora/<pays>`) acceptent deux
contextes de query : `?revision=` (canonique, propagé par la page carte électorale)
ou `?election=` (compat - liens venant d'un contexte d'élection, ex. le dashboard).
Le composable `useElectoralRevision` résout le contexte affiché et le fichier
électoral à interroger ; sans paramètre, la révision la plus récente est utilisée.

### 5.2 Composant carte unifié

`ElectionUnifiedMap` (deck.gl, construit sur le composant générique `SenegalMap`)
remplace les cartes Leaflet des pages `elections-senegal` :

| Mode | Données | Fond |
|---|---|---|
| `offices` | stats bureaux par département | `senegal-departements.geojson` |
| `results` | gagnant par département | idem |
| `results-locale` | gagnant par commune (élections locales) | `communes-senegal.geojson` + bordures départementales |

La jointure données ↔ polygones se fait par le **slug de l'entité géographique**
(`geo_slug` côté données, `properties.slug` côté fichiers ; mécanisme
`joinField`/`geoJoinField` de `SenegalMap`, étendu d'un `geoLevel` par dataset et de sources
GeoJSON surchargeables). `useConstituencyContours` fournit les mêmes contours aux composants
non-deck.gl, en conservant les 4 communes sans polygone sous forme de points afin qu'elles
alimentent le calque de points cliquables au lieu de disparaître silencieusement.

Le mode bureaux n'a **pas de choroplèthe communale** (les bureaux sont rattachés au
département ; le niveau commune est une liste dans le panneau de détail). En mode
locale, l'agrégation par département passe par le `parent` du référentiel, pas par
un rapprochement de noms.

### 5.3 Saisie éditoriale (nouvelle révision / nouveau scrutin)

1. Créer les 2 lignes `election_electoral_files` (national + diaspora) de la révision,
   avec l'arrêté rattaché via `document` ;
2. Importer les bureaux dans `election_polling_stations` (FK fichier + circonscription) ;
3. Pointer les FK `electoral_file_national`/`electoral_file_diaspora` de chaque
   élection concernée - plusieurs scrutins peuvent pointer la même révision ;
4. Après le scrutin, saisir les résultats dans `election_constituency_results`
   (1 ligne par circonscription, coalition gagnante = la participation du scrutin).

## 6bis. La règle de matching DB ↔ carte, en détail

Point central à comprendre : **il n'y a aucune jointure géographique en base**. Le
CMS ne stocke pas de polygone utilisable pour croiser avec un GeoJSON à
la volée. Toute la mécanique repose sur **une seule clé partagée : le slug de l'entité
géographique**, porté par `geo_entities.slug` côté CMS et par la propriété `slug` de chaque
feature GeoJSON côté fichiers statiques. Ce slug est posé à la création d'une entité et
**ne change jamais**, même en cas de renommage : les deux mondes (base et fichiers
`public/geo/`) sont figés indépendamment et ne se retrouvent qu'au moment du rendu, côté
navigateur.

⚠️ **Ne pas confondre les deux slugs.** `election_constituencies.slug` (`dakar-plateau`) est
la clé d'**URL publique** ; `geo_entities.slug` (`commune-dakar-plateau-dakar`) est la clé de
**jointure des contours**, préfixée par le niveau et suffixée par le département parce
qu'elle doit rester unique sur 745 entités de 5 niveaux. Les deux ne sont **jamais dérivés
ni comparés l'un de l'autre** — la FK `geo_entity` est l'unique lien entre les deux objets.
Les API exposent les deux : `slug` pour les liens, `geo_slug` pour la carte.

Il n'y a **aucun join SQL** ni appel réseau qui rapproche directement une ligne
`election_polling_stations`/`election_constituency_results` d'un polygone : le
serveur renvoie des lignes avec un champ `slug` en texte, le client charge le
GeoJSON en parallèle et fait la correspondance en mémoire (`Map` JS), feature par
feature. Si un `slug` diffère d'un seul caractère entre les deux côtés (accent,
tiret), la circonscription existe dans les données mais reste **grise** sur la
carte (`fallback` du `colorScale`) sans erreur visible.

### 6bis.1 Où vit la clé côté DB

- `geo_entities.slug` : la clé de jointure, unique sur les 745 entités, construite à la
  création sous la forme `<niveau>-<nom>-<département parent>` et jamais recalculée ;
- `election_constituencies.geo_entity` : la FK qui relie une circonscription à son entité,
  renseignée sur 599 lignes, nulle sur les 9 lignes purement électorales ;
- `election_constituencies.slug` : la clé d'URL publique, indépendante (voir l'avertissement
  ci-dessus) ;
- `election_polling_stations.constituency` et `election_constituency_results.constituency`
  sont des **FK numériques** vers `election_constituencies.id` — jamais de texte.
  Aucun slug n'est stocké sur ces deux collections : il est résolu **à la lecture**, en
  repassant par le référentiel.

### 6bis.2 Où vit la clé côté fichiers statiques

- `public/geo/senegal-departements.geojson` (46 features) et
  `public/geo/communes-senegal.geojson` (553 features) : chaque feature porte
  `properties.slug`, `name`, `level`, `parent` (slug de l'entité parente) — tous deux
  indexés sur le **même** schéma de slug que `geo_entities`. Contrôle de non-régression :
  toute circonscription dont le `geo_slug` n'est pas nul doit trouver un contour
  (vérifié : 0 manquant, dont 4 servis par un point) ;
- un redécoupage futur doit régénérer les fichiers et les entités ensemble.

### 6bis.3 Parcours complet — mode « Carte » de `/carte-electorale/nationale`

1. La page ([app/pages/elections-senegal/carte-electorale/nationale/index.vue](../../../app/pages/elections-senegal/carte-electorale/nationale/index.vue))
   appelle `useElectoralRevision()`, qui va chercher `/api/elections/electoral-files`
   et en déduit `nationalFileId` = l'`id` de la ligne `election_electoral_files`
   (scope `national`) de la révision affichée ;
2. Elle rend `<ElectionsMapUnifiedMap mode="offices" :electoral-file-id="nationalFileId" />` ;
3. Le composant ([app/components/elections/map/UnifiedMap.vue:139](../../../app/components/elections/map/UnifiedMap.vue))
   appelle `GET /api/elections/map/national?electoral_file=<id>&groupBy=department` ;
4. Le serveur ([server/api/elections/map/national.get.ts:125](../../../server/api/elections/map/national.get.ts))
   fait un `aggregate('election_polling_stations', { groupBy: ['constituency'], filter: { electoral_file } })`
   → une ligne par **id numérique** de circonscription, avec des sommes/comptes
   (`voters`, `office_number`, `polling_place` distincts) mais **aucun nom, aucun slug** ;
5. `getConstituencyNamesById()` ([server/utils/electionElectoralFile.ts:68](../../../server/utils/electionElectoralFile.ts))
   fait une **deuxième requête**, sur `election_constituencies`, filtrée sur les ids
   obtenus à l'étape 4, demandant `id`/`name`/`slug`/`geo_entities`, puis passe chaque ligne
   dans `resolveGeoUnit()` avec l'instantané pour obtenir `population`/`region` — c'est
   **le seul endroit où les slugs apparaissent** dans toute la chaîne bureaux/agrégats ;
6. La réponse `{ department, slug, geo_slug, population, region, count, sum, countDistinct }`
   est mappée côté client en `OfficeMapItem { slug, name, voters, offices, places, ... }` ;
7. `buildElectionMapConfig()` ([app/config/map-elections.ts](../../../app/config/map-elections.ts))
   construit un dataset avec `geoLevel: 'departements'` et une jointure sur le slug du
   référentiel de part et d'autre ;
8. `SenegalMap.vue` charge `public/geo/senegal-departements.geojson` (fond par
   défaut du niveau `departements`, pas de surcharge en mode bureaux) ;
9. **Le join lui-même** a lieu dans [app/composables/useMapLayers.ts](../../../app/composables/useMapLayers.ts) :
   pour chaque item de données, `dataMap.set(<slug du référentiel>, item)` ; pour chaque
   feature GeoJSON, on lit `feature.properties.slug` et on va chercher dans
   `dataMap` — une correspondance trouvée alimente `getFillColor`/le popup, une
   absence laisse la feature dans sa couleur `fallback`, grise.

### 6bis.4 Parcours complet — vue « Résultats » (choroplèthe du gagnant)

Même schéma, source différente :

1. `<ElectionUnifiedMap mode="results" :election-id="..." />` appelle
   `GET /api/carte/result?election=<id>` ;
2. Le serveur ([server/api/carte/result.get.ts](../../../server/api/carte/result.get.ts))
   lit `election_constituency_results` avec les champs `constituency.slug`,
   `constituency.nationale_type` et `constituency.geo_entity` **dans la requête Directus**,
   puis `resolveGeoUnit()` calcule nom, `parent`, `region` et population **contre
   l'instantané** — la hiérarchie n'étant pas traversable par expansion ; la clé de réponse
   `constituency` est renommée `constituencie` pour compat avec l'ancien contrat ;
3. Côté client, `ElectionUnifiedMap.vue` filtre les lignes reçues sur
   `constituencie.nationale_type === 'departement'` (mode `results`) ou
   `'commune'` (mode `results-locale`) — **c'est ce champ qui distingue une carte
   nationale d'une carte communale**, pas un paramètre d'API séparé ;
4. Chaque ligne devient un `ResultMapItem { slug: constituencie.geo_slug, winnerName,
   winnerColor, parentSlug: constituencie.parent.slug, ... }` ;
5. Même mécanique de join que ci-dessus (étape 9 du 6bis.3), sur
   `senegal-departements.geojson` (mode `results`) ou
   `communes-senegal.geojson` (mode `results-locale`) ;
6. Pour le drill-down départemental du mode `results-locale`,
   `aggregateResultsByDepartment()` ([app/config/map-elections.ts](../../../app/config/map-elections.ts))
   regroupe les communes par `parentSlug` — donc par le **`parent` résolu par
   `resolveGeoUnit()`**, c'est-à-dire le premier ancêtre de niveau département dans
   l'instantané (jamais l'arrondissement, jamais un rapprochement de noms). Ce `parentSlug`
   est un slug du référentiel, donc directement comparable aux clés du fichier des
   départements.

### 6bis.5 En une phrase

> Le CMS ne connaît des circonscriptions que par **id numérique** (FK) ; le slug de
> l'**entité géographique** est la seule traduction texte de cet id, résolue à la lecture
> API et exposée sous la clé `geo_slug` ; les fichiers `public/geo/*.geojson` portent le
> **même** slug en dur dans leurs propriétés ; la carte affichée est donc le résultat d'un
> **rapprochement en mémoire côté navigateur** entre deux listes indépendantes qui doivent
> rester synchronisées sur cette seule valeur.

### 6bis.6 L'exception : la route de détail d'un département

La page `/elections-senegal/carte-electorale/nationale/<département>` est le **dernier
endroit du module indexé sur un nom** et non sur un identifiant. Elle est fragile par
construction, et sa fragilité s'est révélée à la bascule : les liens se sont mis à émettre
la graphie du référentiel (`Bignona`, `Kédougou`) alors que les endpoints filtraient en
égalité stricte sur la graphie des fichiers électoraux (`BIGNONA`, `KEDOUGOU`) — page vide,
sans erreur.

Le dispositif en place :

- côté serveur, [`electionConstituencyLookup.ts`](../../../server/utils/electionConstituencyLookup.ts)
  résout un nom reçu **par comparaison normalisée** et indexe les **deux** graphies d'une
  circonscription, puis filtre les bureaux par identifiant. Toute graphie déjà indexée
  continue donc de répondre ;
- côté application, [`shared/geo-name.ts`](../../../shared/geo-name.ts) fournit les deux
  règles, **non interchangeables** : `normalizeGeoName()` pour **comparer**,
  `toHistoricalGeoName()` pour **écrire** une valeur d'URL. `nationalDepartmentPath()` est le
  **seul** constructeur de cette URL, et il émet la graphie historique — celle qui est
  indexée. La canonical de la page s'aligne dessus pour éviter le contenu dupliqué.

Sortie souhaitable à terme : passer cette route au slug de circonscription, avec des
redirections 301 depuis les formes en nom. Non fait à ce jour.

## 7. Transition

Les collections historiques `carte`, `election_map_national` et
`election_map_diaspora` ne sont plus écrites ni lues qu'en **fallback** (environnement
dont les nouvelles collections ne sont pas encore peuplées). Elles seront supprimées,
avec les composants Leaflet restants, lors du décommissionnement final ; les pages
`elections/legislatives/**` (héritées) restent inchangées jusque-là.

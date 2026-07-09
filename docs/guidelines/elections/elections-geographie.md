# Carte électorale, fichier électoral et résultats - architecture

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
| `election_constituencies` | Référentiel hiérarchique des circonscriptions : régions → départements → communes, plus les 8 zones de la diaspora. Champs clés : `slug` (clé publique de jointure), `code` (pcode officiel), `parent`, `population`, `seats` | Pérenne (change aux redécoupages) |
| `election_constituency_results` | Une ligne = le résultat d'une élection dans une circonscription : FK `election` + `constituency`, `winning_coalition` (la participation gagnante), `winning_list`, `voters`, `seat`, relevés horaires `participation_10h/12h/14h/17h`. Unicité métier : 1 ligne par (élection, circonscription) | Par élection × circonscription |

Ce que ce modèle garantit :

- **une révision saisie une fois** sert toutes les élections qui s'y rattachent;
- les bureaux sont **rattachés au référentiel par FK** (plus de jointures par chaîne
  de caractères sur des noms de départements) ;
- les résultats sont **normalisés** par circonscription et reliés aux entités
  politiques via la participation gagnante (`election_coalition` → `political_entity`).

## 3. Contours cartographiques (fichiers statiques)

Les polygones ne sont **pas stockés dans le CMS** : ce sont des GeoJSON statiques
versionnés dans `public/geo/`, joints aux données par le **`slug`** de circonscription
(propriété `slug` de chaque feature, alignée sur `election_constituencies.slug`).

| Fichier | Contenu | Propriétés |
|---|---|---|
| `senegal-departements.geojson` | Les **46 départements** du découpage administratif actuel (Keur Massar inclus, créé en 2021) | `slug`, `name`, `department`, `code` (pcode), `parent` (slug de région) |
| `senegal-communes-contours.geojson` | Les polygones de **539 communes** | `slug`, `name`, `code`, `parent` (slug de département) |
| `senegal-regions.geojson` | Les 14 régions (fond des cartes génériques) | `code`, `name` |
| `senegal-communes.geojson` | Points (centres) de 58 communes - fichier historique des cartes génériques, conservé tel quel | `name`, `department`, `region` |

Provenance et limites :

- les contours départementaux et communaux sont **consolidés à partir des données
  cartographiques du projet**, simplifiés avec mapshaper (objectif ~1 Mo par fichier) ;
- les **pcodes** (`code`) des régions et départements viennent du référentiel
  humanitaire OCHA COD-AB (v02, 2024) ;
- **6 communes n'ont pas de contour connu** (aucune source ouverte au niveau communal :
  geoBoundaries s'arrête à l'ADM3, OCHA aux arrondissements) - elles apparaissent dans
  les données mais pas sur la carte ; toute source future comblera le trou sans
  changement de modèle ;
- un redécoupage administratif = une mise à jour de ces fichiers (versionnée en git)
  + les nouvelles lignes du référentiel.

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
  **référentiel** (lignes régions et leurs départements enfants), plus des textes
  dénormalisés des bureaux.

### 4.2 Résultats

- `GET /api/carte/result?election=<id>` : les lignes `election_constituency_results`
  de l'élection. Clés de réponse historiques conservées pour le front :
  `coalition_gagnante` (identité fusionnée via l'entité politique de la participation),
  `constituencie` (avec `slug`, `nationale_type`, `parent`), `winning_list` (candidats
  avec identité fusionnée via leur person). **Les polygones ne sont plus servis** :
  le front joint les contours statiques par `constituencie.slug` ;
- `GET /api/carte?election=<id>` : électeurs/bureaux/lieux/population par
  circonscription (bureaux et lieux **recalculés** par agrégation des
  `election_polling_stations` du fichier de l'élection - plus de valeurs dénormalisées) ;
- `GET /api/elections/participation` : relevés horaires de participation par
  département (paramètre `election` optionnel).

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
| `results-locale` | gagnant par commune (élections locales) | `senegal-communes-contours.geojson` + bordures départementales |

La jointure données ↔ polygones se fait par `slug` (mécanisme `joinField`/`geoJoinField`
de `SenegalMap`, étendu d'un `geoLevel` par dataset et de sources GeoJSON surchargables).
`useConstituencyContours` fournit les mêmes contours aux composants non-deck.gl.

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
la volée. Toute la mécanique repose sur **une seule clé partagée : `slug`**, portée
par `election_constituencies.slug` côté DB et par la propriété `slug` de chaque
feature GeoJSON côté fichiers statiques. Cette clé a été posée une fois (script
`backfill-constituencies.mjs`) puis n'est plus jamais recalculée : les
deux mondes (base et fichiers `public/geo/`) sont figés indépendamment et ne se
retrouvent qu'au moment du rendu, côté navigateur.

Il n'y a **aucun join SQL** ni appel réseau qui rapproche directement une ligne
`election_polling_stations`/`election_constituency_results` d'un polygone : le
serveur renvoie des lignes avec un champ `slug` en texte, le client charge le
GeoJSON en parallèle et fait la correspondance en mémoire (`Map` JS), feature par
feature. Si un `slug` diffère d'un seul caractère entre les deux côtés (accent,
tiret), la circonscription existe dans les données mais reste **grise** sur la
carte (`fallback` du `colorScale`) sans erreur visible.

### 6bis.1 Où vit la clé côté DB

- `election_constituencies.slug` : unique, nullable (ex. `kaolack`,
  `medina-yoro-foulah`, pour les 45 collisions de noms communaux → suffixe
  département type `kaolack-kaolack`) ;
- `election_polling_stations.constituency` et `election_constituency_results.constituency`
  sont des **FK numériques** vers `election_constituencies.id` — jamais de texte.
  Le `slug` n'est donc jamais stocké sur ces deux collections : il est résolu **à
  la lecture**, en repassant par le référentiel.

### 6bis.2 Où vit la clé côté fichiers statiques

- `public/geo/senegal-departements.geojson` (46 features) et
  `public/geo/senegal-communes-contours.geojson` (539 features) : chaque feature
  porte `properties.slug`, `name`, `code` (pcode), `parent` (slug du niveau
  parent) — générés en même temps que les slugs du référentiel, donc
  **par construction identiques** à `election_constituencies.slug` au moment de
  l'export ; un redécoupage futur doit régénérer les deux ensembles ensemble.

### 6bis.3 Parcours complet — mode « Carte » de `/carte-electorale/nationale`

1. La page ([app/pages/elections-senegal/carte-electorale/nationale/index.vue](../../../app/pages/elections-senegal/carte-electorale/nationale/index.vue))
   appelle `useElectoralRevision()`, qui va chercher `/api/elections/electoral-files`
   et en déduit `nationalFileId` = l'`id` de la ligne `election_electoral_files`
   (scope `national`) de la révision affichée ;
2. Elle rend `<ElectionUnifiedMap mode="offices" :electoral-file-id="nationalFileId" />` ;
3. Le composant ([app/components/Election/ElectionUnifiedMap.vue:107](../../../app/components/Election/ElectionUnifiedMap.vue))
   appelle `GET /api/elections/map/national?electoral_file=<id>&groupBy=department` ;
4. Le serveur ([server/api/elections/map/national.get.ts:125](../../../server/api/elections/map/national.get.ts))
   fait un `aggregate('election_polling_stations', { groupBy: ['constituency'], filter: { electoral_file } })`
   → une ligne par **id numérique** de circonscription, avec des sommes/comptes
   (`voters`, `office_number`, `polling_place` distincts) mais **aucun nom, aucun slug** ;
5. `getConstituencyNamesById()` ([server/utils/electionElectoralFile.ts:68](../../../server/utils/electionElectoralFile.ts))
   fait une **deuxième requête**, sur `election_constituencies`, filtrée sur les ids
   obtenus à l'étape 4, pour récupérer `name`/`slug`/`population`/`region` — c'est
   **le seul endroit où le `slug` apparaît** dans toute la chaîne bureaux/agrégats ;
6. La réponse `{ department, slug, population, region, count, sum, countDistinct }`
   est mappée côté client en `OfficeMapItem { slug, name, voters, offices, places, ... }` ;
7. `buildElectionMapConfig()` ([app/config/map-elections.ts:97](../../../app/config/map-elections.ts))
   construit un dataset avec `geoLevel: 'departements'`, `joinField: 'slug'`,
   `geoJoinField: 'slug'` ;
8. `SenegalMap.vue` charge `public/geo/senegal-departements.geojson` (fond par
   défaut du niveau `departements`, pas de surcharge en mode bureaux) ;
9. **Le join lui-même** a lieu dans [app/composables/useMapLayers.ts:196-217](../../../app/composables/useMapLayers.ts) :
   pour chaque item de données, `dataMap.set(item.slug, item)` ; pour chaque
   feature GeoJSON, on lit `feature.properties.slug` et on va chercher dans
   `dataMap` — une correspondance trouvée alimente `getFillColor`/le popup, une
   absence laisse la feature dans sa couleur `fallback`, grise.

### 6bis.4 Parcours complet — vue « Résultats » (choroplèthe du gagnant)

Même schéma, source différente :

1. `<ElectionUnifiedMap mode="results" :election-id="..." />` appelle
   `GET /api/carte/result?election=<id>` ;
2. Le serveur ([server/api/carte/result.get.ts:52-59](../../../server/api/carte/result.get.ts))
   lit `election_constituency_results` avec les champs `constituency.slug`,
   `constituency.nationale_type`, `constituency.parent.slug` **directement dans la
   requête Directus** (pas de deuxième requête ici : `election_constituency_results`
   pointe déjà le référentiel par FK, et Directus résout les champs liés en un seul
   appel) ; la clé de réponse `constituency` est renommée `constituencie` pour
   compat avec l'ancien contrat ;
3. Côté client, `ElectionUnifiedMap.vue` filtre les lignes reçues sur
   `constituencie.nationale_type === 'departement'` (mode `results`) ou
   `'commune'` (mode `results-locale`) — **c'est ce champ qui distingue une carte
   nationale d'une carte communale**, pas un paramètre d'API séparé ;
4. Chaque ligne devient un `ResultMapItem { slug: constituencie.slug, winnerName,
   winnerColor, parentSlug: constituencie.parent.slug, ... }` ;
5. Même mécanique de join que ci-dessus (étape 9 du 6bis.3), sur
   `senegal-departements.geojson` (mode `results`) ou
   `senegal-communes-contours.geojson` (mode `results-locale`) ;
6. Pour le drill-down départemental du mode `results-locale`,
   `aggregateResultsByDepartment()` ([app/config/map-elections.ts:48](../../../app/config/map-elections.ts))
   regroupe les communes par `parentSlug` — donc par le **`parent` du référentiel**
   (FK `election_constituencies.parent`), jamais par un rapprochement de noms.

### 6bis.5 En une phrase

> Le CMS ne connaît des circonscriptions que par **id numérique** (FK) ; le
> `slug` du référentiel est la seule traduction texte de cet id, résolue à la
> lecture API ; les fichiers `public/geo/*.geojson` portent le **même** `slug`
> en dur dans leurs propriétés ; la carte affichée est donc le résultat d'un
> **rapprochement en mémoire côté navigateur** entre deux listes indépendantes
> qui doivent rester synchronisées sur cette seule valeur. 

## 7. Transition

Les collections historiques `carte`, `election_map_national` et
`election_map_diaspora` ne sont plus écrites ni lues qu'en **fallback** (environnement
dont les nouvelles collections ne sont pas encore peuplées). Elles seront supprimées,
avec les composants Leaflet restants, lors du décommissionnement final ; les pages
`elections/legislatives/**` (héritées) restent inchangées jusque-là.

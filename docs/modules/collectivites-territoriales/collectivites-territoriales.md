# Module Collectivités territoriales

Annuaire des 558 collectivités de base du Sénégal — 553 communes et 5 villes
(Dakar, Pikine, Guédiawaye, Rufisque, Thiès) — avec leur maire en fonction,
leur population, leur contact institutionnel et une cartographie interactive.

Tout ce qu'affiche le module vient du référentiel géographique Directus. Ce qui
n'est pas en base vaut `null` et n'est jamais remplacé par une valeur par
défaut : une fiche incomplète le montre, elle ne l'invente pas.

## Vue d'ensemble

```
Directus (geo_* + public_*)
        │
        ▼
server/utils/collectivites-geo.ts     ← seule couche qui parle à Directus
        │  assemble CommuneGeo[] (558 lignes), mis en cache 30 min
        ▼
server/api/collectivites/…            ← /communes (annuaire) et /communes/[slug]
        │
        ▼
composables/collectivites/useCommunesGeo.ts
        │
        ├─► pages (annuaire, fiches, carte plein écran)
        └─► CommunesMap ──► SenegalMap (MapLibre + deck.gl)
                                │
                                └─► public/geo/*.geojson   ← les géométries
```

Deux sources, jointes seulement au moment du rendu : **le référentiel porte les
attributs, les fichiers de `public/geo/` portent les contours.** `geo_entities`
ne contient aucune géométrie.

## Modèle de données

| Collection Directus | Ce que le module y lit |
| --- | --- |
| `geo_entities` | identité stable : `id`, `slug`, `level`, `name_current` |
| `geo_entity_versions` | état **en vigueur** (`valid_to IS NULL`) : nom courant, `parent`, `chef_lieu` |
| `geo_demographic_observations` | population et année (RGPH 2023) |
| `public_entity_profiles` | contact institutionnel (adresse, téléphone, e-mail, site), logo, photo de couverture |
| `public_person_appointments` | maire et secrétaire municipal en fonction (`is_current`, champ `municipality`) |

Trois règles structurantes, à ne pas contourner :

**`geo_entities` est générique.** Elle sert à d'autres modules : on ne lui ajoute
aucun champ propre aux collectivités. Tout besoin spécifique passe par une
collection reliée — c'est la raison d'être de `public_entity_profiles`, qui porte
le contact et les visuels de la mairie sans toucher au référentiel.

**Le référentiel est temporel.** Le nom et le rattachement d'une entité vivent
dans `geo_entity_versions`, pas sur `geo_entities`. Toute lecture de l'état
courant filtre sur `valid_to IS NULL`. Le rattachement département/région est
reconstitué en remontant la chaîne `parent` (commune → arrondissement →
département → région), une commune pouvant être rattachée soit à un
arrondissement, soit directement à son département.

**Une collectivité de base est un `level` `commune` ou `ville`.** Les niveaux
supérieurs (arrondissement, département, région) ne sont lus que pour
reconstituer le rattachement, jamais listés dans l'annuaire.

### Type exposé au front

`CommuneGeo` ([`types/collectivite.ts`](../../../types/collectivite.ts)) :
identité (`id`, `slug`, `nom`, `type`), rattachement (`region`, `departement`,
`departementSlug`, `arrondissement`, `chefLieu`), `population` / `populationAnnee`, `maire` et
`secretaireMunicipal` (`CommuneResponsable`), `contact` (`CommuneContact`),
`logo` et `photoCouverture` — **identifiants de fichiers Directus** à passer à
`<CmsImage>`, pas des URLs.

Le référentiel ne porte ni superficie, ni budget, ni conseil municipal : ces
champs n'existent pas sur le type plutôt que d'exister vides.

### Slug public

Les URLs n'utilisent **pas** le slug Directus (`commune-<nom>-<dept>`), dont le
préfixe de niveau alourdit l'adresse sans rien apporter au lecteur. `buildPublicSlugs`
construit le slug à partir du nom seul quand il est unique parmi les 558, suffixé
du département sinon (une dizaine d'homonymes, ex. `velingara-kolda`). La règle
ne dépend que du jeu complet, jamais de l'ordre des lignes : le slug est stable
d'un build à l'autre.

## D'où viennent les données

Le peuplement de Directus se fait hors de ce dépôt : le référentiel géographique
(entités, versions, rattachements, populations RGPH) et le répertoire national
des maires et secrétaires municipaux sont préparés, rapprochés du référentiel par
`entity_id`, puis chargés en base sous forme de personnes et de mandats.

Le module, lui, n'ingère rien : **il lit.** Une correction de donnée se fait dans
Directus (ou par un nouveau chargement) et se voit sur le site à l'expiration du
cache.

## Couche serveur

Toute la lecture Directus est centralisée dans
[`server/utils/collectivites-geo.ts`](../../../server/utils/collectivites-geo.ts).
Les pages et les endpoints ne parlent jamais à Directus directement.

| Endpoint | Usage |
| --- | --- |
| `GET /api/collectivites/communes` | annuaire complet (558 lignes, sans pagination) + facettes régions/départements + repères de complétude |
| `GET /api/collectivites/communes/[slug]` | fiche d'une collectivité (404 si le slug n'existe pas) |
| `GET /api/collectivites/departements` | les 46 départements agrégés + la liste des régions |
| `GET /api/collectivites/departements/[slug]` | un département, ses collectivités et ses voisins de région (404 si le slug n'existe pas) |

**Une seule lecture pour tout le module.** `getCommunesGeo` est un
`defineCachedFunction` (30 min en production, désactivé en dev) : la fiche
`[slug]` se sert dans la même liste mise en cache, aucune requête Directus
supplémentaire par fiche. Les deux endpoints sont eux-mêmes des
`defineCachedEventHandler`.

**Les départements sont dérivés, pas lus.** `getDepartementsGeo` agrège les
collectivités de base par `departementSlug` : nombre de collectivités, population
cumulée, maires renseignés. Le référentiel porte bien des entités de niveau
`departement`, mais elles ne servent qu'à reconstituer le rattachement — les
chiffres affichés sont donc ceux des communes réellement publiées, ce qui est
exactement ce que la page montre en dessous. Aucun cache propre : `getCommunesGeo`
en a déjà un, et agréger 558 lignes ne justifie pas une seconde entrée à invalider.

**Annuaire renvoyé d'un bloc.** La charge utile est légère (aucun texte long),
ce qui permet à la page de filtrer, paginer et changer de vue sans aller-retour
réseau. Les facettes sont dérivées côté serveur pour que la page n'ait pas à
parcourir la liste pour peupler ses sélecteurs.

**Complétude assumée.** La réponse porte `completude.avecPopulation`,
`avecMaire`, `avecContact` : des compteurs affichés tels quels à l'utilisateur,
sans arrondir ni masquer les trous.

**Dégradation.** Chaque requête Directus est isolée dans un `safeRequest` : une
panne sur la population ou sur les profils omet la donnée concernée et remonte
dans `reportServerError`, elle ne fait jamais échouer l'annuaire.

## Plan d'URLs

| URL | Fichier | Contenu |
| --- | --- | --- |
| `/collectivites-territoriales` | `pages/…/index.vue` | Annuaire : recherche, filtres, vues Cartes / Liste / Carte. État syncé dans l'URL (`?q`, `?region`, `?departement`, `?type`, `?vue`, `?page`). |
| `/collectivites-territoriales/departements` | `pages/…/departements/index.vue` | Hub : les 46 départements groupés par région |
| `/collectivites-territoriales/departements/[slug]` | `pages/…/departements/[slug].vue` | Les collectivités d'un département (404 si le slug n'existe pas) |
| `/collectivites-territoriales/communes/[slug]` | `pages/…/communes/[slug]/index.vue` | Fiche, onglet Aperçu |
| `/collectivites-territoriales/communes/[slug]/[tab]` | `pages/…/communes/[slug]/[tab].vue` | Fiche, autres onglets |
| `/collectivites-territoriales/carte` | `pages/…/carte.vue` | Carte plein écran (layout `fullscreen`), filtre région dans un panneau superposé |

`communes/[slug].vue` n'est pas une page concurrente de `[slug]/index.vue` :
c'est la **route parente** qui porte le hero, les KPI et la barre d'onglets, et
qui rend ses enfants dans un `<NuxtPage />`.

Les onglets sont des **routes à part entière et indexables**, pas un `?tab=`.

### Le hub par département

L'annuaire filtre en **query params** (`?departement=Mbour`) : pratique à l'usage,
invisible à l'indexation — un filtre n'est pas une page. Le hub donne la même
lecture sous **47 URLs stables** (1 pivot + 46 départements), chacune portant une
quinzaine de liens vers des fiches. C'est le même rôle que
`documents/[category]/index.vue` : une page intermédiaire réelle entre l'index et
les fiches.

Le segment `departements/` est explicite plutôt qu'un paramètre à la racine du
module (`/collectivites-territoriales/[departement]`) : ce dernier serait entré en
concurrence avec `a-propos`, `carte`, `communes` et toute page future du module —
Nuxt donne aujourd'hui la priorité au statique, mais la collision serait à
retardement. Il est aussi symétrique de `communes/[slug]`, et laisse la place à un
niveau `regions/` si le besoin vient.

**Recherche du hub** — sur les 46 départements, mais aussi sur leurs **communes
et leurs maires** : c'est ainsi qu'on retrouve le département d'une commune sans
savoir où elle est rattachée. L'endpoint renvoie pour cela chaque département
avec ses communes en version allégée (`nom`, `slug`, `maire`) : la recherche est
instantanée côté client, sans rapatrier les 558 fiches complètes. Quand un
département ne sort que par une de ses communes, la ligne **dit laquelle** —
sinon « Mbour » en réponse à « Ndiaganiao » paraîtrait arbitraire.

L'état est dans l'URL (`?q=`), lu **synchroniquement** au setup : un lien partagé
rend déjà filtré côté serveur. Une vue filtrée est un résultat de recherche, donc
`noindex, follow` (règle SEO §10), le `canonical` restant sur l'URL propre qui,
elle, reste pleinement indexable. Le JSON-LD décrit ce qui est réellement
affiché — les 46 départements sans recherche, les résultats sinon.

**Maillage** (ce qui fait le travail SEO, plus que les pages elles-mêmes) :
annuaire → hub, hub → 46 départements, département → ses communes et ses voisins
de région, et retour depuis chaque fiche via le **fil d'ariane** (« Collectivités
territoriales › Département de Mbour › Ndiaganiao ») et la ligne « Département »
de l'onglet Aperçu.

**Slug de département** — même règle que les communes (`buildDepartementSlugs`) :
le nom seul quand il est unique, suffixé de la région sinon. Un département est
identifié par le couple **(région, nom)**, jamais par le nom seul : deux
homonymes de deux régions restent deux pages. Le slug retenu est porté par chaque
commune (`departementSlug`), ce qui garantit que le lien d'une fiche et l'URL du
hub ne peuvent pas diverger. Une commune dont la chaîne `parent` ne remonte à
aucun département a un `departementSlug` vide : le lien est alors **omis**, pas
pointé vers une page absente.

Les pages du hub n'affichent **pas de carte**. `CommunesMap` sans `focusSlug`
rend la vue nationale des 46 départements et n'en colorerait qu'un seul : la
carte plein écran fait déjà ce travail, mieux.

### Règles SSR de l'annuaire

L'état UI est initialisé **synchroniquement** depuis `route.query`, et le recalage
d'une page hors limites (`?page=999`, ou un filtre qui réduit le jeu) passe par
un `computed` et non par un `watch` : un watch ne s'exécute pas pendant le rendu
serveur, qui afficherait donc « aucun résultat » à tort. Le watch ne fait que
réaligner l'URL après coup.

La recherche est insensible aux accents (`thies` trouve `Thiès`) et porte sur le
nom, le maire, la région, le département et l'arrondissement. Le sélecteur de
département est dérivé de la région choisie — 46 départements bruts sont
inexploitables au doigt — et se vide si le couple région/département devient
incohérent.

## Onglets dérivés des données

Un onglet ne s'affiche que si le référentiel a de quoi le remplir
([`composables/collectivites/communeTabs.ts`](../../../app/composables/collectivites/communeTabs.ts)) :

| Onglet | URL | Condition d'affichage |
| --- | --- | --- |
| Aperçu | `/communes/<slug>` | toujours |
| Le maire | `…/maire` | un maire en fonction existe |
| Secrétariat municipal | `…/secretariat-municipal` | un secrétaire municipal existe |
| Contacts | `…/contacts` | un contact institutionnel existe |

Conséquence voulue : pas d'onglet vide, pas d'URL indexable sans contenu (une
section sans donnée renvoie 404, pas une page blanche), et un onglet qui apparaît
de lui-même le jour où la donnée arrive.

La fiche est montée **deux fois** pour une même URL — par la route parente (hero,
onglets) et par la route d'onglet (contenu, SEO). Les deux appellent
`useCommuneGeo` avec la même clé `useAsyncData` et un `getCachedData` qui sert le
payload du rendu serveur : aucune requête client n'est émise et le contenu ne
« flashe » pas à l'hydratation.

## Composants

`app/components/collectivites/` (préfixe d'auto-import `Collectivites…`) :

- annuaire : `CommuneCard`, `CommunesTable`, `CommunesMap`, `CommuneKpiStrip`, `InfoRow` ;
- listes : `DataTable` (le tableau du module, cf. plus bas) ;
- personnes : `ResponsableAvatar`, `ResponsableCard`, `ResponsableProfile` ;
- onglets : `tabs/Apercu`, `tabs/Maire`, `tabs/Secretariat`, `tabs/Contacts`.

### Le tableau du module

`CollectivitesDataTable` rend **une liste d'entités cliquables décrite par ses
colonnes** ([`dataTable.ts`](../../../app/composables/collectivites/dataTable.ts)) :
table sur desktop, blocs empilés sur mobile (règle « pas de scroll horizontal »).
Il ne connaît ni les communes ni les départements — chaque colonne fournit sa
valeur déjà formatée, ce qui évite d'y faire entrer des règles métier à dupliquer
au prochain usage. La **première** colonne est la colonne d'identité : elle porte
le lien et le `hint` (seconde ligne de contexte), les suivantes sont des
attributs. Une valeur `null` s'affiche « - ».

Deux jeux de colonnes l'utilisent aujourd'hui :

| Appelant | Colonnes |
| --- | --- |
| `CommunesTable` (vue « Liste » de l'annuaire) | Commune (+ département en `hint`), Région, Arrondissement, Maire, Population |
| `CommunesTable` sur une page département | Commune, Maire, Arrondissement, Population — ni « Région » ni le `hint` département (déjà dans le titre de la page), et « Maire » disparaît si aucune commune du département n'en a un |
| Hub des départements | Département (+ communes trouvées en `hint`), Région, Collectivités, Population |

`CommunesTable` n'est plus qu'un jeu de colonnes posé sur `DataTable` : sa prop
`columns` choisit celles affichées à droite du nom, dans l'ordre donné.

Une colonne peut être **cliquable** au-delà de la première (`col.to`) — c'est
ainsi que le nom du maire ouvre sa fiche personne. Conséquence de structure : le
bloc mobile n'est **pas** un lien englobant, sinon le maire produirait un `<a>`
dans un `<a>`. Chaque lien est porté par son propre texte, dans les deux rendus.

### Reconnaître un lien

Tout texte cliquable est en **couleur d'accent** (`text-primary-600` /
`dark:text-primary-400`), soulignement au survol. La couleur porte seule
l'information : le survol n'existe pas au doigt, et un lien qui ne se distingue
qu'au `hover` est invisible sur mobile. Même règle pour les pastilles de
départements voisins et les liens de contexte.

**Le nom d'un maire est cliquable partout où il s'affiche** — carte d'annuaire,
tableaux, onglets de fiche — via `getResponsableLien`
([`responsable.ts`](../../../app/composables/collectivites/responsable.ts)), seule
définition de l'URL `/personnalites/<id>/<slug>`. Sans slug au référentiel, le nom
s'affiche **sans lien** plutôt qu'en lien cassé. Corollaire sur `CommuneCard` :
la carte n'est pas un lien englobant, c'est son bandeau (visuel + nom) qui l'est.

Seule exception : le popup de la carte, où le maire reste du texte. Le rendre
cliquable supposerait d'étendre le contrat de popup du **moteur partagé**
(`types/map.ts`, utilisé par cinq autres modules) pour une ligne d'information,
alors que le popup propose déjà « Voir la fiche ».

Les composants d'onglet sont **importés explicitement** dans `[tab].vue` et
mappés par clé dans `TAB_COMPONENTS`. Ce n'est pas un oubli : l'auto-import Nuxt
est une analyse statique des balises littérales de chaque template, il n'inscrit
rien globalement — un `<component :is="'CollectivitesTabsContacts'">` construit
depuis une chaîne ne résoudrait donc rien. C'est le seul endroit du module où
l'import manuel est nécessaire ; `Apercu` reste auto-importé puisque
`[slug]/index.vue` l'écrit en balise littérale.

## Cartographie

`CommunesMap` est l'**unique composant carte du module**. Les trois usages —
vue « Carte » de l'annuaire, page carte plein écran, mini-carte de l'onglet
Aperçu — passent tous par lui, avec la même API : `communes`, `height`,
`focusSlug`.

### Ce sur quoi il s'appuie

`CommunesMap` n'implémente aucun rendu : il construit une configuration et la
passe à `<MapSenegalMap>`, le moteur partagé du site (MapLibre + deck.gl,
cf. [`docs/modules/carte/map-system.md`](../carte/map-system.md)). Le module
apporte trois choses par-dessus :

| Fichier | Rôle |
| --- | --- |
| [`components/collectivites/CommunesMap.vue`](../../../app/components/collectivites/CommunesMap.vue) | états (département ouvert, focus), caméra, actions de popup |
| [`config/map-collectivites.ts`](../../../app/config/map-collectivites.ts) | la `SenegalMapConfig` : couches, échelles de couleur, popups, légende |
| [`composables/collectivites/useCommunesGeoJoin.ts`](../../../app/composables/collectivites/useCommunesGeoJoin.ts) | jointure référentiel ⇄ fond cartographique |

### Les fonds géographiques

Servis en statique depuis `public/geo/`, chargés par le moteur à la demande
(`config.geoSources`) et jamais rechargés une fois obtenus :

| Fichier | Contenu | Poids |
| --- | --- | --- |
| `senegal-departements.geojson` | 46 polygones de département | ~1 Mo |
| `senegal-communes.geojson` | 553 polygones de commune | ~1 Mo |
| `senegal-communes-labels.geojson` | 553 centroïdes (mêmes `slug`/`name`/`parent`) | ~110 Ko |

Polygones et centroïdes sont deux fichiers, deux rôles : le premier sert au
rendu, le second à étiqueter et à calculer des emprises. Chaque feature porte
`slug`, `name`, `level` et `parent` — ce dernier est la clé du drill-down
(`departement-<nom>` sur une commune, `region-<nom>` sur un département).

La vue nationale ne charge que les départements ; les polygones de commune (1 Mo)
ne sont demandés qu'au moment où l'utilisateur descend d'un niveau.

### La jointure

Le référentiel ne porte aucune géométrie et les fichiers de `public/geo/` ne
portent aucun identifiant Directus : le pont se fait par **nom de commune +
département normalisés** (`#shared/geo-name`), seule clé commune aux deux
sources. `useCommunesGeoJoin` indexe pour cela le fichier des **centroïdes**
(110 Ko) et non celui des polygones (1 Mo), puisque les deux portent les mêmes
propriétés.

Résultat mesuré sur le référentiel complet : **553 rapprochements sur 558**. Les
5 manquants sont exactement les villes (Dakar, Pikine, Guédiawaye, Rufisque,
Thiès) : le fond ne contient que le niveau `commune`, et le territoire d'une
ville *est* celui de ses communes, déjà dessinées. La carte le dit en toutes
lettres plutôt que d'afficher un écart de chiffres qui ressemblerait à un trou
dans les données.

L'asset étant dans `public/`, il n'est atteignable qu'au client (`server: false`).
Un échec de chargement ne produit aucune erreur : simplement aucun rapprochement.

### Deux modes, décidés par `focusSlug`

**Sans `focusSlug` — exploration à deux niveaux.** Les 46 départements colorés
par population cumulée ; un clic ouvre le popup, et c'est **l'action du popup**
(« Voir les communes ») qui descend d'un niveau. Descendre au premier clic serait
un piège sur une carte qu'on explore. Même règle pour l'ouverture d'une fiche
(« Voir la fiche »). Un bouton « Tous les départements » remonte au niveau
national — sans lui on resterait prisonnier d'un département.

**Avec `focusSlug` — la fiche.** Le contour de cette seule collectivité, cadré au
plus juste, en couleur d'accent unie : ni drill-down, ni popup, ni légende. Il
n'y a rien à comparer, et la fiche répond déjà en texte à toutes ces questions.
Pour une ville sans polygone propre, on retombe sur les communes de son
département : leur réunion couvre bien son territoire.

### Agrégats et échelles

Les agrégats départementaux (nombre de collectivités, population cumulée, maires
renseignés) sont dérivés des **communes affichées**, pas du référentiel entier :
un filtre de l'annuaire doit se lire sur la carte, département par département.
Corollaire : si un filtre vide le département ouvert, la carte remonte d'elle-même
au niveau national plutôt que d'afficher un département sans commune.

Les deux échelles de couleur sont des seuils, pas une rampe linéaire : la moitié
des communes est sous 15 000 habitants et une rampe linéaire écraserait tout dans
la première teinte. Seuils communes `0 / 10k / 25k / 60k / 150k`, seuils
départements `0 / 150k / 300k / 600k / 1,2 M`.

### Caméra

`fitBounds` sur l'emprise des centroïdes du département au drill-down (marge
généreuse : les polygones débordent forcément de leurs centres), `fitBounds` sur
l'emprise exacte du polygone en mode fiche, `flyTo` sur la vue nationale au
retour. Le cadrage est rejoué sur l'événement `ready` du moteur : sur une fiche,
le département est connu bien avant l'initialisation de la carte, et un `flyTo`
prématuré serait perdu.

## SEO

- Hub départements : JSON-LD `CollectionPage` + `ItemList` — les 46 items en
  entier (contrairement à l'annuaire), et sur une page département la liste
  complète de ses collectivités.
- Annuaire : JSON-LD `CollectionPage` + `ItemList` (échantillon de 100 items —
  lister les 558 alourdirait le HTML sans bénéfice, l'exhaustivité de
  l'indexation passe par le sitemap).
- Fiche et onglets : `useCommuneSeo` émet un titre, une description et un
  canonical **propres à chaque onglet**, et réémet le même nœud
  `GovernmentOrganization` (« Mairie de X »). Les champs absents du référentiel
  sont omis du JSON-LD, jamais remplis d'une valeur par défaut.
- `BreadcrumbList` émis uniquement par `<AppBreadcrumb>`, jamais dupliqué en page.
- Sitemap : les fiches et les 46 pages département sont poussées par
  `server/api/__sitemap__/urls.ts`.

## Points d'intégration

- `app/app.vue` : `/collectivites-territoriales/carte` est dans le gate
  `isFullscreenPage` (masque header et footer).
- `app/pages/menu.vue` : carte de section (sans `featureKey` tant que le flag
  `menu_collectivites_territoriales` n'existe pas dans `vp_feature_flags`).

## Faire évoluer le module

**Ajouter une donnée à la fiche** — une requête Directus de plus dans le
`Promise.all` de `collectivites-geo.ts` (dans un `safeRequest`, comme les
autres), un champ sur `CommuneGeo`, puis l'affichage. Ne jamais ajouter le champ
sur `geo_entities` : passer par une collection reliée.

**Ajouter un onglet** (budget, conseil municipal, projets, documents…) — quatre
étapes, détaillées en tête de `communeTabs.ts` : exposer la donnée côté serveur,
l'ajouter au type, déclarer l'onglet avec son `isAvailable` (l'onglet et son URL
n'apparaissent alors que sur les collectivités qui ont la donnée), créer le
composant et l'enregistrer dans `TAB_COMPONENTS`.

**Ajuster la carte** — tout ce qui est visuel (couches, seuils, popups, légende,
contrôles) est dans `map-collectivites.ts`, sans toucher au composant. Les
comportements (niveau ouvert, caméra, navigation) sont dans `CommunesMap.vue`.
Les props (`communes` / `height` / `focusSlug`) sont le contrat des trois
call-sites : les changer impose de tous les revoir.

**Mettre à jour un fond géographique** — remplacer le fichier dans `public/geo/`
en conservant les propriétés `slug`, `name`, `level`, `parent` : c'est sur elles
que reposent la jointure et le drill-down. Toucher aux polygones impose de
regénérer les centroïdes correspondants, les deux fichiers devant rester alignés.

**Faire remonter le taux de couverture** — le taux de jointure (553/558) et les
compteurs de complétude ne se corrigent pas dans le code : ils se corrigent en
base, ou dans le fond géographique. Le module se remplit tout seul.

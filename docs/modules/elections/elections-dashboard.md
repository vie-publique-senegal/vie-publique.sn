# 🗳️ Dashboard Électoral - Documentation complète

> **Specs de référence** : [Document de spécifications - Dashboard Électoral](https://docs.google.com/document/d/1_O5dHPXORhyltH0f-yIhU-319FdjxhlsOVDsyIEHYok/edit?tab=t.0#heading=h.s087gd8gcxn2)
>
> **Dernière mise à jour** : 2026-07-18

Ce document décrit le fonctionnement du dashboard électoral de Vie-Publique.sn, ses règles métier et sa gestion des déploiements. Il complète :

- [elections-model.md](./elections-model.md) - modèle de données CMS (collections, champs, relations)
- [elections-geographie.md](./elections-geographie.md) - fichier électoral, bureaux de vote, circonscriptions, résultats et cartes
- [elections-geo-resolution.md](./elections-geo-resolution.md) - résolution du référentiel géographique générique (`geo_regions`/`geo_departments`/`geo_municipalities`)
- [elections-insertion.md](./elections-insertion.md) - procédure d'insertion des données par type d'élection
- [elections-pages-architecture.md](./elections-pages-architecture.md) - structure des pages et URLs
- [pvs-upload-deploiement.md](./pvs-upload-deploiement.md) - module d'upload des PVs
- [deployments/](./deployments/) - fichiers de déploiement versionnés par évolution

---

## 1. Vue d'ensemble

Le module électoral couvre :

| Espace | URL | Rôle |
|--------|-----|------|
| Landing | `/elections-senegal` | Élection en vedette + accès rapide (guide, législation, carte) + actualités |
| Historique des scrutins | `/elections-senegal/scrutins` | Liste paginée de toutes les élections publiées, lien vers leur tableau de bord |
| Dashboard élection | `/elections-senegal/[slug]/...` | Tableau de bord d'UNE élection, organisé en onglets |
| Guide électoral | `/elections-senegal/guide-electoral` | Vidéos tutoriels, filtrables par type de scrutin et langue |
| Législation | `/documents/elections` | Documents électoraux (page mutualisée `/documents/[category]`) |
| Carte électorale | `/elections-senegal/carte-electorale` | **Redirige (301)** vers `/elections-senegal/carte-electorale/nationale` (query propagée) ; le contenu vit dans les sous-pages `nationale`/`diaspora`/`resume` |

Chaque élection est identifiée par un **slug CMS** (ex. `legislatives-2024`) et par le couple **type + année** (`legislative` / `presidential` / `locale` + `year`).

### Onglets du dashboard

| Onglet | URL | Contenu |
|--------|-----|---------|
| Candidats | `/[slug]/candidats` | Listes, coalitions et candidats + routes dédiées : fiche candidat `/candidats/[candidateSlug]`, fiche coalition `/candidats/coalition/[coalitionSlug]`, fiche circonscription `/candidats/circonscription/[constituencySlug]` (et son croisement `.../coalition/[coalitionSlug]`) — chaque page résout son id depuis le slug, plus de query params `?coalition=`/`?constituency=` |
| Carte | `/[slug]/carte` | Carte des résultats |
| Résultats | `/[slug]/resultats` | KPIs, classement des coalitions, second tour |
| PVs | `/[slug]/pvs` | Procès-verbaux (si activé) |
| Documents | `/[slug]/documents` | Documents liés à l'élection |
| Statistiques | `/[slug]/statistiques` | Analyses par élection (profession, sexe, présence des listes…), pilotées par un **registre de stats** — voir [3.9](#39-statistiques-registre-de-stats) |
| Guide | `/[slug]/guide` | Vidéos tutoriels |

---

## 2. Fonctionnement

### 2.1 Configuration centrale

Toutes les pages s'appuient sur `GET /api/elections/dashboard/config` qui retourne :

- `elections` : la liste des élections avec leurs métadonnées, KPIs et documents publiés ;
- `years` / `types` : les options des sélecteurs (déduites des élections existantes) ;
- `election_ids_with_documents` : IDs des élections ayant au moins un document publié (utilisé par la page Législation).

Caractéristiques :

- **Cache serveur 5 minutes** (`defineCachedEventHandler`) - une modification CMS peut mettre jusqu'à 5 min à apparaître ;
- les élections en **`draft` ou `archived` sont exclues** à la source ;
- les documents liés sont filtrés sur `status = published` et triés par date de publication décroissante.

### 2.2 État partagé

Le composable `useElectoralDashboard()` centralise l'état via `useState` (partagé entre pages) : `selectedYear`, `selectedType`, `activeTab`, `searchQuery`, `legislativeViewType` (vue liste/tête de liste/bulletin des législatives). Sur les pages `[slug]`, l'élection est résolue depuis le slug qui **pilote** `selectedType`/`selectedYear` ; ces états pilotés par l'URL sont initialisés depuis `route.query` dès le SSR (pour éviter tout mismatch d'hydratation au refresh, ex. `?view=head`). Coalition et circonscription **ne sont plus des query params** (`?coalition=`/`?constituency=`) : elles ont leurs propres routes dédiées (voir tableau des onglets ci-dessus), chaque page résolvant son id depuis le slug d'URL.

⚠️ **Nouvelle page statique sous `/elections-senegal`** : toute page qui n'est pas un dashboard par slug d'élection (ex. `scrutins`, `guide-electoral`) doit être ajoutée à `STATIC_ELECTION_PATHS` dans `useElectoralDashboard.ts`, sinon elle est traitée comme un slug d'élection inconnu.

---

## 3. Règles métier

### 3.1 Statuts d'une élection

`scheduled` → `registration` → `campaign` → `ongoing` → `completed` (+ `draft` / `archived` comme états de publication, jamais exposés au front).

### 3.2 Élection en vedette (landing)

Priorité de sélection sur `/elections-senegal` :

1. **`ongoing`** (priorité absolue) ;
2. **`completed`** la plus récente (`election_date` desc) - cas par défaut ;
3. **`scheduled`** la plus proche (`election_date` asc).

### 3.3 Résolution d'une élection

- Par **slug** sur les pages `/elections-senegal/[slug]/...` ; slug inconnu → écran « Élection introuvable » ;
- par **type + année** lors des changements de sélecteurs : si l'année courante n'existe pas pour le type choisi, on retombe sur la **dernière élection `completed`** de ce type, sinon la plus récente ;
- après navigation vers une autre élection, l'onglet d'arrivée est `resultats` si elle est `completed`, sinon `candidats`.

### 3.4 Onglets visibles selon statut et type

| Contexte | Onglets |
|----------|---------|
| Élection `completed` | `candidats`, `resultats`, `documents` |
| Autres statuts | `candidats`, `carte`, `resultats`, `documents`, `guide` |
| + si `pv_upload_active = true` | + `pvs` |
| + si type **législative ou présidentielle** | + `statistiques` |

> L'onglet `statistiques` est ouvert aux scrutins **législatifs et présidentiels**.

Le libellé de l'onglet « candidats » dépend du type : **Candidats** (présidentielle), **Coalitions** (législatives), **Circonscriptions** (locales).

### 3.5 Second tour (présidentielle uniquement)

- Seules les élections **présidentielles** peuvent avoir 2 tours : `rounds = 2` sur l'élection, date dans `election_date_round_2` ;
- les résultats du 2nd tour sont portés par les coalitions (`round_2_voix`, `round_2_pourcentage`) ;
- le bloc « second tour » ne s'affiche que si `type = presidential` **et** `rounds = 2` **et** qu'au moins une coalition a des données `round_2_*` > 0 ;
- la **majorité absolue** (`absolute_majority` sur l'élection) sert de seuil de référence au 1er tour.

### 3.6 Résultats et sièges

- **Présidentielle** : le vainqueur est la coalition au plus fort `pourcentage` (du tour décisif) ;
- **Législatives** : total de sièges d'une coalition = `sieges` (national) + `sieges_departement` (scrutin majoritaire départemental) ; le classement se fait sur ce total ;
- les KPIs de participation viennent de l'élection : `registered_voters`, `voters_count`, `null_ballots`, `valid_votes`, `participation_rate` ;
- les totaux sont **pré-calculés côté CMS/API**, le front ne recalcule pas les agrégats.

### 3.7 Documents et actualités

- Les documents sont liés aux élections en M2M (`elections_documents`) ; seuls les documents `published` sont exposés ;
- la page Législation filtre via `election_ids` (IDs séparés par des virgules) ;
- les actualités électorales sont les articles de la catégorie **« Election »** (`news_category`).

### 3.8 PVs

L'onglet PVs n'apparaît que si `pv_upload_active = true` sur l'élection. Le fonctionnement détaillé (upload, filtres géographiques, authentification) est décrit dans [pvs-upload-deploiement.md](./pvs-upload-deploiement.md).

### 3.9 Statistiques (registre de stats)

La page `/[slug]/statistiques` ([app/pages/elections-senegal/[slug]/statistiques.vue](../../../app/pages/elections-senegal/%5Bslug%5D/statistiques.vue)) n'affiche pas une liste fixe de graphiques : elle est pilotée par un **registre de statistiques** défini dans la page elle-même (`STATS_REGISTRY`). Chaque entrée décrit une analyse possible, indépendamment du fait qu'elle ait ou non des données pour l'élection affichée.

#### Structure d'une entrée du registre

```ts
interface StatDefinition {
  value: string;      // clé technique, reflétée dans ?stats_type=
  label: string;       // libellé affiché dans le sélecteur
  enabled: boolean;     // interrupteur global : proposée un jour, ou jamais ?
  types?: string[];     // types de scrutin concernés (absent = tous)
}
```

- **`enabled: false`** = la stat n'est **jamais** proposée, quelle que soit l'élection — utilisé quand la donnée n'existe pas encore dans le CMS pour aucun scrutin (ex. `ageDistribution`, désactivée car les dates de naissance des candidats sont renseignées à moins de 3 % — voir [elections-model.md](./elections-model.md), collection `election_persons`). À réactiver le jour où la donnée existe réellement, pas avant.
- **`types`** restreint une stat *activée* aux scrutins où elle a un sens métier (ex. « présence des listes par circonscription » et « profession des élus » n'existent que pour les législatives — une présidentielle n'a ni listes départementales ni 165 élus).

#### Filtrage à deux niveaux : `enabled`/`types` puis données réelles

Le registre ne suffit pas à décider si une stat doit apparaître dans le sélecteur : une stat `enabled: true` et compatible avec le `type` du scrutin peut quand même n'avoir **aucune donnée** pour l'élection précise affichée (ex. une législative ancienne sans élus renseignés en base). La page calcule donc :

1. `enabledStats` — filtre le registre sur `enabled` + `types` (dépend du **type** de scrutin) ;
2. `statDataState` — pour chaque stat, l'état `{ loading, hasData }` déduit de la réponse de son `useAsyncData`/`useFetch` (dépend de l'**élection précise**) ;
3. `availableStats` — l'intersection des deux : c'est la liste réellement proposée dans le `USelect`.

**Règle d'affichage** (validée avec l'utilisateur le 2026-07-18) :

- une stat sans données pour l'élection courante **n'apparaît pas** dans le sélecteur, même si elle est `enabled` ;
- si `availableStats.length <= 1`, le sélecteur **lui-même est masqué** (pas d'utilité à choisir entre zéro ou une seule option) — la stat unique (ou l'état vide global) s'affiche directement.

**Exemple concret** : sur `legislatives-2022`, l'endpoint `professions?elected=true` ne renvoie aucune ligne (élus non renseignés pour ce scrutin) → « Profession des élus » disparaît du sélecteur bien que la stat soit `enabled` et de `type: legislative`. Sur `presidentielles-2024`, ce sont `professionElus` et `listsPresence` qui disparaissent car exclus par `types`.

#### Stat effectivement affichée : `activeStat` (piège hydratation SSR)

La stat demandée par `?stats_type=` peut ne pas être dans `availableStats` (lien externe obsolète, changement d'élection via les sélecteurs année/type). Le recalage vers la première stat disponible **doit être un `computed` (`activeStat`), jamais un `watch`** : un `watch` ne se ré-exécute pas côté serveur une fois les données résolues, ce qui produit un HTML SSR différent du rendu client (sélecteur figé sur le placeholder, mismatch d'hydratation Vue). Le `computed` est réévalué à chaque rendu — SSR et client convergent forcément vers la même valeur.

```ts
const activeStat = computed(() => {
  if (availableStats.value.some((stat) => stat.value === statsType.value)) {
    return statsType.value;
  }
  return availableStats.value[0]?.value ?? null;
});
```

L'écriture de `?stats_type=` dans l'URL passe par un handler explicite (`@update:model-value="onStatChange"` sur le `USelect`), pas par un `v-model` + `watch(statsType, …)`.

#### Ajouter une nouvelle stat

1. Ajouter l'endpoint API (`server/api/elections/dashboard/stats/<nom>.get.ts`), filtrable par `year`/`type` (voir `genders.get.ts`/`professions.get.ts` comme modèles) ;
2. Ajouter le composable de lecture dans `app/composables/elections/dashboard/` ;
3. Créer le composant d'affichage dans **`app/components/elections/dashboard/stats/`** (jamais ailleurs — convention validée pour ce module) ;
4. Ajouter une entrée dans `STATS_REGISTRY` (`enabled: true`, `types` si la stat ne concerne pas tous les scrutins) ;
5. Brancher son `useAsyncData` dans `statDataState` (`{ loading, hasData }`) et son rendu conditionnel dans le template.

#### Stats existantes (2026-07-18)

| `value` | Libellé | `types` | Endpoint | Composant |
|---|---|---|---|---|
| `professionCandidat` | Profession des candidats | tous | `dashboard/stats/professions` | `ProfessionsRanking` |
| `genderDistribution` | Répartition des candidats par sexe | tous | `dashboard/stats/genders` (via `election_persons.gender`) | `CandidatesGenderStats` |
| `professionElus` | Profession des élus | `legislative` | `dashboard/stats/professions?elected=true` | `ProfessionsRanking` |
| `listsPresence` | Présence des listes par circonscription | `legislative` | `dashboard/stats/lists` + `dashboard/coalitions` | `CoalitionListsPresence` |
| `ageDistribution` | Répartition par âge | — | *(désactivée, `enabled: false`)* | — |

Tous les composants d'affichage de stats vivent dans `app/components/elections/dashboard/stats/` et partagent le même langage visuel : listes plates (pas de `UCard`/ombre), fine barre de progression bleue (`#2a78d6` clair / `#3987e5` sombre), compte + pourcentage tabulaires alignés à droite.

---

## 4. Architecture technique

### 4.1 Composables (`app/composables/elections/`)

| Composable | Rôle |
|------------|------|
| `useElectoralDashboard()` | Config, état partagé, élection courante |
| `useElectoralCoalitions()` | Coalitions (liste ou détail), avec classement et recherche |
| `useElectoralConstituencies()` | Circonscriptions |
| `useElectoralCandidateProfile()` | Fiche candidat |
| `useElectoralDashboardLists()` | Listes électorales |
| `useElectoralProfessions()` | Profession des candidats/élus (param `elected`) — voir 3.9 |
| `useElectoralGenderStats()` | Répartition des candidats par sexe — voir 3.9 |
| `useElectoralStatsList()` | Présence des listes électorales par coalition — voir 3.9 |
| `useElectoralRevision()` | Résolution du contexte carte électorale (`?revision=` canonique, `?election=` compat) |
| `useElectionPvsFilters()` / `useElectionPvsUpload()` | Filtres et upload du module PVs |

### 4.2 API serveur (`server/api/elections/`)

| Endpoint | Description |
|----------|-------------|
| `dashboard/config` | Configuration centrale (cache 5 min) |
| `dashboard/coalitions`, `dashboard/constituencies`, `dashboard/lists` | Données du dashboard |
| `dashboard/stats/professions` (param `elected`), `dashboard/stats/genders`, `dashboard/stats/lists` | Statistiques du registre de la page `/statistiques` — voir 3.9 |
| `dashboard/candidates/[slug]` | Fiche candidat |
| `coalitions/*`, `lists/[coalitionId]`, `candidates/elected` | Fiches coalition/circonscription et élus |
| `electoral-files` | Révisions publiées (fichiers électoraux national + diaspora) |
| `map/*`, `diaspora/*`, `participation` | Carte électorale nationale et diaspora, relevés de participation |
| `/api/carte`, `/api/carte/result` | Agrégats géographiques et résultats (gagnant seul) par circonscription (voir [elections-geographie.md](./elections-geographie.md)) |
| `results/constituency/[slug]` | Classement complet des coalitions pour une circonscription |
| `pvs/*`, `pvs-upload/*`, `auth/*` | Module PVs |

---

## 5. Déploiements versionnés

Toute évolution du module (schéma CMS, règle métier, nouvelle fonctionnalité) donne lieu à un fichier dans [deployments/](./deployments/), nommé `YYYY-MM-<sujet>.md`, décrivant : le contexte, les changements de schéma (champs/collections à créer ou modifier dans Directus), les migrations de données et les impacts front. Voir le [README du dossier](./deployments/README.md) pour la convention complète et l'historique.

---

**Auteur** : Vie Publique Sénégal

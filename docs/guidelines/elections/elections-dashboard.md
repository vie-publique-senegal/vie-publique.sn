# 🗳️ Dashboard Électoral - Documentation complète

> **Specs de référence** : [Document de spécifications - Dashboard Électoral](https://docs.google.com/document/d/1_O5dHPXORhyltH0f-yIhU-319FdjxhlsOVDsyIEHYok/edit?tab=t.0#heading=h.s087gd8gcxn2)
>
> **Dernière mise à jour** : 2026-07-17

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
| Législation | `/elections-senegal/legislation` | Documents électoraux filtrables |
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
| Statistiques | `/[slug]/statistiques` | Répartition par profession, sexe, âge |
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
| + si type législative | + `statistiques` |

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
| `useElectoralProfessions()` / `useElectoralStatsList()` | Statistiques |
| `useElectoralRevision()` | Résolution du contexte carte électorale (`?revision=` canonique, `?election=` compat) |
| `useElectionPvsFilters()` / `useElectionPvsUpload()` | Filtres et upload du module PVs |

### 4.2 API serveur (`server/api/elections/`)

| Endpoint | Description |
|----------|-------------|
| `dashboard/config` | Configuration centrale (cache 5 min) |
| `dashboard/coalitions`, `dashboard/constituencies`, `dashboard/lists` | Données du dashboard |
| `dashboard/stats*` | KPIs et statistiques |
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

# 🏗️ Architecture des Pages Élections

**Dernière mise à jour** : 2026-07-17

> Le fonctionnement détaillé et les règles métier sont documentés dans [elections-dashboard.md](./elections-dashboard.md).

---

## 📁 Structure des fichiers

```
app/pages/elections-senegal/
├── index.vue                             # Landing page
├── scrutins.vue                          # Historique paginé de tous les scrutins
├── guide-electoral.vue                   # Guide de l'électeur
├── legislation.vue                       # Législation électorale
├── [slug].vue                            # Layout dashboard (header, sélecteurs, onglets)
├── [slug]/
│   ├── index.vue                         # Redirection vers l'onglet par défaut
│   ├── candidats.vue                     # Layout onglet candidats
│   ├── candidats/
│   │   ├── index.vue                     # Listes, coalitions et candidats
│   │   ├── [candidateSlug].vue           # Fiche candidat
│   │   ├── coalition/
│   │   │   └── [coalitionSlug].vue       # Fiche coalition
│   │   └── circonscription/
│   │       └── [constituencySlug].vue    # Fiche circonscription
│   │           └── coalition/[coalitionSlug].vue  # Croisement circonscription × coalition
│   ├── carte.vue                         # Carte des résultats
│   ├── resultats.vue                     # Résultats (KPIs, classement, 2nd tour)
│   ├── pvs.vue                           # Procès-verbaux (si pv_upload_active)
│   ├── documents.vue                     # Documents de l'élection
│   ├── statistiques.vue                  # Stats (professions, sexe, âge)
│   └── guide.vue                         # Vidéos tutoriels
└── carte-electorale/
    ├── index.vue                         # Redirection 301 vers nationale/ (query propagée)
    ├── nationale/
    │   ├── index.vue                     # Carte nationale (mode bureaux + liste)
    │   └── [department].vue              # Détail département
    ├── diaspora/
    │   ├── index.vue                     # Grille des 8 zones + tableau des pays
    │   └── [country].vue                 # Détail pays
    └── resume/
        └── index.vue                     # Totaux (onglet Résumé)
```

> Toute nouvelle page statique ajoutée sous `/elections-senegal` (comme `scrutins.vue`) doit être déclarée dans `STATIC_ELECTION_PATHS` (`app/composables/elections/dashboard/useElectoralDashboard.ts`), sinon elle est traitée comme un slug d'élection inconnu.

---

## 🔗 URLs

| URL | Description |
|-----|-------------|
| `/elections-senegal` | Landing page |
| `/elections-senegal/scrutins` | Historique de tous les scrutins (liste paginée) |
| `/elections-senegal/[slug]/resultats` | Résultats d'une élection (ex : `legislatives-2024`) |
| `/elections-senegal/[slug]/candidats` | Candidats/coalitions d'une élection |
| `/elections-senegal/[slug]/candidats/[candidateSlug]` | Fiche candidat |
| `/elections-senegal/[slug]/candidats/coalition/[coalitionSlug]` | Fiche coalition |
| `/elections-senegal/[slug]/candidats/circonscription/[constituencySlug]` | Fiche circonscription |
| `/elections-senegal/[slug]/candidats/circonscription/[constituencySlug]/coalition/[coalitionSlug]` | Croisement circonscription × coalition |
| `/elections-senegal/[slug]/carte` | Carte des résultats |
| `/elections-senegal/[slug]/pvs` | Procès-verbaux |
| `/elections-senegal/[slug]/documents` | Documents de l'élection |
| `/elections-senegal/[slug]/statistiques` | Statistiques (législatives) |
| `/elections-senegal/[slug]/guide` | Vidéos tutoriels de l'élection |
| `/elections-senegal/guide-electoral` | Guide de l'électeur |
| `/elections-senegal/legislation` | Législation électorale |
| `/elections-senegal/carte-electorale` | **Redirige (301)** vers `carte-electorale/nationale` |
| `/elections-senegal/carte-electorale/nationale` | Carte électorale nationale, pilotée par révision (`?revision=`) |
| `/elections-senegal/carte-electorale/nationale/dakar` | Détail département Dakar |
| `/elections-senegal/carte-electorale/diaspora` | Carte électorale diaspora (8 zones) |
| `/elections-senegal/carte-electorale/diaspora/france` | Détail diaspora France |
| `/elections-senegal/carte-electorale/resume` | Totaux nationale + diaspora |

> L'onglet actif est le **dernier segment du path** (pas un query param). L'élection est résolue par son **slug CMS** ; les onglets visibles dépendent du statut et du type de l'élection (voir les règles dans [elections-dashboard.md](./elections-dashboard.md#34-onglets-visibles-selon-statut-et-type)). Coalition et circonscription sont résolues par leur **slug d'URL** dédié, plus par query param (`?coalition=`/`?constituency=` sont abandonnés).

---

## 📄 Pages

### 1. Landing (`index.vue`)

Point d'entrée : élection en vedette (hero card cliquable vers le dashboard), accès rapide (guide, législation, carte), actualités électorales.

### 2. Dashboard (`[slug].vue` + pages enfants)

`[slug].vue` est le layout commun : breadcrumb, titre, sélecteurs type/année, barre d'onglets sticky. Chaque onglet est une page enfant rendue via `<NuxtPage />`.

### 3. Guide Électoral (`guide-electoral.vue`)

Vidéos tutoriels pour expliquer le processus électoral.

### 4. Législation (`legislation.vue`)

Liste des documents électoraux avec filtres par type et année.

**Filtrage** : utilise `election_ids` (IDs séparés par virgules) pour filtrer sur plusieurs élections.

### 5. Historique des scrutins (`scrutins.vue`)

Liste paginée (10 par page) de toutes les élections publiées (triées par date décroissante), avec chiffres clés et lien vers le tableau de bord (`resultats` si `completed`, sinon `candidats`).

### 6. Carte Électorale (`carte-electorale/`)

- `index.vue` : redirection 301 vers `nationale/`
- `nationale/index.vue` : carte nationale (mode bureaux + vue liste) ; `nationale/[department].vue` : détail département
- `diaspora/index.vue` : grille des 8 zones puis tableau des pays ; `diaspora/[country].vue` : détail pays diaspora
- `resume/index.vue` : totaux national + diaspora

Pilotée par **révision** (pas par élection) : voir [elections-geographie.md section 5.1](./elections-geographie.md#51-page-carte-électorale-elections-senegalcarte-electorale).

---

## 🧩 Composables

| Composable | Rôle |
|------------|------|
| `useElectoralDashboard()` | Config, état partagé, élection courante |
| `useElectoralCoalitions()` | Liste des coalitions |
| `useElectoralConstituencies()` | Liste des circonscriptions |
| `useElectoralCandidateProfile()` | Fiche candidat |
| `useElectoralRevision()` | Contexte carte électorale (révision/élection) |
| `useElectoralProfessions()` | Stats par profession |
| `useElectoralStatsList()` | Stats départementales |

---

## 📡 APIs

| Endpoint | Description |
|----------|-------------|
| `/api/elections/dashboard/config` | Configuration (années, types, élections) — cache 5 min |
| `/api/elections/dashboard/coalitions` | Coalitions |
| `/api/elections/dashboard/constituencies` | Circonscriptions |
| `/api/elections/dashboard/candidates/[slug]` | Fiche candidat |
| `/api/elections/coalitions/*`, `/api/elections/lists/[coalitionId]` | Fiche coalition, circonscription |
| `/api/elections/dashboard/stats/professions` | Stats professions |
| `/api/elections/electoral-files` | Révisions publiées (fichiers électoraux) |
| `/api/elections/map/*`, `/api/elections/diaspora/*` | Carte électorale |
| `/api/carte`, `/api/carte/result` | Agrégats géographiques et résultats (gagnant seul) par circonscription |
| `/api/elections/results/constituency/[slug]` | Classement complet des coalitions pour une circonscription |
| `/api/elections/pvs/*`, `/api/elections/pvs-upload/*` | Module PVs |
| `/api/documents?election_ids=1,2,3` | Documents filtrés par élections |

---

**Auteur** : Vie Publique Sénégal

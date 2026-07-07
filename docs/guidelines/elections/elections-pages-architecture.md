# 🏗️ Architecture des Pages Élections

**Dernière mise à jour** : 2026-07-05

> Le fonctionnement détaillé et les règles métier sont documentés dans [elections-dashboard.md](./elections-dashboard.md).

---

## 📁 Structure des fichiers

```
app/pages/elections-senegal/
├── index.vue                             # Landing page
├── guide-electoral.vue                   # Guide de l'électeur
├── legislation.vue                       # Législation électorale
├── [slug].vue                            # Layout dashboard (header, sélecteurs, onglets)
├── [slug]/
│   ├── index.vue                         # Redirection vers l'onglet par défaut
│   ├── candidats.vue                     # Layout onglet candidats
│   ├── candidats/
│   │   ├── index.vue                     # Listes et candidats
│   │   └── [candidateSlug].vue           # Fiche candidat
│   ├── carte.vue                         # Carte des résultats
│   ├── resultats.vue                     # Résultats (KPIs, classement, 2nd tour)
│   ├── pvs.vue                           # Procès-verbaux (si pv_upload_active)
│   ├── documents.vue                     # Documents de l'élection
│   ├── statistiques.vue                  # Stats (professions, sexe, âge)
│   └── guide.vue                         # Vidéos tutoriels
└── carte-electorale/
    ├── index.vue                         # Carte (vue globale)
    ├── nationale/
    │   └── [department].vue              # Détail département
    └── diaspora/
        └── [country].vue                 # Détail pays
```

---

## 🔗 URLs

| URL | Description |
|-----|-------------|
| `/elections-senegal` | Landing page |
| `/elections-senegal/[slug]/resultats` | Résultats d'une élection (ex : `legislatives-2024`) |
| `/elections-senegal/[slug]/candidats` | Candidats/coalitions d'une élection |
| `/elections-senegal/[slug]/candidats/[candidateSlug]` | Fiche candidat |
| `/elections-senegal/[slug]/carte` | Carte des résultats |
| `/elections-senegal/[slug]/pvs` | Procès-verbaux |
| `/elections-senegal/[slug]/documents` | Documents de l'élection |
| `/elections-senegal/[slug]/statistiques` | Statistiques (législatives) |
| `/elections-senegal/[slug]/guide` | Vidéos tutoriels de l'élection |
| `/elections-senegal/guide-electoral` | Guide de l'électeur |
| `/elections-senegal/legislation` | Législation électorale |
| `/elections-senegal/carte-electorale` | Carte électorale (bureaux de vote) |
| `/elections-senegal/carte-electorale/nationale/dakar` | Détail département Dakar |
| `/elections-senegal/carte-electorale/diaspora/france` | Détail diaspora France |

> L'onglet actif est le **dernier segment du path** (pas un query param). L'élection est résolue par son **slug CMS** ; les onglets visibles dépendent du statut et du type de l'élection (voir les règles dans [elections-dashboard.md](./elections-dashboard.md#34-onglets-visibles-selon-statut-et-type)).

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

### 5. Carte Électorale (`carte-electorale/`)

- `index.vue` : vue globale
- `nationale/[department].vue` : détail département
- `diaspora/[country].vue` : détail pays diaspora

---

## 🧩 Composables

| Composable | Rôle |
|------------|------|
| `useElectoralDashboard()` | Config, état partagé, élection courante |
| `useElectoralCoalitions()` | Liste des coalitions |
| `useElectoralConstituencies()` | Liste des circonscriptions |
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
| `/api/elections/dashboard/stats/professions` | Stats professions |
| `/api/elections/map/*`, `/api/elections/diaspora/*` | Carte électorale |
| `/api/elections/pvs/*`, `/api/elections/pvs-upload/*` | Module PVs |
| `/api/documents?election_ids=1,2,3` | Documents filtrés par élections |

---

**Auteur** : Vie Publique Sénégal

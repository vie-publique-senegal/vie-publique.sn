# 🏗️ Architecture des Pages Élections

**Dernière mise à jour** : 2026-07-18

---

## ⚠️ Ancien système supprimé (2026-07)

L'ancien système « soirée électorale » des législatives 2024 (`app/pages/elections/**`,
composants `Election*` de résultats/tendances/PV, composables `useCoalitions` & co) a été
**supprimé** le 2026-07-18. Toutes les URLs `/elections/**` sont redirigées en **301** vers le
dashboard (`routeRules` de `nuxt.config.ts`) :

| Ancienne URL | Redirection 301 |
| --- | --- |
| `/elections` | `/elections-senegal` |
| `/elections/legislatives` (+ `[id]`, `taux-participation`) | `/elections-senegal/dashboard/legislative/2024` |
| `/elections/legislatives/resultats/**` | `…/dashboard/legislative/2024?tab=resultats` |
| `/elections/legislatives/resultats/deputes` | `/assemblee-nationale/deputes` |
| `/elections/legislatives/statistiques` | `…/dashboard/legislative/2024?tab=statistiques` |
| `/elections/legislatives/guide-electoral` | `/elections-senegal/guide-electoral` |
| `/elections/legislatives/carte-electorale/**` | `/elections-senegal/carte-electorale/**` (bureaux-temoins → racine carte) |

Deux stats de l'ancienne page ont été **portées dans l'onglet Stats du dashboard** :
« Présence des listes par département » (composant
`app/components/elections/dashboard/stats/DepartmentalPresence.vue`, API dashboard) et
« Métiers des députés élus » (`ElectionCandidatProfessionDeputies.vue`, données 2024 codées en
dur → option visible uniquement sur législatives 2024). Les artefacts de soirée électorale
(tendances live, bureaux témoins, projection hémicycle, grille PV) n'ont volontairement pas
été repris.

---

## 📁 Structure des fichiers

```
app/pages/elections-senegal/
├── index.vue                             # Landing page
├── guide-electoral.vue                   # Guide de l'électeur
├── legislation.vue                       # Législation électorale
├── dashboard/
│   └── [type]/
│       └── [year].vue                    # Dashboard dynamique
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
| `/elections-senegal/dashboard/legislative/2024` | Dashboard Législatives 2024 |
| `/elections-senegal/dashboard/presidential/2024` | Dashboard Présidentielle 2024 |
| `/elections-senegal/dashboard/locale/2022` | Dashboard Locales 2022 |
| `/elections-senegal/guide-electoral` | Guide de l'électeur |
| `/elections-senegal/legislation` | Législation électorale |
| `/elections-senegal/carte-electorale` | Carte électorale |
| `/elections-senegal/carte-electorale/nationale/dakar` | Détail département Dakar |
| `/elections-senegal/carte-electorale/diaspora/france` | Détail diaspora France |

---

## 📄 Pages

### 1. Landing (`index.vue`)

Point d'entrée avec élection en vedette et accès rapide aux sections.

### 2. Dashboard (`dashboard/[type]/[year].vue`)

Dashboard interactif avec onglets :
- **Candidats** : Listes et candidats
- **Carte** : Carte des résultats
- **Résultats** : Stats et classement coalitions
- **Documents** : Documents liés à l'élection
- **Statistiques** : Professions, sexe, âge
- **Guide** : Vidéos tutoriels

**Params URL** :
- `type` : `legislative`, `presidential`, `locale`
- `year` : Année (ex: `2024`)
- `tab` : Onglet actif (query param)
- `stats_type` : Type de stat (uniquement sur onglet stats)

### 3. Guide Électoral (`guide-electoral.vue`)

Vidéos tutoriels pour expliquer le processus électoral.

### 4. Législation (`legislation.vue`)

Liste des documents électoraux avec filtres par type et année.

**Filtrage** : Utilise `election_ids` (IDs séparés par virgules) pour filtrer sur plusieurs élections.

### 5. Carte Électorale (`carte-electorale/`)

- `index.vue` : Vue globale
- `nationale/[department].vue` : Détail département
- `diaspora/[country].vue` : Détail pays diaspora

---

## 🧩 Composables

| Composable | Rôle |
|------------|------|
| `useElectoralDashboard()` | Config, élection active, documents |
| `useElectoralCoalitions()` | Liste des coalitions |
| `useElectoralConstituencies()` | Liste des circonscriptions |
| `useElectoralProfessions()` | Stats par profession |
| `useElectoralStatsList()` | Stats départementales |

---

## 📡 APIs

| Endpoint | Description |
|----------|-------------|
| `/api/elections/dashboard/config` | Configuration (années, types, élections) |
| `/api/elections/dashboard/coalitions` | Coalitions |
| `/api/elections/dashboard/constituencies` | Circonscriptions |
| `/api/elections/dashboard/stats/professions` | Stats professions |
| `/api/documents?election_ids=1,2,3` | Documents filtrés par élections |

---

**Auteur** : Vie Publique Sénégal

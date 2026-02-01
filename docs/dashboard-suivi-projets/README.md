# Tableau de Bord - Suivi des Projets Publics (Vision 2050)

## Description

Dashboard de visualisation et suivi des projets publics du Sénégal inspiré de la maquette Vision 2050.

**URL**: `/dashboard/suivi-projets-publics`

## Fonctionnalités

### KPIs Principaux
- **412** Projets Vision suivis
- **3 200 Mds CFA** Budget total
- **46%** Avancement global
- **32** Projets à risque

### Onglets

#### 1. Par Pilier Vision
- Carte interactive du Sénégal (placeholder)
- 4 piliers avec jauges circulaires:
  - Capital Humain (138 projets - 36%)
  - Infrastructures & Territoire (105 projets - 51%)
  - Économie Productive (87 projets - 40%)
  - Gouvernance (82 projets - 55%)

#### 2. Projets Prioritaires
Tableau TOP 5 avec:
- Nom du projet
- Budget
- Pilier
- Statut (OK, En cours, À surveiller)
- Barre de progression

#### 3. Par Région
Grille des 14 régions du Sénégal avec:
- Nombre de projets
- Budget alloué

### Recherche
Barre de recherche pour filtrer les projets.

## Stack Technique

- **Framework**: Nuxt 3 + Vue 3
- **UI**: Nuxt UI + Tailwind CSS
- **Charts**: ApexCharts (vue3-apexcharts)
- **Type**: TypeScript
- **Rendu**: SSR + Client-side

## Fichiers Créés

```
app/
├── pages/dashboard/suivi-projets-publics.vue   # Page principale
├── plugins/apexcharts.client.ts                # Plugin ApexCharts
└── config/features.config.ts                   # Feature flag ajouté

app/pages/menu.vue                               # Lien menu ajouté
```

## Configuration

### Feature Flag

```typescript
menu_dashboard_vision2050: {
  key: 'menu_dashboard_vision2050',
  enabled: true,
  environments: ['dev'],
  description: 'Menu Tableau de Bord Vision 2050'
}
```

### Variables d'environnement

Pour activer le dashboard, définir dans `.env`:

```bash
NUXT_PUBLIC_APP_ENV=dev
```

## Installation

Les dépendances ApexCharts sont déjà installées:

```bash
npm install apexcharts vue3-apexcharts
```

## Utilisation

1. Démarrer le serveur:
```bash
npm run dev
```

2. Accéder au dashboard:
```
http://localhost:3000/dashboard/suivi-projets-publics
```

3. Ou via le menu: Cliquer sur "Tableau de Bord Vision 2050"

## SEO

Page désindexée pour les moteurs de recherche:

```html
<meta name="robots" content="noindex, nofollow">
```

## Données

### Structure JSON

Les données sont actuellement mockées dans le composant. Structure:

```typescript
// KPIs
{
  label: string
  value: string
  icon: string
  iconColor: string
  iconBg: string
}

// Piliers
{
  name: string
  projects: number
  progress: number
  icon: string
  color: string
}

// Projets
{
  id: number
  name: string
  budget: string
  pillar: string
  status: string
  progress: number
}

// Régions
{
  name: string
  projects: number
  budget: string
}
```

## Améliorations Futures

### Court terme
- [ ] Intégrer vraie carte interactive (Leaflet/Mapbox)
- [ ] Connecter à une API réelle
- [ ] Filtres avancés (budget, région, statut)

### Moyen terme
- [ ] Export PDF/CSV
- [ ] Graphiques d'évolution temporelle
- [ ] Détails de projet (modal/page)
- [ ] Système de notifications

### Long terme
- [ ] Dashboard temps réel
- [ ] Analyse prédictive
- [ ] Rapports automatisés
- [ ] Intégration BI

## Performance

- **ClientOnly**: ApexCharts chargé uniquement côté client
- **Responsive**: Grid adaptatif (mobile, tablet, desktop)
- **Lazy loading**: Prêt pour l'ajout d'images optimisées

## Maintenance

### Modifier les données

Éditer directement les constantes dans `suivi-projets-publics.vue`:
- `kpis` - Ligne 94
- `pillars` - Ligne 118
- `topProjects` - Ligne 145
- `regions` - Ligne 190

### Personnaliser les couleurs

Les couleurs sont définies avec Tailwind CSS. Modifier les classes dans le template.

### Ajouter un graphique

```vue
<ClientOnly>
  <apexchart
    type="radialBar"
    :options="chartOptions"
    :series="[value]"
    height="180"
  />
</ClientOnly>
```

## Notes

- Template de test pour visualisation de données
- Données fictives basées sur la maquette Vision 2050
- Optimisé pour la performance et la responsivité
- Prêt pour intégration API backend

---

**Créé le**: 2026-01-30
**Version**: 1.0.0

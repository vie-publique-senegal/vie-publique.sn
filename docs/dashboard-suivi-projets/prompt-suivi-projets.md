/budget-senegal/dashboard

Tu es un agent développeur senior. Objectif : créer une maquette fonctionnelle (MVP) du dashboard A11 “Suivi des projets publics – Vision 2050” en Nuxt (Nuxt 3 ou Nuxt 4) avec Tailwind (dark mode déjà activé dans le projet), NuxtCharts (https://nuxtcharts.com/) pour les charts + GeoJSON pour la carte du Sénégal.


POINT CRITIQUE : gérer DEUX VERSIONS UI
- Version LIGHT
- Version DARK
=> Utiliser Tailwind `dark:` + quelques CSS variables (tokens) pour harmoniser.
=> Pas de duplication de composants. Les composants doivent être themables.


LAYOUT UI (identique sur les 2 thèmes)
- Header
  - gauche : “Tableau de Bord – Vision 2050” + logo
  - droite : search arrondi + badge drapeau Sénégal
- Ligne KPI (4 cartes)
  1) Projets Vision suivis (412)
  2) Budget total (3 200 Mds CFA)
  3) Avancement global (46%) + mini gauge
  4) Projets à risque (32)
- Tabs : Par Pilier Vision | Par Région | Projets Prioritaires
- Main : 2 colonnes
  - gauche : Carte Sénégal (GeoJSON) + zoom controls + légende piliers
  - droite : 4 cartes piliers avec icône + nb projets + barre + demi-jauge
- Bas : table Top 5 projets prioritaires + progress bar + chevron + click => drawer

COMPORTEMENTS MINIMUM
- Search filtre la table
- Tabs modifient mode d’affichage (au minimum un state `viewMode`)
- Carte:
  - Hover région: tooltip (nom région, nb projets, budget, avancement)
  - Click région: filtre table et surligne la région
- Table:
  - Click ligne: ouvre drawer détail (mock)
- Responsive:
  - Sur mobile : colonne unique (carte puis piliers puis table)
  - Considérer scroll horizontal pour la table


CHARTS
- KPI “Avancement global”: petite jauge circulaire via NuxtCharts (ECharts gauge)
- Cartes piliers: demi-jauge (gauge semicircle) + barre horizontale
- Progress bars table: custom CSS (pas besoin de chart)

COMPORTEMENTS MINIMUM
- Search: filtre la table par nom de projet
- Tabs: modifie le mode d’affichage (piliers vs régions vs top projets)
- Hover map: tooltip
- Click region: filtre la table sur la région (et surligne la région)
- Click project row: ouvre drawer détails

CONTRAINTES
- Pas de dépendances lourdes inutiles.
- Code lisible, composants isolés, pas de logique dans le template.
- Tout doit fonctionner en local avec `npm run dev`.

Commence par générer le squelette Nuxt + composants + styles + mock data, puis implémente la carte GeoJSON avec Leaflet, puis intègre les charts via NuxtCharts.

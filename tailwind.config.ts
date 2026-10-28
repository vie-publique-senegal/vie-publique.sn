import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  content: [],
  darkMode: 'class',
  // ⚠️ Anneaux de `<UBadge variant="subtle" :color="...">` dont la couleur est
  // DYNAMIQUE. L'extracteur de @nuxt/ui ne lit que les couleurs statiques
  // (`color="green"`) : sans cette safelist, `ring-<couleur>-500` /
  // `dark:ring-<couleur>-400` ne sont pas générés, et `--tw-ring-color` retombe sur
  // le bleu par défaut du reset Tailwind — badge cerclé de bleu au lieu de sa couleur.
  // Invisible en dev (le CSS y est plus permissif), visible seulement en build de prod.
  // ⚠️ `gray` est touché AUSSI avec une couleur STATIQUE : la map `color` de Nuxt UI
  // ne définit `gray`/`white`/`black` que pour la variante `solid`. En `subtle`/`outline`,
  // gray retombe sur le gabarit générique `ring-{color}-500` — non généré sans cette liste.
  // Concernés : 10 `<UBadge color="gray" variant="subtle">` (dont les 4 encarts du
  // dashboard budget), ElectoralDetailsCard (getStatusColor → orange/blue/yellow) et
  // ConstituencyCard (badgeColorByType → blue). Ajouter ici toute nouvelle couleur
  // utilisée par un composant Nuxt UI qui pose un anneau.
  safelist: [
    {
      pattern: /^ring-(gray|orange|blue|yellow)-(400|500)$/,
      variants: ['dark'],
    },
  ],
  theme: {
    extend: {
      // ⚠️ NE PAS SUPPRIMER. @nuxt/ui v2 charge `@tailwindcss/aspect-ratio`, dont la config
      // REMPLACE `theme.aspectRatio` par des valeurs numériques (1..16) destinées à
      // `aspect-w-*` / `aspect-h-*`. Conséquence : les utilitaires NOMMÉS du cœur Tailwind
      // (`aspect-video`, `aspect-square`, `aspect-auto`) ne génèrent plus AUCUNE règle CSS
      // — silencieusement : la classe reste dans le HTML mais n'a aucun effet (les hauteurs
      // d'images retombent sur la taille intrinsèque → cartes désalignées). Seules les
      // valeurs arbitraires (`aspect-[16/9]`) survivaient. On restaure donc les ratios nommés.
      aspectRatio: {
        auto: 'auto',
        square: '1 / 1',
        video: '16 / 9',
      },
      colors: {
        // Couleurs de marque Vie Publique Sénégal
        brand: {
          navy: '#18223B', // Bleu Marine - couleur principale
          gold: '#E2BA13', // Jaune Doré - accent, CTA, highlights
        },
        // Dark mode "Dim" palette - Twitter/X inspired
        // Bleu-noir profond, plus doux que le noir pur
        dark: {
          50: '#E7E9EA', // Texte principal
          100: '#D6D9DB', // Texte secondaire clair
          200: '#8899A6', // Texte secondaire
          300: '#6E767D', // Texte tertiaire
          400: '#536471', // Icônes inactives
          500: '#38444D', // Bordures, séparateurs
          600: '#2F3336', // Surface élevée hover
          700: '#1E2732', // Surface élevée (cartes)
          800: '#192734', // Surface principale
          900: '#15202B', // Background principal
          950: '#0D1520', // Background plus profond
        },
      },
      backgroundColor: {
        // Raccourcis pour le dark mode
        dim: '#15202B',
        'dim-card': '#1E2732',
        'dim-hover': '#2F3336',
      },
    },
  },
  plugins: [typography],
} satisfies Config;

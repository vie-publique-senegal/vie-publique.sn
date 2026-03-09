// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2026-01-11',
  devtools: { enabled: true },
  imports: {
    autoImport: true,
    dirs: [
      'app/composables/**',
      'app/composables/elections/dashboard'
    ],
  },
  hooks: {
    'pages:extend'(pages) {
      // Lire la configuration du pays depuis app.config.ts
      // Note: Dans un contexte de build, on peut lire directement le fichier ou utiliser une valeur par défaut
      const appConfigPath = './app/app.config.ts';
      let countryName = 'senegal'; // Valeur par défaut

      try {
        // Essayer de lire la config depuis le projet parent si elle existe
        const fs = require('fs');
        const path = require('path');

        // Chercher d'abord dans le projet parent
        const parentConfigPath = path.resolve(process.cwd(), 'app/app.config.ts');
        if (fs.existsSync(parentConfigPath)) {
          const configContent = fs.readFileSync(parentConfigPath, 'utf-8');
          // Extraire le nom du pays via regex (simple parsing)
          const countryMatch = configContent.match(/country:\s*{\s*name:\s*['"]([^'"]+)['"]/);
          if (countryMatch) {
            countryName = countryMatch[1];
          }
        }
      } catch (e) {
        console.warn('Could not read country config, using default "senegal"');
      }

      // Convertir le nom du pays en slug
      const countrySlug = countryName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-');

      const baseRoute = `elections-${countrySlug}`;

      // Trouver et modifier toutes les pages du dossier elections-senegal
      const electionsPages = pages.filter(page =>
        page.file?.includes('elections-senegal')
      );

      electionsPages.forEach(page => {
        if (page.path) {
          // Remplacer elections-senegal par le slug dynamique
          page.path = page.path.replace('elections-senegal', baseRoute);

          // Mettre à jour le name également
          if (page.name) {
            page.name = page.name.replace('elections-senegal', baseRoute);
          }
        }
      });
    },
  },
});

/**
 * Configuration Sentry côté CLIENT (navigateur).
 * Injectée automatiquement par le module @sentry/nuxt (fichier conventionnel à la racine).
 *
 * Périmètre volontairement minimal : capture d'ERREURS uniquement.
 * Pas de tracing ni de session replay (poids client + quota du plan gratuit).
 * Voir docs/infra/sentry.md avant de modifier.
 */
import * as Sentry from '@sentry/nuxt';
import { useRuntimeConfig } from '#imports';

const config = useRuntimeConfig();
const dsn = config.public.sentry?.dsn;

// Pas de DSN configuré → Sentry entièrement désactivé (aucun impact runtime)
if (dsn) {
  Sentry.init({
    dsn,
    environment: config.public.appEnv || 'production',
    release: `vie-publique.sn@${config.public.appVersion}`,

    // Erreurs uniquement — pas de tracing de performance
    tracesSampleRate: 0,

    // Bruit connu à NE PAS remonter (quota + signal/bruit) :
    ignoreErrors: [
      // Erreurs de chunks après déploiement — déjà auto-gérées par reload
      // (voir app/plugins/chunk-error-handler.client.ts)
      'Failed to fetch dynamically imported module',
      'Importing a module script failed',
      'error loading dynamically imported module',
      'Unable to preload CSS',
      'Loading chunk',
      'ChunkLoadError',
      'Failed to load module script',
      // Manifest de build Nuxt : un onglet resté ouvert sur l'ancien build
      // interroge /_nuxt/builds/meta/<ancien-id>.json qui n'existe plus après
      // un déploiement → 404 attendu (c'est ce qui déclenche la détection de
      // build périmé). Regex limitée à ce chemin : ne masque rien d'autre.
      /\/_nuxt\/builds\/meta\/[\w-]+\.json.*404/,
      // Connectivité utilisateur (réseaux mobiles instables), pas un bug applicatif
      'Failed to fetch',
      'NetworkError when attempting to fetch a resource',
      'Load failed',
      // Extensions navigateur / scripts tiers hors de notre contrôle
      'ResizeObserver loop',
      // Webviews Android avec stockage tiers bloqué : l'accès localStorage est
      // refusé au boot (DOMException 18). Environnemental, pas un bug applicatif.
      "Failed to read the 'localStorage' property from 'Window'",
    ],
    // Ne pas remonter les erreurs venant de scripts tiers (GTM, Twitter, Facebook…)
    denyUrls: [
      /googletagmanager\.com/,
      /google-analytics\.com/,
      /clarity\.ms/,
      /connect\.facebook\.net/,
      /platform\.twitter\.com/,
      // Extensions navigateur injectées via blob: — notre code (y compris le worker
      // pdf.js) est toujours servi depuis /_nuxt/, jamais depuis un blob:
      /^blob:/,
    ],

    // Les 404 « attendus » (slug inexistant, vieux lien) sont un comportement
    // normal, pas une erreur à monitorer : ne pas brûler le quota avec.
    // Les throw createError({ statusCode: 503 }) des pages, eux, remontent bien.
    beforeSend(event, hint) {
      const original = hint.originalException;
      if (
        original &&
        typeof original === 'object' &&
        (original as { statusCode?: number }).statusCode === 404
      ) {
        return null;
      }
      return event;
    },
  });
}

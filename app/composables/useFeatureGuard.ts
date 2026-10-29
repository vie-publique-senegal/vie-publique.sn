/**
 * Garde feature flag d'une page : 404 si la feature est désactivée.
 *
 * À appeler en tête du `<script setup>` de chaque page d'un module protégé par
 * un flag (une page parente qui contient `<NuxtPage />` couvre aussi ses enfants).
 *
 * @example
 * useFeatureGuard('menu_collectivites_territoriales');
 */
export function useFeatureGuard(featureKey: string): void {
  const { isFeatureEnabled, loading } = useFeatureFlags();

  watchEffect(() => {
    if (!loading.value && !isFeatureEnabled(featureKey)) {
      throw createError({ statusCode: 404, statusMessage: 'Page non trouvée' });
    }
  });
}

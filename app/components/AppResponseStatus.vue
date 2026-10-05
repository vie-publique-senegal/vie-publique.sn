<script setup lang="ts">
/**
 * Fixe le code HTTP de la réponse SSR depuis le template, sans remplacer la page par
 * la page d'erreur globale : à placer dans la branche « introuvable » d'une page dont
 * les données arrivent en différé (`<AppResponseStatus :code="404" />`), pour que les
 * moteurs de recherche ne l'indexent pas comme un contenu (soft 404).
 *
 * Le setup d'un composant s'exécute pendant le rendu serveur, avant l'envoi des en-têtes.
 * Sans effet côté client (navigation interne).
 */
const props = defineProps<{ code: number }>();

if (import.meta.server) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, props.code);
}
</script>

<template>
  <span hidden />
</template>

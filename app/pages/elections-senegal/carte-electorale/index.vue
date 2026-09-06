<script setup lang="ts">
/**
 * Le hub carte-electorale redirige vers la vue nationale (onglet par défaut)
 * en propageant le contexte (?revision= / ?election=). Redirection 301 côté
 * serveur : le contenu vit dans les sous-pages nationale / diaspora / resume.
 */
definePageMeta({
  middleware: [
    (to) =>
      navigateTo(
        { path: '/elections-senegal/carte-electorale/nationale', query: to.query },
        { redirectCode: 301 },
      ),
  ],
});
</script>

<template>
  <div />
</template>

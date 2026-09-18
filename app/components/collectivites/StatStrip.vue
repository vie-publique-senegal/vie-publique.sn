<!--
  Bandeau de repères chiffrés du module : « valeur en gras + libellé gris »,
  séparé du contenu par un filet. Les cinq pages du module l'affichaient
  chacune à la main ; c'est le même bandeau, il n'a qu'une définition.

  Sobre par choix (cf. UI conventions du CLAUDE.md) : une ligne de chiffres,
  pas des tuiles. Les repères qui correspondent à un hub sont des liens — ils
  SONT l'entrée de ce hub.

  Valeur et libellé sont espacés par `mr-1`/`ml-1`, pas par une espace
  typographique : Vue condense les blancs autour d'une interpolation multiligne
  et les deux se retrouveraient collés (« 14régions »).
-->
<template>
  <div class="flex flex-wrap gap-6 border-b border-gray-100 py-4 text-sm dark:border-gray-700">
    <div v-for="repere in items" :key="repere.key">
      <span v-if="repere.prefix" class="mr-1 text-gray-500 dark:text-gray-400">{{
        repere.prefix
      }}</span>

      <NuxtLink
        v-if="repere.to"
        :to="repere.to"
        class="text-primary-600 dark:text-primary-400 hover:underline"
      >
        <span class="font-bold">{{ formatRepereValue(repere.value) }}</span>
        <span v-if="repere.label" class="ml-1">{{ repere.label }}</span>
      </NuxtLink>

      <template v-else>
        <span class="font-bold text-gray-900 dark:text-white">{{
          formatRepereValue(repere.value)
        }}</span>
        <span v-if="repere.label" class="ml-1 text-gray-500 dark:text-gray-400">{{
          repere.label
        }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatRepereValue, type Repere } from '~/composables/collectivites/reperes';

interface Props {
  /** Repères affichés, dans l'ordre donné. Voir les helpers de `reperes.ts`. */
  items: Repere[];
}

defineProps<Props>();
</script>

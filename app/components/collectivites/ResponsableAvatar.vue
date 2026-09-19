<!-- Photo de la personne si le CMS en a une, initiales sinon. -->
<template>
  <CmsImage
    v-if="responsable.photo"
    :src="responsable.photo"
    :alt="responsable.nom"
    :width="size"
    :height="size"
    class="shrink-0 rounded-full object-cover"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
  <div
    v-else
    class="flex shrink-0 items-center justify-center rounded-full bg-sky-50 font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size / 3)}px` }"
  >
    {{ initiales }}
  </div>
</template>

<script setup lang="ts">
import type { CommuneResponsable } from '~~/types/collectivite';

interface Props {
  responsable: CommuneResponsable;
  size?: number;
}

const props = withDefaults(defineProps<Props>(), { size: 56 });

const initiales = computed(() =>
  props.responsable.nom
    .split(/\s+/)
    .map((mot) => mot[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase(),
);
</script>

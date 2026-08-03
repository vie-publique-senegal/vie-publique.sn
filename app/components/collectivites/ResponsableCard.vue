<!--
  Bloc « personne rattachée à une collectivité » (maire, secrétaire municipal).

  La fiche personne vit sur /personnalites/<id>/<slug> : l'id est obligatoire
  dans l'URL, le slug seul ne résout rien. Quand la personne n'a pas de slug, on
  affiche le bloc sans lien plutôt qu'un lien cassé.

  ⚠️ Deux gabarits explicites plutôt qu'un `<component :is="lien ? 'NuxtLink' : 'div'">` :
  un composant désigné par une CHAÎNE n'est pas résolu ici et le bloc se rendait
  vide (même piège que celui documenté dans communeTabs.ts).
-->
<template>
  <NuxtLink
    v-if="lien"
    :to="lien"
    class="group flex items-start gap-3 rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-sky-500"
  >
    <CollectivitesResponsableAvatar :responsable="responsable" />
    <div class="min-w-0">
      <div class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {{ role }}
      </div>
      <div
        class="group-hover:text-primary-600 dark:group-hover:text-primary-400 font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 group-hover:decoration-current dark:text-white dark:decoration-gray-600"
      >
        {{ responsable.nom }}
      </div>
      <div v-if="responsable.depuis" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        En fonction depuis {{ formatDate(responsable.depuis) }}
      </div>
      <div
        class="text-primary-600 dark:text-primary-400 mt-1 inline-flex items-center gap-1 text-xs"
      >
        Voir sa fiche
        <UIcon name="i-heroicons-arrow-right-20-solid" class="size-3.5" />
      </div>
    </div>
  </NuxtLink>

  <div v-else class="flex items-start gap-3">
    <CollectivitesResponsableAvatar :responsable="responsable" />
    <div class="min-w-0">
      <div class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {{ role }}
      </div>
      <div class="font-medium text-gray-900 dark:text-white">{{ responsable.nom }}</div>
      <div v-if="responsable.depuis" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        En fonction depuis {{ formatDate(responsable.depuis) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommuneResponsable } from '~~/types/collectivite';

interface Props {
  responsable: CommuneResponsable;
  role: string;
}

const props = defineProps<Props>();

const lien = computed(() =>
  props.responsable.slug
    ? `/personnalites/${props.responsable.id}/${props.responsable.slug}`
    : undefined,
);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
</script>

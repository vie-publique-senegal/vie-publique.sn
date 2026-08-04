<!--
  Maillage interne en bas de fiche : les départements voisins d'une région, les
  autres régions du pays. Deux pages affichaient la même rangée de pastilles.

  Ce n'est pas de la décoration : c'est ce qui rend les 46 hubs départementaux et
  les 14 hubs régionaux atteignables les uns depuis les autres, donc crawlables
  sans passer par l'annuaire filtré (dont les `?query` ne sont pas indexables).
-->
<template>
  <section v-if="items.length" class="mx-auto max-w-7xl px-4">
    <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {{ title }}
    </h2>

    <div class="mt-3 flex flex-wrap gap-2">
      <NuxtLink
        v-for="item in items"
        :key="item.slug"
        :to="`${basePath}/${item.slug}`"
        class="text-primary-600 dark:text-primary-400 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        {{ item.nom }}
      </NuxtLink>
    </div>

    <NuxtLink
      v-if="moreTo && moreLabel"
      :to="moreTo"
      class="text-primary-600 dark:text-primary-400 mt-4 inline-block text-sm hover:underline"
    >
      {{ moreLabel }}
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
/** Renvoi minimal : de quoi nommer l'entité et construire son URL. */
interface RelatedItem {
  slug: string;
  nom: string;
}

interface Props {
  /** Intitulé de la rangée (« Autres régions du Sénégal »). */
  title: string;
  items: RelatedItem[];
  /** Préfixe d'URL, sans slash final (`/collectivites-territoriales/regions`). */
  basePath: string;
  /** Lien de sortie optionnel vers le hub complet, sous la rangée. */
  moreTo?: string;
  moreLabel?: string;
}

defineProps<Props>();
</script>

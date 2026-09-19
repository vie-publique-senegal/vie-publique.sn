<!--
  En-tête des pages hub du module (régions, départements, fiche région, fiche
  département) : fil d'ariane, H1, chapô, puis ce que la page ajoute (recherche,
  bandeau de repères) via le slot par défaut.

  Toutes ces pages sont du MÊME rang : elles partagent donc la même échelle de
  titre (`text-lg` / `sm:text-xl`). Un H1 plus gros sur l'une les ferait paraître
  hiérarchisées. Centraliser l'en-tête garantit qu'elles le restent.

  L'annuaire (`/collectivites-territoriales`) garde le sien : son en-tête est
  collant et embarque filtres et bascule de vue, ce n'est pas le même objet.
-->
<template>
  <div>
    <div class="mx-auto max-w-7xl px-4 pt-2">
      <AppBreadcrumb :items="breadcrumb" />
    </div>

    <header class="mx-auto max-w-7xl px-4 pt-4">
      <h1 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">{{ title }}</h1>

      <p v-if="$slots.description" class="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        <slot name="description" />
      </p>

      <slot />
    </header>
  </div>
</template>

<script setup lang="ts">
interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface Props {
  /** Fil d'ariane complet, page courante incluse (API `<AppBreadcrumb>`). */
  breadcrumb: BreadcrumbItem[];
  title: string;
}

defineProps<Props>();
</script>

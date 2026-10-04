<script setup lang="ts">
/**
 * Bloc d'erreur canonique du site (listes, dashboards, sections asynchrones).
 *
 * Règle projet : aucun message technique à l'écran. Passer l'erreur brute via
 * `:error` — le message affiché est TOUJOURS produit par
 * `getFriendlyErrorMessage()`. Utiliser `message` seulement pour un texte
 * métier plus précis (« Impossible de charger les députés… »).
 */
interface Props {
  /** Erreur brute (ofetch / h3 / Error). Jamais affichée telle quelle. */
  error?: unknown;
  /** Titre du bloc. */
  title?: string;
  /** Message métier de repli, utilisé quand l'erreur n'est pas reconnue. */
  message?: string;
  /** Affiche le bouton « Réessayer » (émet `retry`). */
  retryable?: boolean;
  /** Version dense, pour un encart ou une colonne étroite. */
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  error: undefined,
  title: 'Contenu momentanément indisponible',
  message: undefined,
  retryable: false,
  compact: false,
});

const emit = defineEmits<{ retry: [] }>();

const description = computed(() => getFriendlyErrorMessage(props.error, props.message));
</script>

<template>
  <div
    class="flex flex-col items-center justify-center text-center"
    :class="compact ? 'py-8' : 'py-12'"
    role="alert"
  >
    <div
      class="flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30"
      :class="compact ? 'h-10 w-10' : 'h-14 w-14'"
    >
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="text-red-500 dark:text-red-400"
        :class="compact ? 'h-5 w-5' : 'h-7 w-7'"
      />
    </div>

    <p
      class="mt-4 font-semibold text-gray-900 dark:text-white"
      :class="compact ? 'text-sm' : 'text-base'"
    >
      {{ title }}
    </p>

    <p class="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
      {{ description }}
    </p>

    <UButton
      v-if="retryable"
      class="mt-4"
      color="gray"
      variant="solid"
      size="sm"
      icon="i-heroicons-arrow-path"
      @click="emit('retry')"
    >
      Réessayer
    </UButton>
  </div>
</template>

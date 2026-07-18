<script setup lang="ts">
import { useElectoralDashboard } from '~/composables/elections/dashboard/useElectoralDashboard';

const { currentElection, currentElectionDocuments, loadingConfig } = useElectoralDashboard();

const route = useRoute();
const router = useRouter();
const itemsPerPage = 12;
const currentPage = ref(Math.max(1, Number(route.query.page) || 1));

watch(currentPage, (page) => {
  router.replace({ query: { ...route.query, page: page > 1 ? String(page) : undefined } });
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(currentElectionDocuments.value.length / itemsPerPage)),
);

// Ramène la page dans les bornes si l'URL pointe vers une page qui n'existe plus
watch(
  totalPages,
  (pages) => {
    if (currentPage.value > pages) currentPage.value = pages;
  },
  { immediate: true },
);

const paginatedDocuments = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return currentElectionDocuments.value.slice(start, start + itemsPerPage);
});

useSeoMeta({
  title: () =>
    currentElection.value?.name
      ? `Documents · ${currentElection.value.name}`
      : 'Documents Officiels | Élections Sénégal',
  description: () =>
    currentElection.value?.name
      ? `Documents et textes officiels de ${currentElection.value.name}.`
      : 'Documents officiels des élections au Sénégal.',
  ogTitle: () =>
    currentElection.value?.name
      ? `Documents · ${currentElection.value.name}`
      : 'Documents Officiels des Élections au Sénégal',
  ogDescription: () =>
    currentElection.value?.name
      ? `Accédez aux documents et textes officiels de ${currentElection.value.name} : décrets, arrêtés et résultats définitifs.`
      : 'Documents officiels des élections au Sénégal.',
});
</script>

<template>
  <div class="animate-in fade-in mx-auto max-w-7xl space-y-4 duration-700">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h2 class="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
          Documents Officiels
        </h2>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Retrouvez les textes et documents liés à ce scrutin.
        </p>
      </div>
      <UButton
        to="/elections-senegal/legislation"
        variant="ghost"
        size="xs"
        icon="i-heroicons-arrow-right"
        class="shrink-0 self-start sm:self-auto"
      >
        Voir toute la législation
      </UButton>
    </div>

    <div class="min-h-[300px]">
      <ElectionsDashboardDocumentsTab
        :documents="paginatedDocuments"
        :election-name="currentElection?.name"
        :loading="loadingConfig"
      />

      <div v-if="totalPages > 1" class="mt-6 flex justify-center">
        <UPagination
          v-model="currentPage"
          :total="currentElectionDocuments.length"
          :page-count="itemsPerPage"
          size="sm"
          :ui="{
            wrapper: 'flex items-center gap-1',
            rounded: 'rounded-lg',
          }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useElectoralDashboard } from '../../composables/elections/dashboard/useElectoralDashboard';
import { useElectionRoutes } from '../../composables/useElectionRoutes';


/**
 * Page Guide Électoral - Sénégal
 */

const route = useRoute();
const router = useRouter();
const electionRoutes = useElectionRoutes();

const { filteredTypes, showTypeFilter } = useElectoralDashboard();

const selectedType = ref<string>((route.query.type as string) || 'all');

// Correspondance type élection → valeur attendue par GuideElectoralVideos (CMS guide_videos.type_election)
// Le type 'locale' (élection) correspond à 'local' dans le CMS guide_videos
const toGuideType = (t: string) => t === 'locale' ? 'local' : t;

// Types disponibles dérivés de enabledTypes — respecte la config app.config.ts
const electionTypes = computed(() => {
  const all = [{ label: 'Toutes les élections', value: 'all' }];
  if (!filteredTypes.value.length) return all;

  const mapped = filteredTypes.value.map(t => ({
    label: t.label,
    value: toGuideType(t.value),
  }));

  return [...all, ...mapped];
});

watch(selectedType, (newType) => {
  router.replace({ query: { ...route.query, type: newType === 'all' ? undefined : newType } });
});

// Quand le filtre est masqué, forcer le type au premier enabledType dès que la config est chargée
watch(filteredTypes, (types) => {
  if (!showTypeFilter && types.length > 0) {
    selectedType.value = toGuideType(types[0].value);
  }
}, { immediate: true });

// SEO avec Open Graph
useSeoMeta({
  title: 'Guide Électoral | Élections Sénégal',
  description: 'Apprenez comment voter au Sénégal : vidéos tutoriels, étapes du scrutin et conseils pour exercer votre droit de vote.',
  ogTitle: 'Guide Électoral - Élections Sénégal',
  ogDescription: 'Découvrez le processus de vote au Sénégal avec nos vidéos explicatives et guides pratiques.',
});
</script>

<template>
  <div class="min-h-screen pb-16">
    <!-- Header Compact -->
    <div class="bg-white dark:bg-gray-900 border-b dark:border-gray-800 pt-8 pb-6 shadow-sm">
      <div class="container mx-auto px-4 max-w-6xl">
        <!-- Breadcrumb -->
        <AppBreadcrumb
          class="mb-6"
          :links="[{ label: 'Élections', to: electionRoutes.home }]"
          last-text="Guide Électoral"
        />

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="space-y-1">
            <h1 class="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Guide de l'Électeur</h1>
            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider italic">Apprenez comment voter et découvrez les étapes du scrutin</p>
          </div>

          <div v-if="showTypeFilter" class="flex flex-wrap items-center gap-3">
             <USelect
                v-model="selectedType"
                :options="electionTypes"
                size="md"
                class="w-full md:w-64"
                placeholder="Type d'élection"
                icon="i-heroicons-funnel"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 max-w-6xl py-12">
      <!-- Component reusing existing guide logic -->
      <ElectionDashboardGuideElectoralVideos :type-election="selectedType" />
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
}
</style>

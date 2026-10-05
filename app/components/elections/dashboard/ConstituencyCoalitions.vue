<script setup lang="ts">
import { useElectoralDashboardLists } from '~/composables/elections/dashboard/useElectoralDashboardLists';
import {
  isMunicipalConstituencyType,
  municipalConstituencyLabel,
} from '#shared/election-constituency';

const props = defineProps<{
  constituencyId: string | number;
  constituencyName: string;
  year: number;
  type: string;
}>();

const emit = defineEmits(['close', 'selectCoalition']);

const route = useRoute();
const router = useRouter();
const selectedCommuneId = ref<string | number | null>(
  route.query.commune_id ? String(route.query.commune_id) : null,
);

const { lists, loading } = useElectoralDashboardLists({
  year: computed(() => props.year),
  type: computed(() => props.type),
  constituencyId: computed(() => String(props.constituencyId)),
});

// « Ville de DAKAR » : les noms bruts des listes sont en capitales, le libellé suit
const constituencyLabel = (c?: { name?: string; nationale_type?: string | null } | null) => {
  const name = c?.name || '';
  const label = municipalConstituencyLabel(name, c?.nationale_type);
  return name && name === name.toUpperCase() ? label.toUpperCase() : label;
};

const communes = computed(() => {
  if (!lists.value) return [];
  const uniqueCommunes = new Map<string | number, { name: string; isCity: boolean }>();
  lists.value.forEach((list: any) => {
    // Communes et villes (une ville se traite comme une commune) ; villes en tête
    if (
      list.constituency &&
      (list.constituency.type === 'commune' ||
        isMunicipalConstituencyType(list.constituency.nationale_type))
    ) {
      uniqueCommunes.set(list.constituency.id, {
        name: list.constituency.name,
        isCity: list.constituency.nationale_type === 'ville',
      });
    }
  });
  return Array.from(uniqueCommunes.entries())
    .map(([id, { name, isCity }]) => ({
      id,
      name,
      isCity,
      label: constituencyLabel({ name, nationale_type: isCity ? 'ville' : null }),
    }))
    .sort((a, b) => Number(b.isCity) - Number(a.isCity) || a.name.localeCompare(b.name));
});

watch(selectedCommuneId, (newId) => {
  const query = { ...route.query };
  if (newId) {
    query.commune_id = String(newId);
  } else {
    delete query.commune_id;
  }
  router.replace({ query });
});

const searchQuery = ref('');

const filteredLists = computed(() => {
  if (!lists.value) return [];

  let result = lists.value.filter((l: any) => {
    if (l.constituency?.type === 'departement' || l.constituency?.nationale_type === 'departement')
      return false;
    return true;
  });

  if (selectedCommuneId.value) {
    result = result.filter((l: any) => l.constituency?.id == selectedCommuneId.value);
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (l: any) =>
        l.coalition?.name?.toLowerCase().includes(q) ||
        l.coalition?.acronym?.toLowerCase().includes(q),
    );
  }

  return result;
});

const uniqueCoalitions = computed(() => {
  if (!filteredLists.value) return [];

  const map = new Map();
  filteredLists.value.forEach((list: any) => {
    const key = selectedCommuneId.value
      ? list.coalition.id
      : `${list.coalition.id}-${list.constituency?.id}`;

    if (list.coalition && !map.has(key)) {
      map.set(key, list);
    }
  });
  return Array.from(map.values());
});

watch(
  () => props.constituencyId,
  () => {
    selectedCommuneId.value = null;
  },
);

const selectCoalition = (list: any) => {
  if (list.coalition?.id) {
    const targetConstituencyId =
      selectedCommuneId.value || list.constituency?.id || props.constituencyId;

    emit('selectCoalition', {
      coalitionId: list.coalition.id,
      coalitionSlug: list.coalition.political_entity?.slug || null,
      constituencyId: targetConstituencyId,
      // Slug de la commune/ville de la liste : URL propre de la page coalition
      constituencySlug: list.constituency?.slug || null,
    });
  }
};
</script>

<template>
  <div class="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
    <!-- Header avec bouton retour et Filtre -->
    <div class="border-b border-gray-200 pb-4 dark:border-gray-800">
      <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div class="flex items-start gap-4">
          <UButton
            icon="i-heroicons-arrow-left"
            color="gray"
            variant="soft"
            size="sm"
            class="mt-1 shrink-0 rounded-xl"
            @click="emit('close')"
          >
            <span class="hidden sm:inline">Retour</span>
          </UButton>
          <div>
            <div class="flex items-center gap-2">
              <div class="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-1.5">
                <UIcon name="i-heroicons-map-pin" class="text-primary-600 h-4 w-4" />
              </div>
              <h2 class="text-xl font-black uppercase tracking-tighter md:text-2xl">
                {{ constituencyName }}
              </h2>
            </div>
            <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {{ uniqueCoalitions.length }} listes en lice au total
            </p>
          </div>
        </div>

        <!-- Search & Filters -->
        <div class="flex w-full flex-col items-center gap-3 sm:flex-row md:w-auto">
          <div class="w-full md:w-64">
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Rechercher une liste..."
              size="sm"
              class="w-full"
              :ui="{ rounded: 'rounded-xl' }"
            />
          </div>
          <!-- Commune Selector -->
          <div v-if="communes.length > 0" class="w-full md:w-64">
            <USelectMenu
              v-model="selectedCommuneId"
              :options="communes"
              value-attribute="id"
              option-attribute="label"
              placeholder="Toutes les communes"
              searchable
              clearable
              size="sm"
              :ui="{ rounded: 'rounded-xl' }"
            >
              <template #label>
                <span v-if="selectedCommuneId" class="truncate">{{
                  communes.find((c) => c.id == selectedCommuneId)?.label
                }}</span>
                <span v-else class="text-gray-400">Toutes les communes</span>
              </template>
            </USelectMenu>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <ElectionsDashboardCoalitionGridLoadingState v-if="loading" />

    <!-- Grille des Listes -->
    <div
      v-else-if="uniqueCoalitions.length > 0"
      class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="list in uniqueCoalitions"
        :key="`${list.coalition?.id || list.id}-${list.constituency?.id ?? ''}`"
        class="hover:ring-primary-500 group relative cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-lg hover:ring-2 dark:border-gray-800 dark:bg-gray-900"
        @click="selectCoalition(list)"
      >
        <div class="flex items-center gap-5 p-6">
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800"
          >
            <CmsImage
              v-if="list.coalition?.logo"
              :src="list.coalition.logo"
              class="max-h-full max-w-full object-contain"
              :alt="list.coalition?.name"
            />
            <UIcon v-else name="i-heroicons-photo" class="h-8 w-8 text-gray-200" />
          </div>
          <div>
            <p class="text-primary-600 mb-1 text-xs font-bold uppercase tracking-wider">
              {{ constituencyLabel(list.constituency) }}
            </p>
            <h3 class="line-clamp-2 text-lg font-bold leading-tight text-gray-900 dark:text-white">
              {{ list.coalition?.name || list.name }}
            </h3>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="rounded-2xl border bg-white py-20 text-center shadow-inner dark:border-gray-800 dark:bg-gray-900"
    >
      <UIcon
        name="i-heroicons-user-group"
        class="mx-auto mb-4 h-20 w-20 text-gray-200 dark:text-gray-800"
      />
      <h4 class="text-lg font-bold text-gray-400">Aucune liste</h4>
      <p class="mx-auto max-w-xs text-sm text-gray-500">
        Aucune liste trouvée pour les filtres sélectionnés.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Listes en lice dans une circonscription (département) d'une élection locale :
 * tableau groupé par commune/ville, chaque ligne étant un vrai lien vers la page
 * de la liste (URL fournie par la page via `coalitionUrl`).
 */
import { matchesSearch } from '#shared/search';
import { useElectoralDashboardLists } from '~/composables/elections/dashboard/useElectoralDashboardLists';
import {
  isMunicipalConstituencyType,
  municipalConstituencyLabel,
} from '#shared/election-constituency';

export interface CoalitionLinkPayload {
  coalitionId: number | string;
  coalitionSlug?: string | null;
  constituencyId: number | string;
  /** Slug de la circonscription de la liste (commune ou ville) */
  constituencySlug?: string | null;
}

/** Liste telle que renvoyée par `/api/elections/dashboard/lists` (champs utilisés ici) */
interface ListConstituency {
  id: number | string;
  name?: string;
  display_name?: string | null;
  slug?: string | null;
  type?: string | null;
  nationale_type?: string | null;
}
interface DashboardList {
  id: number | string;
  name?: string;
  constituency?: ListConstituency | null;
  coalition?: {
    id: number | string;
    name?: string;
    acronym?: string | null;
    logo?: string | null;
    political_entity?: { slug?: string | null } | null;
  } | null;
  candidates?: {
    first_name?: string | null;
    last_name?: string | null;
    position?: number | null;
    is_substitute?: boolean | null;
  }[];
}

const props = defineProps<{
  constituencyId: string | number;
  constituencyName: string;
  year: number;
  type: string;
  /** Lien de retour vers la liste des circonscriptions */
  backUrl: string;
  coalitionUrl: (payload: CoalitionLinkPayload) => string;
}>();

const route = useRoute();
const router = useRouter();
const selectedCommuneId = ref<string | number | null>(
  route.query.commune_id ? String(route.query.commune_id) : null,
);

const { lists: rawLists, loading } = useElectoralDashboardLists({
  year: computed(() => props.year),
  type: computed(() => props.type),
  constituencyId: computed(() => String(props.constituencyId)),
});
const lists = computed(() => rawLists.value as unknown as DashboardList[]);

// Graphie du référentiel (« Sadatou ») plutôt que la graphie brute en capitales ;
// « Ville de Dakar » pour une ville
const constituencyLabel = (c?: ListConstituency | null) =>
  municipalConstituencyLabel(c?.display_name || c?.name || '', c?.nationale_type);

const isMunicipal = (
  list: DashboardList,
): list is DashboardList & { constituency: ListConstituency } =>
  !!list.constituency &&
  (list.constituency.type === 'commune' ||
    isMunicipalConstituencyType(list.constituency.nationale_type));

const headOfList = (list: DashboardList): string => {
  const candidates = (list.candidates || []).filter((c) => !c.is_substitute);
  if (candidates.length === 0) return '';
  const head = [...candidates].sort(
    (a, b) => (a.position ?? Infinity) - (b.position ?? Infinity),
  )[0];
  return [head.first_name, head.last_name].filter(Boolean).join(' ');
};

const communes = computed(() => {
  if (!lists.value) return [];
  const uniqueCommunes = new Map<string | number, { label: string; isCity: boolean }>();
  lists.value.forEach((list) => {
    // Communes et villes (une ville se traite comme une commune) ; villes en tête
    if (isMunicipal(list)) {
      uniqueCommunes.set(list.constituency.id, {
        label: constituencyLabel(list.constituency),
        isCity: list.constituency.nationale_type === 'ville',
      });
    }
  });
  return Array.from(uniqueCommunes.entries())
    .map(([id, { label, isCity }]) => ({ id, label, isCity }))
    .sort((a, b) => Number(b.isCity) - Number(a.isCity) || a.label.localeCompare(b.label, 'fr'));
});

// Les villes (Dakar, Pikine…) se filtrent comme des communes mais ne s'y comptent pas
const communeCount = computed(() => communes.value.filter((c) => !c.isCity).length);

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

  let result = lists.value.filter((l) => {
    if (l.constituency?.type === 'departement' || l.constituency?.nationale_type === 'departement')
      return false;
    return true;
  });

  if (selectedCommuneId.value) {
    result = result.filter((l) => l.constituency?.id == selectedCommuneId.value);
  }

  if (searchQuery.value) {
    result = result.filter((l) =>
      matchesSearch(searchQuery.value, l.coalition?.name, l.coalition?.acronym, headOfList(l)),
    );
  }

  return result;
});

const uniqueCoalitions = computed(() => {
  if (!filteredLists.value) return [];

  const map = new Map<string | number | undefined, DashboardList>();
  filteredLists.value.forEach((list) => {
    const key = selectedCommuneId.value
      ? list.coalition?.id
      : `${list.coalition?.id}-${list.constituency?.id}`;

    if (list.coalition && !map.has(key)) {
      map.set(key, list);
    }
  });
  return Array.from(map.values());
});

// Groupes par commune/ville (ordre du sélecteur : villes puis alphabétique)
const groups = computed(() => {
  const byCommune = new Map<string, { id: string; label: string; lists: DashboardList[] }>();
  uniqueCoalitions.value.forEach((list) => {
    const id = String(list.constituency?.id ?? '');
    if (!byCommune.has(id)) {
      byCommune.set(id, { id, label: constituencyLabel(list.constituency), lists: [] });
    }
    byCommune.get(id)!.lists.push(list);
  });
  const order = new Map(communes.value.map((c, i) => [String(c.id), i]));
  return Array.from(byCommune.values())
    .map((g) => ({
      ...g,
      lists: [...g.lists].sort((a, b) =>
        (a.coalition?.name || a.name || '').localeCompare(b.coalition?.name || b.name || '', 'fr'),
      ),
    }))
    .sort(
      (a, b) =>
        (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity) ||
        a.label.localeCompare(b.label, 'fr'),
    );
});

watch(
  () => props.constituencyId,
  () => {
    selectedCommuneId.value = null;
  },
);

// Toute ligne a une coalition (cf. uniqueCoalitions)
const listUrl = (list: DashboardList): string =>
  props.coalitionUrl({
    coalitionId: list.coalition!.id,
    coalitionSlug: list.coalition!.political_entity?.slug || null,
    constituencyId: selectedCommuneId.value || list.constituency?.id || props.constituencyId,
    constituencySlug: list.constituency?.slug || null,
  });
</script>

<template>
  <div class="space-y-5">
    <!-- En-tête -->
    <div class="space-y-3">
      <NuxtLink
        :to="backUrl"
        class="hover:text-primary-600 dark:hover:text-primary-400 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
      >
        <UIcon name="i-heroicons-arrow-left-20-solid" class="h-4 w-4" />
        Toutes les circonscriptions
      </NuxtLink>
      <div>
        <h2 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white md:text-2xl">
          {{ constituencyName }}
        </h2>
        <p v-if="!loading" class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {{ uniqueCoalitions.length }} {{ uniqueCoalitions.length > 1 ? 'listes' : 'liste' }}
          <template v-if="!selectedCommuneId && communeCount > 0">
            · {{ communeCount }} {{ communeCount > 1 ? 'communes' : 'commune' }}
          </template>
        </p>
      </div>
    </div>

    <!-- Recherche & filtre commune -->
    <div class="flex flex-col gap-2 sm:flex-row">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="Liste ou tête de liste…"
        class="w-full sm:w-64"
        aria-label="Rechercher une liste ou une tête de liste"
      />
      <USelectMenu
        v-if="communes.length > 0"
        v-model="selectedCommuneId"
        :options="communes"
        value-attribute="id"
        option-attribute="label"
        placeholder="Toutes les communes"
        searchable
        searchable-placeholder="Rechercher une commune…"
        class="w-full sm:w-64"
      >
        <template #label>
          <span v-if="selectedCommuneId" class="truncate">{{
            communes.find((c) => c.id == selectedCommuneId)?.label
          }}</span>
          <span v-else class="text-gray-400">Toutes les communes</span>
        </template>
      </USelectMenu>
      <UButton
        v-if="selectedCommuneId"
        color="gray"
        variant="ghost"
        icon="i-heroicons-x-mark-20-solid"
        class="self-start sm:self-auto"
        @click="selectedCommuneId = null"
      >
        Effacer
      </UButton>
    </div>

    <USkeleton v-if="loading" class="h-96 w-full rounded-xl" />

    <!-- Tableau des listes, groupé par commune -->
    <div
      v-else-if="groups.length > 0"
      class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    >
      <table class="w-full text-left text-sm">
        <thead
          class="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"
        >
          <tr>
            <th scope="col" class="px-4 py-2.5 font-medium">Liste</th>
            <th scope="col" class="hidden px-4 py-2.5 font-medium sm:table-cell">Tête de liste</th>
            <th scope="col" class="w-8 pr-3"><span class="sr-only">Voir</span></th>
          </tr>
        </thead>
        <tbody v-for="group in groups" :key="group.id">
          <tr class="bg-gray-50 dark:bg-gray-900/40">
            <th
              scope="rowgroup"
              colspan="3"
              class="border-y border-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
            >
              {{ group.label }}
              <span class="font-normal text-gray-400">· {{ group.lists.length }}</span>
            </th>
          </tr>
          <tr
            v-for="list in group.lists"
            :key="`${list.coalition?.id || list.id}-${list.constituency?.id ?? ''}`"
            class="group relative border-t border-gray-100 transition-colors first:border-t-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <!-- Logo décoratif (le nom suit) ; avatar vide à défaut -->
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                >
                  <CmsImage
                    v-if="list.coalition?.logo"
                    :src="list.coalition.logo"
                    alt=""
                    class="max-h-full max-w-full object-contain p-1"
                  />
                  <UIcon v-else name="i-heroicons-photo" class="h-4 w-4 text-gray-300" />
                </div>
                <div class="min-w-0">
                  <NuxtLink
                    :to="listUrl(list)"
                    class="group-hover:text-primary-600 dark:group-hover:text-primary-400 font-medium text-gray-900 before:absolute before:inset-0 focus:outline-none dark:text-white"
                  >
                    {{ list.coalition?.name || list.name }}
                  </NuxtLink>
                  <span
                    v-if="headOfList(list)"
                    class="block text-xs text-gray-500 dark:text-gray-400 sm:hidden"
                  >
                    {{ headOfList(list) }}
                  </span>
                </div>
              </div>
            </td>
            <td class="hidden px-4 py-3 text-gray-600 dark:text-gray-300 sm:table-cell">
              {{ headOfList(list) || '—' }}
            </td>
            <td class="pr-3 text-right">
              <UIcon
                name="i-heroicons-chevron-right-20-solid"
                class="group-hover:text-primary-500 ml-auto block h-4 w-4 text-gray-300 dark:text-gray-500"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- État vide -->
    <div v-else class="rounded-xl border border-gray-200 py-12 text-center dark:border-gray-700">
      <p class="font-semibold text-gray-700 dark:text-gray-200">Aucune liste</p>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Aucune liste trouvée pour les filtres sélectionnés.
      </p>
    </div>
  </div>
</template>

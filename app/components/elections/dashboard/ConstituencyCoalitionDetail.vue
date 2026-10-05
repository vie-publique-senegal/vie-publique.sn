<script setup lang="ts">
/**
 * Coalition au sein d'une circonscription (élections locales), une fois la
 * circonscription résolue par la page parente.
 *
 * Monté seulement quand l'id de circonscription est connu : le fetch des listes part
 * alors au setup avec le bon id et le SSR l'attend. Fait dans la page, il partait
 * d'abord sans id (circonscriptions pas encore chargées) et le refetch n'était pas
 * attendu → le serveur rendait « Coalition introuvable ».
 *
 * `communeSlug` (optionnel) restreint à une commune ou ville du département : les listes
 * sont lues pour le département puis filtrées sur le slug, ce qui garantit que la
 * commune lui appartient (sinon « introuvable »).
 */
import { useElectoralDashboardLists } from '~/composables/elections/dashboard/useElectoralDashboardLists';
import { municipalConstituencyLabel } from '#shared/election-constituency';

const props = defineProps<{
  constituencyId: string | number;
  constituencyName: string;
  coalitionSlug: string;
  communeSlug?: string | null;
  year: number;
  type: string;
  candidatsUrl: string;
  constituencyUrl: string;
}>();

const router = useRouter();

const { lists, loading, failed } = useElectoralDashboardLists({
  constituencyId: computed(() => String(props.constituencyId)),
  year: computed(() => props.year),
  type: computed(() => props.type),
});

interface ListWithCoalition {
  constituency?: {
    id: number | string;
    name?: string;
    slug?: string | null;
    display_name?: string | null;
    nationale_type?: string | null;
  } | null;
  coalition?: {
    id: number | string;
    name: string;
    political_entity?: { slug?: string | null } | null;
  } | null;
}

// La coalition d'une élection locale n'a pas toujours de slug (entité politique
// non rattachée) : on matche par slug si disponible, sinon par id numérique.
const matchedList = computed(() => {
  const all = (lists.value as unknown as ListWithCoalition[]).filter(
    (l) => !props.communeSlug || l.constituency?.slug === props.communeSlug,
  );
  return (
    all.find((l) => l.coalition?.political_entity?.slug === props.coalitionSlug) ||
    all.find((l) => String(l.coalition?.id) === props.coalitionSlug) ||
    null
  );
});

const notFound = computed(() => !loading.value && !matchedList.value);

// Commune (ou ville) ciblée, une fois résolue
const commune = computed(() => (props.communeSlug ? matchedList.value?.constituency : null));

// Libellé du lieu : la commune (« Biscuiterie », « Ville de Dakar ») si ciblée, sinon le département
const placeName = computed(() => {
  if (!commune.value) return props.constituencyName;
  const name = commune.value.display_name || commune.value.name || '';
  return municipalConstituencyLabel(name, commune.value.nationale_type);
});

// « dans la ville de Dakar » / « à Hann-Bel Air »
const placeWithPreposition = computed(() =>
  commune.value?.nationale_type === 'ville'
    ? `dans la ville de ${commune.value.display_name || commune.value.name}`
    : `à ${placeName.value}`,
);

// Retour : page du département, filtrée sur la commune si l'on en vient
const backUrl = computed(() =>
  commune.value ? `${props.constituencyUrl}?commune_id=${commune.value.id}` : props.constituencyUrl,
);

useSeoMeta({
  title: () =>
    matchedList.value?.coalition?.name
      ? `${matchedList.value.coalition.name} · ${placeName.value}`
      : 'Coalition | Élections Sénégal',
  description: () =>
    matchedList.value?.coalition?.name
      ? `Candidats de ${matchedList.value.coalition.name} ${placeWithPreposition.value}` +
        (commune.value ? ` (département de ${props.constituencyName}).` : '.')
      : undefined,
});
</script>

<template>
  <div v-if="loading" class="animate-in fade-in zoom-in-95 duration-500">
    <USkeleton class="h-72 w-full rounded-2xl" />
  </div>

  <div
    v-else-if="notFound"
    class="rounded-2xl bg-white py-20 text-center ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
  >
    <UIcon
      name="i-heroicons-face-frown"
      class="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-700"
    />
    <!-- 404 HTTP seulement si les listes ont bien été lues (panne CMS ≠ « introuvable ») -->
    <AppResponseStatus v-if="!failed" :code="404" />
    <h2 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Coalition introuvable</h2>
    <p class="mb-6 text-sm text-gray-500">
      Cette coalition n'existe pas dans cette circonscription.
    </p>
    <UButton :to="candidatsUrl" icon="i-heroicons-arrow-left" variant="soft"
      >Retour aux candidats</UButton
    >
  </div>

  <div v-else class="animate-in fade-in zoom-in-95 duration-500">
    <ElectionsDashboardCoalitionDetails
      :coalition-id="String(matchedList!.coalition!.id)"
      :coalition-name="matchedList!.coalition!.name"
      :year="year"
      :type="type"
      :constituency-id="commune ? commune.id : constituencyId"
      @close="router.push(backUrl)"
    />
  </div>
</template>

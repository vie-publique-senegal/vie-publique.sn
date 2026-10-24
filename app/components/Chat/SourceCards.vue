<script setup lang="ts">
import type { ChatSource } from '~~/types/chat';

/**
 * Sources en VIGNETTES — interface vocale. Couverture (ou tuile icône, comme
 * `DocumentsDocumentListItem`), titre, pages citées. Pas d'extrait : pour qui
 * écoute la réponse, il n'apporte rien ; la coquille classique le garde pour
 * vérifier les citations.
 *
 * UNE carte par document : l'API cite souvent le même rapport à plusieurs
 * pages, qui apparaissait en double.
 */
const props = defineProps<{ sources: ChatSource[] }>();

interface Carte {
  cle: string;
  id?: string;
  titre: string;
  url?: string;
  pages: number[];
}

const cartes = computed<Carte[]>(() => {
  const parCle = new Map<string, Carte>();
  for (const source of props.sources) {
    const cle = source.externalId ?? source.pageUrl ?? source.title;
    const carte = parCle.get(cle) ?? {
      cle,
      id: source.externalId,
      titre: source.title,
      url: source.pageUrl,
      pages: [],
    };
    if (source.page && !carte.pages.includes(source.page)) carte.pages.push(source.page);
    parCle.set(cle, carte);
  }
  return [...parCle.values()].map((carte) => ({
    ...carte,
    pages: carte.pages.sort((a, b) => a - b),
  }));
});

/**
 * Couvertures retrouvées côté site (`/api/chat/covers`, l'`external_id` est
 * l'id Directus). Échec = tuiles icône : jamais d'erreur affichée pour ça.
 */
const couvertures = ref<Record<string, string | null>>({});
const ids = computed(() =>
  cartes.value
    .map((carte) => carte.id)
    .filter((id): id is string => Boolean(id && /^\d+$/.test(id)))
    .join(','),
);

watch(
  ids,
  async (liste) => {
    if (!liste) return;
    try {
      couvertures.value = await $fetch<Record<string, string | null>>('/api/chat/covers', {
        query: { ids: liste },
      });
    } catch {
      couvertures.value = {};
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
    <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      Sources
    </p>
    <ul class="mt-2 space-y-2">
      <li v-for="carte in cartes" :key="carte.cle">
        <component
          :is="carte.url ? 'a' : 'div'"
          :href="carte.url"
          :target="carte.url ? '_blank' : undefined"
          :rel="carte.url ? 'noopener noreferrer' : undefined"
          class="group flex items-center gap-3 rounded-xl p-1.5 transition-colors"
          :class="carte.url ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : ''"
        >
          <div
            class="h-14 w-11 shrink-0 overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-700 dark:ring-gray-600"
          >
            <CmsImage
              v-if="carte.id && couvertures[carte.id]"
              :src="couvertures[carte.id]"
              :alt="carte.titre"
              :quality="25"
              class="h-full w-full object-cover"
              loading="lazy"
            />
            <div v-else class="flex h-full w-full items-center justify-center">
              <UIcon
                name="i-heroicons-document-text"
                class="h-5 w-5 text-gray-300 dark:text-gray-500"
              />
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <p
              class="group-hover:text-primary-600 dark:group-hover:text-primary-400 line-clamp-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              {{ carte.titre }}
            </p>
            <p v-if="carte.pages.length" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              p. {{ carte.pages.join(', ') }}
            </p>
          </div>
        </component>
      </li>
    </ul>
  </div>
</template>

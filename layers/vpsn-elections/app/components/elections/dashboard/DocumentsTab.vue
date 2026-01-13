<script setup lang="ts">
import { useElectionDocuments } from '../../../composables/elections/dashboard/useElectionDocuments';

const props = defineProps<{
  electionId: string;
  electionName?: string;
}>();

const { documents, loading, error } = useElectionDocuments(computed(() => props.electionId));
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading" class="flex flex-col items-center justify-center space-y-4 py-20">
      <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-8 w-8 animate-spin" />
      <p class="text-sm text-gray-400">Recherche des documents...</p>
    </div>

    <div
      v-else-if="error"
      class="rounded-2xl border border-red-100 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
    >
      <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto mb-2 h-10 w-10 text-red-500" />
      <p class="font-bold text-red-600 dark:text-red-400">
        Une erreur est survenue lors de la récupération des documents.
      </p>
    </div>

    <div
      v-else-if="!documents || documents.length === 0"
      class="rounded-3xl border-2 border-dashed border-gray-100 bg-slate-50 py-20 text-center dark:border-gray-700 dark:bg-gray-800/50"
    >
      <UIcon
        name="i-heroicons-document-magnifying-glass"
        class="mx-auto mb-4 h-12 w-12 text-gray-300"
      />
      <p class="font-bold text-gray-500">
        Aucun document spécifique n'est encore rattaché à ce scrutin.
      </p>
      <p class="mt-2 text-xs text-gray-400">
        Consultez la bibliothèque complète pour les textes généraux.
      </p>
      <UButton
        to="/elections-senegal/legislation"
        class="mt-6 rounded-full"
        color="black"
        variant="soft"
      >
        Toute la législation
      </UButton>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="doc in documents"
        :key="doc.id"
        class="group rounded-3xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="flex items-start gap-4">
          <div
            class="bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shrink-0 rounded-2xl p-3 transition-transform group-hover:scale-110"
          >
            <UIcon name="i-heroicons-document-text" class="h-6 w-6" />
          </div>
          <div class="space-y-1 overflow-hidden">
            <h4
              class="group-hover:text-primary-600 line-clamp-2 font-black leading-tight text-gray-900 transition-colors dark:text-gray-100"
            >
              {{ doc.title }}
            </h4>
            <div
              class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400"
            >
              <span>{{
                doc.publish_date ? new Date(doc.publish_date).toLocaleDateString() : 'Date inconnue'
              }}</span>
              <span class="h-1 w-1 rounded-full bg-gray-300"></span>
              <span class="text-primary-500">{{ doc.type }}</span>
            </div>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-between">
          <NuxtLink
            :to="`/documents/${doc.id}/${doc.slug}`"
            class="text-primary-600 flex items-center text-xs font-black hover:underline"
          >
            Consulter
            <UIcon name="i-heroicons-arrow-right" class="ml-1 h-3 w-3" />
          </NuxtLink>

          <div v-if="doc.file" class="flex gap-2">
            <UButton
              :to="`https://vie-publique.sn/assets/${typeof doc.file === 'string' ? doc.file : (doc.file as any).id}`"
              target="_blank"
              icon="i-heroicons-arrow-down-tray"
              size="xs"
              variant="ghost"
              color="gray"
              class="rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

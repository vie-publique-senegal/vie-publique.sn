<script setup lang="ts">
import { useElectoralFormatting } from '../../../../composables/elections/dashboard/useElectoralFormatting';
import type { Candidate } from '../../../../types';

interface Props {
  candidate: Candidate;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'select', candidate: Candidate): void;
}>();

const { getCmsAsset } = useElectoralFormatting();
</script>

<template>
  <div
    class="hover:border-primary-500/50 group flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 transition-colors dark:border-gray-800 dark:bg-gray-900"
    @click="emit('select', candidate)"
  >
    <div
      class="group-hover:text-primary-500 w-8 text-center text-lg font-black italic text-gray-300 dark:text-gray-700"
    >
      {{ candidate.position }}
    </div>
    <div
      class="h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-gray-100 dark:border-gray-700"
    >
      <img
        v-if="candidate.photo"
        :src="getCmsAsset(candidate.photo)"
        class="h-full w-full object-cover"
      />
      <UIcon v-else name="i-heroicons-user" class="h-full w-full p-2 text-gray-400" />
    </div>
    <div class="flex min-w-0 flex-col">
      <span class="truncate text-sm font-bold uppercase text-gray-900 dark:text-white">
        {{ candidate.first_name }} {{ candidate.last_name }}
      </span>
      <span class="truncate text-[10px] text-gray-500">{{ candidate.profession }}</span>
    </div>
  </div>
</template>

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
    class="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl bg-gray-200 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-800"
    @click="emit('select', candidate)"
  >
    <img
      v-if="candidate.photo"
      :src="getCmsAsset(candidate.photo)"
      class="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
      :alt="`${candidate.first_name} ${candidate.last_name}`"
    />
    <div v-else class="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
      <UIcon name="i-heroicons-user" class="h-20 w-20 text-gray-300 dark:text-gray-700" />
    </div>

    <!-- Overlay Info -->
    <div
      class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3"
    >
      <div
        class="bg-primary-600/90 absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-[10px] font-black text-white backdrop-blur-sm"
      >
        {{ candidate.position }}
      </div>
      <div
        class="translate-y-1 transform transition-transform duration-300 group-hover:translate-y-0"
      >
        <p class="text-xs font-black uppercase leading-tight tracking-tighter text-white">
          {{ candidate.last_name }}
        </p>
        <p class="text-primary-300 text-[11px] font-bold capitalize">{{ candidate.first_name }}</p>
        <p class="mt-0.5 line-clamp-1 text-[9px] text-gray-400">{{ candidate.profession }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useElectoralFormatting } from '../../../../composables/elections/dashboard/useElectoralFormatting';

interface Props {
  coalition: any;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'select', coalitionId: string | number): void;
}>();

const { getCoalitionColor, getCmsAsset } = useElectoralFormatting();
</script>

<template>
  <UCard
    class="hover:ring-primary-500 group relative cursor-pointer overflow-hidden border-none bg-white shadow-sm ring-offset-2 ring-offset-[#f8fafc] transition-all duration-300 hover:shadow-md hover:ring-2 dark:bg-gray-900 dark:ring-offset-gray-950"
    :ui="{ body: { padding: 'p-0' } }"
    @click="emit('select', coalition.id)"
  >
    <!-- Color Strip -->
    <div
      class="absolute bottom-0 left-0 top-0 w-1"
      :style="{ backgroundColor: getCoalitionColor(coalition.color) }"
    ></div>

    <!-- Number Badge (top-right corner) -->
    <div
      class="absolute right-2 top-2 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <span class="text-[9px] font-black uppercase tracking-widest text-gray-500"
        >N°{{ coalition.list_order }}</span
      >
    </div>

    <div class="space-y-3 p-4 pt-8">
      <!-- Candidat Principal -->
      <div v-if="coalition.head_of_list" class="flex flex-col items-center space-y-3 text-center">
        <!-- Photo du candidat (plus grande) -->
        <div
          class="border-3 h-28 w-28 overflow-hidden rounded-full bg-gray-100 shadow-lg transition-transform duration-500 group-hover:scale-105 dark:bg-gray-800"
          :style="{ borderColor: getCoalitionColor(coalition.color) }"
        >
          <img
            v-if="coalition.head_of_list.photo"
            :src="getCmsAsset(coalition.head_of_list.photo)"
            class="h-full w-full object-cover"
          />
          <UIcon v-else name="i-heroicons-user" class="h-full w-full p-6 text-gray-300" />
        </div>

        <!-- Nom du candidat (en avant) -->
        <div class="w-full min-w-0 space-y-1">
          <h4
            class="group-hover:text-primary-600 text-base font-black leading-tight text-gray-900 transition-colors dark:text-white"
          >
            {{ coalition.head_of_list.first_name }} {{ coalition.head_of_list.last_name }}
          </h4>

          <!-- Coalition (juste après le nom) -->
          <p
            class="line-clamp-2 px-2 text-[10px] font-semibold uppercase tracking-tight text-gray-500 dark:text-gray-400"
          >
            {{ coalition.name }}
          </p>
        </div>
      </div>

      <!-- Arrow -->
      <div class="flex justify-center pt-1">
        <UIcon
          name="i-heroicons-chevron-right-20-solid"
          class="group-hover:text-primary-400 h-4 w-4 text-gray-300 transition-colors"
        />
      </div>
    </div>
  </UCard>
</template>

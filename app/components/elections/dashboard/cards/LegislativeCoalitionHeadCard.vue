<script setup lang="ts">
interface Props {
  coalition: any;
  showRound2Badge?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'select', coalitionId: string | number): void;
}>();

const isInRound2 = computed(
  () =>
    props.showRound2Badge === true &&
    ((props.coalition.round_2_voix != null && props.coalition.round_2_voix > 0) ||
      (props.coalition.round_2_pourcentage != null && props.coalition.round_2_pourcentage > 0)),
);
</script>

<template>
  <div
    class="group relative flex h-64 cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900"
    @click="emit('select', coalition.id)"
  >
    <!-- Background Head of List Photo -->
    <div class="absolute inset-0 bg-gray-100 dark:bg-gray-800">
      <CmsImage
        v-if="coalition.head_of_list?.photo"
        :src="coalition.head_of_list.photo"
        class="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0"
        alt="Photo tête de liste"
      />
      <div v-else class="flex h-full w-full items-center justify-center">
        <UIcon name="i-heroicons-user" class="h-24 w-24 text-gray-200 dark:text-gray-700" />
      </div>
    </div>

    <!-- Overlay Gradient -->
    <div
      class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 transition-opacity group-hover:opacity-90"
    ></div>

    <!-- Content -->
    <div class="absolute inset-0 flex flex-col justify-end p-4 text-white">
      <!-- Badge Second Tour -->
      <div v-if="isInRound2" class="absolute right-3 top-3">
        <span
          class="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow"
        >
          2<sup>e</sup> tour
        </span>
      </div>

      <h4 v-if="coalition.head_of_list" class="text-lg font-black uppercase leading-tight">
        {{ coalition.head_of_list.first_name }} {{ coalition.head_of_list.last_name }}
      </h4>
      <h4 v-else class="text-lg font-black uppercase italic leading-tight opacity-50">
        Non spécifié
      </h4>

      <div class="mt-3 flex items-center justify-between border-t border-white/20 pt-3">
        <span class="max-w-[80%] truncate text-[10px] font-bold uppercase tracking-widest">
          {{ coalition.list_order }}. {{ coalition.name }}
        </span>
        <UIcon
          name="i-heroicons-arrow-right"
          class="h-4 w-4 transform transition-transform group-hover:translate-x-1"
        />
      </div>
    </div>
  </div>
</template>

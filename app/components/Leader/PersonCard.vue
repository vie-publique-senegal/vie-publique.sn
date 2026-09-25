<script setup lang="ts">
import type { LeaderBrief } from '~~/types/leader-history';

interface Props {
  person: LeaderBrief;
  to: string;
}
defineProps<Props>();

const { initials } = useLeaderFormat();
</script>

<template>
  <NuxtLink
    :to="to"
    class="block rounded-xl border border-gray-100 bg-white p-3 text-center transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
  >
    <CmsImage
      v-if="person.photo"
      :src="person.photo"
      :alt="person.full_name"
      class="mx-auto size-14 rounded-full object-cover"
      loading="lazy"
      :width="56"
      :height="56"
    />
    <div
      v-else
      class="mx-auto flex aspect-square size-14 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
    >
      {{ initials(person.full_name) }}
    </div>
    <p class="mt-2 text-xs font-medium text-gray-900 dark:text-white">{{ person.full_name }}</p>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { LeaderProfile } from '~~/types/leader-history';

interface Props {
  profile: LeaderProfile;
}
const props = defineProps<Props>();

const { formatLongDate, isSafeUrl } = useLeaderFormat();

const socials = computed(() =>
  [
    { url: props.profile.website, icon: 'i-heroicons-globe-alt', label: 'Site officiel' },
    { url: props.profile.twitter, icon: 'i-simple-icons-x', label: 'X / Twitter' },
    { url: props.profile.facebook, icon: 'i-simple-icons-facebook', label: 'Facebook' },
    { url: props.profile.instagram, icon: 'i-simple-icons-instagram', label: 'Instagram' },
    { url: props.profile.linkedin, icon: 'i-simple-icons-linkedin', label: 'LinkedIn' },
  ].filter((s) => isSafeUrl(s.url)),
);

const hasContent = computed(
  () =>
    props.profile.birthdate ||
    props.profile.birthplace ||
    props.profile.education ||
    socials.value.length,
);
</script>

<template>
  <section
    v-if="hasContent"
    class="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5"
  >
    <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div v-if="profile.birthdate">
        <dt class="text-xs font-medium text-gray-400 dark:text-gray-500">Naissance</dt>
        <dd class="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
          {{ formatLongDate(profile.birthdate)
          }}<template v-if="profile.birthplace"> à {{ profile.birthplace }}</template>
        </dd>
      </div>
      <div v-if="profile.education">
        <dt class="text-xs font-medium text-gray-400 dark:text-gray-500">Formation</dt>
        <dd class="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{{ profile.education }}</dd>
      </div>
    </dl>
    <div
      v-if="socials.length"
      class="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-700"
    >
      <a
        v-for="s in socials"
        :key="s.label"
        :href="s.url!"
        target="_blank"
        rel="noopener noreferrer nofollow"
        :aria-label="s.label"
        class="inline-flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-sky-100 hover:text-sky-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-sky-900/40"
      >
        <UIcon :name="s.icon" class="size-4" />
      </a>
    </div>
  </section>
</template>

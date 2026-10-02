<script setup lang="ts">
import type { Candidate } from '~~/types/candidate';

interface Props {
  modelValue: boolean;
  candidate: Candidate | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const decodeHtmlEntities = (text: string) =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&agrave;/g, 'à')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"');

const candidateBio = computed(() => {
  if (!props.candidate) return '';
  const longBio = typeof (props.candidate as any).long_bio === 'string' ? (props.candidate as any).long_bio.trim() : '';
  const shortBio = typeof (props.candidate as any).short_bio === 'string' ? (props.candidate as any).short_bio.trim() : '';
  const legacyBio = typeof (props.candidate as any).biography === 'string' ? (props.candidate as any).biography.trim() : '';
  return longBio || shortBio || legacyBio || '';
});

const candidateBioText = computed(() => {
  if (!candidateBio.value) return '';

  return decodeHtmlEntities(candidateBio.value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
});
</script>

<template>
  <UModal
    v-model="isOpen"
    :ui="{
      width: 'max-w-md',
      container: 'flex items-center justify-center'
    }"
  >
    <UCard
      v-if="candidate"
      :ui="{
        ring: '',
        divide: 'divide-y divide-gray-100 dark:divide-gray-800',
      }"
    >
      <template #header>
        <div class="flex items-center justify-center">
          <CmsImage
            v-if="candidate.photo"
            :src="candidate.photo"
            :alt="candidate.first_name + ' ' + candidate.last_name"
            :quality="50"
            class="h-full w-full object-cover"
            loading="lazy"
          />
          <img
            v-else
            :src="candidate.gender === 'M' ? '/adobe-default-profil-man.jpg' : '/adobe-default-profil-women.jpg'"
            alt="Default image"
            class="h-full w-full object-cover"
          />
        </div>
      </template>

      <div class="text-center">
        <UBadge color="primary" class="mb-2">Position {{ candidate.position }}</UBadge>
        <h2 class="text-xl font-semibold">
          <span class="capitalize">{{ candidate.first_name?.toLowerCase() }}</span>
          {{ candidate.last_name?.toUpperCase() }}
        </h2>
        <div v-if="candidate.profession" class="mt-1">
          <p class="text-sm font-semibold capitalize text-primary-600 dark:text-primary-400">
            {{ candidate.profession.toLowerCase() }}
          </p>
        </div>
        <div v-if="candidate.gender" class="mt-2">
          <p class="text-xs text-gray-500">
            {{ candidate.gender === 'M' ? 'Masculin' : 'Féminin' }}
          </p>
        </div>
        <div v-if="candidateBioText" class="mt-3">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ candidateBioText }}
          </p>
        </div>
      </div>

      <template #footer>
        <div class="p-0 text-right">
          <UButton color="white" @click="isOpen = false">Fermer</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

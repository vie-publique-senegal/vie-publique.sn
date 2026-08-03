<script setup lang="ts">
const props = defineProps<{
  /** Une requête est en cours : on propose l'arrêt plutôt que l'envoi. */
  busy?: boolean;
  /** Secondes restantes avant de pouvoir réessayer (quota atteint). */
  cooldown?: number;
}>();

const emit = defineEmits<{
  (e: 'send', question: string): void;
  (e: 'stop'): void;
}>();

const question = ref('');
const textarea = ref<{ textarea?: HTMLTextAreaElement } | HTMLElement | null>(null);

const disabled = computed(() => Boolean(props.cooldown && props.cooldown > 0));

function submit() {
  if (props.busy || disabled.value) return;
  const valeur = question.value.trim();
  if (!valeur) return;
  question.value = '';
  emit('send', valeur);
}

function focus() {
  nextTick(() => {
    const element = textarea.value as { textarea?: HTMLTextAreaElement } | null;
    (element?.textarea ?? (textarea.value as HTMLElement | null))?.focus?.();
  });
}

defineExpose({ focus });
</script>

<template>
  <div class="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div class="mx-auto max-w-3xl">
      <p v-if="disabled" class="mb-2 text-center text-sm text-amber-700 dark:text-amber-400">
        Nouvelle question possible dans {{ cooldown }} seconde{{ (cooldown ?? 0) > 1 ? 's' : '' }}.
      </p>

      <form class="relative flex w-full flex-col" @submit.prevent="submit">
        <UTextarea
          ref="textarea"
          v-model="question"
          placeholder="Posez une question..."
          color="primary"
          variant="outline"
          class="w-full"
          :rows="3"
          :max-rows="12"
          size="xl"
          :disabled="disabled"
          :autoresize="true"
          :ui="{ base: 'rounded-3xl resize-none pb-12 px-4 pt-4 md:text-sm' }"
          @keydown.enter.exact.prevent="submit"
        />
        <div class="absolute bottom-3 right-3">
          <UButton
            v-if="busy"
            type="button"
            color="gray"
            variant="solid"
            size="sm"
            icon="i-lucide-square"
            class="rounded-full"
            aria-label="Arrêter la réponse"
            @click="emit('stop')"
          />
          <UButton
            v-else
            type="submit"
            color="primary"
            variant="solid"
            size="sm"
            icon="i-lucide-arrow-up"
            class="rounded-full"
            aria-label="Envoyer la question"
            :disabled="!question.trim() || disabled"
            :ui="{ base: 'disabled:opacity-20' }"
          />
        </div>
      </form>
    </div>
  </div>
</template>

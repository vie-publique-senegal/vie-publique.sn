<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-md' }">
    <div class="p-6">
      <div class="mb-6 flex items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <UIcon name="i-heroicons-lock-closed" class="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 class="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white">
            Connexion Observateur
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Identifiez-vous pour soumettre des PVs
          </p>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Email <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.email"
            type="email"
            required
            autocomplete="username"
            placeholder="observateur@vpsn.sn"
            class="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
          />
        </div>

        <div>
          <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Mot de passe <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
            class="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
          />
        </div>

        <!-- Messages d'erreur/succès -->
        <div
          v-if="errorMsg"
          class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300"
        >
          {{ errorMsg }}
        </div>

        <div
          v-if="successMsg"
          class="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-xs font-medium text-green-700 dark:text-green-300"
        >
          {{ successMsg }}
        </div>

        <!-- Countdown si bloqué -->
        <div
          v-if="lockoutSecondsLeft > 0"
          class="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-center"
        >
          <UIcon name="i-heroicons-clock" class="mx-auto mb-1 h-6 w-6 text-amber-500" />
          <p class="text-xs font-bold text-amber-800 dark:text-amber-200">
            Compte temporairement bloqué
          </p>
          <p class="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Réessayez dans {{ Math.ceil(lockoutSecondsLeft / 60) }} minute{{
              Math.ceil(lockoutSecondsLeft / 60) > 1 ? "s" : ""
            }}
          </p>
        </div>

        <div class="flex gap-3 pt-2">
          <UButton
            type="button"
            color="gray"
            variant="soft"
            class="flex-1 font-black uppercase tracking-widest text-center justify-center"
            @click="isOpen = false"
          >
            Annuler
          </UButton>
          <UButton
            type="submit"
            color="primary"
            class="flex-1 font-black uppercase tracking-widest text-center justify-center"
            :loading="loading"
            :disabled="loading || lockoutSecondsLeft > 0"
          >
            Connexion
          </UButton>
        </div>
      </form>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { useElectionAuth } from "~/composables/elections/useElectionAuth";
import { useErrorHandler } from "~/composables/useErrorHandler";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "success"): void;
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const { login } = useElectionAuth();
const { getFriendlyErrorMessage } = useErrorHandler();

const form = reactive({
  email: "",
  password: "",
});

const loading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const lockoutSecondsLeft = ref(0);

let countdownInterval: NodeJS.Timeout | null = null;

const startCountdown = (seconds: number) => {
  lockoutSecondsLeft.value = seconds;
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    lockoutSecondsLeft.value--;
    if (lockoutSecondsLeft.value <= 0 && countdownInterval) {
      clearInterval(countdownInterval);
    }
  }, 1000);
};

const handleLogin = async () => {
  if (lockoutSecondsLeft.value > 0) return;

  errorMsg.value = "";
  successMsg.value = "";
  loading.value = true;

  try {
    await login(form.email, form.password);
    successMsg.value = "Connexion réussie ! Bienvenue.";

    setTimeout(() => {
      isOpen.value = false;
      emit("success");
      form.email = "";
      form.password = "";
    }, 1000);
  } catch (err: any) {
    // Utiliser le message d'erreur user-friendly
    errorMsg.value = getFriendlyErrorMessage(err);

    // Détecter si c'est un blocage (rate limiting)
    if (err?.statusCode === 429) {
      // Extraire le nombre de minutes du message
      const message = err?.data?.message || "";
      const match = message.match(/(\d+)\s+minute/);
      if (match) {
        const minutes = parseInt(match[1]);
        startCountdown(minutes * 60);
      } else {
        // Par défaut, 15 minutes de lockout
        startCountdown(15 * 60);
      }
    }
  } finally {
    loading.value = false;
  }
};

// Nettoyage
onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval);
});

// Reset quand on ferme le modal
watch(isOpen, (open) => {
  if (!open) {
    errorMsg.value = "";
    successMsg.value = "";
  }
});
</script>

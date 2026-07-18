<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-2xl' }">
    <div class="p-6">
      <!-- Header -->
      <div class="mb-6 flex items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <UIcon name="i-heroicons-arrow-up-tray" class="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 class="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white">
            Uploader un PV
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            <template v-if="effectiveElection">{{ effectiveElection.name }} ({{ effectiveElection.year }})</template>
            <template v-else>Aucune élection active</template>
          </p>
        </div>
      </div>

      <!-- Upload désactivé -->
      <div
        v-if="!effectiveElection && !loadingElection"
        class="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-4 text-center"
      >
        <UIcon name="i-heroicons-lock-closed" class="mx-auto mb-2 h-8 w-8 text-amber-500" />
        <p class="text-sm font-bold text-amber-800 dark:text-amber-200">Upload désactivé</p>
        <p class="mt-1 text-xs text-amber-700 dark:text-amber-300">
          L'upload de PVs n'est pas activé pour le moment.
        </p>
      </div>

      <!-- Formulaire -->
      <form v-else class="space-y-4" @submit.prevent="handleUpload">
        <!-- Source avec Radio Buttons -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <label class="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 shrink-0">
            Source <span class="text-red-500">*</span>
          </label>
          <div class="flex gap-2">
            <label
              class="flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 cursor-pointer transition-all"
              :class="
                source === 'national'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              "
            >
              <input
                v-model="source"
                type="radio"
                value="national"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <UIcon name="i-heroicons-map" class="h-4 w-4" :class="source === 'national' ? 'text-primary-600' : 'text-gray-400'" />
              <span class="text-xs font-medium" :class="source === 'national' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'">
                National
              </span>
            </label>
            <label
              class="flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 cursor-pointer transition-all"
              :class="
                source === 'diaspora'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              "
            >
              <input
                v-model="source"
                type="radio"
                value="diaspora"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <UIcon name="i-heroicons-globe-europe-africa" class="h-4 w-4" :class="source === 'diaspora' ? 'text-primary-600' : 'text-gray-400'" />
              <span class="text-xs font-medium" :class="source === 'diaspora' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'">
                Diaspora
              </span>
            </label>
          </div>
        </div>

        <!-- Tour (multi-tours uniquement) -->
        <div v-if="!isSingleRoundElection">
          <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Tour <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <select
              v-model="form.tour"
              required
              class="block w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
            >
              <option class="bg-white dark:bg-[#0e1110] dark:text-gray-200" value="">- Sélectionner -</option>
              <option class="bg-white dark:bg-[#0e1110] dark:text-gray-200" value="1">1er tour</option>
              <option class="bg-white dark:bg-[#0e1110] dark:text-gray-200" value="2">2ème tour</option>
            </select>
            <UIcon
              name="i-heroicons-chevron-down"
              class="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        <!-- Champs National -->
        <template v-if="source === 'national'">
          <!-- Titre section National -->
          <div class="flex items-center gap-2 pt-2">
            <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
            <span class="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Localisation Nationale
            </span>
            <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
          </div>

          <!-- Région -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Région <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select
                v-model="form.region"
                required
                :disabled="loadingRegions"
                class="block w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-50"
                @change="onRegionChange"
              >
                <option class="bg-white dark:bg-[#0e1110] dark:text-gray-200" value="">
                  - Sélectionner une région -
                </option>
                <option
                  v-for="region in regions"
                  :key="region"
                  :value="region"
                  class="bg-white dark:bg-[#0e1110] dark:text-gray-200"
                >
                  {{ region }}
                </option>
              </select>
              <UIcon
                name="i-heroicons-chevron-down"
                class="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <!-- Département -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Département <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select
                v-model="form.department"
                required
                :disabled="!form.region || loadingDepartments"
                class="block w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-50"
                @change="onDepartmentChange"
              >
                <option class="bg-white dark:bg-[#0e1110] dark:text-gray-200" value="">
                  {{ form.region ? '- Sélectionner un département -' : '- Choisir une région d\'abord -' }}
                </option>
                <option
                  v-for="dept in departments"
                  :key="dept"
                  :value="dept"
                  class="bg-white dark:bg-[#0e1110] dark:text-gray-200"
                >
                  {{ dept }}
                </option>
              </select>
              <UIcon
                name="i-heroicons-chevron-down"
                class="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <!-- Commune -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Commune <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select
                v-model="form.municipality"
                required
                :disabled="!form.department || loadingMunicipalities"
                class="block w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-50"
              >
                <option class="bg-white dark:bg-[#0e1110] dark:text-gray-200" value="">
                  {{
                    form.department
                      ? '- Sélectionner une commune -'
                      : '- Choisir un département d\'abord -'
                  }}
                </option>
                <option
                  v-for="mun in municipalities"
                  :key="mun"
                  :value="mun"
                  class="bg-white dark:bg-[#0e1110] dark:text-gray-200"
                >
                  {{ mun }}
                </option>
              </select>
              <UIcon
                name="i-heroicons-chevron-down"
                class="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <!-- Lieu de vote / Centre de vote -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Lieu de vote <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select
                v-model="form.polling_place"
                required
                :disabled="!form.municipality || loadingPollingPlaces"
                class="block w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-50"
              >
                <option class="bg-white dark:bg-[#0e1110] dark:text-gray-200" value="">
                  {{
                    form.municipality
                      ? '- Sélectionner un lieu de vote -'
                      : '- Choisir une commune d\'abord -'
                  }}
                </option>
                <option
                  v-for="place in pollingPlaces"
                  :key="place"
                  :value="place"
                  class="bg-white dark:bg-[#0e1110] dark:text-gray-200"
                >
                  {{ place }}
                </option>
              </select>
              <UIcon
                name="i-heroicons-chevron-down"
                class="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
        </template>

        <!-- Champs Diaspora -->
        <template v-else>
          <!-- Titre section Diaspora -->
          <div class="flex items-center gap-2 pt-2">
            <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
            <span class="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Localisation Diaspora
            </span>
            <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
          </div>

          <!-- Pays -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Pays <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select
                v-model="form.country"
                required
                :disabled="loadingCountries"
                class="block w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-50"
                @change="onCountryChange"
              >
                <option class="bg-white dark:bg-[#0e1110] dark:text-gray-200" value="">
                  - Sélectionner un pays -
                </option>
                <option
                  v-for="country in countries"
                  :key="country"
                  :value="country"
                  class="bg-white dark:bg-[#0e1110] dark:text-gray-200"
                >
                  {{ country }}
                </option>
              </select>
              <UIcon
                name="i-heroicons-chevron-down"
                class="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <!-- Représentation diplomatique -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Représentation diplomatique <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select
                v-model="form.diplomatic_representation"
                required
                :disabled="!form.country || loadingRepresentations"
                class="block w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-50"
              >
                <option class="bg-white dark:bg-[#0e1110] dark:text-gray-200" value="">
                  {{ form.country ? '- Sélectionner -' : '- Choisir un pays d\'abord -' }}
                </option>
                <option
                  v-for="rep in diplomaticRepresentations"
                  :key="rep"
                  :value="rep"
                  class="bg-white dark:bg-[#0e1110] dark:text-gray-200"
                >
                  {{ rep }}
                </option>
              </select>
              <UIcon
                name="i-heroicons-chevron-down"
                class="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <!-- Localité (optionnel) -->
          <div>
            <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Localité
            </label>
            <input
              v-model="form.locality"
              type="text"
              placeholder="ex: Paris, Lyon..."
              class="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
            />
          </div>
        </template>

        <!-- Bureau (commun) -->
        <div>
          <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Bureau de vote <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.bureau"
            type="text"
            required
            placeholder="ex: Bureau 003"
            class="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
          />
        </div>

        <!-- Photo -->
        <div>
          <label class="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Photo du PV <span class="text-red-500">*</span>
          </label>
          <div
            class="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/10 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
            :class="{ 'border-primary/60 bg-primary/5': selectedFile }"
            @dragover.prevent
            @drop.prevent="onDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              class="absolute inset-0 cursor-pointer opacity-0"
              @change="onFileChange"
            />
            <UIcon
              :name="selectedFile ? 'i-heroicons-photo' : 'i-heroicons-arrow-up-tray'"
              class="mx-auto mb-2 h-8 w-8"
              :class="selectedFile ? 'text-primary' : 'text-gray-300 dark:text-gray-600'"
            />
            <p v-if="selectedFile" class="text-xs font-bold text-primary truncate max-w-xs">
              {{ selectedFile.name }}
            </p>
            <p v-else class="text-xs text-gray-400">
              Glisser-déposer ou <span class="font-bold text-primary">cliquer</span> pour sélectionner
            </p>
            <p class="mt-1 text-[10px] text-gray-400">JPG, PNG, WEBP - max 20 Mo</p>
          </div>

          <!-- Preview de l'image -->
          <div v-if="imagePreview" class="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img
              :src="imagePreview"
              alt="Aperçu du PV"
              class="w-full h-auto max-h-64 object-contain bg-gray-100 dark:bg-gray-900"
            />
          </div>
        </div>

        <!-- Messages -->
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

        <!-- Actions -->
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
            :loading="uploading"
            :disabled="uploading || !isFormValid"
          >
            Soumettre
          </UButton>
        </div>
      </form>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { useActiveElection } from '~/composables/elections/useActiveElection';
import { useElectionGeography } from '~/composables/elections/useElectionGeography';

const props = defineProps<{
  modelValue: boolean;
  election?: {
    id: number;
    name: string;
    year: number;
    rounds?: number;
    pv_upload_active?: boolean;
  };
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "success"): void;
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

// Active election (via composable)
const {
  activeElection,
  loading: loadingElection,
  refresh: refreshActiveElection,
} = useActiveElection();

const effectiveElection = computed(() => props.election || activeElection.value || null);

// Géographie (via composable)
const {
  // National
  regions,
  loadingRegions,
  departments,
  loadingDepartments,
  loadDepartments,
  municipalities,
  loadingMunicipalities,
  loadMunicipalities,
  pollingPlaces,
  loadingPollingPlaces,
  loadPollingPlaces,
  resetNationalData,
  // Diaspora
  countries,
  loadingCountries,
  diplomaticRepresentations,
  loadingRepresentations,
  loadDiplomaticRepresentations,
  resetDiasporaData,
} = useElectionGeography();

// Source toggle
const source = ref<"national" | "diaspora">("national");

// Form
const form = reactive({
  tour: "",
  // National
  region: "",
  department: "",
  municipality: "",
  polling_place: "",
  // Diaspora
  country: "",
  diplomatic_representation: "",
  locality: "",
  // Commun
  bureau: "",
});

const isSingleRoundElection = computed(() => Number(effectiveElection.value?.rounds || 0) === 1);
const effectiveTour = computed(() => (isSingleRoundElection.value ? "1" : form.tour));

// Cascade loading handlers
const onRegionChange = async () => {
  form.department = "";
  form.municipality = "";
  form.polling_place = "";
  municipalities.value = [];
  pollingPlaces.value = [];

  if (form.region) {
    await loadDepartments(form.region);
  }
};

const onDepartmentChange = async () => {
  form.municipality = "";
  form.polling_place = "";
  pollingPlaces.value = [];

  if (form.department) {
    await loadMunicipalities(form.department);
  }
};

const onMunicipalityChange = async () => {
  form.polling_place = "";

  if (form.municipality) {
    await loadPollingPlaces(form.municipality);
  }
};

const onCountryChange = async () => {
  form.diplomatic_representation = "";

  if (form.country) {
    await loadDiplomaticRepresentations(form.country);
  }
};

// File handling
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const imagePreview = ref<string | null>(null);

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 20 * 1024 * 1024; // 20 Mo

const validateFile = (f: File): boolean => {
  if (!ALLOWED_TYPES.includes(f.type)) {
    errorMsg.value = "Seules les images JPG, PNG et WEBP sont acceptées";
    return false;
  }
  if (f.size > MAX_SIZE) {
    errorMsg.value = "Le fichier ne doit pas dépasser 20 Mo";
    return false;
  }
  return true;
};

const onFileChange = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f && validateFile(f)) {
    selectedFile.value = f;
    errorMsg.value = "";

    // Générer le preview
    const reader = new FileReader();
    reader.onload = (event) => {
      imagePreview.value = event.target?.result as string;
    };
    reader.readAsDataURL(f);
  }
};

const onDrop = (e: DragEvent) => {
  const f = e.dataTransfer?.files?.[0];
  if (f && validateFile(f)) {
    selectedFile.value = f;
    errorMsg.value = "";

    // Générer le preview
    const reader = new FileReader();
    reader.onload = (event) => {
      imagePreview.value = event.target?.result as string;
    };
    reader.readAsDataURL(f);
  }
};

// Form validation
const isFormValid = computed(() => {
  if (!effectiveTour.value || !form.bureau || !selectedFile.value) return false;

  if (source.value === "national") {
    return !!(form.region && form.department && form.municipality && form.polling_place);
  } else {
    return !!(form.country && form.diplomatic_representation);
  }
});

// Upload
const uploading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const resetForm = () => {
  form.tour = isSingleRoundElection.value ? "1" : "";
  form.region = "";
  form.department = "";
  form.municipality = "";
  form.polling_place = "";
  form.country = "";
  form.diplomatic_representation = "";
  form.locality = "";
  form.bureau = "";
  selectedFile.value = null;
  imagePreview.value = null;
  resetNationalData();
  resetDiasporaData();
  if (fileInput.value) fileInput.value.value = "";
};

// Messages d'erreur user-friendly
const getFriendlyErrorMessage = (error: any): string => {
  // Erreur réseau
  if (!error?.data && error?.message?.includes('fetch')) {
    return "Impossible de se connecter au serveur. Vérifiez votre connexion internet.";
  }

  // Erreur serveur
  if (error?.statusCode === 500) {
    return "Une erreur est survenue sur le serveur. Veuillez réessayer.";
  }

  // Erreur d'authentification
  if (error?.statusCode === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  // Erreur d'accès
  if (error?.statusCode === 403) {
    return "Vous n'avez pas l'autorisation d'effectuer cette action.";
  }

  // Erreur de validation
  if (error?.statusCode === 400) {
    return error?.data?.message || "Vérifiez les informations saisies.";
  }

  // Message spécifique de l'API
  if (error?.data?.message) {
    return error.data.message;
  }

  // Par défaut
  return "Une erreur inattendue est survenue. Veuillez réessayer.";
};

const handleUpload = async () => {
  if (!isFormValid.value) return;

  errorMsg.value = "";
  successMsg.value = "";
  uploading.value = true;

  try {
    const fd = new FormData();
    fd.append("file", selectedFile.value!);
    fd.append("source", source.value);
    fd.append("tour", effectiveTour.value);
    fd.append("bureau", form.bureau);
    if (effectiveElection.value?.id) {
      fd.append("election_id", String(effectiveElection.value.id));
    }

    if (source.value === "national") {
      fd.append("region", form.region);
      fd.append("department", form.department);
      fd.append("municipality", form.municipality);
      fd.append("polling_place", form.polling_place);
    } else {
      fd.append("country", form.country);
      fd.append("diplomatic_representation", form.diplomatic_representation);
      if (form.locality) fd.append("locality", form.locality);
    }

    await $fetch("/api/elections/pvs-upload/upload", { method: "POST", body: fd });

    successMsg.value = "PV soumis avec succès ! Il sera publié après vérification.";
    resetForm();
    emit("success");

    setTimeout(() => {
      successMsg.value = "";
      isOpen.value = false;
    }, 3000);
  } catch (err: any) {
    errorMsg.value = getFriendlyErrorMessage(err);
  } finally {
    uploading.value = false;
  }
};

// Reset quand on change de source
watch(source, () => {
  form.region = "";
  form.department = "";
  form.municipality = "";
  form.polling_place = "";
  form.country = "";
  form.diplomatic_representation = "";
  form.locality = "";
  resetNationalData();
  resetDiasporaData();
});

// Charger les lieux de vote quand on change de commune
watch(() => form.municipality, (newMunicipality) => {
  if (newMunicipality && source.value === "national") {
    onMunicipalityChange();
  }
});

// Préremplir le tour pour les élections à tour unique
watch(isSingleRoundElection, (isSingleRound) => {
  if (isSingleRound) {
    form.tour = "1";
  }
}, { immediate: true });

// Reset messages quand on ferme
watch(isOpen, (open) => {
  if (!open) {
    errorMsg.value = "";
    successMsg.value = "";
  } else if (isSingleRoundElection.value) {
    form.tour = "1";
  }
});

watch(isOpen, async (open) => {
  if (!open) return;

  if (!props.election) {
    try {
      await refreshActiveElection();
    } catch {
      // Silent fail: l'état actuel sera conservé jusqu'au prochain refresh.
    }
  }

  if (isSingleRoundElection.value) {
    form.tour = "1";
  } else {
    form.tour = "";
  }
});
</script>

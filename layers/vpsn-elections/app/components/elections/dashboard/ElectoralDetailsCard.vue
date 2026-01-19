<script setup lang="ts">
import type { Constituency } from '../../../composables/elections/dashboard/useElectoralConstituencies';
import { useElectoralFormatting } from '../../../composables/elections/dashboard/useElectoralFormatting';
import { useElectionRoutes } from '../../../composables/useElectionRoutes';
import type { Coalition, ElectionDetails } from '../../../types';

interface Props {
  election: ElectionDetails;
  coalitions?: Coalition[];
  constituencies?: Constituency[];
}

const props = defineProps<Props>();

const { formatDate, getStatusColor, getCmsAsset } = useElectoralFormatting();
const electionRoutes = useElectionRoutes();

const countdown = ref('');
let timerInterval: NodeJS.Timeout | null = null;

const updateTimer = () => {
  if (!props.election.election_date || props.election.status === 'completed') return;

  const status = props.election.status;
  const now = new Date();
  const electionDate = new Date(props.election.election_date);

  let targetTime: Date;
  let prefix = '';

  if (status === 'scheduled') {
    targetTime = new Date(
      Date.UTC(
        electionDate.getFullYear(),
        electionDate.getMonth(),
        electionDate.getDate(),
        8,
        0,
        0,
      ),
    );
    prefix = 'Ouverture dans';
  } else if (status === 'ongoing') {
    targetTime = new Date(
      Date.UTC(
        electionDate.getFullYear(),
        electionDate.getMonth(),
        electionDate.getDate(),
        18,
        0,
        0,
      ),
    );
    prefix = 'Clôture dans';
  } else {
    return;
  }

  const diff = targetTime.getTime() - now.getTime();

  if (diff <= 0) {
    countdown.value = status === 'scheduled' ? 'Scrutin ouvert' : 'Scrutin clos';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let timeString = '';
  if (days > 0) timeString += `${days}j `;
  if (hours > 0 || days > 0) timeString += `${hours}h `;
  timeString += `${minutes}m ${seconds}s`;

  countdown.value = `${prefix} ${timeString}`;
};

// --- Results Logic (Completed) ---

const winningCoalition = computed(() => {
  if (!props.coalitions || props.coalitions.length === 0) return null;
  if (props.election.type === 'presidential') {
    return [...props.coalitions].sort(
      (a, b) => (Number(b.pourcentage) || 0) - (Number(a.pourcentage) || 0),
    )[0];
  }
  return null;
});

const topLegislativeCoalitions = computed(() => {
  if (props.election.type !== 'legislative' || !props.coalitions) return [];
  return [...props.coalitions]
    .sort((a, b) => {
      const totalA = (Number(a.sieges) || 0) + (Number((a as any).sieges_departement) || 0);
      const totalB = (Number(b.sieges) || 0) + (Number((b as any).sieges_departement) || 0);
      return totalB - totalA;
    })
    .slice(0, 2);
});

const electionYear = computed(() => {
  if (!props.election.election_date) return 'all';
  return new Date(props.election.election_date).getFullYear().toString();
});

const quickLinks = computed(() => {
  const links = [];
  if (props.election.type === 'presidential') {
    links.push({
      label: 'Résultats définitifs',
      description: 'Proclamés par le Conseil Constitutionnel.',
      to: `${electionRoutes.legislation}?type=${props.election.type}&year=${electionYear.value}&q=resultats`,
      icon: 'i-heroicons-document-text',
    });
  } else if (props.election.type === 'legislative') {
    links.push({
      label: 'Annuaire des députés',
      description: 'Liste et profils des représentants.',
      to: '/assemblee-nationale/deputes',
      icon: 'i-heroicons-users',
    });
    links.push({
      label: 'Assemblée nationale',
      description: "Dashboard de l'Assemblée nationale.",
      to: '/assemblee-nationale',
      icon: 'i-heroicons-building-library',
    });
  }
  return links;
});

onMounted(() => {
  updateTimer();
  if (props.election.status !== 'completed') timerInterval = setInterval(updateTimer, 1000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<template>
  <UCard
    :ui="{
      body: { padding: 'p-0' },
      base: 'overflow-hidden border-none shadow-md bg-white dark:bg-gray-950 rounded-[1.5rem]',
    }"
  >
    <!-- View: COMPLETED (Compact & Focused) -->
    <div v-if="election.status === 'completed'" class="flex flex-col lg:flex-row">
      <!-- Info Section -->
      <div class="flex-1 space-y-3 p-4 lg:p-5">
        <div class="flex items-center gap-3">
          <UBadge
            color="green"
            variant="subtle"
            class="rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
          >
            Terminée
          </UBadge>
          <div
            class="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-gray-400"
          >
            <UIcon name="i-heroicons-calendar" class="h-3 w-3" />
            {{ formatDate(election.election_date) }}
          </div>
        </div>

        <h2
          class="text-lg font-black uppercase leading-none tracking-tight text-gray-900 lg:text-xl dark:text-white"
        >
          {{ election.name }}
        </h2>

        <!-- Action Links -->
        <div class="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
          <NuxtLink
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="hover:border-primary-500/50 group flex items-center gap-2.5 rounded-xl border bg-gray-50 p-2 transition-all dark:border-gray-800 dark:bg-gray-800/50"
          >
            <div
              class="text-primary-600 shrink-0 rounded-lg bg-white p-1.5 shadow-sm transition-transform group-hover:scale-105 dark:bg-gray-900"
            >
              <UIcon :name="link.icon" class="h-4 w-4" />
            </div>
            <div class="min-w-0">
              <p
                class="mb-0.5 text-[9px] font-black uppercase leading-none tracking-wider text-gray-900 dark:text-white"
              >
                {{ link.label }}
              </p>
              <p class="truncate text-[8px] font-medium text-gray-500">{{ link.description }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Results Section -->
      <div
        class="flex flex-col justify-center border-l bg-gray-50 p-5 lg:w-[320px] lg:p-6 dark:border-gray-800 dark:bg-gray-900/50"
      >
        <!-- Presidential Winner -->
        <div
          v-if="election.type === 'presidential' && winningCoalition"
          class="flex items-center gap-4"
        >
          <UAvatar
            :src="getCmsAsset(winningCoalition.head_of_list.photo)"
            size="xl"
            class="shadow-lg ring-2 ring-white dark:ring-gray-800"
          />
          <div class="min-w-0">
            <p
              class="text-primary-600 dark:text-primary-400 mb-0.5 text-[8px] font-black uppercase tracking-widest"
            >
              Vainqueur
            </p>
            <h3 class="mb-0.5 text-sm font-black leading-tight text-gray-900 dark:text-white">
              {{ winningCoalition.head_of_list.first_name }}
              {{ winningCoalition.head_of_list.last_name }}
            </h3>
            <p class="text-primary-600 text-2xl font-black leading-none tracking-tighter">
              {{ parseFloat(String(winningCoalition.pourcentage)).toFixed(2) }}%
            </p>
          </div>
        </div>

        <!-- Legislative Sièges -->
        <div
          v-else-if="election.type === 'legislative' && topLegislativeCoalitions.length > 0"
          class="space-y-4"
        >
          <p class="text-[9px] font-black uppercase tracking-widest text-gray-400">
            Répartition des sièges
          </p>
          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="(col, idx) in topLegislativeCoalitions"
              :key="col.id"
              class="rounded-2xl border bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <p class="truncate text-[8px] font-black uppercase text-gray-400">
                {{ col.acronym || col.name }}
              </p>
              <p class="text-primary-600 text-xl font-black">
                {{ (Number(col.sieges) || 0) + (Number((col as any).sieges_departement) || 0) }}
              </p>
              <p class="text-[8px] font-bold text-gray-500">
                {{ idx === 0 ? 'Majorité' : 'Opposition' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Placeholder -->
        <div v-else class="text-center opacity-40">
          <UIcon name="i-heroicons-pause-circle" class="mx-auto mb-2 h-10 w-10 text-gray-300" />
          <p class="text-[9px] font-black uppercase tracking-widest text-gray-400">
            Calcul des résultats...
          </p>
        </div>
      </div>
    </div>

    <!-- View: ONGOING / SCHEDULED -->
    <div v-else class="flex flex-col lg:flex-row">
      <div class="flex-1 space-y-4 p-6 lg:p-8">
        <div class="flex items-center gap-3">
          <UBadge
            :color="getStatusColor(election.status)"
            variant="subtle"
            class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest"
          >
            {{
              { scheduled: 'Programmée', ongoing: 'En cours', pending: 'À venir' }[
                election.status
              ] || election.status
            }}
          </UBadge>
          <div
            v-if="countdown"
            class="flex animate-pulse items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase text-gray-500 dark:bg-gray-800"
          >
            <UIcon name="i-heroicons-clock" class="h-3.5 w-3.5" />
            {{ countdown }}
          </div>
        </div>

        <h2
          class="text-2xl font-black uppercase leading-tight tracking-tighter text-gray-900 dark:text-white"
        >
          {{ election.name }}
        </h2>

        <div
          class="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400"
        >
          <div class="flex items-center gap-1.5">
            <UIcon name="i-heroicons-calendar" class="text-primary-500 h-4 w-4" />
            Scrutin: {{ formatDate(election.election_date) }}
          </div>
          <div v-if="election.rounds > 1" class="flex items-center gap-1.5">
            <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-4 w-4" />
            {{ election.rounds }} Tours
          </div>
        </div>
      </div>

      <!-- Campaign Simple Footer/Sideline -->
      <div
        class="flex flex-col justify-center border-l bg-gray-50 p-6 lg:w-64 dark:border-gray-800 dark:bg-gray-900"
      >
        <div class="space-y-3">
          <p class="text-[9px] font-black uppercase tracking-widest text-gray-400">
            Campagne électorale
          </p>
          <div class="space-y-1">
            <p class="flex justify-between text-xs font-black dark:text-white">
              <span class="text-[8px] font-bold uppercase text-gray-400">Incipit:</span>
              {{ formatDate(election.campaign_start_date) || '—' }}
            </p>
            <p class="flex justify-between text-xs font-black dark:text-white">
              <span class="text-[8px] font-bold uppercase text-gray-400">Clôture:</span>
              {{ formatDate(election.campaign_end_date) || '—' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>

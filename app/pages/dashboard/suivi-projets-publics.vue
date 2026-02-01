<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Hero Header -->
    <div
      class="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white dark:border-gray-800 dark:from-gray-900 dark:to-gray-900"
    >
      <div class="container mx-auto px-4 py-6 sm:py-8">
        <!-- Breadcrumb -->
        <nav class="mb-4 flex items-center gap-1.5 text-sm">
          <NuxtLink
            to="/"
            class="hover:text-primary-600 text-gray-500 transition-colors dark:text-gray-400"
          >
            Accueil
          </NuxtLink>
          <UIcon name="i-heroicons-chevron-right-20-solid" class="h-4 w-4 text-gray-400" />
          <NuxtLink
            to="/dashboard"
            class="hover:text-primary-600 text-gray-500 transition-colors dark:text-gray-400"
          >
            Dashboard
          </NuxtLink>
          <UIcon name="i-heroicons-chevron-right-20-solid" class="h-4 w-4 text-gray-400" />
          <span class="font-medium text-gray-900 dark:text-white">Suivi des Projets</span>
        </nav>

        <!-- Title -->
        <div>
          <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            Tableau de Bord - Vision 2050
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Suivez en temps réel l'avancement des projets publics structurants du Sénégal
          </p>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <!-- KPIs -->
      <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="kpi in kpis"
          :key="kpi.label"
          class="rounded-lg bg-white p-4 shadow sm:p-6 dark:bg-gray-800"
        >
          <div class="flex items-center gap-3 sm:gap-4">
            <div
              :class="kpi.iconBg"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12"
            >
              <UIcon :name="kpi.icon" class="h-5 w-5 sm:h-6 sm:w-6" :class="kpi.iconColor" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">
                {{ kpi.value }}
              </div>
              <div class="text-xs text-gray-500 sm:text-sm dark:text-gray-400">
                {{ kpi.label }}
              </div>
            </div>
            <!-- Mini gauge for Avancement global -->
            <ClientOnly v-if="kpi.label === 'Avancement global'">
              <NuxtChartsProgressCircle :value="46" color="#EAB308" :size="50" :stroke-width="6" />
            </ClientOnly>
          </div>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mb-6">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          size="lg"
          placeholder="Rechercher un projet..."
          :ui="{ icon: { trailing: { pointer: '' } } }"
        >
          <template #trailing>
            <UButton
              v-show="searchQuery !== ''"
              color="gray"
              variant="link"
              icon="i-heroicons-x-mark-20-solid"
              :padded="false"
              @click="searchQuery = ''"
            />
          </template>
        </UInput>
      </div>

      <!-- Tabs -->
      <UTabs v-model="selectedTab" :items="tabs" class="mb-8">
        <!-- Tab: Par Pilier Vision -->
        <template #par-pilier>
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Carte interactive -->
            <div class="lg:col-span-2">
              <div class="rounded-lg bg-white p-4 shadow sm:p-6 dark:bg-gray-800">
                <h3 class="mb-4 text-base font-semibold text-gray-900 sm:text-lg dark:text-white">
                  Répartition géographique des projets
                </h3>
                <DashboardSenegalMap min-height="500px" />
                <div class="mt-4 flex flex-wrap gap-3 sm:gap-4">
                  <div v-for="pillar in pillars" :key="pillar.name" class="flex items-center gap-2">
                    <div :class="pillar.colorClass" class="h-3 w-3 shrink-0 rounded-full"></div>
                    <span class="text-xs text-gray-600 sm:text-sm dark:text-gray-400">{{
                      pillar.name
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Stats par pilier avec Progress Circle -->
            <div class="space-y-4">
              <div
                v-for="pillar in pillars"
                :key="pillar.name"
                class="rounded-lg bg-white p-4 shadow sm:p-6 dark:bg-gray-800"
              >
                <div class="mb-4 flex items-center gap-3">
                  <div
                    :class="pillar.iconBg"
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  >
                    <UIcon :name="pillar.icon" class="h-5 w-5" :class="pillar.iconColor" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <h4
                      class="truncate text-sm font-semibold text-gray-900 sm:text-base dark:text-white"
                    >
                      {{ pillar.name }}
                    </h4>
                    <p class="text-xs text-gray-500 sm:text-sm dark:text-gray-400">
                      {{ pillar.projects }} projets
                    </p>
                  </div>
                </div>
                <!-- Progress Bar -->
                <div class="mb-3 flex items-center gap-2">
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      :class="pillar.colorClass"
                      class="h-full rounded-full transition-all"
                      :style="{ width: pillar.progress + '%' }"
                    ></div>
                  </div>
                  <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {{ pillar.progress }}%
                  </span>
                </div>
                <!-- Half Gauge -->
                <ClientOnly>
                  <div class="flex items-center justify-center">
                    <NuxtChartsProgressCircle
                      :value="pillar.progress"
                      :color="pillar.color"
                      :size="160"
                      :stroke-width="12"
                      angle="180"
                    >
                      <template #label>
                        <span class="text-2xl font-bold" :style="{ color: pillar.color }">
                          {{ pillar.progress }}%
                        </span>
                      </template>
                    </NuxtChartsProgressCircle>
                  </div>
                </ClientOnly>
              </div>
            </div>
          </div>

          <!-- Top 5 Projets Prioritaires -->
          <div class="mt-6 rounded-lg bg-white shadow dark:bg-gray-800">
            <div class="border-b p-4 sm:p-6 dark:border-gray-700">
              <h3 class="text-base font-semibold text-gray-900 sm:text-lg dark:text-white">
                TOP 5 PROJETS PRIORITAIRES
              </h3>
            </div>

            <!-- Version mobile: Cards -->
            <div class="block p-4 md:hidden">
              <div class="space-y-4">
                <div
                  v-for="(project, index) in topProjects"
                  :key="project.id"
                  class="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div class="mb-3 flex items-start justify-between">
                    <div class="flex-1">
                      <div class="mb-1 flex items-center gap-2">
                        <span
                          class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {{ index + 1 }}
                        </span>
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
                          {{ project.name }}
                        </h4>
                      </div>
                      <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {{ project.budget }}
                      </p>
                    </div>
                  </div>
                  <div class="mb-3 flex flex-wrap gap-2">
                    <UBadge :color="project.pillarColor" variant="subtle" size="xs">
                      {{ project.pillar }}
                    </UBadge>
                    <UBadge :color="project.statusColor" variant="subtle" size="xs">
                      {{ project.status }}
                    </UBadge>
                  </div>
                  <div class="flex items-center gap-2">
                    <div
                      class="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                    >
                      <div
                        :class="project.progressColor"
                        class="h-full rounded-full transition-all"
                        :style="{ width: project.progress + '%' }"
                      ></div>
                    </div>
                    <span class="text-xs font-medium text-gray-900 dark:text-white">
                      {{ project.progress }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Version desktop: Table -->
            <div class="hidden overflow-x-auto md:block">
              <table class="w-full">
                <thead class="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      #
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      Projet
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      Budget
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      Pilier
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      Statut
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      Progrès
                    </th>
                    <th class="px-4 py-3 lg:px-6"></th>
                  </tr>
                </thead>
                <tbody
                  class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800"
                >
                  <tr
                    v-for="(project, index) in topProjects"
                    :key="project.id"
                    class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td
                      class="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 lg:px-6 dark:text-white"
                    >
                      {{ index + 1 }}
                    </td>
                    <td class="px-4 py-4 lg:px-6">
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ project.name }}
                      </div>
                    </td>
                    <td
                      class="whitespace-nowrap px-4 py-4 text-sm text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      {{ project.budget }}
                    </td>
                    <td class="whitespace-nowrap px-4 py-4 lg:px-6">
                      <UBadge :color="project.pillarColor" variant="subtle" size="xs">
                        {{ project.pillar }}
                      </UBadge>
                    </td>
                    <td class="whitespace-nowrap px-4 py-4 lg:px-6">
                      <UBadge :color="project.statusColor" variant="subtle" size="xs">
                        {{ project.status }}
                      </UBadge>
                    </td>
                    <td class="px-4 py-4 lg:px-6">
                      <div class="flex items-center gap-2">
                        <div
                          class="h-2 w-20 overflow-hidden rounded-full bg-gray-200 lg:w-24 dark:bg-gray-700"
                        >
                          <div
                            :class="project.progressColor"
                            class="h-full rounded-full transition-all"
                            :style="{ width: project.progress + '%' }"
                          ></div>
                        </div>
                        <span class="text-xs font-medium text-gray-900 lg:text-sm dark:text-white">
                          {{ project.progress }}%
                        </span>
                      </div>
                    </td>
                    <td class="whitespace-nowrap px-4 py-4 text-right text-sm lg:px-6">
                      <UButton
                        variant="ghost"
                        color="gray"
                        icon="i-heroicons-chevron-right"
                        size="xs"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- Tab: Projets Prioritaires -->
        <template #projets-prioritaires>
          <div class="rounded-lg bg-white shadow dark:bg-gray-800">
            <div class="border-b p-4 sm:p-6 dark:border-gray-700">
              <h3 class="text-base font-semibold text-gray-900 sm:text-lg dark:text-white">
                TOP 5 PROJETS PRIORITAIRES
              </h3>
            </div>

            <!-- Version mobile: Cards -->
            <div class="block p-4 md:hidden">
              <div class="space-y-4">
                <div
                  v-for="(project, index) in topProjects"
                  :key="project.id"
                  class="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div class="mb-3 flex items-start justify-between">
                    <div class="flex-1">
                      <div class="mb-1 flex items-center gap-2">
                        <span
                          class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {{ index + 1 }}
                        </span>
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
                          {{ project.name }}
                        </h4>
                      </div>
                      <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {{ project.budget }}
                      </p>
                    </div>
                  </div>
                  <div class="mb-3 flex flex-wrap gap-2">
                    <UBadge :color="project.pillarColor" variant="subtle" size="xs">
                      {{ project.pillar }}
                    </UBadge>
                    <UBadge :color="project.statusColor" variant="subtle" size="xs">
                      {{ project.status }}
                    </UBadge>
                  </div>
                  <div class="flex items-center gap-2">
                    <div
                      class="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                    >
                      <div
                        :class="project.progressColor"
                        class="h-full rounded-full transition-all"
                        :style="{ width: project.progress + '%' }"
                      ></div>
                    </div>
                    <span class="text-xs font-medium text-gray-900 dark:text-white">
                      {{ project.progress }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Version desktop: Table -->
            <div class="hidden overflow-x-auto md:block">
              <table class="w-full">
                <thead class="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      #
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      Projet
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      Budget
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      Pilier
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      Statut
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      Progrès
                    </th>
                    <th class="px-4 py-3 lg:px-6"></th>
                  </tr>
                </thead>
                <tbody
                  class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800"
                >
                  <tr
                    v-for="(project, index) in topProjects"
                    :key="project.id"
                    class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td
                      class="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 lg:px-6 dark:text-white"
                    >
                      {{ index + 1 }}
                    </td>
                    <td class="px-4 py-4 lg:px-6">
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ project.name }}
                      </div>
                    </td>
                    <td
                      class="whitespace-nowrap px-4 py-4 text-sm text-gray-500 lg:px-6 dark:text-gray-400"
                    >
                      {{ project.budget }}
                    </td>
                    <td class="whitespace-nowrap px-4 py-4 lg:px-6">
                      <UBadge :color="project.pillarColor" variant="subtle" size="xs">
                        {{ project.pillar }}
                      </UBadge>
                    </td>
                    <td class="whitespace-nowrap px-4 py-4 lg:px-6">
                      <UBadge :color="project.statusColor" variant="subtle" size="xs">
                        {{ project.status }}
                      </UBadge>
                    </td>
                    <td class="px-4 py-4 lg:px-6">
                      <div class="flex items-center gap-2">
                        <div
                          class="h-2 w-20 overflow-hidden rounded-full bg-gray-200 lg:w-24 dark:bg-gray-700"
                        >
                          <div
                            :class="project.progressColor"
                            class="h-full rounded-full transition-all"
                            :style="{ width: project.progress + '%' }"
                          ></div>
                        </div>
                        <span class="text-xs font-medium text-gray-900 lg:text-sm dark:text-white">
                          {{ project.progress }}%
                        </span>
                      </div>
                    </td>
                    <td class="whitespace-nowrap px-4 py-4 text-right text-sm lg:px-6">
                      <UButton
                        variant="ghost"
                        color="gray"
                        icon="i-heroicons-chevron-right"
                        size="xs"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- Tab: Par Région -->
        <template #par-region>
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Projets par région
            </h3>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div
                v-for="region in regions"
                :key="region.name"
                class="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="font-semibold text-gray-900 dark:text-white">{{ region.name }}</h4>
                  <UBadge color="blue" variant="subtle">{{ region.projects }}</UBadge>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Budget: {{ region.budget }}</p>
              </div>
            </div>
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
// SEO: Désindexer la page
useHead({
  title: 'DEMO Suivi des Projets Publics - Vision 2050 Sénégal',
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});

const searchQuery = ref('');
const selectedTab = ref(0);

const tabs = [
  {
    label: 'Par Pilier Vision',
    icon: 'i-heroicons-squares-2x2',
    slot: 'par-pilier',
  },
  {
    label: 'Projets Prioritaires',
    icon: 'i-heroicons-star',
    slot: 'projets-prioritaires',
  },
  {
    label: 'Par Région',
    icon: 'i-heroicons-map-pin',
    slot: 'par-region',
  },
];

// KPIs
const kpis = [
  {
    label: 'Projets Vision suivis',
    value: '412',
    icon: 'i-heroicons-eye',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/20',
  },
  {
    label: 'Budget total',
    value: '3 200 Mds CFA',
    icon: 'i-heroicons-banknotes',
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100 dark:bg-green-900/20',
  },
  {
    label: 'Avancement global',
    value: '46%',
    icon: 'i-heroicons-arrow-trending-up',
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
  },
  {
    label: 'Projets à risque',
    value: '32',
    icon: 'i-heroicons-exclamation-triangle',
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100 dark:bg-red-900/20',
  },
];

// Pilliers Vision
const pillars = [
  {
    name: 'Capital Humain',
    projects: 138,
    progress: 36,
    icon: 'i-heroicons-academic-cap',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/20',
    color: '#3B82F6',
    colorClass: 'bg-blue-500',
  },
  {
    name: 'Infrastructures & Territoire',
    projects: 105,
    progress: 51,
    icon: 'i-heroicons-building-office-2',
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
    color: '#EAB308',
    colorClass: 'bg-yellow-500',
  },
  {
    name: 'Économie Productive',
    projects: 87,
    progress: 40,
    icon: 'i-heroicons-chart-bar',
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100 dark:bg-green-900/20',
    color: '#10B981',
    colorClass: 'bg-green-500',
  },
  {
    name: 'Gouvernance',
    projects: 82,
    progress: 55,
    icon: 'i-heroicons-scale',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100 dark:bg-purple-900/20',
    color: '#A855F7',
    colorClass: 'bg-purple-500',
  },
];

// TOP 5 Projets prioritaires
const topProjects = [
  {
    id: 1,
    name: 'Autoroute Dakar-Saint-Louis',
    budget: '450 Mds CFA',
    pillar: 'Infrastructures',
    pillarColor: 'yellow',
    status: 'En cours',
    statusColor: 'blue',
    progress: 65,
    progressColor: 'bg-blue-500',
  },
  {
    id: 2,
    name: 'Programme National de Santé',
    budget: '280 Mds CFA',
    pillar: 'Capital Humain',
    pillarColor: 'blue',
    status: 'En cours',
    statusColor: 'blue',
    progress: 42,
    progressColor: 'bg-blue-500',
  },
  {
    id: 3,
    name: 'Zone Économique Spéciale',
    budget: '350 Mds CFA',
    pillar: 'Économie',
    pillarColor: 'green',
    status: 'Planifié',
    statusColor: 'gray',
    progress: 15,
    progressColor: 'bg-gray-500',
  },
  {
    id: 4,
    name: 'Modernisation Administration Publique',
    budget: '120 Mds CFA',
    pillar: 'Gouvernance',
    pillarColor: 'purple',
    status: 'En cours',
    statusColor: 'blue',
    progress: 78,
    progressColor: 'bg-blue-500',
  },
  {
    id: 5,
    name: 'Programme Éducation Numérique',
    budget: '95 Mds CFA',
    pillar: 'Capital Humain',
    pillarColor: 'blue',
    status: 'À risque',
    statusColor: 'red',
    progress: 28,
    progressColor: 'bg-red-500',
  },
];

// Régions
const regions = [
  { name: 'Dakar', projects: 89, budget: '1,200 Mds CFA' },
  { name: 'Thiès', projects: 45, budget: '450 Mds CFA' },
  { name: 'Diourbel', projects: 38, budget: '320 Mds CFA' },
  { name: 'Saint-Louis', projects: 35, budget: '280 Mds CFA' },
  { name: 'Kaolack', projects: 32, budget: '250 Mds CFA' },
  { name: 'Ziguinchor', projects: 28, budget: '210 Mds CFA' },
  { name: 'Louga', projects: 25, budget: '180 Mds CFA' },
  { name: 'Tambacounda', projects: 22, budget: '165 Mds CFA' },
  { name: 'Fatick', projects: 20, budget: '140 Mds CFA' },
  { name: 'Kolda', projects: 18, budget: '125 Mds CFA' },
  { name: 'Matam', projects: 16, budget: '110 Mds CFA' },
  { name: 'Kaffrine', projects: 15, budget: '95 Mds CFA' },
  { name: 'Kédougou', projects: 12, budget: '80 Mds CFA' },
  { name: 'Sédhiou', projects: 10, budget: '65 Mds CFA' },
];
</script>

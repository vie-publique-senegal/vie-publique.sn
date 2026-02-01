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
          <span class="font-medium text-gray-900 dark:text-white">Dashboard</span>
        </nav>

        <!-- Title -->
        <div>
          <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            Dashboards Démo
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Choisissez un tableau de bord et explorez la démo des graphiques
          </p>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <!-- Dashboard Cards -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
        <!-- Suivi des Projets Publics -->
        <NuxtLink
          to="/dashboard/suivi-projets-publics"
          class="group relative overflow-hidden rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800"
        >
          <div class="mb-4 flex items-center justify-between">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20"
            >
              <UIcon name="i-heroicons-chart-bar" class="h-6 w-6 text-purple-600" />
            </div>
            <UBadge color="purple" variant="subtle">Dashboard</UBadge>
          </div>
          <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            Suivi des Projets Publics
          </h3>
          <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Tableau de bord principal avec visualisation des projets Vision 2050
          </p>
          <div class="flex items-center text-sm font-medium text-purple-600">
            Voir le dashboard
            <UIcon
              name="i-heroicons-arrow-right"
              class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </div>
        </NuxtLink>

        <!-- Demo Nuxt Charts -->
        <NuxtLink
          to="/dashboard/demo-charts"
          class="group relative overflow-hidden rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800"
        >
          <div class="mb-4 flex items-center justify-between">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20"
            >
              <UIcon name="i-heroicons-beaker" class="h-6 w-6 text-orange-600" />
            </div>
            <UBadge color="orange" variant="subtle">Démo</UBadge>
          </div>
          <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Démo Nuxt Charts</h3>
          <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Graphiques avec Nuxt Charts : bars, lines, area, donut, bubble et map
          </p>
          <div class="flex items-center text-sm font-medium text-orange-600">
            Voir la démo
            <UIcon
              name="i-heroicons-arrow-right"
              class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </div>
        </NuxtLink>

        <!-- Demo D3.js -->
        <NuxtLink
          to="/dashboard/demo-d3"
          class="group relative overflow-hidden rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800"
        >
          <div class="mb-4 flex items-center justify-between">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20"
            >
              <UIcon name="i-heroicons-chart-pie" class="h-6 w-6 text-green-600" />
            </div>
            <UBadge color="green" variant="subtle">Démo</UBadge>
          </div>
          <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Démo D3.js</h3>
          <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Visualisations avancées avec D3.js v7 : line, bar, pie, donut, area, stacked
          </p>
          <div class="flex items-center text-sm font-medium text-green-600">
            Voir la démo
            <UIcon
              name="i-heroicons-arrow-right"
              class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </div>
        </NuxtLink>

        <!-- Projets Publics -->
        <NuxtLink
          to="/dashboard/projets-publics"
          class="group relative overflow-hidden rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800"
        >
          <div class="mb-4 flex items-center justify-between">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20"
            >
              <UIcon name="i-heroicons-clipboard-document-list" class="h-6 w-6 text-blue-600" />
            </div>
            <UBadge color="blue" variant="subtle">Dashboard</UBadge>
          </div>
          <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            Projets Publics
          </h3>
          <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Gestion et suivi des projets publics avec filtres, stats et carte régionale
          </p>
          <div class="flex items-center text-sm font-medium text-blue-600">
            Voir le dashboard
            <UIcon
              name="i-heroicons-arrow-right"
              class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// SEO: Désindexer la page
useHead({
  title: 'Dashboards - Vision 2050',
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});
</script>

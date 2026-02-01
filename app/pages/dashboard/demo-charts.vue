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
          <span class="font-medium text-gray-900 dark:text-white">Démo Charts</span>
        </nav>

        <!-- Title -->
        <div>
          <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            Démo Nuxt Charts
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Explorez tous les types de graphiques disponibles avec Nuxt Charts
          </p>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <!-- Bar Charts -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">Bar Charts</h2>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Simple Bar Chart -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Revenus Mensuels
            </h3>
            <ClientOnly>
              <BarChart
                :data="barData"
                :categories="barCategories"
                :height="300"
                :xFormatter="monthFormatter"
                xLabel="Mois"
                yLabel="Revenus (Mds CFA)"
                :yAxis="['revenus']"
              />
            </ClientOnly>
          </div>

          <!-- Multi-Series Bar Chart -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Budget vs Dépenses
            </h3>
            <ClientOnly>
              <BarChart
                :data="multiBarData"
                :categories="multiBarCategories"
                :height="300"
                :xFormatter="monthFormatter"
                xLabel="Mois"
                yLabel="Montant (Mds CFA)"
                :yAxis="['budget', 'depenses']"
              />
            </ClientOnly>
          </div>
        </div>
      </section>

      <!-- Stacked Horizontal Bar Charts -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">
          Stacked Horizontal Bar Charts
        </h2>
        <div class="grid grid-cols-1 gap-6">
          <!-- Stacked Horizontal Bar Chart -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Revenus Desktop vs Mobile (Stacked Horizontal)
            </h3>
            <ClientOnly>
              <BarChart
                :data="stackedHorizontalData"
                :categories="stackedHorizontalCategories"
                :height="400"
                :stacked="true"
                :yAxis="['desktop', 'mobile']"
                :yFormatter="stackedYFormatter"
                xLabel="Revenus (K)"
                :radius="4"
                :group-padding="0"
                :bar-padding="0.2"
              />
            </ClientOnly>
          </div>
        </div>
      </section>

      <!-- Line Charts -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">Line Charts</h2>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Simple Line Chart -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Projets Complétés
            </h3>
            <ClientOnly>
              <LineChart
                :data="lineData"
                :categories="lineCategories"
                :height="300"
                :xFormatter="monthFormatter"
                xLabel="Mois"
                yLabel="Nombre de projets"
                :yAxis="['projets']"
              />
            </ClientOnly>
          </div>

          <!-- Multi-Line Chart -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Évolution des Indicateurs
            </h3>
            <ClientOnly>
              <LineChart
                :data="multiLineData"
                :categories="multiLineCategories"
                :height="300"
                :xFormatter="monthFormatter"
                xLabel="Mois"
                yLabel="Score"
                :yAxis="['education', 'sante', 'infrastructure']"
              />
            </ClientOnly>
          </div>
        </div>
      </section>

      <!-- Area Charts -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">Area Charts</h2>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Simple Area Chart -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Trafic Web Mensuel
            </h3>
            <ClientOnly>
              <AreaChart
                :data="areaData"
                :categories="areaCategories"
                :height="300"
                :xFormatter="monthFormatter"
                xLabel="Mois"
                yLabel="Visites"
                :yAxis="['visites']"
              />
            </ClientOnly>
          </div>

          <!-- Multi-Series Area Chart -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Desktop vs Mobile
            </h3>
            <ClientOnly>
              <AreaChart
                :data="multiAreaData"
                :categories="multiAreaCategories"
                :height="300"
                :xFormatter="monthFormatter"
                xLabel="Mois"
                yLabel="Utilisateurs"
                :yAxis="['desktop', 'mobile']"
              />
            </ClientOnly>
          </div>
        </div>
      </section>

      <!-- Donut Charts -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">Donut Charts</h2>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <!-- Donut Chart - Pillars -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Projets par Pilier
            </h3>
            <ClientOnly>
              <DonutChart
                :data="donutPillarData"
                :categories="donutPillarCategories"
                :height="300"
                :radius="4"
              />
            </ClientOnly>
          </div>

          <!-- Donut Chart - Regions -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Projets par Région
            </h3>
            <ClientOnly>
              <DonutChart
                :data="donutRegionData"
                :categories="donutRegionCategories"
                :height="300"
                :radius="4"
              />
            </ClientOnly>
          </div>

          <!-- Donut Chart - Budget -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Répartition Budgétaire
            </h3>
            <ClientOnly>
              <DonutChart
                :data="donutBudgetData"
                :categories="donutBudgetCategories"
                :height="300"
                :radius="4"
              />
            </ClientOnly>
          </div>
        </div>
      </section>

      <!-- Bubble Charts -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">Bubble Charts</h2>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Bubble Chart - Projects -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Projets par Impact et Budget
            </h3>
            <ClientOnly>
              <BubbleChart
                :data="bubbleData"
                :categories="bubbleCategories"
                :height="400"
                xLabel="Impact Social (%)"
                yLabel="Budget (Mds CFA)"
                xAxis="x"
                :yAxis="['y']"
              />
            </ClientOnly>
          </div>

          <!-- Bubble Chart - Sectors -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Secteurs par Performance
            </h3>
            <ClientOnly>
              <BubbleChart
                :data="bubbleSectorData"
                :categories="bubbleSectorCategories"
                :height="400"
                xLabel="Efficacité (%)"
                yLabel="Croissance (%)"
                xAxis="x"
                :yAxis="['y']"
              />
            </ClientOnly>
          </div>
        </div>
      </section>

      <!-- Semi-Circle Gauges -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">
          Semi-Circle Gauges (Demi-Jauges)
        </h2>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <!-- Gauge 1 -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
              Performance
            </h3>
            <div class="flex flex-col items-center">
              <svg width="160" height="90" viewBox="0 0 160 90">
                <defs>
                  <linearGradient id="gaugeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #3b82f6; stop-opacity: 1" />
                    <stop offset="100%" style="stop-color: #60a5fa; stop-opacity: 1" />
                  </linearGradient>
                </defs>
                <!-- Background arc -->
                <path
                  d="M 20 80 A 60 60 0 0 1 140 80"
                  fill="none"
                  stroke="#e5e7eb"
                  stroke-width="12"
                  stroke-linecap="round"
                />
                <!-- Progress arc -->
                <path
                  :d="getArcPath(75, 60, 20, 80)"
                  fill="none"
                  stroke="url(#gaugeGradient1)"
                  stroke-width="12"
                  stroke-linecap="round"
                />
                <!-- Center text -->
                <text x="80" y="70" text-anchor="middle" class="fill-gray-900 dark:fill-white">
                  <tspan font-size="24" font-weight="bold">75%</tspan>
                </text>
              </svg>
              <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">Excellent</div>
            </div>
          </div>

          <!-- Gauge 2 -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
              Disponibilité
            </h3>
            <div class="flex flex-col items-center">
              <svg width="160" height="90" viewBox="0 0 160 90">
                <defs>
                  <linearGradient id="gaugeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #10b981; stop-opacity: 1" />
                    <stop offset="100%" style="stop-color: #34d399; stop-opacity: 1" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20 80 A 60 60 0 0 1 140 80"
                  fill="none"
                  stroke="#e5e7eb"
                  stroke-width="12"
                  stroke-linecap="round"
                />
                <path
                  :d="getArcPath(92, 60, 20, 80)"
                  fill="none"
                  stroke="url(#gaugeGradient2)"
                  stroke-width="12"
                  stroke-linecap="round"
                />
                <text x="80" y="70" text-anchor="middle" class="fill-gray-900 dark:fill-white">
                  <tspan font-size="24" font-weight="bold">92%</tspan>
                </text>
              </svg>
              <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">Très bon</div>
            </div>
          </div>

          <!-- Gauge 3 -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
              Efficacité
            </h3>
            <div class="flex flex-col items-center">
              <svg width="160" height="90" viewBox="0 0 160 90">
                <defs>
                  <linearGradient id="gaugeGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #f59e0b; stop-opacity: 1" />
                    <stop offset="100%" style="stop-color: #fbbf24; stop-opacity: 1" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20 80 A 60 60 0 0 1 140 80"
                  fill="none"
                  stroke="#e5e7eb"
                  stroke-width="12"
                  stroke-linecap="round"
                />
                <path
                  :d="getArcPath(58, 60, 20, 80)"
                  fill="none"
                  stroke="url(#gaugeGradient3)"
                  stroke-width="12"
                  stroke-linecap="round"
                />
                <text x="80" y="70" text-anchor="middle" class="fill-gray-900 dark:fill-white">
                  <tspan font-size="24" font-weight="bold">58%</tspan>
                </text>
              </svg>
              <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">Moyen</div>
            </div>
          </div>

          <!-- Gauge 4 -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
              Qualité
            </h3>
            <div class="flex flex-col items-center">
              <svg width="160" height="90" viewBox="0 0 160 90">
                <defs>
                  <linearGradient id="gaugeGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #8b5cf6; stop-opacity: 1" />
                    <stop offset="100%" style="stop-color: #a78bfa; stop-opacity: 1" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20 80 A 60 60 0 0 1 140 80"
                  fill="none"
                  stroke="#e5e7eb"
                  stroke-width="12"
                  stroke-linecap="round"
                />
                <path
                  :d="getArcPath(85, 60, 20, 80)"
                  fill="none"
                  stroke="url(#gaugeGradient4)"
                  stroke-width="12"
                  stroke-linecap="round"
                />
                <text x="80" y="70" text-anchor="middle" class="fill-gray-900 dark:fill-white">
                  <tspan font-size="24" font-weight="bold">85%</tspan>
                </text>
              </svg>
              <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">Très bon</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Progress Bars with Mini Gauges -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">
          Barres + Demi-Jauges
        </h2>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Indicateurs de Performance
            </h3>
            <div class="space-y-6">
              <!-- Indicator 1 -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">CPU Usage</span>
                  <div class="flex items-center gap-3">
                    <svg width="60" height="35" viewBox="0 0 60 35">
                      <path
                        d="M 10 30 A 20 20 0 0 1 50 30"
                        fill="none"
                        stroke="#e5e7eb"
                        stroke-width="4"
                      />
                      <path
                        :d="getArcPath(72, 20, 10, 30, 60, 35)"
                        fill="none"
                        stroke="#3b82f6"
                        stroke-width="4"
                        stroke-linecap="round"
                      />
                      <text x="30" y="28" text-anchor="middle" font-size="10" font-weight="bold" class="fill-gray-900 dark:fill-white">
                        72%
                      </text>
                    </svg>
                    <span class="text-sm font-bold text-gray-900 dark:text-white">72%</span>
                  </div>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div class="h-full rounded-full bg-blue-600" style="width: 72%"></div>
                </div>
              </div>

              <!-- Indicator 2 -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Memory</span>
                  <div class="flex items-center gap-3">
                    <svg width="60" height="35" viewBox="0 0 60 35">
                      <path
                        d="M 10 30 A 20 20 0 0 1 50 30"
                        fill="none"
                        stroke="#e5e7eb"
                        stroke-width="4"
                      />
                      <path
                        :d="getArcPath(45, 20, 10, 30, 60, 35)"
                        fill="none"
                        stroke="#10b981"
                        stroke-width="4"
                        stroke-linecap="round"
                      />
                      <text x="30" y="28" text-anchor="middle" font-size="10" font-weight="bold" class="fill-gray-900 dark:fill-white">
                        45%
                      </text>
                    </svg>
                    <span class="text-sm font-bold text-gray-900 dark:text-white">45%</span>
                  </div>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div class="h-full rounded-full bg-green-600" style="width: 45%"></div>
                </div>
              </div>

              <!-- Indicator 3 -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Disk Space</span>
                  <div class="flex items-center gap-3">
                    <svg width="60" height="35" viewBox="0 0 60 35">
                      <path
                        d="M 10 30 A 20 20 0 0 1 50 30"
                        fill="none"
                        stroke="#e5e7eb"
                        stroke-width="4"
                      />
                      <path
                        :d="getArcPath(88, 20, 10, 30, 60, 35)"
                        fill="none"
                        stroke="#ef4444"
                        stroke-width="4"
                        stroke-linecap="round"
                      />
                      <text x="30" y="28" text-anchor="middle" font-size="10" font-weight="bold" class="fill-gray-900 dark:fill-white">
                        88%
                      </text>
                    </svg>
                    <span class="text-sm font-bold text-gray-900 dark:text-white">88%</span>
                  </div>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div class="h-full rounded-full bg-red-600" style="width: 88%"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Another variant -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Objectifs Mensuels
            </h3>
            <div class="space-y-6">
              <!-- Goal 1 -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Ventes</span>
                  <div class="flex items-center gap-3">
                    <svg width="60" height="35" viewBox="0 0 60 35">
                      <path
                        d="M 10 30 A 20 20 0 0 1 50 30"
                        fill="none"
                        stroke="#e5e7eb"
                        stroke-width="4"
                      />
                      <path
                        :d="getArcPath(95, 20, 10, 30, 60, 35)"
                        fill="none"
                        stroke="#8b5cf6"
                        stroke-width="4"
                        stroke-linecap="round"
                      />
                      <text x="30" y="28" text-anchor="middle" font-size="10" font-weight="bold" class="fill-gray-900 dark:fill-white">
                        95%
                      </text>
                    </svg>
                    <span class="text-sm font-bold text-gray-900 dark:text-white">95%</span>
                  </div>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div class="h-full rounded-full bg-purple-600" style="width: 95%"></div>
                </div>
              </div>

              <!-- Goal 2 -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Leads</span>
                  <div class="flex items-center gap-3">
                    <svg width="60" height="35" viewBox="0 0 60 35">
                      <path
                        d="M 10 30 A 20 20 0 0 1 50 30"
                        fill="none"
                        stroke="#e5e7eb"
                        stroke-width="4"
                      />
                      <path
                        :d="getArcPath(67, 20, 10, 30, 60, 35)"
                        fill="none"
                        stroke="#f59e0b"
                        stroke-width="4"
                        stroke-linecap="round"
                      />
                      <text x="30" y="28" text-anchor="middle" font-size="10" font-weight="bold" class="fill-gray-900 dark:fill-white">
                        67%
                      </text>
                    </svg>
                    <span class="text-sm font-bold text-gray-900 dark:text-white">67%</span>
                  </div>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div class="h-full rounded-full bg-yellow-600" style="width: 67%"></div>
                </div>
              </div>

              <!-- Goal 3 -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Conversions</span>
                  <div class="flex items-center gap-3">
                    <svg width="60" height="35" viewBox="0 0 60 35">
                      <path
                        d="M 10 30 A 20 20 0 0 1 50 30"
                        fill="none"
                        stroke="#e5e7eb"
                        stroke-width="4"
                      />
                      <path
                        :d="getArcPath(82, 20, 10, 30, 60, 35)"
                        fill="none"
                        stroke="#06b6d4"
                        stroke-width="4"
                        stroke-linecap="round"
                      />
                      <text x="30" y="28" text-anchor="middle" font-size="10" font-weight="bold" class="fill-gray-900 dark:fill-white">
                        82%
                      </text>
                    </svg>
                    <span class="text-sm font-bold text-gray-900 dark:text-white">82%</span>
                  </div>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div class="h-full rounded-full bg-cyan-600" style="width: 82%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Map Section -->
      <section class="mb-12">
        <h2 class="mb-6 text-xl font-bold text-gray-900 dark:text-white">
          Interactive Map (Leaflet)
        </h2>
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Carte du Sénégal
          </h3>
          <DashboardSenegalMap min-height="500px" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// SEO: Désindexer la page
useHead({
  title: 'Démo Nuxt Charts - Vision 2050',
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});

// Formatter pour les mois
const monthFormatter = (i: number) => {
  const data = barData; // Utilise n'importe quel dataset pour récupérer le label
  return data[i]?.month || '';
};

// Formatter pour Stacked Horizontal Bar Chart
const stackedYFormatter = (i: number) => {
  return stackedHorizontalData[i]?.month || '';
};

// ===== BAR CHARTS =====

// Simple Bar Chart
const barData = [
  { month: 'Jan', revenus: 120 },
  { month: 'Fév', revenus: 150 },
  { month: 'Mar', revenus: 180 },
  { month: 'Avr', revenus: 170 },
  { month: 'Mai', revenus: 200 },
  { month: 'Jun', revenus: 220 },
];

const barCategories = {
  revenus: {
    name: 'Revenus',
    color: '#3b82f6',
  },
};

// Multi-Series Bar Chart
const multiBarData = [
  { month: 'Jan', budget: 300, depenses: 280 },
  { month: 'Fév', budget: 320, depenses: 310 },
  { month: 'Mar', budget: 340, depenses: 325 },
  { month: 'Avr', budget: 360, depenses: 345 },
  { month: 'Mai', budget: 380, depenses: 365 },
  { month: 'Jun', budget: 400, depenses: 385 },
];

const multiBarCategories = {
  budget: {
    name: 'Budget alloué',
    color: '#3b82f6',
  },
  depenses: {
    name: 'Budget dépensé',
    color: '#ef4444',
  },
};

// ===== STACKED HORIZONTAL BAR CHART =====

// Stacked Horizontal Bar Chart Data
const stackedHorizontalData = [
  { month: 'Janvier', desktop: 186, mobile: 80 },
  { month: 'Février', desktop: 305, mobile: 200 },
  { month: 'Mars', desktop: 237, mobile: 120 },
  { month: 'Avril', desktop: 73, mobile: 190 },
  { month: 'Mai', desktop: 209, mobile: 130 },
  { month: 'Juin', desktop: 214, mobile: 140 },
];

const stackedHorizontalCategories = {
  desktop: {
    name: 'Desktop',
    color: '#3b82f6',
  },
  mobile: {
    name: 'Mobile',
    color: '#22c55e',
  },
};

// ===== LINE CHARTS =====

// Simple Line Chart
const lineData = [
  { month: 'Jan', projets: 12 },
  { month: 'Fév', projets: 19 },
  { month: 'Mar', projets: 25 },
  { month: 'Avr', projets: 32 },
  { month: 'Mai', projets: 38 },
  { month: 'Jun', projets: 45 },
  { month: 'Jul', projets: 52 },
];

const lineCategories = {
  projets: {
    name: 'Projets complétés',
    color: '#10b981',
  },
};

// Multi-Line Chart
const multiLineData = [
  { month: 'Jan', education: 65, sante: 58, infrastructure: 72 },
  { month: 'Fév', education: 68, sante: 62, infrastructure: 75 },
  { month: 'Mar', education: 72, sante: 65, infrastructure: 78 },
  { month: 'Avr', education: 75, sante: 70, infrastructure: 80 },
  { month: 'Mai', education: 78, sante: 73, infrastructure: 82 },
  { month: 'Jun', education: 82, sante: 78, infrastructure: 85 },
];

const multiLineCategories = {
  education: {
    name: 'Éducation',
    color: '#3b82f6',
  },
  sante: {
    name: 'Santé',
    color: '#ef4444',
  },
  infrastructure: {
    name: 'Infrastructure',
    color: '#10b981',
  },
};

// ===== AREA CHARTS =====

// Simple Area Chart
const areaData = [
  { month: 'Jan', visites: 3000 },
  { month: 'Fév', visites: 4200 },
  { month: 'Mar', visites: 3800 },
  { month: 'Avr', visites: 5100 },
  { month: 'Mai', visites: 4800 },
  { month: 'Jun', visites: 6200 },
];

const areaCategories = {
  visites: {
    name: 'Trafic web',
    color: '#8b5cf6',
  },
};

// Multi-Series Area Chart
const multiAreaData = [
  { month: 'Jan', desktop: 2000, mobile: 1000 },
  { month: 'Fév', desktop: 2800, mobile: 1400 },
  { month: 'Mar', desktop: 2500, mobile: 1300 },
  { month: 'Avr', desktop: 3400, mobile: 1700 },
  { month: 'Mai', desktop: 3200, mobile: 1600 },
  { month: 'Jun', desktop: 4100, mobile: 2100 },
];

const multiAreaCategories = {
  desktop: {
    name: 'Desktop',
    color: '#3b82f6',
  },
  mobile: {
    name: 'Mobile',
    color: '#10b981',
  },
};

// ===== DONUT CHARTS =====

// Donut Chart - Pillars (DonutChart attend un tableau de nombres simples)
const donutPillarData = ref([138, 105, 87, 82]);

const donutPillarLabels = [
  { name: 'Capital Humain', color: '#3b82f6' },
  { name: 'Infrastructures', color: '#eab308' },
  { name: 'Économie', color: '#10b981' },
  { name: 'Gouvernance', color: '#a855f7' },
];

const donutPillarCategories = Object.fromEntries(
  donutPillarLabels.map((i) => [i.name, { name: i.name, color: i.color }]),
);

// Donut Chart - Regions
const donutRegionData = ref([89, 45, 38, 32, 208]);

const donutRegionLabels = [
  { name: 'Dakar', color: '#ef4444' },
  { name: 'Thiès', color: '#3b82f6' },
  { name: 'Saint-Louis', color: '#10b981' },
  { name: 'Ziguinchor', color: '#eab308' },
  { name: 'Autres', color: '#8b5cf6' },
];

const donutRegionCategories = Object.fromEntries(
  donutRegionLabels.map((i) => [i.name, { name: i.name, color: i.color }]),
);

// Donut Chart - Budget
const donutBudgetData = ref([350, 280, 450, 220, 180]);

const donutBudgetLabels = [
  { name: 'Éducation', color: '#3b82f6' },
  { name: 'Santé', color: '#ef4444' },
  { name: 'Infrastructure', color: '#10b981' },
  { name: 'Agriculture', color: '#eab308' },
  { name: 'Autres', color: '#8b5cf6' },
];

const donutBudgetCategories = Object.fromEntries(
  donutBudgetLabels.map((i) => [i.name, { name: i.name, color: i.color }]),
);

// ===== BUBBLE CHARTS =====

// Bubble Chart - Projects
const bubbleData = [
  { x: 65, y: 450, size: 15 },
  { x: 42, y: 280, size: 10 },
  { x: 15, y: 350, size: 12 },
  { x: 78, y: 120, size: 8 },
  { x: 28, y: 95, size: 6 },
  { x: 85, y: 520, size: 18 },
  { x: 55, y: 310, size: 14 },
];

const bubbleCategories = {
  size: {
    name: 'Projets prioritaires',
    color: '#3b82f6',
  },
};

// Bubble Chart - Sectors
const bubbleSectorData = [
  { x: 70, y: 25, size: 12 },
  { x: 45, y: 15, size: 8 },
  { x: 85, y: 35, size: 15 },
  { x: 60, y: 20, size: 10 },
  { x: 90, y: 40, size: 18 },
  { x: 55, y: 18, size: 9 },
];

const bubbleSectorCategories = {
  size: {
    name: 'Secteurs',
    color: '#10b981',
  },
};

// ===== SEMI-CIRCLE GAUGE ARC CALCULATION =====

/**
 * Génère le chemin SVG pour un arc semi-circulaire basé sur un pourcentage
 * @param percentage - Pourcentage de remplissage (0-100)
 * @param radius - Rayon de l'arc
 * @param startX - Coordonnée X de départ
 * @param startY - Coordonnée Y de départ
 */
const getArcPath = (
  percentage: number,
  radius: number,
  startX: number,
  startY: number,
): string => {
  // Limiter le pourcentage entre 0 et 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Convertir le pourcentage en angle (180 degrés = 100%)
  // L'angle part de 180° (π) et va vers 0° (0)
  const startAngle = Math.PI; // 180 degrés (gauche)
  const endAngle = Math.PI - (clampedPercentage / 100) * Math.PI;

  // Calculer le point final de l'arc
  const centerX = startX + radius;
  const centerY = startY;
  const endX = centerX + radius * Math.cos(endAngle);
  const endY = centerY - radius * Math.sin(endAngle);

  // Déterminer si l'arc doit être grand (> 50%) ou petit (<= 50%)
  const largeArcFlag = clampedPercentage > 50 ? 1 : 0;

  // Générer le chemin SVG
  // Format: M startX startY A radiusX radiusY rotation largeArcFlag sweepFlag endX endY
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
};
</script>

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
          <span class="font-medium text-gray-900 dark:text-white">Projets Publics</span>
        </nav>

        <!-- Title -->
        <div>
          <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            Projets Publics — Vision 2050
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Suivi et gestion des projets structurants du Sénégal
          </p>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 py-6">
      <div class="flex flex-col gap-6 lg:flex-row">
        <!-- Main Content -->
        <div class="flex-1">
          <!-- Filters -->
          <div class="mb-6 flex flex-wrap gap-3">
            <USelectMenu
              v-model="selectedRegion"
              :options="regions"
              placeholder="🏷️ Région"
              class="w-40"
            />
            <USelectMenu
              v-model="selectedSecteur"
              :options="secteurs"
              placeholder="🏢 Secteur"
              class="w-40"
            />
            <USelectMenu
              v-model="selectedStatut"
              :options="statuts"
              placeholder="📊 Statut"
              class="w-48"
            />
            <USelectMenu
              v-model="selectedBudget"
              :options="budgetRanges"
              placeholder="📊 Plage budgétaire"
              class="w-48"
            />
            <UInput
              v-model="searchQuery"
              placeholder="🔍 Search project"
              icon="i-heroicons-magnifying-glass"
              class="flex-1 min-w-48"
            />
          </div>

          <!-- Projects Table -->
          <div class="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-800">
            <table class="w-full">
              <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Projet
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Secteur
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Région
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Budget
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Avancement
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Statut
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Chronologie
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-for="projet in filteredProjets"
                  :key="projet.id"
                  class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td class="px-4 py-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="flex h-10 w-10 items-center justify-center rounded-lg"
                        :class="projet.iconBg"
                      >
                        <UIcon :name="projet.icon" class="h-5 w-5 text-white" />
                      </div>
                      <span class="font-medium text-gray-900 dark:text-white">{{ projet.nom }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {{ projet.secteur }}
                  </td>
                  <td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {{ projet.region }}
                  </td>
                  <td class="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                    {{ projet.budget }}
                  </td>
                  <td class="px-4 py-4">
                    <div class="flex items-center gap-2">
                      <div class="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          class="h-full rounded-full transition-all"
                          :class="getProgressColor(projet.avancement)"
                          :style="{ width: projet.avancement + '%' }"
                        ></div>
                      </div>
                      <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {{ projet.avancement }}%
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-4">
                    <UBadge
                      :color="getStatutColor(projet.statut)"
                      variant="subtle"
                      size="sm"
                    >
                      {{ projet.statut }}
                    </UBadge>
                  </td>
                  <td class="px-4 py-4 text-xs text-gray-600 dark:text-gray-400">
                    {{ projet.chronologie }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="mt-4 flex items-center justify-between">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Affichage de {{ filteredProjets.length }} projets sur {{ projets.length }}
            </p>
            <div class="flex gap-2">
              <UButton variant="ghost" size="sm" disabled>Précédent</UButton>
              <UButton variant="ghost" size="sm">Suivant</UButton>
            </div>
          </div>
        </div>

        <!-- Sidebar Stats -->
        <div class="w-full space-y-6 lg:w-80">
          <!-- KPI Cards -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <UIcon name="i-heroicons-document-text" class="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.totalProjets }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">Total Projets</div>
              </div>
            </div>
          </div>

          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <UIcon name="i-heroicons-check-circle" class="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.projetsActifs }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">Projets Actifs</div>
              </div>
            </div>
          </div>

          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <UIcon name="i-heroicons-exclamation-triangle" class="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.projetsEnRetard }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">Projets en Retard</div>
              </div>
            </div>
          </div>

          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <UIcon name="i-heroicons-currency-dollar" class="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.budgetExecute }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">Budget Exécuté</div>
              </div>
            </div>
          </div>

          <!-- Map -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              Répartition par Région
            </h3>
            <div class="relative">
              <svg viewBox="0 0 300 250" class="w-full">
                <!-- Simplified Senegal map -->
                <path
                  d="M 50 100 L 100 80 L 150 90 L 200 70 L 250 80 L 250 150 L 200 170 L 150 180 L 100 160 L 50 150 Z"
                  fill="currentColor"
                  class="text-gray-200 dark:text-gray-700"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <!-- Region markers -->
                <circle cx="120" cy="120" r="25" fill="#3b82f6" opacity="0.3" />
                <text x="120" y="127" text-anchor="middle" class="fill-blue-600 text-xl font-bold dark:fill-blue-400">81</text>
                <text x="120" y="145" text-anchor="middle" class="fill-gray-700 text-xs dark:fill-gray-300">Dakar</text>

                <circle cx="180" cy="110" r="20" fill="#fbbf24" opacity="0.3" />
                <text x="180" y="117" text-anchor="middle" class="fill-yellow-600 text-lg font-bold dark:fill-yellow-400">52</text>
                <text x="180" y="133" text-anchor="middle" class="fill-gray-700 text-xs dark:fill-gray-300">Centre</text>
              </svg>
            </div>
            <div class="mt-4 flex items-center gap-4 text-xs">
              <div class="flex items-center gap-1">
                <div class="h-3 w-3 rounded-full bg-blue-200 dark:bg-blue-800"></div>
                <span class="text-gray-600 dark:text-gray-400">0-20</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="h-3 w-3 rounded-full bg-green-300 dark:bg-green-700"></div>
                <span class="text-gray-600 dark:text-gray-400">20%</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="h-3 w-3 rounded-full bg-yellow-400 dark:bg-yellow-600"></div>
                <span class="text-gray-600 dark:text-gray-400">60%</span>
              </div>
            </div>
          </div>

          <!-- Sector Stats -->
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              Performance par Secteur
            </h3>
            <div class="space-y-4">
              <div>
                <div class="mb-1 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded-full bg-blue-600"></div>
                    <span class="text-sm text-gray-700 dark:text-gray-300">Éducation</span>
                  </div>
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">85%</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div class="h-full rounded-full bg-blue-600" style="width: 85%"></div>
                </div>
              </div>
              <div>
                <div class="mb-1 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded-full bg-cyan-600"></div>
                    <span class="text-sm text-gray-700 dark:text-gray-300">Emploi</span>
                  </div>
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">79%</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div class="h-full rounded-full bg-cyan-600" style="width: 79%"></div>
                </div>
              </div>
              <div>
                <div class="mb-1 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="h-3 w-3 rounded-full bg-teal-600"></div>
                    <span class="text-sm text-gray-700 dark:text-gray-300">Sud</span>
                  </div>
                  <span class="text-sm font-semibold text-gray-900 dark:text-white">43%</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div class="h-full rounded-full bg-teal-600" style="width: 43%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// SEO
useHead({
  title: 'Projets Publics Vision 2050 - Tableau de Bord',
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});

// Filters
const selectedRegion = ref<string | null>(null);
const selectedSecteur = ref<string | null>(null);
const selectedStatut = ref<string | null>(null);
const selectedBudget = ref<string | null>(null);
const searchQuery = ref('');

const regions = ['Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Kaolack', 'Nord', 'Sud', 'Centre'];
const secteurs = ['Logement', 'Infrastructures', 'Santé', 'Numérique', 'Agriculture', 'Énergie', 'Travail', 'Sirtement'];
const statuts = ['Sur la bonne voie', 'En retard', 'Achevé'];
const budgetRanges = ['$0 - $500M', '$500M - $700M', '$700M+'];

// Stats
const stats = {
  totalProjets: 325,
  projetsActifs: 210,
  projetsEnRetard: 48,
  budgetExecute: '$6,8 bl',
};

// Mock Projects Data
const projets = ref([
  {
    id: 1,
    nom: 'Réforme du Logement',
    secteur: 'Logement',
    region: 'Dakar',
    budget: '$650 M',
    avancement: 66,
    statut: 'Sur la bonne voie',
    chronologie: 'Oct 2027',
    icon: 'i-heroicons-home',
    iconBg: 'bg-blue-500',
  },
  {
    id: 2,
    nom: 'Modernisation Routière',
    secteur: 'Infrastructures',
    region: 'Nord',
    budget: '$720 M',
    avancement: 45,
    statut: 'En retard',
    chronologie: 'Jan 204 - May 2028',
    icon: 'i-heroicons-truck',
    iconBg: 'bg-cyan-500',
  },
  {
    id: 3,
    nom: 'Programme Santé 2050',
    secteur: 'Santé',
    region: 'Sud',
    budget: '$580 M',
    avancement: 90,
    statut: 'Achevé',
    chronologie: 'Jun 2022 - Mar 2024',
    icon: 'i-heroicons-heart',
    iconBg: 'bg-green-500',
  },
  {
    id: 4,
    nom: 'Connectivité Numérique',
    secteur: 'Numérique',
    region: 'Centre',
    budget: '$340 M',
    avancement: 65,
    statut: 'Sur la bonne voie',
    chronologie: 'Dec 2026',
    icon: 'i-heroicons-wifi',
    iconBg: 'bg-cyan-600',
  },
  {
    id: 5,
    nom: 'Développement Agricole',
    secteur: 'Agriculture',
    region: 'Nord',
    budget: '$410 M',
    avancement: 35,
    statut: 'En retard',
    chronologie: 'Mar 2025 - Sep 2027',
    icon: 'i-heroicons-globe-alt',
    iconBg: 'bg-green-600',
  },
  {
    id: 6,
    nom: 'Transition Énergétique',
    secteur: 'Énergie',
    region: 'Dakar',
    budget: '$850 M',
    avancement: 60,
    statut: 'Sur la bonne voie',
    chronologie: 'Jul 2030',
    icon: 'i-heroicons-bolt',
    iconBg: 'bg-yellow-500',
  },
  {
    id: 7,
    nom: 'Emploi Jeunesse 2050',
    secteur: 'Travail',
    region: 'Centre',
    budget: '$580 M',
    avancement: 25,
    statut: 'Sur la bonne voie',
    chronologie: 'Jan 2028',
    icon: 'i-heroicons-user-group',
    iconBg: 'bg-cyan-500',
  },
  {
    id: 8,
    nom: 'Emploi Jeunesse 2050',
    secteur: 'Sirtement',
    region: 'Dakar',
    budget: '$590 M',
    avancement: 25,
    statut: 'En retard',
    chronologie: 'Jul 2024 - Jan 2028',
    icon: 'i-heroicons-briefcase',
    iconBg: 'bg-yellow-600',
  },
  {
    id: 9,
    nom: 'Emploi Jeunesse 2050',
    secteur: 'Travail',
    region: 'Centre',
    budget: '$560 M',
    avancement: 25,
    statut: 'En retard',
    chronologie: 'Jul 2024 - Jan 2028',
    icon: 'i-heroicons-academic-cap',
    iconBg: 'bg-cyan-500',
  },
]);

// Filtered projects
const filteredProjets = computed(() => {
  return projets.value.filter((projet) => {
    const matchRegion = !selectedRegion.value || projet.region === selectedRegion.value;
    const matchSecteur = !selectedSecteur.value || projet.secteur === selectedSecteur.value;
    const matchStatut = !selectedStatut.value || projet.statut === selectedStatut.value;
    const matchSearch = !searchQuery.value || projet.nom.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchRegion && matchSecteur && matchStatut && matchSearch;
  });
});

// Helper functions
const getProgressColor = (avancement: number) => {
  if (avancement >= 80) return 'bg-green-600';
  if (avancement >= 50) return 'bg-blue-600';
  if (avancement >= 25) return 'bg-yellow-500';
  return 'bg-orange-500';
};

const getStatutColor = (statut: string) => {
  if (statut === 'Achevé') return 'blue';
  if (statut === 'Sur la bonne voie') return 'green';
  return 'orange';
};
</script>

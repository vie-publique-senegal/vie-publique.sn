<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  budgetData: {
    type: Array,
    required: true,
  },
});

const total = computed(() => props.budgetData.reduce((sum, item) => sum + item.value, 0));

// Part arrondie à l'entier : une décimale (« 20,5 % ») n'apporte rien à la
// lecture d'une répartition et alourdit la colonne. La valeur exacte reste
// dans le montant affiché juste à côté.
const getPercentage = (value, total) => Math.round((value / total) * 100);
</script>

<template>
  <div class="mx-auto space-y-4">
    <div class="mt-2">
      <h2 v-if="title" class="mb-2 p-2 text-center font-bold text-gray-900 dark:text-white">
        {{ title }}
      </h2>

      <div>
        <div
          class="flex items-baseline justify-between gap-2 border-b border-gray-200 px-2 pb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400"
        >
          <span class="flex-1">Type</span>
          <span class="shrink-0">Montant (Md FCFA)</span>
        </div>
        <!-- Items -->
        <div
          v-for="item in budgetData"
          :key="item.label"
          class="border-b border-gray-100 px-2 py-2 text-sm text-gray-900 last:border-b-0 dark:border-gray-700 dark:text-gray-100"
        >
          <div class="flex items-start gap-2">
            <!-- Pourcentage cercle -->
            <span
              class="relative inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl dark:bg-gray-800"
            >
              <span class="text-xs font-medium leading-none text-gray-900 dark:text-gray-300">
                {{ getPercentage(item.value, total) }}%
              </span>
            </span>

            <!-- Contenu principal -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="line-clamp-1 block flex-1 text-sm">{{ item.label }}</span>
                <div class="flex shrink-0 items-center gap-2">
                  <span class="text-sm font-medium">{{ item.value.toLocaleString() }}</span>
                  <BudgetVariationBadge :value="item.variation_percentage" />
                </div>
              </div>

              <!-- Barre de progression -->
              <div class="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  :class="`h-2 rounded-full bg-${color}-500`"
                  :style="{
                    width: `${getPercentage(item.value, total)}%`,
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Total -->
        <div
          :class="`hidden px-2 py-2 text-sm font-semibold text-${color}-800 dark:text-${color}-300`"
        >
          <div class="flex items-center justify-between">
            <span class="pl-1">Total</span>
            <span>{{ total.toLocaleString() }} Mds</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

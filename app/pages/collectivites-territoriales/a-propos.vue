<script setup lang="ts">
const { siteUrl, themeColor } = useSiteMetadata();

const pageTitle = "À propos de l'annuaire des collectivités territoriales";
const pageDescription =
  "L'annuaire des collectivités territoriales du Sénégal : mission, méthodologie et sources.";
const pageUrl = `${siteUrl}/collectivites-territoriales/a-propos`;

useSeoMeta({
  title: pageTitle,
  ogTitle: "À propos de l'annuaire des collectivités",
  description: pageDescription,
  ogDescription: pageDescription,
  ogUrl: pageUrl,
  ogType: 'website',
});

useHead({
  htmlAttrs: { lang: 'fr-SN' },
  link: [{ rel: 'canonical', href: pageUrl }],
  meta: [
    { name: 'robots', content: 'index, follow' },
    { name: 'theme-color', content: themeColor },
  ],
});
</script>

<template>
  <div class="min-h-screen pb-16">
    <AppBreadcrumb
      :items="[
        { label: 'Collectivités territoriales', to: '/collectivites-territoriales' },
        { label: 'À propos' },
      ]"
      class="px-4"
    />

    <div class="mx-auto mt-4 max-w-3xl px-4">
      <div class="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">À propos</div>
      <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
        Le portail de référence des collectivités territoriales
      </h1>
      <p class="mt-4 leading-relaxed text-gray-600 dark:text-gray-400">
        L'annuaire centralise toutes les informations utiles sur chaque commune du Sénégal :
        gouvernance locale, administration municipale, données territoriales, résultats électoraux,
        documents publics, projets, budget et actualités.
      </p>

      <div class="mt-10 grid gap-8 md:grid-cols-2">
        <section>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Mission</h2>
          <p class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Offrir aux citoyens, journalistes, chercheurs, étudiants, administrations, ONG, partis
            politiques, développeurs et institutions publiques un accès simple, structuré et fiable
            aux données des collectivités.
          </p>
        </section>
        <section>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Méthodologie</h2>
          <p class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Les fiches sont construites à partir de sources ouvertes : arrêtés, délibérations, sites
            officiels, rapports de l'ANSD et publications des ministères. Chaque donnée est datée et
            vérifiable.
          </p>
        </section>
        <section>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Fonctionnalités à venir
          </h2>
          <ul class="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>· Comparaison entre communes</li>
            <li>· Classements par indicateurs</li>
            <li>· Historique des mandats et des conseils</li>
            <li>· Cartographie des résultats électoraux</li>
            <li>· Export PDF / CSV, API publique et Open Data</li>
          </ul>
        </section>
        <section>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Écosystème</h2>
          <p class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Ce module fait partie de la plateforme
            <strong class="font-semibold text-gray-800 dark:text-gray-200"
              >Vie Publique Sénégal</strong
            >, aux côtés des modules élections, institutions et données publiques.
          </p>
        </section>
      </div>

      <div
        class="mt-12 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200"
      >
        <strong>Note :</strong> les données actuellement présentées dans ce module sont des données
        de démonstration ; elles seront remplacées par les données officielles avant toute
        communication publique.
      </div>
    </div>
  </div>
</template>

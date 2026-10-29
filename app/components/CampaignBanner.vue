<script setup lang="ts">
/**
 * Bannière de campagne temporaire (page d'accueil).
 * Contenu et durée de vie : `app/config/campaign.config.ts`.
 *
 * PLACEMENT — elle vient APRÈS la recherche et les accès rapides, pas sous le
 * titre d'accueil : collée au « Accès facilité à l'information publique au
 * Sénégal », elle se lisait comme un sous-titre de Vie-Publique, et elle
 * repoussait la recherche, qui est l'action principale de la page.
 *
 * FORME — carte blanche à anneau, le gabarit standard des sections du site
 * (`ui.card` dans `app/app.config.ts`), et non un aplat de couleur : l'affiche
 * de campagne a elle-même un fond quasi blanc, un aplat derrière elle jurait.
 * L'affiche porte déjà le titre, donc le texte à côté ne répète que ce qu'elle
 * ne dit pas : qui organise, la question posée, les freins levés, l'échéance.
 *
 * COULEUR — le bouton porte le rouge de Kaddu, en #e8201b (accent-600 de leur
 * palette). PAS leur #fa3a35 d'origine : en blanc dessus il ne donne que 3,7:1,
 * sous le seuil AA. #e8201b est la nuance la plus proche qui passe (4,51:1), et
 * elle appartient à leur propre échelle, donc on reste dans leur charte. Survol
 * en #c31612 (accent-700), la marche suivante.
 * Le compte à rebours est volontairement NEUTRE : avec un bouton rouge, un « J-3 »
 * rouge juste à côté donnait deux accents qui se disputaient l'attention.
 *
 * Rendu côté serveur de bout en bout. Le visuel est auto-hébergé, en 16/9 comme
 * son cadre (aucun recadrage), avec `width`/`height` : aucun décalage de mise en
 * page. Il est chargé en `eager` + `fetchpriority="high"` À DESSEIN : mesuré, il
 * EST l'élément LCP de l'accueil (ordinateur comme mobile) — un `loading="lazy"`
 * retarderait donc la métrique au lieu de l'aider. À retirer en même temps que la
 * campagne : le LCP repassera sur le contenu habituel.
 */
import { CAMPAIGN_BANNER } from '~/config/campaign.config';

const campaign = CAMPAIGN_BANNER;

const { isFeatureEnabled } = useFeatureFlags();

const endsAtMs = Date.parse(campaign.endsAt);

const isVisible = computed(
  () => campaign.enabled && Date.now() < endsAtMs && isFeatureEnabled(campaign.featureKey),
);

/** « Dernier jour » le jour J, « J-2 » avant : l'urgence est le premier levier. */
const countdown = computed(() => {
  const days = Math.ceil((endsAtMs - Date.now()) / 86_400_000);
  return days <= 1 ? 'Dernier jour' : `J-${days}`;
});

// UTM : Kaddu doit pouvoir attribuer les participations venues de Vie-Publique.
const ctaUrl = `${campaign.url}?utm_source=vie-publique.sn&utm_medium=banner&utm_campaign=${campaign.id}`;

const { trackCampaignClick } = useAnalytics();

const onCtaClick = () => {
  trackCampaignClick(campaign.id);
};
</script>

<template>
  <section
    v-if="isVisible"
    class="overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
    :aria-label="`Consultation citoyenne : ${campaign.title}`"
  >
    <div class="flex flex-col sm:flex-row sm:items-center">
      <!--
        Affiche décorative (`alt=""`) : elle reprend le titre, que le texte porte
        déjà juste à côté. L'annoncer la ferait lire deux fois à un lecteur d'écran.
      -->
      <a
        :href="ctaUrl"
        target="_blank"
        rel="noopener"
        tabindex="-1"
        aria-hidden="true"
        class="block shrink-0 sm:w-[44%] lg:w-[40%]"
        @click="onCtaClick"
      >
        <img
          :src="campaign.image"
          alt=""
          :width="campaign.imageWidth"
          :height="campaign.imageHeight"
          class="aspect-video w-full object-cover"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
      </a>

      <div class="flex min-w-0 flex-1 flex-col gap-3 p-5 sm:p-6">
        <!-- Le logo seul dit où mène le lien : pas besoin d'une phrase pour ça -->
        <img
          :src="campaign.partnerLogoLight"
          :alt="campaign.partnerName"
          width="360"
          height="131"
          class="h-4 w-auto self-start dark:hidden"
          loading="lazy"
          decoding="async"
        />
        <img
          :src="campaign.partnerLogoDark"
          :alt="campaign.partnerName"
          width="360"
          height="131"
          class="hidden h-4 w-auto self-start dark:block"
          loading="lazy"
          decoding="async"
        />

        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">
            {{ campaign.title }}
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {{ campaign.question }}
          </p>
        </div>

        <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <li v-for="item in campaign.reassurances" :key="item" class="flex items-center gap-1.5">
            <UIcon
              name="i-heroicons-check-circle"
              class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            />
            {{ item }}
          </li>
        </ul>

        <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            :href="ctaUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#e8201b] px-5 text-sm font-semibold text-white transition hover:bg-[#c31612] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8201b]"
            @click="onCtaClick"
          >
            {{ campaign.ctaLabel }}
            <span aria-hidden="true">&rarr;</span>
          </a>

          <p class="text-xs text-gray-500 dark:text-gray-400">
            <span class="font-semibold tabular-nums text-gray-700 dark:text-gray-200">
              {{ countdown }}
            </span>
            &middot; {{ campaign.deadlineLabel }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

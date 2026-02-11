<script lang="ts" setup>
const { tweets, loading, error } = useTweets();
const { $dateformatWithDayName } = useNuxtApp();

const getMediaUrl = (tweet: (typeof tweets.value)[number]) => {
  if (!tweet.media?.length) return undefined;
  const media = tweet.media[0];
  return media.url || media.preview_image_url || undefined;
};
</script>

<template>
  <div class="my-4">
    <div class="prose prose-sm mx-auto my-4 sm:prose">
      <h2 class="text-center text-gray-800 dark:text-white">Nos derniers posts X (Twitter)</h2>
    </div>

    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0"
    >
      <div
        v-for="n in 3"
        :key="n"
        class="w-72 flex-shrink-0 animate-pulse rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800 md:w-auto"
      >
        <div class="h-44 rounded-t-2xl bg-gray-200 dark:bg-gray-700"></div>
        <div class="p-5">
          <div class="mb-4 flex items-center gap-3">
            <div class="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div class="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
          <div class="h-4 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
          <div class="mt-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div class="mt-4 h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="py-4 text-center">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Impossible de charger les derniers posts.
      </p>
      <a
        href="https://x.com/ViePubliqueSN"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Voir sur X
        <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" />
      </a>
    </div>

    <!-- Tweets cards -->
    <div v-else>
      <div
        class="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:snap-none"
      >
        <article
          v-for="tweet in tweets"
          :key="tweet.id"
          class="group flex h-full w-72 flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800 md:w-auto"
        >
          <a :href="tweet.url" target="_blank" rel="noopener noreferrer" class="flex h-full flex-col">
            <!-- Media preview -->
            <div class="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-gray-700">
              <img
                v-if="getMediaUrl(tweet)"
                :src="getMediaUrl(tweet)"
                :alt="tweet.text.slice(0, 60)"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div
                v-else
                class="flex h-full items-center justify-center text-sm italic text-gray-400 dark:text-gray-500"
              >
                Pas d'image jointe
              </div>
            </div>

            <!-- Content -->
            <div class="flex flex-grow flex-col p-5">
              <!-- Avatar + name -->
              <div class="mb-4 flex items-center">
                <img
                  src="/favicon.ico"
                  alt="Vie Publique SN"
                  class="h-8 w-8 flex-shrink-0 rounded-full"
                />
                <div class="ml-3">
                  <p class="text-sm font-bold leading-none text-gray-900 dark:text-white">
                    Vie Publique SN
                  </p>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400">@ViePubliqueSN</p>
                </div>
              </div>

              <!-- Tweet text -->
              <p class="mb-4 line-clamp-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {{ tweet.text }}
              </p>

              <!-- Date -->
              <div
                v-if="tweet.created_at"
                class="mt-auto text-[11px] font-medium uppercase tracking-tight text-gray-400 dark:text-gray-500"
              >
                {{ $dateformatWithDayName(tweet.created_at) }}
              </div>
            </div>
          </a>
        </article>
      </div>

      <!-- Link to profile -->
      <div class="mt-8 text-center">
        <a
          href="https://x.com/ViePubliqueSN"
          target="_blank"
          rel="noopener noreferrer"
          class="group inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 transition-all duration-200 hover:bg-gray-50 hover:shadow-md hover:ring-gray-400 dark:bg-gray-800 dark:text-white dark:ring-gray-700 dark:hover:bg-gray-700 dark:hover:ring-gray-600"
        >
          Suivre sur X (Twitter)
          <UIcon
            name="i-heroicons-arrow-top-right-on-square"
            class="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
          />
        </a>
      </div>
    </div>
  </div>
</template>

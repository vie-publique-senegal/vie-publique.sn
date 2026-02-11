import type { Tweet } from '~~/types/tweet';

export const useTweets = () => {
  const {
    data: tweetsData,
    status,
    error,
  } = useAsyncData('latest-tweets', () => $fetch<{ data: Tweet[] }>('/api/social/tweets'));

  const tweets = computed(() => tweetsData.value?.data || []);
  const loading = computed(() => status.value === 'pending');

  return {
    tweets,
    loading,
    error,
  };
};

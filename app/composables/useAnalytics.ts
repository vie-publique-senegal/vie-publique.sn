// composables/useAnalytics.ts
export const useAnalytics = () => {
  // Dans le composable, pas au niveau module : `useGtag` lit `useRuntimeConfig`,
  // qui exige le contexte Nuxt. Appelé à l'import du module, il lève en SSR
  // (500 sur toute page qui importe ce composable, ex. /liens).
  const { gtag } = useGtag();

  const trackQuizStart = () => {
    gtag("event", "start_quiz", {
      event_category: "Quiz",
      event_label: "Quiz Started",
    });
  };

  const trackQuizFinish = () => {
    gtag("event", "finish_quiz", {
      event_category: "Quiz",
      event_label: "Quiz Finished",
    });
  };

  return {
    trackQuizStart,
    trackQuizFinish,
  };
};

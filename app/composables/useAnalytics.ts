// composables/useAnalytics.ts
const { gtag } = useGtag();

export const useAnalytics = () => {
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

  // Page /liens (remplaçante du Linktree) : un clic par lien, internes compris
  // (GA4 ne mesure d'office que les clics sortants).
  const trackLinkClick = (linkId: string | number, section: string) => {
    gtag("event", "liens_click", {
      link_id: String(linkId),
      link_section: section,
    });
  };

  return {
    trackQuizStart,
    trackQuizFinish,
    trackLinkClick,
  };
};

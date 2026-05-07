import type { RouterConfig } from '@nuxt/schema';

export default <RouterConfig>{
  routes: (routes) => {
    const candidateProfileRoute = {
      name: 'elections-dashboard-candidate-profile',
      path: '/elections-senegal/dashboard/:type/:year/candidats/:slug',
      component: () => import('~/pages/elections-senegal/dashboard/[type]/[year]/candidats/[slug].vue'),
    };

    return [candidateProfileRoute, ...routes];
  },
};

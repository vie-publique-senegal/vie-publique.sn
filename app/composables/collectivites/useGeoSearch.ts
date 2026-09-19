import { normalizeGeoName } from '#shared/geo-name';

/**
 * Recherche texte d'une page du module, miroitée dans `?q=`.
 *
 * Deux règles y sont réunies une bonne fois, parce qu'elles étaient recopiées :
 *
 * 1. **État lu de `route.query` DE FAÇON SYNCHRONE** (règle « listes filtrées &
 *    SSR » du CLAUDE.md) : le rendu serveur d'un `?q=…` partagé doit déjà être
 *    filtré. Un `onMounted` ne s'exécute pas au SSR — la page rendrait la liste
 *    entière, puis « sauterait » après hydratation.
 * 2. **Comparaison via `normalizeGeoName`**, pas un repli d'accents maison : il
 *    replie AUSSI tirets et espaces multiples des deux côtés. Sans lui,
 *    « Ousmane SARR » ne trouvait pas « Ousmane  SARR » (double espace en base)
 *    et « joal-fadhiouth » ne trouvait pas « Joal-Fadhiouth ».
 *
 * `router.replace` (et non `push`) : filtrer n'est pas naviguer, le bouton
 * Retour doit ramener à la page précédente, pas dérouler chaque frappe.
 */
export function useGeoSearch() {
  const route = useRoute();
  const router = useRouter();

  const q = ref((route.query.q as string) || '');

  /** Terme normalisé, prêt à être comparé — vide si la recherche est inactive. */
  const query = computed(() => normalizeGeoName(q.value.trim()));

  watch(q, () => {
    router.replace({ query: { ...(q.value && { q: q.value }) } });
  });

  /**
   * À appliquer au texte cherché DANS les données, pour que les deux côtés de la
   * comparaison soient repliés de la même façon.
   */
  const normalize = (value: string) => normalizeGeoName(value);

  /** Vrai dès qu'un terme est saisi : les vues filtrées sont `noindex`. */
  const isSearching = computed(() => Boolean(q.value));

  return { q, query, normalize, isSearching };
}

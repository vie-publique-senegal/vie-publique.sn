export const useSearchEnhanced = () => {
  const route = useRoute();
  const router = useRouter();

  // États de recherche
  const searchQuery = ref((route.query.q as string) || "");
  const searchResults = ref([]);
  const totalResults = ref(0);
  const totalIndexed = ref(0);
  const loading = ref(false);
  const currentPage = ref(parseInt(route.query.page as string) || 1);
  const hasSearched = ref(false);
  const selectedTypes = ref<string[]>(
    (route.query.types as string)?.split(",").filter(Boolean) || [],
  );
  const itemsPerPage = 10;
  
  // Compteurs par type (tous les types supportés)
  const resultCountsByType = ref<Record<string, number>>({
    document: 0,
    actualite: 0,
    depute: 0,
    question: 0,
    vote: 0,
    commission: 0,
    groupe: 0,
    budget_entity: 0,
    budget_term: 0,
    coalition: 0,
    nomination: 0,
    media: 0,
  });

  // Fonction pour mettre en surbrillance les termes recherchés
  const highlightText = (text: string, query: string) => {
    if (!text || !query) return text;

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    return text.replace(
      regex,
      '<mark class="bg-yellow-200 px-1 rounded">$1</mark>',
    );
  };

  // Fonction pour formater l'URL des résultats (identique à la page recherche.vue)
  const formatResultUrl = (result: any) => {
    return result.formattedUrl || "/actualites";
  };

  // Synchroniser avec l'URL
  const syncWithUrl = () => {
    const query: any = {};

    if (searchQuery.value) {
      query.q = searchQuery.value;
    }

    if (currentPage.value > 1) {
      query.page = currentPage.value.toString();
    }

    if (selectedTypes.value.length > 0) {
      query.types = selectedTypes.value.join(",");
    }

    router.push({ query });
  };

  // Fonction de recherche améliorée
  const performSearch = async () => {
    if (!searchQuery.value.trim() && selectedTypes.value.length === 0) {
      searchResults.value = [];
      totalResults.value = 0;
      hasSearched.value = false;
      return;
    }

    loading.value = true;
    hasSearched.value = true;

    // Synchroniser avec l'URL
    syncWithUrl();

    try {
      const searchParams: Record<string, string | number> = {
        q: searchQuery.value,
        page: currentPage.value,
        limit: itemsPerPage,
      };

      if (selectedTypes.value.length > 0) {
        searchParams.types = selectedTypes.value.join(",");
      }

      const data = await $fetch("/api/search", {
        query: searchParams,
      });

      if (data) {
        // Traiter les résultats avec highlighting (en gardant les données originales)
        searchResults.value = (data.data || []).map((result: any) => ({
          ...result,
          highlightedTitle: result.highlights?.title?.[0]?.snippet
            ? result.highlights.title[0].snippet
            : highlightText(result.document?.title || "", searchQuery.value),
          highlightedContent: result.highlights?.content_text?.[0]?.snippet
            ? result.highlights.content_text[0].snippet
            : highlightText(
                result.document?.content_text?.substring(0, 300) || "",
                searchQuery.value,
              ),
        }));

        totalResults.value = data.total || 0;
        totalIndexed.value = data.totalIndexed || data.total || 0;

        // Utiliser les comptages par type depuis les facets Typesense
        // Note: Typesense utilise "news", l'UI utilise "actualite"
        const counts = (data as any).typeCounts || {};
        resultCountsByType.value = {
          document: counts.document || 0,
          actualite: counts.news || 0,
          depute: counts.depute || 0,
          question: counts.question || 0,
          vote: counts.vote || 0,
          commission: counts.commission || 0,
          groupe: counts.groupe || 0,
          budget_entity: counts.budget_entity || 0,
          budget_term: counts.budget_term || 0,
          coalition: counts.coalition || 0,
          nomination: counts.nomination || 0,
          media: counts.media || 0,
        };
      }
    } catch (error) {
      searchResults.value = [];
      totalResults.value = 0;
    } finally {
      loading.value = false;
    }
  };

  // Recherche avec debounce pour temps réel
  const debouncedSearch = useDebounceFn(() => {
    currentPage.value = 1;
    performSearch();
  }, 300);

  // Observer les changements de la requête de recherche
  watch(searchQuery, () => {
    debouncedSearch();
  });

  // Observer les changements de filtres
  watch(
    selectedTypes,
    (newTypes, oldTypes) => {
      currentPage.value = 1;
      performSearch();
    },
    { deep: true },
  );

  // Observer les changements de page
  watch(currentPage, () => {
    if (hasSearched.value) {
      performSearch();
    }
  });

  // Calcul du nombre total de pages
  const totalPages = computed(() => {
    return Math.ceil(totalResults.value / itemsPerPage);
  });

  // Fonction pour obtenir la couleur du badge selon le type
  const getTypeBadgeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      document: "bg-orange-100 text-orange-800 border-orange-200",
      actualite: "bg-blue-100 text-blue-800 border-blue-200",
      actualités: "bg-blue-100 text-blue-800 border-blue-200",
      news: "bg-blue-100 text-blue-800 border-blue-200",
      depute: "bg-green-100 text-green-800 border-green-200",
      question: "bg-purple-100 text-purple-800 border-purple-200",
      vote: "bg-red-100 text-red-800 border-red-200",
      commission: "bg-teal-100 text-teal-800 border-teal-200",
      groupe: "bg-indigo-100 text-indigo-800 border-indigo-200",
      budget_entity: "bg-yellow-100 text-yellow-800 border-yellow-200",
      budget_term: "bg-amber-100 text-amber-800 border-amber-200",
      coalition: "bg-pink-100 text-pink-800 border-pink-200",
      nomination: "bg-cyan-100 text-cyan-800 border-cyan-200",
      media: "bg-rose-100 text-rose-800 border-rose-200",
      default: "bg-gray-100 text-gray-800 border-gray-200",
    };

    return typeColors[type?.toLowerCase()] || typeColors.default;
  };

  // Fonction pour basculer un type dans les filtres
  const toggleType = (type: string) => {
    const index = selectedTypes.value.indexOf(type);
    if (index > -1) {
      selectedTypes.value.splice(index, 1);
    } else {
      selectedTypes.value.push(type);
    }
  };

  // Initialisation au montage
  onMounted(() => {
    // Si il y a déjà une requête dans l'URL, lancer la recherche
    if (searchQuery.value || selectedTypes.value.length > 0) {
      performSearch();
    }
  });

  return {
    searchQuery,
    searchResults,
    totalResults,
    totalIndexed,
    loading,
    currentPage,
    hasSearched,
    selectedTypes,
    performSearch,
    debouncedSearch,
    totalPages,
    itemsPerPage,
    getTypeBadgeColor,
    toggleType,
    highlightText,
    resultCountsByType,
  };
};

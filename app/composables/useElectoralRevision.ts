/**
 * Source unique de résolution de la révision de carte électorale consultée,
 * réutilisée par toutes les pages carte-electorale (hub, nationale, diaspora,
 * résumé, pages détail département/pays).
 *
 * Contexte lu depuis les query params de la route :
 * - `?revision=<clé>` : canonique, utilisé par les pages du hub carte-electorale ;
 * - `?election=<id>` : compat, utilisé par les liens venant du dashboard d'un
 *   scrutin (`/elections-senegal/[slug]/carte`, qui n'a pas de notion de révision).
 * Sans paramètre : la révision publiée la plus récente.
 */

export interface RevisionDocumentRef {
  id: number;
  slug: string | null;
  title: string | null;
}

export interface RevisionFileRef {
  id: number;
  document: RevisionDocumentRef | null;
}

export interface RevisionElectionRef {
  id: number;
  name: string;
  type: string;
  year: number;
  slug: string | null;
}

export interface ElectoralRevision {
  key: string;
  year: number | null;
  revision_type: string | null;
  period_start: string | null;
  period_end: string | null;
  national: RevisionFileRef | null;
  diaspora: RevisionFileRef | null;
  elections: RevisionElectionRef[];
}

export const revisionKeyOf = (revision: ElectoralRevision) => revision.key;

const ELECTION_TYPE_LABELS: Record<string, string> = {
  presidential: 'Présidentielle',
  legislative: 'Législatives',
  locale: 'Locales',
};

export const electionTypeLabel = (type: string) => ELECTION_TYPE_LABELS[type] || type;

/** Arrêtés officiels (documents) d'une révision, en liens internes vers leur page documents. */
export const officialDocumentsOf = (revision: ElectoralRevision) => {
  const docs: { label: string; to: string }[] = [];
  const { national, diaspora } = revision;
  if (national?.document?.id && national.document.slug) {
    docs.push({
      label: 'Arrêté - carte électorale nationale',
      to: `/documents/${national.document.id}/${national.document.slug}`,
    });
  }
  if (diaspora?.document?.id && diaspora.document.slug) {
    docs.push({
      label: 'Arrêté - carte électorale de la diaspora',
      to: `/documents/${diaspora.document.id}/${diaspora.document.slug}`,
    });
  }
  return docs;
};

interface UseElectoralRevisionOptions {
  /** Si vrai, l'URL de la page est réécrite en `?revision=<clé>` une fois résolue
   * (pages du hub carte-electorale) ; les pages détail laissent le contexte tel quel. */
  syncUrl?: boolean;
}

export const useElectoralRevision = (options: UseElectoralRevisionOptions = {}) => {
  const route = useRoute();
  const router = useRouter();

  const { data: filesData, pending } = useFetch<{ revisions: ElectoralRevision[] }>(
    '/api/elections/electoral-files',
    { key: 'electoral-files-revisions', default: () => ({ revisions: [] }) },
  );

  const revisions = computed(() => filesData.value?.revisions || []);

  const revisionParam = computed(() => route.query.revision as string | undefined);
  const electionIdParam = computed(() => route.query.election as string | undefined);
  // Compat anciens liens (ex. landing page) : ?type=&year= résout l'élection correspondante
  const legacyTypeParam = computed(() => route.query.type as string | undefined);
  const legacyYearParam = computed(() => route.query.year as string | undefined);

  const currentRevision = computed<ElectoralRevision | null>(() => {
    const all = revisions.value;
    if (!all.length) return null;

    if (revisionParam.value) {
      const match = all.find(
        (r) => revisionKeyOf(r) === revisionParam.value || String(r.year) === revisionParam.value,
      );
      if (match) return match;
    }
    if (electionIdParam.value) {
      const match = all.find((r) =>
        r.elections.some((e) => String(e.id) === electionIdParam.value),
      );
      if (match) return match;
    }
    if (legacyTypeParam.value && legacyYearParam.value) {
      const match = all.find((r) =>
        r.elections.some(
          (e) => e.type === legacyTypeParam.value && String(e.year) === legacyYearParam.value,
        ),
      );
      if (match) return match;
    }
    return all[0];
  });

  const currentRevisionKey = computed(() =>
    currentRevision.value ? revisionKeyOf(currentRevision.value) : null,
  );

  const revisionOptions = computed(() =>
    revisions.value.map((r) => ({
      label: `Carte électorale ${r.year ?? ''}`.trim(),
      value: revisionKeyOf(r),
    })),
  );

  /** Révision par défaut = la plus récente ; l'URL sans paramètre lui correspond. */
  const defaultRevisionKey = computed(() =>
    revisions.value.length ? revisionKeyOf(revisions.value[0]) : null,
  );

  /** Navigue vers une autre révision, sur la page courante. */
  const setRevision = (key: string) => {
    if (key === currentRevisionKey.value) return;
    router.push({
      path: route.path,
      query: key === defaultRevisionKey.value ? {} : { revision: key },
    });
  };

  if (options.syncUrl) {
    // URL SEO friendly : le chemin nu est canonique pour la révision par défaut ;
    // `?revision=<slug>` n'apparaît que pour une révision plus ancienne. Les autres
    // paramètres (dont `election`, contexte de retour dashboard) sont laissés tels quels.
    watch(
      currentRevision,
      (rev) => {
        if (!rev) return;
        const key = revisionKeyOf(rev);
        const isDefault = key === defaultRevisionKey.value;
        const query = { ...route.query };
        let changed = false;
        if (isDefault) {
          if ('revision' in query) {
            delete query.revision;
            changed = true;
          }
        } else if (query.revision !== key) {
          query.revision = key;
          changed = true;
        }
        if (changed) {
          router.replace({ path: route.path, query });
        }
      },
      { immediate: true },
    );
  }

  /** Libellé de contexte, ex. « Carte électorale 2024 » */
  const revisionLabel = computed(() =>
    currentRevision.value?.year ? `Carte électorale ${currentRevision.value.year}` : null,
  );

  /** Nom de l'élection quand la navigation vient d'un contexte d'élection (dashboard) */
  const electionName = computed(() => {
    if (!electionIdParam.value || !currentRevision.value) return null;
    const election = currentRevision.value.elections.find(
      (e) => String(e.id) === electionIdParam.value,
    );
    return election?.name || null;
  });

  const nationalFileId = computed(() => currentRevision.value?.national?.id ?? null);
  const diasporaFileId = computed(() => currentRevision.value?.diaspora?.id ?? null);

  /** Query de contexte à propager sur les liens internes de la carte électorale
   * (vide pour la révision par défaut : les chemins nus restent canoniques). */
  const contextQuery = computed(() => {
    const query: Record<string, string> = {};
    if (currentRevisionKey.value && currentRevisionKey.value !== defaultRevisionKey.value) {
      query.revision = currentRevisionKey.value;
    }
    if (electionIdParam.value) query.election = electionIdParam.value;
    return query;
  });

  /** Élections rattachées à la révision, avec libellé et lien vers leur dashboard */
  const elections = computed(() =>
    (currentRevision.value?.elections || []).map((e) => ({
      ...e,
      label: `${electionTypeLabel(e.type)} ${e.year}`,
      dashboardUrl: e.slug ? `/elections-senegal/${e.slug}` : null,
    })),
  );

  /**
   * URL de retour, tenant compte du contexte de navigation :
   * - venu du dashboard d'une élection (`?election=`) → son onglet carte ;
   * - sinon → la sous-page carte-electorale d'origine.
   */
  const backTo = (fallbackPath: string) => {
    if (electionIdParam.value && currentRevision.value) {
      const election = currentRevision.value.elections.find(
        (e) => String(e.id) === electionIdParam.value,
      );
      if (election?.slug) {
        return { path: `/elections-senegal/${election.slug}/carte` };
      }
    }
    return { path: fallbackPath, query: contextQuery.value };
  };

  return {
    revisions,
    currentRevision,
    currentRevisionKey,
    revisionOptions,
    setRevision,
    revisionLabel,
    electionName,
    electionIdParam,
    nationalFileId,
    diasporaFileId,
    contextQuery,
    elections,
    backTo,
    pending,
  };
};

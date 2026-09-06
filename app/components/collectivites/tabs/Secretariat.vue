<!--
  Onglet « Secrétariat municipal ». Rendu seulement si le mandat existe
  (cf. communeTabs) : le secrétaire municipal est l'agent administratif de la
  mairie, distinct de l'élu.
-->
<template>
  <CollectivitesResponsableProfile
    :responsable="commune.secretaireMunicipal!"
    role="Secrétaire municipal"
    :commune="commune"
    :intro="`${commune.secretaireMunicipal!.nom} assure le secrétariat municipal de ${commune.type === 'Ville' ? 'la ville' : 'la commune'} de ${commune.nom}. Le secrétaire municipal dirige les services administratifs de la mairie et prépare les actes du conseil municipal.`"
  />
</template>

<script setup lang="ts">
import type { CommuneGeo } from '~~/types/collectivite';

interface Props {
  commune: CommuneGeo;
}

defineProps<Props>();
</script>

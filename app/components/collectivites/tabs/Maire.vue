<!--
  Onglet « Le maire ». N'est rendu que si `commune.maire` existe (cf. communeTabs),
  donc pas d'état vide ici. Volontairement sobre : le référentiel ne porte que
  l'identité et le mandat ; le parcours détaillé vit sur la fiche personne.
-->
<template>
  <CollectivitesResponsableProfile
    :responsable="commune.maire!"
    role="Maire"
    :commune="commune"
    :intro="`${commune.maire!.nom} exerce le mandat de maire de ${commune.type === 'Ville' ? 'la ville' : 'la commune'} de ${commune.nom}, dans le département de ${commune.departement} (région de ${commune.region}).`"
  />
</template>

<script setup lang="ts">
import type { CommuneGeo } from '~~/types/collectivite';

interface Props {
  commune: CommuneGeo;
}

defineProps<Props>();
</script>

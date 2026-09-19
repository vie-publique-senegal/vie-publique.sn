<!--
  Onglet « Contacts » : contact INSTITUTIONNEL de la mairie, porté par
  `geo_entities` (champs `contact_*` + repeater `social_networks`). Rendu
  seulement si au moins un canal existe (cf. communeTabs). Les coordonnées
  personnelles des élus, elles, ne sont jamais publiées ici.
-->
<template>
  <div class="grid gap-6 md:grid-cols-2">
    <div class="rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Mairie de {{ commune.nom }}
      </h2>

      <CollectivitesInfoRow v-if="contact.adresse" label="Adresse" :value="contact.adresse" />

      <CollectivitesInfoRow v-if="contact.telephone" label="Téléphone">
        <a
          :href="`tel:${contact.telephone.replace(/\s/g, '')}`"
          class="text-primary-600 dark:text-primary-400 hover:underline"
        >
          {{ contact.telephone }}
        </a>
      </CollectivitesInfoRow>

      <CollectivitesInfoRow v-if="contact.email" label="E-mail">
        <a
          :href="`mailto:${contact.email}`"
          class="text-primary-600 dark:text-primary-400 hover:underline"
        >
          {{ contact.email }}
        </a>
      </CollectivitesInfoRow>

      <CollectivitesInfoRow v-if="contact.siteWeb" label="Site internet">
        <a
          :href="contact.siteWeb"
          target="_blank"
          rel="noreferrer"
          class="text-primary-600 dark:text-primary-400 hover:underline"
        >
          {{ contact.siteWeb }}
        </a>
      </CollectivitesInfoRow>

      <CollectivitesInfoRow v-if="contact.reseauxSociaux.length" label="Réseaux sociaux">
        <ul class="flex flex-wrap gap-x-4 gap-y-1">
          <li v-for="reseau in contact.reseauxSociaux" :key="reseau.plateforme + reseau.url">
            <a
              :href="reseau.url"
              target="_blank"
              rel="noreferrer"
              class="text-primary-600 dark:text-primary-400 inline-flex items-center gap-1.5 hover:underline"
            >
              <UIcon v-if="plateformeIcon(reseau.plateforme)" :name="plateformeIcon(reseau.plateforme)!" class="size-4" />
              {{ plateformeLabel(reseau.plateforme) }}
            </a>
          </li>
        </ul>
      </CollectivitesInfoRow>
    </div>

    <div class="rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Rattachement</h2>
      <CollectivitesInfoRow label="Statut" :value="commune.type" />
      <CollectivitesInfoRow label="Département" :value="commune.departement" />
      <CollectivitesInfoRow label="Région" :value="commune.region" />
      <CollectivitesInfoRow
        v-if="commune.arrondissement"
        label="Arrondissement"
        :value="commune.arrondissement"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommuneGeo } from '~~/types/collectivite';

interface Props {
  commune: CommuneGeo;
}

const props = defineProps<Props>();

const contact = computed(() => props.commune.contact!);

// Plateformes du repeater `geo_entities.social_networks`. Une plateforme hors
// de cette table (valeur ajoutée au menu Directus avant d'être câblée ici)
// s'affiche quand même : son identifiant capitalisé, sans icône — jamais masquée.
const PLATEFORMES: Record<string, { label: string; icon: string }> = {
  facebook: { label: 'Facebook', icon: 'i-simple-icons-facebook' },
  twitter: { label: 'Twitter / X', icon: 'i-simple-icons-x' },
  linkedin: { label: 'LinkedIn', icon: 'i-simple-icons-linkedin' },
  tiktok: { label: 'TikTok', icon: 'i-simple-icons-tiktok' },
  youtube: { label: 'YouTube', icon: 'i-simple-icons-youtube' },
  instagram: { label: 'Instagram', icon: 'i-simple-icons-instagram' },
};

const plateformeLabel = (plateforme: string) =>
  PLATEFORMES[plateforme]?.label ?? plateforme.charAt(0).toUpperCase() + plateforme.slice(1);

const plateformeIcon = (plateforme: string) => PLATEFORMES[plateforme]?.icon ?? null;
</script>

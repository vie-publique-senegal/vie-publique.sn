import type { CommuneResponsable } from '~~/types/collectivite';

/**
 * Lien vers la fiche d'un responsable (maire, secrétaire municipal).
 *
 * La fiche personne vit sur `/personnalites/<id>/<slug>` : l'**id est
 * obligatoire**, le slug seul ne résout rien. Sans slug au référentiel, on
 * renvoie `null` — l'appelant affiche alors le nom sans lien, jamais un lien
 * cassé.
 *
 * Règle unique parce qu'elle sert partout où un nom de maire s'affiche (cartes
 * de l'annuaire, tableaux, fiche) : une seule définition à corriger si l'URL des
 * personnalités change.
 */
export const getResponsableLien = (
  responsable: CommuneResponsable | null | undefined,
): string | null =>
  responsable?.slug ? `/personnalites/${responsable.id}/${responsable.slug}` : null;

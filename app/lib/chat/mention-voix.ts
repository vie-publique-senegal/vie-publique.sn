/**
 * Mention sur la transmission de l'audio, affichée UNE FOIS avant le premier
 * enregistrement. Partagée par la saisie du chat classique et par l'interface
 * vocale : c'est un point de gouvernance, il ne doit exister qu'en un seul
 * exemplaire.
 *
 * Point de gouvernance, pas de confort : la reconnaissance vocale n'est pas
 * locale, l'audio part chez un tiers. Sur un service public, l'utilisateur doit
 * le savoir avant de parler, pas après.
 *
 * ⚠️ **Le destinataire dépend de la plateforme, pas seulement du navigateur.**
 * Mesuré le 2026-08-04 sur iPhone : Chrome iOS affiche « les données vocales
 * seront envoyées à **Apple** » — c'est le service système, pas Google. Nommer
 * un seul fournisseur rendrait la mention FAUSSE pour une partie des visiteurs,
 * ce qui est pire que de ne rien dire sur un site de service public. D'où une
 * formulation qui couvre les trois cas sans en garantir un.
 *
 * ⚠️ **Depuis le moteur serveur (2026-09-04), il y a DEUX chemins et donc deux
 * mentions.** Celle du navigateur reste vraie mot pour mot ; elle devient fausse
 * dès que la dictée passe par notre API, puisque l'audio transite alors bien par
 * nos serveurs. Une phrase unique qui couvrirait les deux cas serait vague là où
 * la précédente était précise. Clé de consentement en `v2` : ceux qui ont
 * accepté l'ancienne formulation n'ont pas accepté celle-ci.
 */
export const CLE_MENTION_VOIX = 'vp-chat-voix-mention-v2';

/**
 * `envoiDirect` : l'interface vocale envoie la transcription sans passer par le
 * champ de saisie — seul l'endroit où le texte reste change, pas le traitement
 * des données, d'où la même clé de consentement.
 */
export function texteMentionVoix(parNosServeurs: boolean, envoiDirect = false): string {
  const ouResteLeTexte = envoiDirect
    ? 'affiché dans la conversation, où vous pouvez le corriger'
    : 'dans le champ de saisie, où vous pouvez le corriger';
  return parNosServeurs
    ? `Votre voix est enregistrée puis transmise à notre service, qui la fait transcrire par un prestataire. L’enregistrement n’est pas conservé : seul le texte transcrit reste, ${ouResteLeTexte}. Vous pouvez taper votre question à la place.`
    : 'Votre voix est transmise au service de reconnaissance vocale de votre navigateur ou de votre appareil — Apple, Google ou Microsoft selon le cas — afin d’être transcrite. Elle ne transite pas par nos serveurs, et n’est pas conservée par Vie Publique. Vous pouvez taper votre question à la place.';
}

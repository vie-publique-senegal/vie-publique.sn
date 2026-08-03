import DOMPurify from 'dompurify';
import { Marked } from 'marked';

/**
 * Rendu markdown des réponses de chat.
 *
 * Deux garde-fous par rapport à l'ancien `ChatBot.vue` :
 *
 * 1. **Assainissement.** Le HTML produit est passé à DOMPurify avant `v-html`.
 *    Le texte vient d'un modèle qui restitue le contenu de documents tiers :
 *    l'injecter brut en fait un vecteur de XSS.
 * 2. **Instance locale.** `marked.setOptions()` mutait des options GLOBALES à
 *    chaque message ; une instance `Marked` dédiée n'affecte personne d'autre.
 */

const ICONE_LIEN_EXTERNE =
  '<svg xmlns="http://www.w3.org/2000/svg" class="ml-1 inline h-3.5 w-3.5 align-baseline" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 3h7m0 0v7m0-7L10 14m-7 7h7a2 2 0 002-2v-7" /></svg>';

const CLASSES_LIEN =
  'underline underline-offset-2 text-sky-700 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300';

const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    link({ href, text }) {
      return `<a href="${href}" class="${CLASSES_LIEN}" target="_blank" rel="noopener noreferrer">${text}${ICONE_LIEN_EXTERNE}</a>`;
    },
  },
});

const echapper = (texte: string) =>
  texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

export function renderChatMarkdown(texte: string): string {
  if (!texte) return '';

  // Aucun message n'existe au rendu serveur (la conversation naît d'un clic) ;
  // ce repli couvre le cas improbable et évite d'appeler DOMPurify sans DOM.
  if (import.meta.server) return echapper(texte);

  // Syntaxe maison héritée du chat Azure : [[libellé]](url).
  const prepare = texte.replace(/\[\[(.*?)\]\]\((.*?)\)/g, '[$1]($2)');

  return DOMPurify.sanitize(md.parse(prepare, { async: false }) as string, {
    ADD_ATTR: ['target', 'rel'],
  });
}

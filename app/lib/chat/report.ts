import type { ChatSource, ChatVariant } from '~~/types/chat';

/**
 * Construction du retour de testeur, prêt à coller (courriel, ticket, message).
 *
 * C'est la raison d'être du banc : sans contexte, un retour se réduit à « ça
 * hallucine » et n'est remontable à rien. On y met donc l'URL — qui identifie la
 * stack — et l'identifiant de conversation, clé de jointure avec les traces côté
 * backend. Quand une variante n'en fournit pas, on écrit son absence plutôt que
 * de laisser un blanc que le lecteur interpréterait comme un oubli.
 *
 * Fonction PURE (horloge et URL injectées) pour être testable.
 */

export interface ContexteRetour {
  variant: Pick<ChatVariant, 'id' | 'label'>;
  url: string;
  conversationId?: string | null;
  question?: string;
  reponse: string;
  sources?: ChatSource[];
  meta?: Record<string, unknown>;
  erreur?: { code: string; message: string };
  date: Date;
}

export function construireRetour(contexte: ContexteRetour): string {
  const lignes = [
    `Variante : ${contexte.variant.id} (${contexte.variant.label})`,
    `URL : ${contexte.url}`,
    `Conversation : ${contexte.conversationId || 'aucun identifiant fourni par cette variante'}`,
    `Date : ${contexte.date.toISOString()}`,
    '',
    `Question : ${contexte.question || '(inconnue)'}`,
    '',
    'Réponse :',
    contexte.reponse || '(aucune réponse)',
  ];

  if (contexte.erreur) {
    lignes.push('', `Erreur : ${contexte.erreur.code} — ${contexte.erreur.message}`);
  }

  if (contexte.sources?.length) {
    lignes.push('', 'Sources citées :');
    for (const source of contexte.sources) {
      const page = source.page ? ` (p. ${source.page})` : '';
      const lien = source.pageUrl ?? source.fileUrl ?? '';
      lignes.push(`- ${source.title}${page}${lien ? ` ${lien}` : ''}`);
    }
  }

  const meta = Object.entries(contexte.meta ?? {});
  if (meta.length) {
    lignes.push('', `Détails techniques : ${meta.map(([cle, v]) => `${cle}=${v}`).join(', ')}`);
  }

  return lignes.join('\n');
}

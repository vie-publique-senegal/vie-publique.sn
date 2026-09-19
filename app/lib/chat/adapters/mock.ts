import type { ChatAdapterFactory, ChatEvent } from '~~/types/chat';

/**
 * Adaptateur factice : débite du faux texte, sans aucun backend.
 *
 * Il existe pour valider la coquille AVANT qu'un POC ne s'y branche — un bug de
 * l'adaptateur Gemini ne peut donc pas être un bug de la coquille. Il sert aussi
 * de banc d'essai aux états d'erreur, difficiles à provoquer sur un vrai backend :
 *
 * - une question contenant « erreur »  → événement `error` en cours de flux ;
 * - une question contenant « quota »   → `rate_limited` avec un délai d'attente ;
 * - une question contenant « coupure » → flux clos sans événement terminal
 *   (la coquille doit le traiter comme un échec, pas comme un succès) ;
 * - une question contenant « reset »   → `conversationReset` dans le `done`.
 */

const REPONSE_FACTICE = `**Réponse factice** — aucun backend n'est branché sur cette variante.

Ce texte est débité par l'adaptateur de test pour vérifier la coquille : l'affichage au fil de l'eau, le rendu markdown, les documents cités, le bouton d'arrêt et le pied de conversation.

Quelques points de contrôle :

1. le texte s'affiche **avant** l'arrivée des sources ;
2. les liens sont cliquables et s'ouvrent dans un nouvel onglet ;
3. l'identifiant de conversation apparaît en pied de page, copiable en un clic.`;

const SOURCES_FACTICES = [
  {
    externalId: '13939',
    title: 'Document factice — adaptateur de test',
    pageUrl: 'https://www.vie-publique.sn/documents',
    publishDate: '2026-01-01',
    page: 1,
    excerpt: "Extrait factice destiné à vérifier l'affichage des documents cités.",
  },
];

const attendre = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      { once: true },
    );
  });

export const createMockAdapter: ChatAdapterFactory = () => ({
  id: 'mock',

  async *send(question, ctx): AsyncIterable<ChatEvent> {
    const demande = question.toLowerCase();
    await attendre(400, ctx.signal);

    // Découpage grossier en « tokens » : l'objectif est de voir le texte
    // arriver par morceaux, pas d'imiter un tokenizer.
    const morceaux = REPONSE_FACTICE.match(/\S+\s*/g) ?? [];

    for (const [index, morceau] of morceaux.entries()) {
      yield { type: 'token', text: morceau };
      await attendre(18, ctx.signal);

      if (index === 12 && demande.includes('erreur')) {
        yield {
          type: 'error',
          code: 'backend_error',
          message: "Le service n'a pas pu terminer sa réponse. Réessayez dans un instant.",
        };
        return;
      }

      if (index === 12 && demande.includes('quota')) {
        yield {
          type: 'error',
          code: 'rate_limited',
          message: 'Trop de questions à la minute. Réessayez dans 30 secondes.',
          retryAfterSeconds: 30,
        };
        return;
      }

      // Flux interrompu sans événement terminal : la coquille doit le signaler.
      if (index === 12 && demande.includes('coupure')) return;
    }

    yield { type: 'sources', sources: SOURCES_FACTICES };

    yield {
      type: 'done',
      conversationId: ctx.conversationId ?? `factice-${Date.now().toString(36)}`,
      conversationReset: demande.includes('reset'),
      meta: { adapter: 'mock', tokens: morceaux.length },
    };
  },
});

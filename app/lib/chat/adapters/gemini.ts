import { creerGestionnaireJeton } from '../session-token';
import { lireFluxSse } from '../sse';
import type { ChatAdapterFactory, ChatEvent, ChatSource } from '~~/types/chat';

/**
 * Adaptateur de l'API RAG interne (variante « gemini » du banc d'essai).
 *
 * ⚠️ Le navigateur appelle l'API EN DIRECT, sans proxy Nitro. Ce n'est pas une
 * facilité mais une contrainte : le tenant est résolu depuis l'en-tête `Origin`
 * (qu'un appel serveur n'a pas) et le quota est **par IP** (derrière un proxy,
 * tous les visiteurs partageraient l'IP du serveur Nuxt, soit un seul seau de
 * 10 req/min pour le site entier). Il n'y a d'ailleurs aucun secret à cacher :
 * le jeton est anonyme, éphémère et délivré publiquement à la bonne origine.
 *
 * Contrat : `../rag-platform/docs/ARCHITECTURE.md`, § Contrat d'API.
 * Vue d'ensemble : `docs/modules/chat/banc-essai-chat.md`.
 */

class ErreurApiRag extends Error {
  constructor(
    readonly statut: number,
    readonly code: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(`API RAG : ${statut} ${code}`);
  }
}

/** Messages destinés à l'utilisateur, en français. Le `code` reste technique. */
function messageUtilisateur(code: string, retryAfterSeconds?: number): string {
  switch (code) {
    case 'rate_limited':
      return retryAfterSeconds
        ? `Trop de questions à la minute — la limite est partagée par toutes les personnes derrière la même connexion. Réessayez dans ${retryAfterSeconds} secondes.`
        : 'Trop de questions à la minute — la limite est partagée par toutes les personnes derrière la même connexion. Patientez un instant.';
    case 'unauthorized':
      return "La session a expiré et n'a pas pu être renouvelée. Rechargez la page.";
    case 'origin_not_allowed':
      return "Ce site n'est pas autorisé à interroger l'assistant (origine non déclarée côté API).";
    case 'backend_unavailable':
      return "L'assistant est momentanément indisponible. Réessayez dans quelques minutes.";
    default:
      return "L'assistant n'a pas pu répondre. Réessayez dans un instant.";
  }
}

function lireEntier(valeur: string | null): number | undefined {
  if (!valeur) return undefined;
  const nombre = Number.parseInt(valeur, 10);
  return Number.isFinite(nombre) ? nombre : undefined;
}

function codeDepuisStatut(statut: number): string {
  if (statut === 401) return 'unauthorized';
  if (statut === 403) return 'origin_not_allowed';
  if (statut === 429) return 'rate_limited';
  if (statut === 503) return 'backend_unavailable';
  return 'http_error';
}

/**
 * Le corpus contient des doublons connus (un même PDF indexé sous deux
 * `external_id`). La déduplication serveur porte sur `(external_id, page)` et ne
 * peut donc pas les voir : on dédoublonne ici sur l'URL du fichier, pour ne pas
 * afficher deux cartes identiques.
 */
function dedoublonner(sources: ChatSource[]): ChatSource[] {
  const vues = new Set<string>();
  return sources.filter((source) => {
    const cle = `${source.fileUrl ?? source.pageUrl ?? source.title}#${source.page ?? ''}`;
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
}

interface SourceApi {
  external_id?: string;
  title?: string;
  page_url?: string;
  file_url?: string;
  publish_date?: string;
  page?: number;
  excerpt?: string;
}

/** Traduction du format de transport (snake_case) vers le contrat client. */
function versSourceClient(source: SourceApi): ChatSource {
  return {
    externalId: source.external_id,
    title: source.title ?? 'Document sans titre',
    // ⚠️ Les URLs sont FOURNIES par l'API. Ne jamais les recomposer depuis
    // `external_id` ou un slug : un client qui les fabrique casse en silence le
    // jour où le patron change côté serveur.
    pageUrl: source.page_url,
    fileUrl: source.file_url,
    publishDate: source.publish_date,
    page: source.page,
    excerpt: source.excerpt,
  };
}

export const createGeminiAdapter: ChatAdapterFactory = (config) => {
  const base = String(config.ragApiUrl ?? '').replace(/\/+$/, '');

  const jetons = creerGestionnaireJeton({
    async recupererJeton(signal) {
      const reponse = await fetch(`${base}/session`, { method: 'POST', signal });
      if (!reponse.ok) {
        throw new ErreurApiRag(
          reponse.status,
          codeDepuisStatut(reponse.status),
          lireEntier(reponse.headers.get('Retry-After')),
        );
      }
      return reponse.json();
    },
  });

  /**
   * Freinage préventif. `X-RateLimit-Remaining` accompagne toutes les réponses
   * des routes limitées : quand il tombe à 0, on refuse la question suivante
   * SANS appeler l'API — une requête refusée serait elle aussi décomptée.
   */
  let quotaEpuiseJusqua = 0;

  function memoriserQuota(entetes: Headers) {
    const restant = lireEntier(entetes.get('X-RateLimit-Remaining'));
    const reinitialisation = lireEntier(entetes.get('X-RateLimit-Reset'));
    quotaEpuiseJusqua = restant === 0 && reinitialisation ? reinitialisation * 1000 : 0;
  }

  return {
    id: 'gemini',

    async *send(question, ctx): AsyncIterable<ChatEvent> {
      const attenteRestante = Math.ceil((quotaEpuiseJusqua - Date.now()) / 1000);
      if (attenteRestante > 0) {
        yield {
          type: 'error',
          code: 'rate_limited',
          message: messageUtilisateur('rate_limited', attenteRestante),
          retryAfterSeconds: attenteRestante,
        };
        return;
      }

      const demander = async (jeton: string) =>
        fetch(`${base}/ask`, {
          method: 'POST',
          signal: ctx.signal,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            Authorization: `Bearer ${jeton}`,
          },
          // Pas de `tenant_id` (il vient du jeton), pas de `model` (sur un
          // endpoint anonyme, choisir le modèle revient à choisir la facture),
          // pas d'historique (il est stocké côté serveur, TTL 24 h).
          body: JSON.stringify({
            question,
            ...(ctx.conversationId ? { conversation_id: ctx.conversationId } : {}),
          }),
        });

      let reponse: Response;
      try {
        let jeton = await jetons.obtenir(ctx.signal);
        reponse = await demander(jeton);

        // UNE seule reprise, et seulement sur 401 : le jeton a pu expirer entre
        // sa vérification et l'appel. Surtout pas de boucle — chaque requête
        // refusée est décomptée du quota.
        if (reponse.status === 401) {
          jetons.invalider();
          jeton = await jetons.obtenir(ctx.signal);
          reponse = await demander(jeton);
        }
      } catch (erreur) {
        if (ctx.signal.aborted) throw erreur;
        if (erreur instanceof ErreurApiRag) {
          yield {
            type: 'error',
            code: erreur.code,
            message: messageUtilisateur(erreur.code, erreur.retryAfterSeconds),
            retryAfterSeconds: erreur.retryAfterSeconds,
          };
          return;
        }
        throw erreur;
      }

      memoriserQuota(reponse.headers);

      if (!reponse.ok || !reponse.body) {
        const code = codeDepuisStatut(reponse.status);
        const attente = lireEntier(reponse.headers.get('Retry-After'));
        yield {
          type: 'error',
          code,
          message: messageUtilisateur(code, attente),
          retryAfterSeconds: attente,
        };
        return;
      }

      for await (const evenement of lireFluxSse(reponse.body, ctx.signal)) {
        let charge: Record<string, unknown>;
        try {
          charge = JSON.parse(evenement.data);
        } catch {
          // Un événement illisible ne doit pas tuer la conversation : le flux
          // continue, la coquille signalera l'absence d'événement terminal.
          console.warn('[chat/gemini] événement SSE illisible', evenement);
          continue;
        }

        switch (evenement.event) {
          case 'token':
            yield { type: 'token', text: String(charge.text ?? '') };
            break;

          case 'sources': {
            const sources = dedoublonner(
              (Array.isArray(charge.sources) ? (charge.sources as SourceApi[]) : []).map(
                versSourceClient,
              ),
            );
            // Rien à citer : on n'émet pas d'événement, pour ne pas afficher un
            // bloc « Sources » vide sous une réponse « je ne sais pas ».
            if (sources.length) yield { type: 'sources', sources };
            break;
          }

          case 'done': {
            const { conversation_id, conversation_reset, ...meta } = charge;
            yield {
              type: 'done',
              conversationId: typeof conversation_id === 'string' ? conversation_id : undefined,
              conversationReset: conversation_reset === true,
              meta,
            };
            return;
          }

          case 'error': {
            const code = typeof charge.code === 'string' ? charge.code : 'backend_error';
            yield {
              type: 'error',
              code,
              // L'API renvoie un message déjà rédigé dans la langue du tenant.
              message:
                typeof charge.message === 'string' && charge.message
                  ? charge.message
                  : messageUtilisateur(code),
            };
            return;
          }
        }
      }
      // Sortie de boucle sans `done` ni `error` : la coquille traite l'absence
      // d'événement terminal comme un échec (règle de flux nº 2).
    },
  };
};

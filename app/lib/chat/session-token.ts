/**
 * Gestion du jeton de session anonyme de l'API RAG.
 *
 * Le jeton vaut 15 minutes. Trois règles commandent ce fichier :
 *
 * 1. **Renouveler AVANT l'échéance**, plutôt que découvrir un 401 au milieu
 *    d'une conversation. On rafraîchit à 80 % de la durée de vie annoncée.
 * 2. **Une seule requête `/session` en vol.** Deux questions posées coup sur
 *    coup ne doivent pas consommer deux jetons — le quota `/session` (20/min
 *    par IP) est partagé par tout un bureau.
 * 3. **Aucun retry en boucle.** Une requête refusée est décomptée du quota :
 *    réessayer en rafale transforme une panne passagère en blocage complet.
 *    En cas d'échec, on propage — l'appelant décide.
 *
 * Le jeton reste EN MÉMOIRE. Il est anonyme et éphémère : le persister dans
 * `localStorage` n'apporterait rien et l'exposerait.
 */

export interface ReponseSession {
  token: string;
  expires_in: number;
}

export interface OptionsJetonSession {
  /** Appel réseau vers `POST /session`. Injecté pour être testable sans réseau. */
  recupererJeton: (signal?: AbortSignal) => Promise<ReponseSession>;
  /** Horloge injectable (tests). */
  maintenant?: () => number;
  /** Part de la durée de vie consommée avant renouvellement (0.8 = 80 %). */
  ratioRenouvellement?: number;
}

export interface GestionnaireJeton {
  /** Rend un jeton valide, en le renouvelant si besoin. */
  obtenir: (signal?: AbortSignal) => Promise<string>;
  /** Marque le jeton courant comme inutilisable (après un 401). */
  invalider: () => void;
}

export function creerGestionnaireJeton(options: OptionsJetonSession): GestionnaireJeton {
  const maintenant = options.maintenant ?? (() => Date.now());
  const ratio = options.ratioRenouvellement ?? 0.8;

  let jeton: string | null = null;
  let renouvelerA = 0;
  let enVol: Promise<string> | null = null;

  return {
    async obtenir(signal) {
      if (jeton && maintenant() < renouvelerA) return jeton;

      // Requête déjà en cours : on s'y raccroche au lieu d'en lancer une seconde.
      if (enVol) return enVol;

      enVol = options
        .recupererJeton(signal)
        .then((reponse) => {
          jeton = reponse.token;
          renouvelerA = maintenant() + reponse.expires_in * 1000 * ratio;
          return reponse.token;
        })
        .finally(() => {
          enVol = null;
        });

      return enVol;
    },

    invalider() {
      jeton = null;
      renouvelerA = 0;
    },
  };
}

/**
 * Gestionnaires partagés, un par origine d'API.
 *
 * La dictée serveur (`app/lib/voice/engines/rag-serveur.ts`) a besoin du même
 * jeton que le chat. Lui en faire créer un second consommerait deux `/session`
 * là où un seul suffit — exactement ce que la règle 2 de ce fichier interdit,
 * le quota de 20/min étant partagé par tout un bureau.
 *
 * Le PREMIER appelant fournit la fabrique et gagne : en pratique l'adaptateur de
 * chat, créé au chargement de la page bien avant qu'on parle. Les deux fabriques
 * font la même chose — un POST /session qui lève en cas d'échec — et ne
 * diffèrent que par la richesse de l'erreur levée, que le gestionnaire propage
 * telle quelle à son appelant.
 */
const partages = new Map<string, GestionnaireJeton>();

export function gestionnaireJetonPartage(
  base: string,
  fabrique: () => GestionnaireJeton,
): GestionnaireJeton {
  const existant = partages.get(base);
  if (existant) return existant;
  const nouveau = fabrique();
  partages.set(base, nouveau);
  return nouveau;
}

/**
 * Vide le cache des gestionnaires partagés — pour les tests, exclusivement.
 *
 * Sans elle, un jeton obtenu par un test survit au suivant et le fait passer
 * pour de mauvaises raisons : c'est exactement ce qui est arrivé en introduisant
 * le partage, un test de refus sur `/session` ne voyant plus aucun appel partir.
 */
export function reinitialiserJetonsPartages(): void {
  partages.clear();
}

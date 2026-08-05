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

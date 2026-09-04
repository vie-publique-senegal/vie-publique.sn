import { creerMoteurRagServeur } from './engines/rag-serveur';
import { creerMoteurWebSpeech } from './engines/web-speech';
import type { MoteurVocal } from './types';

export * from './types';
export { creerTamponPhrases } from './phrases';
export { nettoyerPourLecture, vautLaPeineDEtreLu } from './texte-parle';

/**
 * Sélection du moteur À L'EXÉCUTION.
 *
 * Le moteur serveur annoncé est arrivé (2026-09-04) : il se place dans cette
 * liste, et rien d'autre n'a bougé — ni les états du bouton, ni le barge-in, ni
 * le découpage du flux en phrases, ni le nettoyage avant lecture.
 *
 * L'ordre vaut priorité, et **Web Speech reste devant** : en français il est
 * gratuit, immédiat, et il rend du partiel. Le moteur serveur prend la main dans
 * les deux cas où l'autre ne peut pas — une langue que Web Speech ne connaît pas
 * (le wolof), ou un navigateur sans l'API (Firefox).
 *
 * Chaque capacité est résolue SÉPARÉMENT : sur l'app iOS, Web Speech sait parler
 * mais pas écouter, et il faut pouvoir garder sa synthèse tout en confiant la
 * dictée à un autre moteur.
 */
const MOTEURS: Array<() => MoteurVocal> = [creerMoteurWebSpeech, creerMoteurRagServeur];

let cache: MoteurVocal[] | null = null;

function moteurs(): MoteurVocal[] {
  // Instanciation paresseuse : `window` n'existe pas au rendu serveur.
  if (!cache) cache = MOTEURS.map((fabrique) => fabrique());
  return cache;
}

/**
 * Premier moteur capable de dicter DANS CETTE LANGUE, ou `null` → le bouton
 * micro ne s'affiche pas.
 *
 * `lang` absente = n'importe quelle langue, ce qui reste utile aux sondes de
 * diagnostic.
 */
export function moteurEcoute(lang?: string): MoteurVocal | null {
  if (import.meta.server) return null;
  return moteurs().find((moteur) => moteur.peutEcouter(lang)) ?? null;
}

/** Premier moteur capable de lire, ou `null` → le bouton son ne s'affiche pas. */
export function moteurLecture(): MoteurVocal | null {
  if (import.meta.server) return null;
  return moteurs().find((moteur) => moteur.peutParler()) ?? null;
}

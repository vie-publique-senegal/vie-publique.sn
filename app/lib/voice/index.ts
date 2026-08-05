import { creerMoteurWebSpeech } from './engines/web-speech';
import type { MoteurVocal } from './types';

export * from './types';
export { creerTamponPhrases } from './phrases';
export { nettoyerPourLecture, vautLaPeineDEtreLu } from './texte-parle';

/**
 * Sélection du moteur À L'EXÉCUTION.
 *
 * Un seul moteur aujourd'hui. Le jour où un moteur serveur arrive (wolof, ou ASR
 * auto-hébergé si l'envoi de l'audio chez Google est refusé), il se place dans
 * cette liste — et rien d'autre ne bouge : ni les états du bouton, ni le
 * barge-in, ni le découpage du flux en phrases, ni le nettoyage avant lecture.
 *
 * L'ordre vaut priorité. Chaque capacité est résolue SÉPARÉMENT : sur l'app iOS,
 * Web Speech sait parler mais pas écouter, et il faut pouvoir garder sa synthèse
 * tout en confiant la dictée à un autre moteur.
 */
const MOTEURS: Array<() => MoteurVocal> = [creerMoteurWebSpeech];

let cache: MoteurVocal[] | null = null;

function moteurs(): MoteurVocal[] {
  // Instanciation paresseuse : `window` n'existe pas au rendu serveur.
  if (!cache) cache = MOTEURS.map((fabrique) => fabrique());
  return cache;
}

/** Premier moteur capable de dicter, ou `null` → le bouton micro ne s'affiche pas. */
export function moteurEcoute(): MoteurVocal | null {
  if (import.meta.server) return null;
  return moteurs().find((moteur) => moteur.peutEcouter()) ?? null;
}

/** Premier moteur capable de lire, ou `null` → le bouton son ne s'affiche pas. */
export function moteurLecture(): MoteurVocal | null {
  if (import.meta.server) return null;
  return moteurs().find((moteur) => moteur.peutParler()) ?? null;
}

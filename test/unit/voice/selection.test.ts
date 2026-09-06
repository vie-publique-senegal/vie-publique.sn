import { afterEach, describe, expect, it, vi } from 'vitest';
import { creerMoteurWebSpeech } from '../../../app/lib/voice/engines/web-speech';

/**
 * La sélection par langue est le seul garde-fou entre une question wolof et un
 * service qui ne la transcrit pas. Sans elle, Web Speech se déclarait capable
 * pour toutes les langues et la dictée wolof partait chez lui — pour revenir
 * vide, ou fausse.
 */
describe('capacité d’écoute selon la langue', () => {
  afterEach(() => vi.unstubAllGlobals());

  function avecApiReconnaissance() {
    // Le constructeur n'est jamais appelé ici : seule sa présence est testée.
    const Reconnaissance = function Reconnaissance() {};
    vi.stubGlobal('window', { webkitSpeechRecognition: Reconnaissance });
  }

  it('Web Speech reste capable pour le français', () => {
    avecApiReconnaissance();
    expect(creerMoteurWebSpeech().peutEcouter('fr-FR')).toBe(true);
  });

  it('Web Speech se déclare incapable pour le wolof, API présente ou non', () => {
    avecApiReconnaissance();
    expect(creerMoteurWebSpeech().peutEcouter('wo-SN')).toBe(false);
    expect(creerMoteurWebSpeech().peutEcouter('wo')).toBe(false);
  });

  it('sans langue précisée, la question est « sais-tu écouter »', () => {
    avecApiReconnaissance();
    expect(creerMoteurWebSpeech().peutEcouter()).toBe(true);
  });

  it('sans l’API du navigateur, aucune langue n’est possible', () => {
    vi.stubGlobal('window', {});
    expect(creerMoteurWebSpeech().peutEcouter('fr-FR')).toBe(false);
  });
});

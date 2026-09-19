import { describe, expect, it, vi } from 'vitest';
import { creerGestionnaireJeton } from '../../../app/lib/chat/session-token';

/**
 * Deuxième endroit où une régression est invisible à l'œil : un jeton mal
 * renouvelé ne se voit qu'au bout de 15 minutes de conversation, et une rafale
 * de `/session` ne se voit qu'une fois le quota atteint.
 */
describe('creerGestionnaireJeton', () => {
  const reponse = (token: string, expires_in = 900) => ({ token, expires_in });

  it('récupère un jeton au premier appel', async () => {
    const recupererJeton = vi.fn().mockResolvedValue(reponse('jeton-1'));
    const gestionnaire = creerGestionnaireJeton({ recupererJeton, maintenant: () => 0 });

    expect(await gestionnaire.obtenir()).toBe('jeton-1');
    expect(recupererJeton).toHaveBeenCalledTimes(1);
  });

  it('réutilise le jeton tant qu’il est frais', async () => {
    const recupererJeton = vi.fn().mockResolvedValue(reponse('jeton-1'));
    let horloge = 0;
    const gestionnaire = creerGestionnaireJeton({ recupererJeton, maintenant: () => horloge });

    await gestionnaire.obtenir();
    horloge = 700_000; // 700 s < 720 s (80 % de 900 s)
    expect(await gestionnaire.obtenir()).toBe('jeton-1');
    expect(recupererJeton).toHaveBeenCalledTimes(1);
  });

  it('renouvelle AVANT l’expiration, à 80 % de la durée de vie', async () => {
    const recupererJeton = vi
      .fn()
      .mockResolvedValueOnce(reponse('jeton-1'))
      .mockResolvedValueOnce(reponse('jeton-2'));
    let horloge = 0;
    const gestionnaire = creerGestionnaireJeton({ recupererJeton, maintenant: () => horloge });

    await gestionnaire.obtenir();
    horloge = 721_000; // au-delà de 80 % — mais le jeton est encore valide 3 min
    expect(await gestionnaire.obtenir()).toBe('jeton-2');
    expect(recupererJeton).toHaveBeenCalledTimes(2);
  });

  it('ne lance qu’une seule requête pour des appels concurrents', async () => {
    let resoudre: ((valeur: { token: string; expires_in: number }) => void) | undefined;
    const recupererJeton = vi.fn(
      () =>
        new Promise<{ token: string; expires_in: number }>((res) => {
          resoudre = res;
        }),
    );
    const gestionnaire = creerGestionnaireJeton({ recupererJeton, maintenant: () => 0 });

    const appels = Promise.all([
      gestionnaire.obtenir(),
      gestionnaire.obtenir(),
      gestionnaire.obtenir(),
    ]);
    resoudre?.(reponse('jeton-unique'));

    expect(await appels).toEqual(['jeton-unique', 'jeton-unique', 'jeton-unique']);
    expect(recupererJeton).toHaveBeenCalledTimes(1);
  });

  it('propage l’échec sans réessayer tout seul', async () => {
    const recupererJeton = vi.fn().mockRejectedValue(new Error('réseau'));
    const gestionnaire = creerGestionnaireJeton({ recupererJeton, maintenant: () => 0 });

    await expect(gestionnaire.obtenir()).rejects.toThrow('réseau');
    expect(recupererJeton).toHaveBeenCalledTimes(1);
  });

  it('reste utilisable après un échec', async () => {
    const recupererJeton = vi
      .fn()
      .mockRejectedValueOnce(new Error('réseau'))
      .mockResolvedValueOnce(reponse('jeton-2'));
    const gestionnaire = creerGestionnaireJeton({ recupererJeton, maintenant: () => 0 });

    await expect(gestionnaire.obtenir()).rejects.toThrow('réseau');
    expect(await gestionnaire.obtenir()).toBe('jeton-2');
  });

  it('redemande un jeton après invalidation (401)', async () => {
    const recupererJeton = vi
      .fn()
      .mockResolvedValueOnce(reponse('jeton-1'))
      .mockResolvedValueOnce(reponse('jeton-2'));
    const gestionnaire = creerGestionnaireJeton({ recupererJeton, maintenant: () => 0 });

    await gestionnaire.obtenir();
    gestionnaire.invalider();

    expect(await gestionnaire.obtenir()).toBe('jeton-2');
    expect(recupererJeton).toHaveBeenCalledTimes(2);
  });

  it('respecte la durée de vie annoncée par le serveur', async () => {
    const recupererJeton = vi
      .fn()
      .mockResolvedValueOnce(reponse('court', 60))
      .mockResolvedValueOnce(reponse('suivant', 60));
    let horloge = 0;
    const gestionnaire = creerGestionnaireJeton({ recupererJeton, maintenant: () => horloge });

    await gestionnaire.obtenir();
    horloge = 47_000; // < 48 s (80 % de 60 s)
    expect(await gestionnaire.obtenir()).toBe('court');
    horloge = 49_000;
    expect(await gestionnaire.obtenir()).toBe('suivant');
  });
});

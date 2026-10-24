import { describe, expect, it } from 'vitest';
import {
  getErrorStatusCode,
  getFriendlyErrorMessage,
  isNetworkError,
  isUserFriendlyMessage,
} from '../../../shared/friendly-error';

/** Reproduit la forme d'une erreur `ofetch` (celle qui fuitait à l'écran). */
const fetchError = (status: number, apiMessage: string) => {
  const error = new Error(
    `[GET] "/api/assembly/votes?limit=50&page=1": ${status} ${apiMessage}`,
  ) as Error & { statusCode: number; data: Record<string, unknown> };
  error.statusCode = status;
  error.data = { statusCode: status, statusMessage: apiMessage, message: apiMessage };
  return error;
};

/** Aucun de ces fragments ne doit jamais atteindre l'écran. */
const TECHNICAL_FRAGMENTS = ['[GET]', '/api/', '500', 'fetch failed', 'statusCode'];

const expectNothingTechnical = (message: string) => {
  for (const fragment of TECHNICAL_FRAGMENTS) {
    expect(message).not.toContain(fragment);
  }
};

describe('getFriendlyErrorMessage', () => {
  it("ne laisse fuir aucun détail technique d'une erreur ofetch 500", () => {
    const message = getFriendlyErrorMessage(
      fetchError(500, 'Erreur lors de la récupération des votes parlementaires: Unknown error'),
    );
    expectNothingTechnical(message);
    expect(message).toContain('Nos serveurs');
  });

  it('ignore le message interne de l’API sur une 5xx même rédigé en français', () => {
    const message = getFriendlyErrorMessage(
      fetchError(500, 'Erreur lors de la récupération des données de la carte nationale'),
    );
    expect(message).not.toContain('carte nationale');
  });

  it('distingue 503 et 504', () => {
    expect(getFriendlyErrorMessage(fetchError(503, 'x'))).toContain('maintenance');
    expect(getFriendlyErrorMessage(fetchError(504, 'x'))).toContain('trop de temps');
  });

  it('conserve un message de validation 4xx rédigé pour l’utilisateur', () => {
    const message = getFriendlyErrorMessage(
      fetchError(400, 'Le fichier ne doit pas dépasser 20 Mo'),
    );
    expect(message).toBe('Le fichier ne doit pas dépasser 20 Mo');
  });

  it('remplace un message 4xx technique par le message standard du code', () => {
    const message = getFriendlyErrorMessage(fetchError(404, 'Item not found in collection'));
    expect(message).toContain('introuvable');
    expectNothingTechnical(message);
  });

  it('gère les codes 401 / 403 / 429', () => {
    expect(getFriendlyErrorMessage(fetchError(401, 'x'))).toContain('session');
    expect(getFriendlyErrorMessage(fetchError(403, 'x'))).toContain("n'avez pas accès");
    expect(getFriendlyErrorMessage(fetchError(429, 'x'))).toContain('tentatives');
  });

  it('détecte une coupure réseau', () => {
    const message = getFriendlyErrorMessage(new Error('fetch failed'));
    expect(message).toContain('Connexion interrompue');
    expectNothingTechnical(message);
  });

  it('ne laisse pas passer un message technique anglais du navigateur', () => {
    const message = getFriendlyErrorMessage(new Error('Registration failed - push service error'));
    expect(message).not.toContain('Registration');
  });

  it('utilise le fallback métier fourni', () => {
    expect(getFriendlyErrorMessage({}, 'Impossible de charger les députés.')).toBe(
      'Impossible de charger les députés.',
    );
  });

  it('renvoie le message générique sans erreur', () => {
    expect(getFriendlyErrorMessage(null)).toContain('momentanément indisponibles');
  });
});

describe('getErrorStatusCode', () => {
  it('lit les différentes formes de code HTTP', () => {
    expect(getErrorStatusCode({ statusCode: 404 })).toBe(404);
    expect(getErrorStatusCode({ status: 403 })).toBe(403);
    expect(getErrorStatusCode({ response: { status: 429 } })).toBe(429);
    expect(getErrorStatusCode({ data: { statusCode: 500 } })).toBe(500);
    expect(getErrorStatusCode(new Error('boom'))).toBeUndefined();
  });
});

describe('isNetworkError', () => {
  it('vrai sans code HTTP et message réseau', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
  });

  it('faux dès qu’un code HTTP est présent', () => {
    expect(isNetworkError(fetchError(500, 'fetch failed'))).toBe(false);
  });
});

describe('isUserFriendlyMessage', () => {
  it('rejette URLs, stacks, JSON et anglais technique', () => {
    expect(isUserFriendlyMessage('[GET] "/api/x": 500 boom')).toBe(false);
    expect(isUserFriendlyMessage('https://cms.example.com/items/news')).toBe(false);
    expect(isUserFriendlyMessage('at Object.handler (server.mjs:12)')).toBe(false);
    expect(isUserFriendlyMessage('{"statusCode":500}')).toBe(false);
    expect(isUserFriendlyMessage('Internal Server Error')).toBe(false);
    expect(isUserFriendlyMessage('unable to get local issuer certificate')).toBe(false);
    expect(isUserFriendlyMessage('court')).toBe(false);
    expect(isUserFriendlyMessage(undefined)).toBe(false);
  });

  it('accepte une phrase rédigée en français', () => {
    expect(isUserFriendlyMessage('Vous devez accepter la charte des dons pour continuer')).toBe(
      true,
    );
  });
});

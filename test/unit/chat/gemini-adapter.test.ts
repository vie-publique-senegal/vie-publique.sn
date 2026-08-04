import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGeminiAdapter } from '../../../app/lib/chat/adapters/gemini';

/**
 * Tests de l'adaptateur avec un `fetch` bouchonné : ils vérifient la traduction
 * du contrat de transport vers le contrat client SANS appeler l'API (donc sans
 * consommer le quota, qui est par IP).
 */

const CONFIG = { ragApiUrl: 'https://rag.example.test' };

function fluxSse(corps: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controleur) {
      controleur.enqueue(new TextEncoder().encode(corps));
      controleur.close();
    },
  });
}

function reponseSse(corps: string, entetes: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    body: fluxSse(corps),
    headers: new Headers(entetes),
  } as unknown as Response;
}

function reponseErreur(status: number, entetes: Record<string, string> = {}) {
  return {
    ok: false,
    status,
    body: null,
    headers: new Headers(entetes),
    json: async () => ({}),
  } as unknown as Response;
}

const reponseSession = () =>
  ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ token: 'jeton-test', expires_in: 900 }),
  }) as unknown as Response;

async function collecter(iterable: AsyncIterable<unknown>) {
  const evenements = [];
  for await (const evenement of iterable) evenements.push(evenement);
  return evenements;
}

function installerFetch(routeur: (url: string, init?: RequestInit) => Response) {
  const espion = vi.fn(async (url: string, init?: RequestInit) => routeur(String(url), init));
  vi.stubGlobal('fetch', espion);
  return espion;
}

afterEach(() => vi.unstubAllGlobals());

describe('createGeminiAdapter', () => {
  it('traduit token, sources et done vers le contrat client', async () => {
    installerFetch((url) =>
      url.endsWith('/session')
        ? reponseSession()
        : reponseSse(
            'event: token\ndata: {"text":"Le déficit "}\n\n' +
              'event: token\ndata: {"text":"est de 1 245,1 Mds."}\n\n' +
              'event: sources\ndata: {"sources":[{"external_id":"42","title":"PLF 2026","page_url":"https://www.vie-publique.sn/documents/42/plf-2026","file_url":"https://www.vie-publique.sn/docs/abc/plf.pdf","page":14}]}\n\n' +
              'event: done\ndata: {"conversation_id":"conv-1","model":"gemini-3.6-flash","latency_ms":2310,"conversation_reset":false}\n\n',
          ),
    );

    const evenements = await collecter(
      createGeminiAdapter(CONFIG).send('Quel déficit ?', { signal: new AbortController().signal }),
    );

    expect(evenements).toEqual([
      { type: 'token', text: 'Le déficit ' },
      { type: 'token', text: 'est de 1 245,1 Mds.' },
      {
        type: 'sources',
        sources: [
          {
            externalId: '42',
            title: 'PLF 2026',
            pageUrl: 'https://www.vie-publique.sn/documents/42/plf-2026',
            fileUrl: 'https://www.vie-publique.sn/docs/abc/plf.pdf',
            publishDate: undefined,
            page: 14,
            excerpt: undefined,
          },
        ],
      },
      {
        type: 'done',
        conversationId: 'conv-1',
        conversationReset: false,
        meta: { model: 'gemini-3.6-flash', latency_ms: 2310 },
      },
    ]);
  });

  it('dédoublonne deux sources pointant sur le même fichier', async () => {
    installerFetch((url) =>
      url.endsWith('/session')
        ? reponseSession()
        : reponseSse(
            'event: sources\ndata: {"sources":[' +
              '{"external_id":"1","title":"PLF 2026","file_url":"https://x/plf.pdf","page":3},' +
              '{"external_id":"2","title":"PLF 2026 (copie)","file_url":"https://x/plf.pdf","page":3}' +
              ']}\n\nevent: done\ndata: {"conversation_id":"c"}\n\n',
          ),
    );

    const evenements = await collecter(
      createGeminiAdapter(CONFIG).send('Qui préside ?', { signal: new AbortController().signal }),
    );

    const sources = evenements.find((e) => (e as { type: string }).type === 'sources') as {
      sources: unknown[];
    };
    expect(sources.sources).toHaveLength(1);
  });

  it("n'émet pas d'événement sources quand la liste est vide", async () => {
    installerFetch((url) =>
      url.endsWith('/session')
        ? reponseSession()
        : reponseSse(
            'event: token\ndata: {"text":"Je ne sais pas."}\n\n' +
              'event: sources\ndata: {"sources":[]}\n\n' +
              'event: done\ndata: {"conversation_id":"c"}\n\n',
          ),
    );

    const evenements = await collecter(
      createGeminiAdapter(CONFIG).send('Budget de Ziguinchor ?', {
        signal: new AbortController().signal,
      }),
    );

    expect(evenements.map((e) => (e as { type: string }).type)).toEqual(['token', 'done']);
  });

  it('repasse le conversation_id au tour suivant, et jamais d’historique', async () => {
    let corpsAsk = '';
    installerFetch((url, init) => {
      if (url.endsWith('/session')) return reponseSession();
      corpsAsk = String(init?.body ?? '');
      return reponseSse('event: done\ndata: {"conversation_id":"conv-1"}\n\n');
    });

    const adaptateur = createGeminiAdapter(CONFIG);
    await collecter(adaptateur.send('Question 1', { signal: new AbortController().signal }));
    expect(JSON.parse(corpsAsk)).toEqual({ question: 'Question 1' });

    await collecter(
      adaptateur.send('Et le plafond ?', {
        conversationId: 'conv-1',
        signal: new AbortController().signal,
      }),
    );
    expect(JSON.parse(corpsAsk)).toEqual({
      question: 'Et le plafond ?',
      conversation_id: 'conv-1',
    });
    expect(corpsAsk).not.toContain('tenant_id');
    expect(corpsAsk).not.toContain('messages');
  });

  it('remonte le conversation_reset du serveur', async () => {
    installerFetch((url) =>
      url.endsWith('/session')
        ? reponseSession()
        : reponseSse('event: done\ndata: {"conversation_id":"neuf","conversation_reset":true}\n\n'),
    );

    const evenements = await collecter(
      createGeminiAdapter(CONFIG).send('Suite ?', { signal: new AbortController().signal }),
    );
    expect(evenements.at(-1)).toMatchObject({ conversationReset: true });
  });

  it('transforme un 429 en erreur avec le délai d’attente', async () => {
    installerFetch((url) =>
      url.endsWith('/session') ? reponseSession() : reponseErreur(429, { 'Retry-After': '42' }),
    );

    const evenements = await collecter(
      createGeminiAdapter(CONFIG).send('Question', { signal: new AbortController().signal }),
    );

    expect(evenements).toHaveLength(1);
    expect(evenements[0]).toMatchObject({
      type: 'error',
      code: 'rate_limited',
      retryAfterSeconds: 42,
    });
    expect((evenements[0] as { message: string }).message).toContain('42 secondes');
  });

  it('freine AVANT de consommer le quota quand X-RateLimit-Remaining tombe à 0', async () => {
    const reinitialisation = Math.floor(Date.now() / 1000) + 30;
    const espion = installerFetch((url) =>
      url.endsWith('/session')
        ? reponseSession()
        : reponseSse('event: done\ndata: {"conversation_id":"c"}\n\n', {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(reinitialisation),
          }),
    );

    const adaptateur = createGeminiAdapter(CONFIG);
    await collecter(adaptateur.send('Question 1', { signal: new AbortController().signal }));
    const appelsApres1 = espion.mock.calls.length;

    const evenements = await collecter(
      adaptateur.send('Question 2', { signal: new AbortController().signal }),
    );

    expect(evenements[0]).toMatchObject({ type: 'error', code: 'rate_limited' });
    // Aucune requête supplémentaire : une requête refusée serait décomptée.
    expect(espion.mock.calls.length).toBe(appelsApres1);
  });

  it('renouvelle le jeton une seule fois sur 401, sans boucler', async () => {
    const espion = installerFetch((url) =>
      url.endsWith('/session') ? reponseSession() : reponseErreur(401),
    );

    const evenements = await collecter(
      createGeminiAdapter(CONFIG).send('Question', { signal: new AbortController().signal }),
    );

    expect(evenements[0]).toMatchObject({ type: 'error', code: 'unauthorized' });
    const appelsAsk = espion.mock.calls.filter(([url]) => String(url).endsWith('/ask'));
    expect(appelsAsk).toHaveLength(2); // l'appel initial + UNE reprise
  });

  it('transforme un 403 sur /session en origin_not_allowed', async () => {
    installerFetch((url) => (url.endsWith('/session') ? reponseErreur(403) : reponseSse('')));

    const evenements = await collecter(
      createGeminiAdapter(CONFIG).send('Question', { signal: new AbortController().signal }),
    );
    expect(evenements[0]).toMatchObject({ type: 'error', code: 'origin_not_allowed' });
  });

  it('remonte un événement error survenu en cours de flux', async () => {
    installerFetch((url) =>
      url.endsWith('/session')
        ? reponseSession()
        : reponseSse(
            'event: token\ndata: {"text":"début"}\n\n' +
              'event: error\ndata: {"code":"backend_error","message":"Le service a échoué."}\n\n',
          ),
    );

    const evenements = await collecter(
      createGeminiAdapter(CONFIG).send('Question', { signal: new AbortController().signal }),
    );
    expect(evenements.at(-1)).toEqual({
      type: 'error',
      code: 'backend_error',
      message: 'Le service a échoué.',
    });
  });

  it("n'invente pas d'événement terminal quand le flux se termine sans done", async () => {
    installerFetch((url) =>
      url.endsWith('/session')
        ? reponseSession()
        : reponseSse('event: token\ndata: {"text":"tronqué"}\n\n'),
    );

    const evenements = await collecter(
      createGeminiAdapter(CONFIG).send('Question', { signal: new AbortController().signal }),
    );
    // C'est la coquille qui traite l'absence d'événement terminal comme un échec.
    expect(evenements).toEqual([{ type: 'token', text: 'tronqué' }]);
  });

  it('ignore le keep-alive de Cloudflare', async () => {
    installerFetch((url) =>
      url.endsWith('/session')
        ? reponseSession()
        : reponseSse(
            ': keep-alive\n\n: keep-alive\n\nevent: token\ndata: {"text":"a"}\n\nevent: done\ndata: {}\n\n',
          ),
    );

    const evenements = await collecter(
      createGeminiAdapter(CONFIG).send('Question', { signal: new AbortController().signal }),
    );
    expect(evenements.map((e) => (e as { type: string }).type)).toEqual(['token', 'done']);
  });
});

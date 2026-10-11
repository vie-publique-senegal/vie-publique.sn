import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { creerMoteurRagServeur } from '../../../app/lib/voice/engines/rag-serveur';
import { ErreurVocale } from '../../../app/lib/voice/types';

/**
 * Le moteur serveur ne se teste pas à l'oreille : ce qui casse en silence, c'est
 * l'enveloppe — un micro laissé ouvert, un `signalFin` qui annule au lieu de
 * transcrire, un refus de l'API rendu comme une panne générique.
 */

const BASE = 'https://rag.test';

class FauxMediaRecorder {
  static dernier: FauxMediaRecorder | null = null;
  static supportes = ['audio/webm;codecs=opus'];
  static isTypeSupported = (type: string) => FauxMediaRecorder.supportes.includes(type);

  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(
    readonly flux: MediaStream,
    readonly options: { mimeType: string },
  ) {
    FauxMediaRecorder.dernier = this;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['son']) });
    this.onstop?.();
  }
}

function pistes() {
  const piste = { stop: vi.fn() };
  return { piste, flux: { getTracks: () => [piste] } as unknown as MediaStream };
}

let arretPistes: ReturnType<typeof vi.fn>;

beforeEach(() => {
  const { piste, flux } = pistes();
  arretPistes = piste.stop;
  vi.stubGlobal('MediaRecorder', FauxMediaRecorder);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(flux) } });
  vi.stubGlobal('window', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function moteur() {
  return creerMoteurRagServeur({ base: () => BASE });
}

function reponses(transcribe: Partial<Response> & { corps?: unknown }) {
  return vi.fn(async (url: string) => {
    if (String(url).endsWith('/session')) {
      return { ok: true, json: async () => ({ token: 'jeton', expires_in: 900 }) } as Response;
    }
    return {
      ok: transcribe.ok ?? true,
      status: transcribe.status ?? 200,
      json: async () => transcribe.corps ?? { text: 'Naka nga def', lang: 'wo' },
    } as Response;
  });
}

/**
 * Déclenche un signal une fois l'enregistrement DÉMARRÉ.
 *
 * `setTimeout` et non `queueMicrotask` : le moteur attache ses écouteurs après
 * avoir attendu `getUserMedia`, donc dans une microtâche. Signaler trop tôt
 * abortait un contrôleur que personne n'écoutait encore, et l'enregistrement ne
 * s'arrêtait jamais.
 */
function bientot(controleur: AbortController) {
  setTimeout(() => controleur.abort(), 0);
}

describe('moteur de dictée serveur', () => {
  it('se déclare capable quelle que soit la langue — c’est le serveur qui la détecte', () => {
    expect(moteur().peutEcouter('wo-SN')).toBe(true);
    expect(moteur().peutEcouter('fr-FR')).toBe(true);
  });

  it('ne se déclare pas capable sans API configurée', () => {
    expect(creerMoteurRagServeur({ base: () => '' }).peutEcouter('wo-SN')).toBe(false);
  });

  it('sait lire depuis que /speak existe', () => {
    vi.stubGlobal('Audio', function Audio() {});
    expect(moteur().peutParler('wo-SN')).toBe(true);
  });

  it('amorce un élément audio, et le RÉUTILISE pour lire', async () => {
    // Le cœur du correctif iOS : un élément créé après l'appel réseau n'a
    // jamais reçu l'autorisation de l'utilisateur, et son play() est refusé.
    const instances: FauxAudio[] = [];
    class FauxAudio {
      src = '';
      lang = '';
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause = vi.fn();
      play = vi.fn(async () => {
        // La lecture se termine aussitôt : on teste le câblage, pas le son.
        queueMicrotask(() => this.onended?.());
      });
      constructor() {
        instances.push(this);
      }
    }
    vi.stubGlobal('Audio', FauxAudio);
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).endsWith('/session')
          ? ({ ok: true, json: async () => ({ token: 'j', expires_in: 900 }) } as Response)
          : ({ ok: true, status: 200, blob: async () => new Blob(['son']) } as Response),
      ),
    );

    const m = moteur();
    m.amorcer!();
    expect(instances).toHaveLength(1);
    expect(instances[0].src).toContain('data:audio/wav');
    // Le silence doit contenir des échantillons : un WAV réduit à son en-tête
    // n'est pas joué par Safari, et l'élément n'est alors jamais déverrouillé.
    const octets = Uint8Array.from(atob(instances[0].src.split(',')[1]!), (c) => c.charCodeAt(0));
    const vue = new DataView(octets.buffer);
    expect(vue.getUint32(40, true)).toBeGreaterThan(0); // taille du chunk `data`

    await m.parler('Naka nga def.', { lang: 'wo-SN', signal: new AbortController().signal });

    // Toujours UN seul élément : celui que le clic a déverrouillé.
    expect(instances).toHaveLength(1);
    expect(instances[0].src).toBe('blob:x');
  });

  it('ne se déclare pas capable de lire sans API configurée', () => {
    vi.stubGlobal('Audio', function Audio() {});
    expect(creerMoteurRagServeur({ base: () => '' }).peutParler('wo-SN')).toBe(false);
  });

  it('transcrit ce qui a été enregistré quand l’utilisateur dit avoir fini', async () => {
    const fetchSimule = reponses({});
    vi.stubGlobal('fetch', fetchSimule);
    const fin = new AbortController();
    bientot(fin);

    const texte = await moteur().ecouter({
      lang: 'wo-SN',
      signal: new AbortController().signal,
      signalFin: fin.signal,
    });

    expect(texte).toBe('Naka nga def');
    const appel = fetchSimule.mock.calls.find(([url]) => String(url).endsWith('/transcribe'))!;
    const corps = (appel[1] as RequestInit).body as FormData;
    expect(corps.get('lang')).toBe('wo-SN');
    expect(corps.get('file')).toBeInstanceOf(Blob);
  });

  it('transmet le profil vocal de la variante à /transcribe, et seulement s’il existe', async () => {
    const fetchSimule = reponses({});
    vi.stubGlobal('fetch', fetchSimule);

    for (const profil of ['alt', undefined]) {
      const fin = new AbortController();
      bientot(fin);
      await moteur().ecouter({
        lang: 'wo-SN',
        signal: new AbortController().signal,
        signalFin: fin.signal,
        profil,
      });
    }

    const corps = fetchSimule.mock.calls
      .filter(([url]) => String(url).endsWith('/transcribe'))
      .map(([, init]) => (init as RequestInit).body as FormData);
    expect(corps[0].get('voice_profile')).toBe('alt');
    // Sans profil, le champ n'existe pas : la voix par défaut reste celle de l'API.
    expect(corps[1].has('voice_profile')).toBe(false);
  });

  it('transmet le profil vocal de la variante à /speak', async () => {
    class FauxAudio {
      src = '';
      lang = '';
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause = vi.fn();
      play = vi.fn(async () => {
        queueMicrotask(() => this.onended?.());
      });
    }
    vi.stubGlobal('Audio', FauxAudio);
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
    const fetchSimule = vi.fn(async (url: string) =>
      String(url).endsWith('/session')
        ? ({ ok: true, json: async () => ({ token: 'j', expires_in: 900 }) } as Response)
        : ({ ok: true, status: 200, blob: async () => new Blob(['son']) } as Response),
    );
    vi.stubGlobal('fetch', fetchSimule);

    const m = moteur();
    const signal = new AbortController().signal;
    await m.parler('Naka nga def.', { lang: 'wo-SN', signal, profil: 'alt' });
    await m.parler('Naka nga def.', { lang: 'wo-SN', signal });

    const corps = fetchSimule.mock.calls
      .filter(([url]) => String(url).endsWith('/speak'))
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
    expect(corps[0]).toMatchObject({ text: 'Naka nga def.', voice_profile: 'alt' });
    expect(corps[1]).not.toHaveProperty('voice_profile');
  });

  it('rapporte la langue entendue — c’est elle qui commande toute la suite', async () => {
    vi.stubGlobal('fetch', reponses({ corps: { text: 'Naka nga def', lang: 'wo' } }));
    const fin = new AbortController();
    bientot(fin);
    const langues: string[] = [];

    await moteur().ecouter({
      lang: 'wo-SN',
      signal: new AbortController().signal,
      signalFin: fin.signal,
      onLangue: (l) => langues.push(l),
    });

    expect(langues).toEqual(['wo']);
  });

  it('ne rapporte aucune langue quand le service n’en déclare pas', async () => {
    vi.stubGlobal('fetch', reponses({ corps: { text: 'Naka nga def', lang: null } }));
    const fin = new AbortController();
    bientot(fin);
    const langues: string[] = [];

    await moteur().ecouter({
      lang: 'wo-SN',
      signal: new AbortController().signal,
      signalFin: fin.signal,
      onLangue: (l) => langues.push(l),
    });

    // Mieux vaut aucune langue qu'une langue inventée : l'échange reste en
    // « auto », et l'API répond dans la langue de la question.
    expect(langues).toEqual([]);
  });

  it('libère le micro même quand la transcription échoue', async () => {
    vi.stubGlobal('fetch', reponses({ ok: false, status: 503 }));
    const fin = new AbortController();
    bientot(fin);

    await expect(
      moteur().ecouter({
        lang: 'wo-SN',
        signal: new AbortController().signal,
        signalFin: fin.signal,
      }),
    ).rejects.toThrow(ErreurVocale);

    expect(arretPistes).toHaveBeenCalled();
  });

  it('rend « aucun-son » plutôt qu’une panne quand rien n’a été transcrit', async () => {
    vi.stubGlobal('fetch', reponses({ corps: { text: '   ', lang: null } }));
    const fin = new AbortController();
    bientot(fin);

    const echec = await moteur()
      .ecouter({
        lang: 'wo-SN',
        signal: new AbortController().signal,
        signalFin: fin.signal,
      })
      .catch((erreur: ErreurVocale) => erreur);

    expect((echec as ErreurVocale).code).toBe('aucun-son');
  });

  it('un micro refusé n’est pas un échec générique', async () => {
    const refus = Object.assign(new Error('refus'), { name: 'NotAllowedError' });
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(refus) },
    });

    const echec = await moteur()
      .ecouter({ lang: 'fr-FR', signal: new AbortController().signal })
      .catch((erreur: ErreurVocale) => erreur);

    expect((echec as ErreurVocale).code).toBe('permission-refusee');
  });

  it('une annulation jette l’enregistrement au lieu de le transcrire', async () => {
    const fetchSimule = reponses({});
    vi.stubGlobal('fetch', fetchSimule);
    const abandon = new AbortController();
    bientot(abandon);

    const echec = await moteur()
      .ecouter({ lang: 'wo-SN', signal: abandon.signal })
      .catch((erreur: ErreurVocale) => erreur);

    expect((echec as ErreurVocale).code).toBe('annule');
    expect(fetchSimule.mock.calls.some(([url]) => String(url).endsWith('/transcribe'))).toBe(false);
    expect(arretPistes).toHaveBeenCalled();
  });
});

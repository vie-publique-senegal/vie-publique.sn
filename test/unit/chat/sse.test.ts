import { describe, expect, it } from 'vitest';
import { createSseDecoder } from '../../../app/lib/chat/sse';

/**
 * Le parseur SSE est l'endroit où une régression est invisible à l'œil : le flux
 * « marche » sur un réseau rapide (un seul chunk bien formé) et casse en
 * production, où les chunks tombent n'importe où.
 */
describe('createSseDecoder', () => {
  it('décode un événement complet', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('event: token\ndata: {"text":"Bonjour"}\n\n')).toEqual([
      { event: 'token', data: '{"text":"Bonjour"}' },
    ]);
  });

  it('rend plusieurs événements présents dans un même chunk', () => {
    const decodeur = createSseDecoder();
    const evenements = decodeur.push(
      'event: token\ndata: {"text":"a"}\n\nevent: token\ndata: {"text":"b"}\n\n',
    );
    expect(evenements.map((e) => e.data)).toEqual(['{"text":"a"}', '{"text":"b"}']);
  });

  it("n'émet rien tant que l'événement n'est pas terminé", () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('event: token\ndata: {"text":"incomplet"}\n')).toEqual([]);
  });

  it('recolle une ligne coupée au milieu par la frontière de chunk', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('event: token\ndata: {"te')).toEqual([]);
    expect(decodeur.push('xt":"coupé"}\n\n')).toEqual([
      { event: 'token', data: '{"text":"coupé"}' },
    ]);
  });

  it('recolle un séparateur \\n\\n à cheval sur deux chunks', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('event: token\ndata: {"text":"a"}\n')).toEqual([]);
    expect(decodeur.push('\nevent: done\ndata: {}\n\n')).toEqual([
      { event: 'token', data: '{"text":"a"}' },
      { event: 'done', data: '{}' },
    ]);
  });

  it('ignore les commentaires de keep-alive', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push(': keep-alive\n\n')).toEqual([]);
    expect(decodeur.push(': keep-alive\nevent: token\ndata: {"text":"a"}\n\n')).toEqual([
      { event: 'token', data: '{"text":"a"}' },
    ]);
  });

  it('ignore un keep-alive coupé entre deux chunks', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push(': keep')).toEqual([]);
    expect(decodeur.push('-alive\n\nevent: done\ndata: {}\n\n')).toEqual([
      { event: 'done', data: '{}' },
    ]);
  });

  it('concatène les champs data multi-lignes avec des retours à la ligne', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('event: token\ndata: ligne 1\ndata: ligne 2\n\n')).toEqual([
      { event: 'token', data: 'ligne 1\nligne 2' },
    ]);
  });

  it("n'enlève qu'un seul espace après le deux-points", () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('data:  deux espaces\n\n')).toEqual([
      { event: 'message', data: ' deux espaces' },
    ]);
  });

  it('accepte un champ sans espace après le deux-points', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('event:done\ndata:{}\n\n')).toEqual([{ event: 'done', data: '{}' }]);
  });

  it('vaut « message » quand aucun nom d’événement n’est donné', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('data: brut\n\n')).toEqual([{ event: 'message', data: 'brut' }]);
  });

  it('gère les fins de ligne \\r\\n', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('event: token\r\ndata: {"text":"a"}\r\n\r\n')).toEqual([
      { event: 'token', data: '{"text":"a"}' },
    ]);
  });

  it('gère un \\r\\n coupé entre les deux caractères', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('data: a\r')).toEqual([]);
    expect(decodeur.push('\n\r\n')).toEqual([{ event: 'message', data: 'a' }]);
  });

  it('ne distribue pas un événement sans champ data', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('event: bruit\n\n')).toEqual([]);
  });

  it('ne réutilise pas le nom d’événement précédent', () => {
    const decodeur = createSseDecoder();
    decodeur.push('event: sources\ndata: {}\n\n');
    expect(decodeur.push('data: suite\n\n')).toEqual([{ event: 'message', data: 'suite' }]);
  });

  it('rend un dernier événement non terminé par une ligne vide au flush', () => {
    const decodeur = createSseDecoder();
    expect(decodeur.push('event: done\ndata: {"a":1}')).toEqual([]);
    expect(decodeur.flush()).toEqual([{ event: 'done', data: '{"a":1}' }]);
  });

  it('ne rend rien au flush quand le flux est propre', () => {
    const decodeur = createSseDecoder();
    decodeur.push('event: done\ndata: {}\n\n');
    expect(decodeur.flush()).toEqual([]);
  });

  it('reconstitue un flux découpé caractère par caractère', () => {
    const decodeur = createSseDecoder();
    const flux =
      'event: token\ndata: {"text":"Bonjour"}\n\n: keep-alive\n\nevent: done\ndata: {}\n\n';
    const recus = [...flux].flatMap((caractere) => decodeur.push(caractere));
    expect(recus).toEqual([
      { event: 'token', data: '{"text":"Bonjour"}' },
      { event: 'done', data: '{}' },
    ]);
  });
});

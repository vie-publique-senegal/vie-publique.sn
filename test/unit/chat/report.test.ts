import { describe, expect, it } from 'vitest';
import { construireRetour } from '../../../app/lib/chat/report';

const BASE = {
  variant: { id: 'gemini', label: 'API RAG Gemini' },
  url: 'https://www.vie-publique.sn/chat/gemini',
  date: new Date('2026-08-04T10:30:00.000Z'),
  reponse: 'Le déficit est de 1 245,1 milliards de FCFA.',
};

describe('construireRetour', () => {
  it('porte de quoi remonter la trace : variante, URL, conversation, date', () => {
    const retour = construireRetour({
      ...BASE,
      conversationId: '480aacdd-b61d-4d31-b1cb-c112f77667c0',
      question: 'Quel déficit ?',
    });

    expect(retour).toContain('Variante : gemini (API RAG Gemini)');
    expect(retour).toContain('URL : https://www.vie-publique.sn/chat/gemini');
    expect(retour).toContain('Conversation : 480aacdd-b61d-4d31-b1cb-c112f77667c0');
    expect(retour).toContain('Date : 2026-08-04T10:30:00.000Z');
    expect(retour).toContain('Question : Quel déficit ?');
    expect(retour).toContain('Le déficit est de 1 245,1 milliards de FCFA.');
  });

  it("écrit l'absence d'identifiant plutôt qu'un blanc", () => {
    const retour = construireRetour({ ...BASE, conversationId: null });
    expect(retour).toContain('Conversation : aucun identifiant fourni par cette variante');
  });

  it('liste les sources avec leur page et leur lien', () => {
    const retour = construireRetour({
      ...BASE,
      sources: [
        {
          title: 'PLF 2026',
          page: 14,
          pageUrl: 'https://www.vie-publique.sn/documents/42/plf-2026',
        },
        { title: 'Rapport sans page' },
      ],
    });

    expect(retour).toContain(
      '- PLF 2026 (p. 14) https://www.vie-publique.sn/documents/42/plf-2026',
    );
    expect(retour).toContain('- Rapport sans page');
  });

  it('omet les sections vides', () => {
    const retour = construireRetour(BASE);
    expect(retour).not.toContain('Sources citées');
    expect(retour).not.toContain('Détails techniques');
    expect(retour).not.toContain('Erreur :');
  });

  it("inclut l'erreur quand la réponse a échoué", () => {
    const retour = construireRetour({
      ...BASE,
      reponse: '',
      erreur: { code: 'rate_limited', message: 'Trop de questions à la minute.' },
    });

    expect(retour).toContain('(aucune réponse)');
    expect(retour).toContain('Erreur : rate_limited — Trop de questions à la minute.');
  });

  it('aplatit les métadonnées sans les interpréter', () => {
    const retour = construireRetour({
      ...BASE,
      meta: { model: 'gemini-3.6-flash', latency_ms: 2310 },
    });
    expect(retour).toContain('Détails techniques : model=gemini-3.6-flash, latency_ms=2310');
  });
});

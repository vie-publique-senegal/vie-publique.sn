import { describe, expect, it } from 'vitest';
import { normaliserLatex } from '../../../app/lib/chat/latex';

describe('normaliserLatex', () => {
  describe('les cas réellement rencontrés', () => {
    it('rend lisible un numéro de loi', () => {
      expect(normaliserLatex('la loi $n^{\\circ}2023-18$ du 15 décembre 2023')).toBe(
        'la loi n° 2023-18 du 15 décembre 2023',
      );
    });

    it('rend lisible un numéro de décret', () => {
      expect(normaliserLatex('le décret $n^{\\circ}2024-921$ du 2 avril 2024')).toBe(
        'le décret n° 2024-921 du 2 avril 2024',
      );
    });

    it("accepte les variantes d'écriture du degré", () => {
      expect(normaliserLatex('$n^\\circ 2023-18$')).toBe('n° 2023-18');
      expect(normaliserLatex('$n{\\circ}2023-18$')).toBe('n° 2023-18');
      expect(normaliserLatex('$n^{\\circ} 2023-18$')).toBe('n° 2023-18');
    });

    it('traite plusieurs expressions dans le même texte', () => {
      expect(normaliserLatex('la loi $n^{\\circ}2023-18$ et le décret $n^{\\circ}2024-921$')).toBe(
        'la loi n° 2023-18 et le décret n° 2024-921',
      );
    });
  });

  describe("ce qu'il ne faut PAS casser", () => {
    it('laisse les montants en dollars intacts', () => {
      expect(normaliserLatex('coûte $100 et $200 au total')).toBe('coûte $100 et $200 au total');
    });

    it('laisse un dollar isolé intact', () => {
      expect(normaliserLatex('un budget de 5 $ par habitant')).toBe(
        'un budget de 5 $ par habitant',
      );
    });

    it('laisse un texte sans dollar strictement inchangé', () => {
      const texte = 'La loi n° 2023-18 du 15 décembre 2023 porte loi de finances.';
      expect(normaliserLatex(texte)).toBe(texte);
    });

    it('est idempotente', () => {
      const entree = 'la loi $n^{\\circ}2023-18$';
      const premier = normaliserLatex(entree);
      expect(normaliserLatex(premier)).toBe(premier);
    });

    it('supporte une chaîne vide', () => {
      expect(normaliserLatex('')).toBe('');
    });
  });

  describe('constructions LaTeX courantes', () => {
    it('déroule les enrobages typographiques', () => {
      expect(normaliserLatex('$\\text{Budget}_{2024}$')).toBe('Budget2024');
      expect(normaliserLatex('$\\mathrm{FCFA}$')).toBe('FCFA');
    });

    it('réduit exposants et indices', () => {
      expect(normaliserLatex('$x^{2}$')).toBe('x2');
      expect(normaliserLatex('$T_{1}$')).toBe('T1');
    });

    it('rend les espacements et les caractères échappés', () => {
      expect(normaliserLatex('$5\\,\\%$')).toBe('5 %');
    });

    it('traite un bloc $$…$$', () => {
      expect(normaliserLatex('$$n^{\\circ}2023-18$$')).toBe('n° 2023-18');
    });

    it("garde le nom d'une commande inconnue plutôt que l'antislash", () => {
      expect(normaliserLatex('$\\alpha$')).toBe('alpha');
    });
  });
});

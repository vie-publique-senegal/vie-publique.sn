import { describe, it, expect } from 'vitest';
import { durationDays, mergePeriods, totalDurationDays } from '../../../shared/leader-periods';

// Cas réel : Moustapha Niasse, PM en 1983 puis de 2000 à 2001.
const NIASSE = [
  { start_date: '1983-04-03', end_date: '1983-04-29' },
  { start_date: '2000-04-05', end_date: '2001-03-04' },
];

// Cas réel : Abdou Diouf PM, 9 gouvernements contigus (1970 → 1981).
const CONTIGUOUS = [
  { start_date: '1970-02-28', end_date: '1970-12-14' },
  { start_date: '1970-12-14', end_date: '1971-04-10' },
  { start_date: '1971-04-10', end_date: '1972-06-08' },
];

describe('leader-periods', () => {
  describe('mergePeriods', () => {
    it('fusionne des gouvernements contigus en un seul passage', () => {
      expect(mergePeriods(CONTIGUOUS)).toEqual([
        { start_date: '1970-02-28', end_date: '1972-06-08' },
      ]);
    });

    it('garde deux passages distincts séparés par une interruption', () => {
      expect(mergePeriods(NIASSE)).toEqual(NIASSE);
    });

    it('tolère un intérim de quelques jours entre deux décrets', () => {
      expect(
        mergePeriods([
          { start_date: '1981-01-01', end_date: '1981-01-03' },
          { start_date: '1981-01-05', end_date: '1983-04-03' },
        ]),
      ).toEqual([{ start_date: '1981-01-01', end_date: '1983-04-03' }]);
    });

    it('un mandat en cours (end null) reste ouvert et absorbe la suite', () => {
      expect(
        mergePeriods([
          { start_date: '2024-04-05', end_date: '2025-09-06' },
          { start_date: '2025-09-06', end_date: null },
        ]),
      ).toEqual([{ start_date: '2024-04-05', end_date: null }]);
    });

    it('trie les intervalles avant de fusionner', () => {
      expect(mergePeriods([...NIASSE].reverse())).toEqual(NIASSE);
    });

    it('retourne une liste vide sans gouvernement', () => {
      expect(mergePeriods([])).toEqual([]);
    });
  });

  describe('totalDurationDays', () => {
    it('additionne les passages au lieu de mesurer première → dernière date', () => {
      const spanDays = durationDays('1983-04-03', '2001-03-04'); // ≈ 18 ans (faux)
      const total = totalDurationDays(NIASSE); // 26 + 333 jours
      expect(total).toBe(26 + 333);
      expect(total).toBeLessThan(spanDays);
    });

    it('vaut la durée globale pour des gouvernements contigus', () => {
      expect(totalDurationDays(CONTIGUOUS)).toBe(durationDays('1970-02-28', '1972-06-08'));
    });
  });
});

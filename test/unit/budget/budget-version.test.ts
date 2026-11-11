import { describe, expect, it } from 'vitest';

import {
  budgetVersionArticle,
  budgetVersionOf,
  describeBudgetVersion,
  pickPriorityBudgetVersion,
  resolveLatestBudget,
} from '#shared/budget-version';

// Les versions arrivent de `/api/budget/years` triées par DATE CROISSANTE.
const PLF_2027 = { id: 8, label: 'PLF', date: '2026-10-14' };
const LFI_2027 = { id: 9, label: 'LFI', date: '2026-12-20' };
const LFR_2027 = { id: 10, label: 'LFR', date: '2027-06-30' };
const LFI_2026 = { id: 5, label: 'LFI', date: '2025-12-18' };

describe('pickPriorityBudgetVersion', () => {
  it("retient l'unique version publiée", () => {
    expect(pickPriorityBudgetVersion([PLF_2027])).toBe(PLF_2027);
  });

  it('préfère la LFI votée au PLF, même si le PLF est listé en premier', () => {
    // Régression : un `find` sur un tableau trié par date croissante renvoyait
    // le PLF — un projet de loi affiché comme s'il était adopté.
    expect(pickPriorityBudgetVersion([PLF_2027, LFI_2027])).toBe(LFI_2027);
  });

  it('préfère la LFR à la LFI et au PLF', () => {
    expect(pickPriorityBudgetVersion([PLF_2027, LFI_2027, LFR_2027])).toBe(LFR_2027);
  });

  it('ignore la casse et les espaces du sigle', () => {
    const lfi = { id: 11, label: ' lfi ', date: '2026-12-20' };
    expect(pickPriorityBudgetVersion([PLF_2027, lfi])).toBe(lfi);
  });

  it('retombe sur la date la plus récente pour des sigles inconnus', () => {
    const lfc = { id: 12, label: 'LFC', date: '2027-03-01' };
    const autre = { id: 13, label: 'DOB', date: '2026-05-01' };
    expect(pickPriorityBudgetVersion([autre, lfc])).toBe(lfc);
  });

  it('retourne undefined sans version', () => {
    expect(pickPriorityBudgetVersion([])).toBeUndefined();
  });
});

describe('resolveLatestBudget', () => {
  const years = [
    { year: 2027, versions: [PLF_2027] },
    { year: 2026, versions: [LFI_2026] },
  ];

  it('retient le dernier exercice publié et sa version', () => {
    expect(resolveLatestBudget(years)).toEqual({
      year: 2027,
      versionId: 8,
      versionLabel: 'PLF',
    });
  });

  it("bascule sur la LFI dès qu'elle est publiée à côté du PLF", () => {
    const withLfi = [{ year: 2027, versions: [PLF_2027, LFI_2027] }, years[1]];
    expect(resolveLatestBudget(withLfi)).toEqual({
      year: 2027,
      versionId: 9,
      versionLabel: 'LFI',
    });
  });

  it("ne dépend pas de l'ordre du tableau d'années", () => {
    expect(resolveLatestBudget([...years].reverse())?.year).toBe(2027);
  });

  it('ignore les exercices sans version publiée', () => {
    const withEmpty = [{ year: 2028, versions: [] }, ...years];
    expect(resolveLatestBudget(withEmpty)?.year).toBe(2027);
  });

  it('retourne null sans donnée', () => {
    expect(resolveLatestBudget([])).toBeNull();
  });
});

describe('describeBudgetVersion', () => {
  it('distingue un projet de loi d’une loi adoptée', () => {
    expect(describeBudgetVersion('PLF')).toEqual({
      code: 'PLF',
      label: 'Projet de loi de finances',
      status: 'En examen au Parlement',
      isDraft: true,
      gender: 'm',
    });
    expect(describeBudgetVersion('LFI').isDraft).toBe(false);
    expect(describeBudgetVersion('LFR').label).toBe('Loi de finances rectificative');
  });

  it("n'affirme rien pour un sigle inconnu ou absent", () => {
    for (const code of ['LFC', '', undefined, null]) {
      const described = describeBudgetVersion(code);
      expect(described.label).toBe('Loi de finances');
      expect(described.status).toBe('');
      expect(described.isDraft).toBe(false);
    }
  });
});

describe('accord grammatical', () => {
  // Sans genre porté par le module, les pages devinaient l'accord et
  // produisaient « de la projet de loi de finances ».
  it('accorde les articles sur le genre du libellé', () => {
    expect(budgetVersionArticle(describeBudgetVersion('PLF'))).toBe('Le');
    expect(budgetVersionOf(describeBudgetVersion('PLF'))).toBe('du');

    for (const code of ['LFI', 'LFR']) {
      expect(budgetVersionArticle(describeBudgetVersion(code))).toBe('La');
      expect(budgetVersionOf(describeBudgetVersion(code))).toBe('de la');
    }
  });

  it('accorde au féminin le repli « Loi de finances »', () => {
    expect(budgetVersionOf(describeBudgetVersion('INCONNU'))).toBe('de la');
  });
});

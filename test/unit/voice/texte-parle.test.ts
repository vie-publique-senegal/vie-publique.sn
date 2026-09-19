import { describe, expect, it } from 'vitest';
import { nettoyerPourLecture, vautLaPeineDEtreLu } from '../../../app/lib/voice/texte-parle';

/**
 * La réponse est écrite pour être LUE À L'ÉCRAN. Passée telle quelle au
 * synthétiseur, elle donne « astérisque astérisque le déficit astérisque
 * astérisque, h-t-t-p-s deux-points barre oblique barre oblique… ».
 */
describe('nettoyerPourLecture', () => {
  it('retire l’emphase markdown', () => {
    expect(nettoyerPourLecture('**Le déficit** se _creuse_.')).toBe('Le déficit se creuse.');
  });

  it('retire les titres et les marqueurs de liste', () => {
    expect(nettoyerPourLecture('## Le budget')).toBe('Le budget');
    expect(nettoyerPourLecture('- Premier point')).toBe('Premier point');
    expect(nettoyerPourLecture('1. Premier point')).toBe('Premier point');
    expect(nettoyerPourLecture('> Une citation')).toBe('Une citation');
  });

  it('garde le libellé d’un lien et jette l’URL', () => {
    expect(
      nettoyerPourLecture('Voir [la loi de finances](https://vie-publique.sn/documents/42).'),
    ).toBe('Voir la loi de finances.');
  });

  it('gère la syntaxe maison [[libellé]](url) héritée du chat Azure', () => {
    expect(nettoyerPourLecture('[[Loi de finances 2026]](https://vie-publique.sn/d/42)')).toBe(
      'Loi de finances 2026',
    );
  });

  it('ne fait pas lire les URLs nues', () => {
    expect(
      nettoyerPourLecture('Voir https://www.vie-publique.sn/documents/42 pour le détail.'),
    ).toBe('Voir pour le détail.');
    expect(nettoyerPourLecture('Voir www.vie-publique.sn pour le détail.')).toBe(
      'Voir pour le détail.',
    );
  });

  it('retire les renvois de sources — elles s’affichent, elles ne s’énoncent pas', () => {
    expect(nettoyerPourLecture('Le déficit [1] atteint 5 % [2, 3].')).toBe(
      'Le déficit atteint 5 %.',
    );
  });

  it('jette les images sans lire leur texte alternatif', () => {
    expect(nettoyerPourLecture('![Graphique du déficit](https://x.sn/g.png) Le déficit.')).toBe(
      'Le déficit.',
    );
  });

  it('rend un tableau en énumération et jette sa ligne de séparation', () => {
    expect(nettoyerPourLecture('| Année | Montant |\n|---|---|\n| 2026 | 1 245 |')).toBe(
      'Année, Montant, 2026, 1 245',
    );
  });

  it('jette les blocs de code, y compris tronqués par le découpage', () => {
    expect(nettoyerPourLecture('```json\n{"a":1}\n```')).toBe('');
    expect(nettoyerPourLecture('```json\n{"a":1}')).toBe('{"a":1}');
  });

  it('replie le pseudo-gras Unicode du corpus (règle §11 du CLAUDE.md)', () => {
    // Sans NFKC, le synthétiseur épelle ou saute ces caractères du plan astral.
    expect(nettoyerPourLecture('𝐎𝐛𝐣𝐞𝐭 du rapport')).toBe('Objet du rapport');
  });

  it('décode les entités et retire le HTML résiduel', () => {
    expect(nettoyerPourLecture('<strong>L&eacute;conomie</strong> cro&icirc;t')).toBe(
      'Léconomie croît',
    );
  });

  it('écrase les blancs et retire la ponctuation orpheline en bord', () => {
    expect(nettoyerPourLecture('  ,  Le   déficit   se creuse ,  ')).toBe('Le déficit se creuse');
  });

  it('conserve les deux-points finaux (pause utile, jamais prononcée)', () => {
    expect(nettoyerPourLecture('Trois départements sont touchés :')).toBe(
      'Trois départements sont touchés :',
    );
  });

  it('n’expanse AUCUNE abréviation — ce serait spécifique au français', () => {
    // Le wolof est la cible d'une version suivante : ce module reste agnostique.
    expect(nettoyerPourLecture('Le déficit est de 1 245,1 Mds, soit 5,37 % du PIB.')).toBe(
      'Le déficit est de 1 245,1 Mds, soit 5,37 % du PIB.',
    );
  });
});

describe('vautLaPeineDEtreLu', () => {
  it('rejette ce qui ne contient ni lettre ni chiffre', () => {
    expect(vautLaPeineDEtreLu('')).toBe(false);
    expect(vautLaPeineDEtreLu('  ')).toBe(false);
    expect(vautLaPeineDEtreLu('.')).toBe(false);
    expect(vautLaPeineDEtreLu('— , —')).toBe(false);
  });

  it('accepte du texte réel', () => {
    expect(vautLaPeineDEtreLu('Le déficit se creuse.')).toBe(true);
    expect(vautLaPeineDEtreLu('2026')).toBe(true);
  });

  it('rejette une ligne de tableau une fois nettoyée', () => {
    expect(vautLaPeineDEtreLu(nettoyerPourLecture('|---|---|'))).toBe(false);
  });
});

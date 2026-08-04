import { describe, expect, it } from 'vitest';
import { creerTamponPhrases } from '../../../app/lib/voice/phrases';

/**
 * Le découpage en phrases est, comme le parseur SSE, un endroit où la régression
 * est invisible à l'œil : sur un réseau rapide les tokens arrivent en gros
 * morceaux bien ponctués et tout « marche ». En production ils tombent au milieu
 * d'un nombre ou entre les deux points d'une abréviation.
 *
 * `longueurMin` est abaissée dans la plupart des cas pour tester la RÈGLE de
 * coupe isolément ; un test dédié couvre la valeur par défaut.
 */
describe('creerTamponPhrases', () => {
  const tampon = (longueurMin = 5) => creerTamponPhrases({ longueurMin });

  it('émet une phrase terminée par un point suivi d’un blanc', () => {
    expect(tampon().pousser('Le déficit se creuse. ')).toEqual(['Le déficit se creuse.']);
  });

  it("n'émet rien tant que rien ne suit la ponctuation", () => {
    // Décisif : « 3. » peut encore devenir « 3.5 » au fragment suivant.
    expect(tampon().pousser('Le déficit se creuse.')).toEqual([]);
  });

  it('recolle une phrase coupée en plein milieu par la frontière de fragment', () => {
    const t = tampon();
    expect(t.pousser('Le déficit se creu')).toEqual([]);
    expect(t.pousser('se. Et le plafond ')).toEqual(['Le déficit se creuse.']);
  });

  it('ne coupe pas sur une décimale à point', () => {
    expect(tampon().pousser('La croissance atteint 8.0 % cette année. ')).toEqual([
      'La croissance atteint 8.0 % cette année.',
    ]);
  });

  it('ne coupe pas sur une décimale à virgule (format du corpus)', () => {
    expect(tampon().pousser('Le déficit atteint 1 245,1 milliards. ')).toEqual([
      'Le déficit atteint 1 245,1 milliards.',
    ]);
  });

  it('ne coupe pas après une initiale isolée', () => {
    expect(tampon().pousser('Le rapport de M. Diop est clair. ')).toEqual([
      'Le rapport de M. Diop est clair.',
    ]);
  });

  it('ne coupe pas après une abréviation du corpus', () => {
    expect(tampon().pousser("L'art. 3 de la loi le prévoit. ")).toEqual([
      "L'art. 3 de la loi le prévoit.",
    ]);
  });

  it('ne coupe pas sur le point d’un item de liste numérotée', () => {
    expect(tampon().pousser('1. Le premier point est important. ')).toEqual([
      '1. Le premier point est important.',
    ]);
  });

  it('coupe en fin de ligne (titre, item de liste)', () => {
    expect(tampon().pousser('Titre du rapport\n\nLe contenu suit. ')).toEqual([
      'Titre du rapport',
      'Le contenu suit.',
    ]);
  });

  it('traverse les points de suspension sans les découper', () => {
    expect(tampon().pousser('Il hésite... Puis il répond. ')).toEqual([
      'Il hésite...',
      'Puis il répond.',
    ]);
  });

  it('coupe après les marqueurs markdown fermants', () => {
    // Le markdown est CONSERVÉ : le nettoyage est la responsabilité de
    // texte-parle.ts. Deux modules, deux jeux de tests.
    expect(tampon().pousser('**Le déficit se creuse.** Le plafond aussi. ')).toEqual([
      '**Le déficit se creuse.**',
      'Le plafond aussi.',
    ]);
  });

  it('ne coupe pas au milieu d’une URL', () => {
    expect(tampon().pousser('Voir https://www.vie-publique.sn/documents pour le détail. ')).toEqual(
      ['Voir https://www.vie-publique.sn/documents pour le détail.'],
    );
  });

  it('fusionne une phrase trop courte avec la suivante', () => {
    // Sinon la lecture devient hachée : « Oui. » puis un silence.
    expect(
      creerTamponPhrases({ longueurMin: 40 }).pousser(
        'Oui. Le déficit prévu par le projet de loi de finances est de 1 245 milliards. ',
      ),
    ).toEqual(['Oui. Le déficit prévu par le projet de loi de finances est de 1 245 milliards.']);
  });

  it('coupe de force au dernier espace au-delà de la longueur maximale', () => {
    // Sans ce garde-fou, un paragraphe mal ponctué ne serait JAMAIS lu.
    const t = creerTamponPhrases({ longueurMin: 5, longueurMax: 20 });
    expect(t.pousser('un texte assez long sans aucune ponctuation du tout')).toEqual([
      'un texte assez long',
      'sans aucune',
    ]);
    expect(t.vider()).toEqual(['ponctuation du tout']);
  });

  it('rend plusieurs phrases présentes dans un même fragment', () => {
    expect(tampon().pousser('Première phrase ici. Deuxième phrase là. Et une troisième. ')).toEqual(
      ['Première phrase ici.', 'Deuxième phrase là.', 'Et une troisième.'],
    );
  });

  it('vide le reliquat en fin de flux et se réinitialise', () => {
    const t = tampon();
    t.pousser('Une phrase sans ponctuation finale');
    expect(t.vider()).toEqual(['Une phrase sans ponctuation finale']);
    expect(t.vider()).toEqual([]);
  });

  it('reconstitue le même découpage caractère par caractère', () => {
    // Le pire cas réseau : un fragment par caractère.
    const texte = 'Le déficit se creuse. Le plafond d’emplois est relevé. ';
    const parCaractere = creerTamponPhrases({ longueurMin: 5 });
    const enUneFois = creerTamponPhrases({ longueurMin: 5 });

    const obtenu = [...texte].flatMap((c) => parCaractere.pousser(c));
    expect(obtenu).toEqual(enUneFois.pousser(texte));
    expect(obtenu).toEqual(['Le déficit se creuse.', 'Le plafond d’emplois est relevé.']);
  });

  it('n’émet jamais de phrase vide', () => {
    const t = tampon();
    expect(t.pousser('\n\n   \n')).toEqual([]);
    expect(t.vider()).toEqual([]);
  });
});

# Résolution des noms géographiques

> Comment le site et les scripts font correspondre les noms de lieux rencontrés
> dans les différentes sources (fichiers électoraux, recensement, Journal
> officiel, saisies passées ou futures) avec le référentiel géographique.

**Dernière mise à jour** : 2026-07-29

## 1. Pourquoi ce mécanisme existe

Un même lieu s'écrit rarement pareil d'une source à l'autre : abréviations,
désambiguïsations locales, coquilles, variantes graphiques (`M'Backé` contre
`Mbacké`, `Nioro` contre `Nioro du Rip`, `Djinaki` contre `Djinaky`). Sans
mécanisme de correspondance, chaque nouvel import buterait sur les mêmes
divergences, et chaque script réinventerait ses propres correspondances en dur.

Le référentiel tranche par une **graphie officielle** — celle du Journal
officiel, portée par `geo_entities.name_current` — et enregistre **toutes les
autres graphies rencontrées** dans une collection dédiée.

## 2. Où vit le dictionnaire

Collection Directus **`geo_entity_names`**. Une ligne = une graphie d'une
entité, telle qu'une source l'écrit.

| Champ | Rôle |
|---|---|
| `entity` | l'entité concernée (M2O vers `geo_entities`) |
| `name` | la graphie telle que publiée par la source (`M'BACKE`, `SAINT LOUIS`) |
| `name_normalized` | forme de comparaison : minuscules, sans accents, ponctuation et blancs réduits à un espace simple |
| `source` | provenance de la graphie : `jo` (Journal officiel), `rgph5` (recensement 2023), `daf` (fichiers électoraux) |
| `uk` | clé technique d'unicité `<entity>|<name_normalized>|<source>` |

État au 2026-07-29 : **1 488 lignes** — 753 `jo`, 553 `rgph5`, 182 `daf`.

Propriétés de ce choix :

- le dictionnaire vit **à côté du référentiel qu'il résout**, et non dans un
  fichier annexe ;
- un alias **survit à un renommage officiel** : il pointe l'entité, pas le nom.
  L'ancienne graphie continue de résoudre les fichiers historiques ;
- la même graphie vue au Journal officiel et dans un fichier électoral fait
  **deux lignes**, c'est voulu — la clé d'unicité inclut la source, qui
  documente qui écrit quoi ;
- une rédactrice peut ajouter un alias sans toucher au code.

## 3. Algorithme de résolution

La recherche se fait sur le **triplet (niveau, nom normalisé, parent)**. Une
recherche par nom seul est un défaut, pas un raccourci :

- **151 graphies normalisées désignent plusieurs entités de niveaux
  différents** — l'arrondissement et la commune de Dakar-Plateau, la région, le
  département et la ville de Dakar ;
- **5 noms de communes sont de vrais homonymes** entre départements : Médina
  Gounass, Dinguiraye, Missirah, Vélingara, Mlomp.

Pour toute graphie rencontrée :

1. **normaliser** la graphie (même règle que `name_normalized`) ;
2. chercher l'**égalité normalisée** sur `geo_entities.name_current`, au bon
   niveau, qualifiée par le parent ;
3. sinon, chercher dans **`geo_entity_names`**, mêmes qualifications ;
4. **aucune correspondance, ou plusieurs candidats** : ne pas résoudre. Le cas
   est remonté pour arbitrage humain. Jamais de résolution silencieuse, jamais
   d'appariement approximatif en production, jamais de correspondance codée en
   dur dans un script.

**Traiter les niveaux de haut en bas.** Une commune se qualifie par son
département *résolu*, pas par la graphie brute du département : sinon une seule
graphie de département non résolue fait échouer toutes ses communes — 2 graphies
suffisent à en bloquer 22.

> **Piège de la hiérarchie.** Le parent immédiat d'une commune est le plus
> souvent son **arrondissement** (497 communes sur 553 ; les 56 autres relèvent
> directement d'un département). Pour qualifier une commune par son
> département, remonter au **premier ancêtre de niveau département**, jamais le
> parent immédiat.

## 4. Deux graphies coexistent en base, et ce n'est pas une anomalie

`election_constituencies.name` porte la graphie des **fichiers électoraux** :
majuscules, sans accents (`KEDOUGOU`, `MALEM HODAR`, `NIORO DU RIP`).
`geo_entities.name_current` porte celle du **Journal officiel** (`Kédougou`,
`Malem Hoddar`, `Nioro`). **181 des 599 circonscriptions rattachées** diffèrent
ainsi de leur entité.

L'affichage public vient du référentiel. Le champ de la circonscription reste
la donnée d'origine, et sert encore de clé à la cascade de l'upload des procès-
verbaux.

Conséquence côté application : [`shared/geo-name.ts`](../../../shared/geo-name.ts)
fournit les deux règles, **non interchangeables** :

- `normalizeGeoName()` pour **comparer** deux graphies (résolution d'une valeur
  reçue en entrée) ;
- `toHistoricalGeoName()` pour **écrire** une valeur d'URL, la route de détail
  d'un département étant indexée en graphie historique.

`normalizeGeoName()` ne réconcilie que casse, accents et ponctuation :
`MALEM HODAR` et `Malem Hoddar` restent deux clés distinctes. C'est pourquoi la
résolution serveur ([`server/utils/electionConstituencyLookup.ts`](../../../server/utils/electionConstituencyLookup.ts))
indexe les **deux** graphies d'une circonscription — toute URL déjà indexée
continue de répondre, quelle que soit sa graphie.

## 5. Qui l'utilise

- **Les scripts d'import** (repo `vpsn-scripts`, dossier `elections/`) :
  rattachement des circonscriptions au référentiel, imports de fichiers
  électoraux, imports de données de recensement. C'est l'usage principal ;
- **le site ne lit pas `geo_entity_names`** : il n'en a pas besoin, l'identité
  lui vient de la clé étrangère `election_constituencies.geo_entity`. Seule
  exception de principe : la résolution d'un nom reçu dans une URL, qui passe
  par les graphies déjà présentes en base et non par le dictionnaire.

## 6. Étendre le dictionnaire

Le dictionnaire n'est **jamais régénéré** : il grossit par l'usage, et un alias
validé une fois reste valable à vie. Pour tout import futur :

1. le script remonte les graphies non résolues, sans les résoudre ;
2. arbitrage humain : soit une **entité nouvelle** (création d'une entité, de sa
   version et d'un événement sourcé par le texte officiel), soit une **graphie
   de plus** d'une entité existante ;
3. l'arbitrage est écrit dans `geo_entity_names` **par script**, depuis un
   fichier de correspondances, avec le drapeau d'écriture explicite — pas à la
   main, pour rester traçable et rejouable ;
4. le script d'import est rejoué : la graphie se résout, définitivement.

## 7. Validation croisée des correspondances

Trois sources indépendantes ont été comparées : recensement ANSD 2023, base des
bureaux de vote (`election_polling_stations.municipality` via `constituency`) et
un export ponctuel de la carte électorale 2023 (15 633 bureaux nationaux).

Les trois portent les **mêmes 553 paires (département, commune)** : 468 par
égalité exacte, 85 via le dictionnaire, **0 orpheline** dans les trois sens.

Ce contrôle vaut toujours : `geo_entity_names` porte l'intégralité de ces
correspondances, et le rattachement des 599 circonscriptions au référentiel se
fait sans aucune non-résolue.

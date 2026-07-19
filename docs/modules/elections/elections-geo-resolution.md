# Résolution des noms géographiques (communes et départements)

> Comment le site fait correspondre les noms de communes et de départements
> rencontrés dans les différentes sources (fichiers électoraux, recensement,
> saisies passées ou futures) avec le référentiel géographique canonique.

## 1. Pourquoi ce dictionnaire existe

La source canonique retenue à la place est le **recensement ANSD 2023**
(`scripts/elections/data/communes_senegal_2023.json`). Problème : les fichiers
électoraux de la DAF (2024 et antérieurs/futurs) n'orthographient pas toujours
les communes et départements comme l'ANSD — abréviations, désambiguïsations
locales, coquilles, variantes graphiques (`M'Backé` vs `Mbacké`, `Nioro` vs
`Nioro du Rip`, `Djinaki` vs `Djinaky`...). Sans mécanisme de correspondance,
chaque nouvel import buterait sur les mêmes divergences.

`geo-name-aliases.json` est ce mécanisme : un dictionnaire qui relie toute
graphie rencontrée dans une source au nom officiel du référentiel ANSD.

## 2. Portée et permanence

- **Dictionnaire permanent et cumulatif** : jamais régénéré depuis zéro. Un
  alias validé une fois reste valable à vie, y compris après un renommage
  officiel de l'entité. Exemple : le département historique « Birkilane »
  devient officiellement « Birkelane » — l'alias `Birkilane → Birkelane`
  continue de résoudre correctement tout fichier électoral passé qui
  utiliserait encore l'ancienne graphie ;
- **Valable pour tout fichier électoral**, passé ou futur, pas seulement celui
  en cours de traitement au moment de l'écriture d'une entrée ;
- **Jamais de correspondance en dur dans un script** : toute résolution nom →
  entité passe par ce fichier, pour que la logique reste auditable et
  réutilisable d'un script à l'autre.

## 3. Algorithme de résolution

Pour toute graphie rencontrée dans une source :

1. **Normaliser** la graphie (majuscules, sans accents ni ponctuation, espaces
   réduits) ;
2. Chercher l'**égalité normalisée** directement dans le référentiel ANSD ;
3. Sinon, chercher la graphie normalisée dans les **aliases** du dictionnaire
   → renvoie le nom officiel (`canonical`) ;
4. Pour les **communes**, toujours qualifier par le département : 5 homonymes
   avérés existent dans le référentiel (Mlomp, Médina Gounass, Dinguiraye,
   Missirah, Vélingara), donc une commune ne se résout jamais par son seul nom ;
5. **Aucune correspondance trouvée** = entité potentiellement nouvelle ou
   graphie non encore vue → le script remonte le cas **sans le résoudre
   silencieusement**, arbitrage humain, puis ajout de l'entrée au dictionnaire.

Exemple bout en bout : un fichier électoral mentionne le département
`Birkilane`. Étape 2 échoue (le référentiel ANSD porte `Birkelane`). Étape 3
trouve l'alias `Birkilane` sous l'entrée canonique `Birkelane` → résolution
réussie, aucun arbitrage nécessaire.

## 4. Structure du fichier

Deux sections, chacune une liste d'entités ayant **au moins un alias** (une
graphie absente du dictionnaire se résout d'abord par égalité normalisée avec
le référentiel, elle n'a pas besoin d'entrée ici) :

- **`departments`** : 6 cas où la graphie officielle a dû être arbitrée
  (Birkelane, Malem Hodar, Nioro du Rip, Mbacké, Koumpentoum, Mbour) — chaque
  entrée porte le nom retenu (`canonical`), ses graphies alternatives
  (`aliases`) et une `note` expliquant l'arbitrage ;
- **`municipalities`** : ~70 communes, chaque entrée qualifiée par son
  `department` (obligatoire, à cause des homonymes) et un `status` qui indique
  l'origine de la correspondance :
  - *« désambiguïsation/abréviation du fichier électoral »* : le fichier
    électoral utilise une forme raccourcie ou désambiguïsée (ex. `PLATEAU` →
    `DAKAR PLATEAU`, `NIORO` → `NIORO DU RIP`) ;
  - *« appariement automatique par distance d'édition, même département »* :
    coquille ou variante orthographique détectée automatiquement (distance de
    Levenshtein) puis validée manuellement, jamais appliquée hors du même
    département.

## 5. Validation déjà effectuée

Validation croisée à 3 sources indépendantes (2026-07-14) :

- **ANSD 2023** (source canonique) ;
- **base des bureaux de vote** (`election_polling_stations.municipality` via
  `constituency`, CMS dev = miroir prod 2024) ;
- **export ponctuel de la carte électorale 2023** (15 633 bureaux nationaux,
  champ `collectivite`) : fichier fourni hors repo pour cette seule
  vérification croisée, non conservé dans `scripts/elections/data/` (jamais
  consommé par un script — la résolution en base passe uniquement par les 2
  premières sources).

Les trois sources portent les **mêmes 553 paires (département, commune)** :
468 par égalité exacte, 85 via ce dictionnaire, **0 orpheline** dans les trois
sens. Seule divergence relevée : 4 électeurs sur 7 033 854 entre base et
fichier (mêmes comptes de bureaux) — écart jugé sans impact.

## 6. Qui l'utilise

Construit et validé en amont de son premier usage, puis consommé par 2
scripts : `backfill-geo-municipalities-ansd.mjs` (résolution du département de
chaque commune ANSD) et `reconcile-communes-contours.mjs` (réconciliation des
slugs des contours GeoJSON communaux). Tout script de résolution géographique
écrit par la suite doit passer par ce mécanisme plutôt que de coder ses
propres correspondances.

## 7. Étendre le dictionnaire

Un cas non résolu par l'algorithme (étape 5) ne doit **jamais** être tranché
silencieusement dans le code. Il doit être remonté pour arbitrage, puis, une
fois la décision prise, ajouté ici comme nouvelle entrée ou nouvel alias —
jamais réécrit en dur dans un script.

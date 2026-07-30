# Guide d'Insertion des Données Électorales

**Dernière mise à jour** : 2026-07-29

> ⚠️ Ce guide décrit le workflow de saisie CMS. Le modèle de données de référence est
> [elections-model.md](./elections-model.md) ; la géographie électorale (fichiers
> électoraux, bureaux, résultats, référentiel `geo_*`) est décrite en détail dans
> [elections-geographie.md](./elections-geographie.md) — les sections « Données
> cartographiques » ci-dessous en sont un résumé pratique, elles ne remplacent pas ce
> document en cas de divergence.

Ce guide décrit le processus d'insertion des données électorales dans Directus pour chaque type d'élection : **Présidentielle**, **Législative** et **Locale**.

---

## 📋 Table des matières

1. [Ordre d'insertion (toutes élections)](#ordre-dinsertion-toutes-élections)
2. [Élection Présidentielle](#élection-présidentielle)
3. [Élection Législative](#élection-législative)
4. [Élection Locale](#élection-locale)
5. [Données cartographiques](#données-cartographiques)
6. [Contenus complémentaires](#contenus-complémentaires)

---

### Collections impliquées

| Collection                       | Description                                         | Ordre |
| ---------------------------------- | ------------------------------------------------------ | ----- |
| `elections`                      | Élection principale                                 | 1     |
| `election_constituencies`        | Circonscriptions (référence le référentiel `geo_*`) | 2     |
| `election_political_entities`    | Identité pérenne des partis/coalitions (créée une fois, réutilisée d'élection en élection) | 2 |
| `election_coalition`             | Participation d'une entité politique à l'élection (sans `head_of_list`) | 2 |
| `election_electoral_lists`       | Listes de candidats                                 | 3     |
| `election_persons`                | Identité pérenne des candidats (créée une fois, réutilisée d'élection en élection) | 3 |
| `election_candidates`            | Candidatures (position, profession du scrutin, FK `person`) | 4     |
| `election_coalition` (MAJ)       | Mise à jour du `head_of_list`                        | 5     |
| `election_electoral_files`       | Fichier électoral (révision × scope), pérenne        | 2     |
| `election_polling_stations`      | Bureaux de vote (FK fichier + circonscription)        | 2-6   |
| `election_constituency_results`  | Résultats par circonscription                         | 6     |
| `election_electoral_guide`       | Guides vidéos (indépendant)                          | Any   |
| `election_coalition_videos`      | Vidéos des coalitions                                | 4+    |
| `documents`                      | Documents électoraux                                 | Any   |

> Les collections `carte`, `election_map_national`, `election_map_diaspora` existent encore mais sont **legacy** : elles ne sont plus la cible d'une saisie normale, uniquement un repli technique tant qu'un environnement n'a pas ses données migrées (voir [elections-geographie.md section 7](./elections-geographie.md#7-transition)).

---

## Ordre d'insertion (toutes élections)

### Étape 1 : Créer l'élection

**Collection** : `elections`

```json
{
  "name": "Législatives 2024",
  "slug": "legislatives-2024",
  "type": "legislative",           // "presidential", "legislative", "locale"
  "year": 2024,
  "status": "scheduled",           // "scheduled", "registration", "campaign", "ongoing", "completed"
  "rounds": 1,
  "election_date": "2024-11-17",
  "election_date_round_2": null,
  "registration_deadline": "2024-10-01T00:00:00Z",
  "campaign_start_date": "2024-10-27",
  "campaign_end_date": "2024-11-15",
  "description": "Description de l'élection...",
  "pv_upload_active": false,
  "electoral_file_national": null,  // Pointé à l'étape « fichier électoral », voir plus bas
  "electoral_file_diaspora": null
}
```

**Champs statistiques** (à remplir après le scrutin) :
- `registered_voters` : Nombre d'inscrits
- `voters_count` : Nombre de votants
- `null_ballots` : Bulletins nuls
- `valid_votes` : Suffrages valablement exprimés
- `participation_rate` : Taux de participation (%)
- `national_quotient` : Quotient national (législatives)
- `absolute_majority` : Majorité absolue (présidentielles)

---

### Étape 2 : Vérifier/compléter les circonscriptions

**Collection** : `election_constituencies`

Le référentiel des circonscriptions (46 départements, ~552 communes, 8 zones diaspora) est **pérenne** et normalement déjà peuplé — il ne change qu'à un redécoupage administratif. Une nouvelle élection réutilise les lignes existantes ; il ne s'agit donc généralement pas d'une création mais d'une vérification.

```json
{
  "name": "Dakar",
  "slug": "dakar",
  "type": "department",            // "department" ou "diaspora"
  "nationale_type": "departement", // "departement", "commune", ou libellé diaspora
  "seats": 7,
  "status": "published",
  "geo_entity": 9                  // FK vers la collection geo_entities, tous niveaux confondus
}
```

> ⚠️ Les anciens champs `region` (texte) et `parent` (M2O self) **n'existent plus** sur `election_constituencies` ont été remplacées par la FK **`geo_entity`** : l'identité géographique (nom, population, hiérarchie) est portée par le référentiel versionné. À la saisie, choisir l'entité au **bon niveau** — l'interface affiche `<niveau> (<nom>)` parce qu'une commune et un arrondissement peuvent porter le même nom. Voir [elections-model.md sections 5️⃣/5️⃣bis](./elections-model.md) et [elections-geo-resolution.md](./elections-geo-resolution.md).

**Types de circonscriptions** :

| Type élection     | Type circonscription | nationale_type      |
| -------------------- | ----------------------- | ---------------------- |
| Presidential      | department/diaspora  | departement         |
| Legislative       | department/diaspora  | departement |
| Locale            | department           | commune              |

---

### Étape 3 : Créer/retrouver l'entité politique, puis la participation (coalition)

**Collections** : `election_political_entities` (identité pérenne) puis `election_coalition` (participation à CETTE élection, sans `head_of_list`)

> ⚠️ **Important** : vérifier d'abord si l'entité politique existe déjà (parti/coalition réutilisé d'une élection précédente, ex. PASTEF, Rewmi) avant d'en créer une nouvelle — sinon les fusions d'identité entre élections doivent être faites a posteriori (voir `deployments/2026-07-migration-prod.md`).

```json
// election_political_entities (créée une seule fois, réutilisée)
{
  "slug": "pastef",
  "name": "PASTEF",
  "acronym": "PASTEF",
  "type": "coalition",             // "coalition", "party", "independent"
  "description": "Patriotes Africains du Sénégal pour le Travail, l'Éthique et la Fraternité",
  "logo": "<logo_de_referentiel>",
  "color": "#E63946",
  "status": "published"
}

// election_coalition (une ligne = une participation à CETTE élection)
{
  "political_entity": 4,           // ID de l'entité politique ci-dessus
  "list_order": 1,                 // Numéro du bulletin
  "logo": null,                    // Override optionnel du logo de l'entité
  "color": null,                   // Override optionnel de la couleur
  "bulletin": "<bulletin_de_la_coalition>",    // Image du bulletin
  "list_file": "<liste_de_la_coalition>",      // PDF de la liste
  "status": "published",
  "head_of_list": null             // 🚨 Sera mis à jour à l'étape 6
}
```

---

### Étape 4 : Créer les listes électorales

**Collection** : `election_electoral_lists`

```json
{
  "name": "Liste nationale PASTEF",
  "type": "national",              // "national", "departmental", "communale", "diaspora"
  "coalition": 1,                  // ID de la participation (election_coalition)
  "election": 1,                   // ID de l'élection
  "constituency": null,            // ID de la circonscription (si départementale/communale)
  "is_substitute": false,          // true pour les listes de suppléants
  "status": "published"
}
```

**Types de listes par élection** :

| Type élection     | Types de listes                                |
| -------------------- | -------------------------------------------------- |
| Presidential      | `national` uniquement                          |
| Legislative       | `national` + `departmental` + `diaspora`       |
| Locale            | `communale` uniquement                         |

---

### Étape 5 : Créer/retrouver la personne, puis la candidature

**Collections** : `election_persons` (identité pérenne) puis `election_candidates` (candidature à CETTE élection)

> ⚠️ Vérifier d'abord si la personne existe déjà (candidat sortant, réutilisé d'une élection précédente) avant d'en créer une nouvelle.

```json
// election_persons (créée une seule fois, réutilisée)
{
  "slug": "ousmane-sonko",
  "first_name": "Ousmane",
  "last_name": "SONKO",
  "birthdate": "1975-07-15",
  "birthplace": "Thiès",
  "gender": "M",
  "profession": "Inspecteur des impôts",
  "photo": "<photo_de_la_personne>",
  "short_bio": "...",
  "long_bio": "Biographie complète...",
  "facebook": "https://facebook.com/...",
  "twitter": "https://twitter.com/...",
  "status": "published"
}

// election_candidates (une ligne = une candidature à CETTE élection)
{
  "person": 6,                     // ID de la personne ci-dessus
  "position": 1,                   // Position dans la liste
  "profession": "Inspecteur des impôts", // Profession AU MOMENT de ce scrutin (peut différer de election_persons.profession)
  "electoral_list": 1,             // ID de la liste électorale
  "is_elected": false,             // 🏆 Mis à jour après résultats
  "is_outgoing_deputy": false,     // Député sortant
  "elected_replacement": false,    // Suppléant devenu élu
  "voter_number": "123456",
  "status": "published"
}
```

---

### Étape 6 : Mettre à jour les coalitions (head_of_list)

**Collection** : `election_coalition` (UPDATE)

> ✅ Maintenant que les candidats existent, on peut lier la tête de liste.

```json
{
  "head_of_list": 42               // ID de la candidature (election_candidates) tête de liste
}
```

---

### Étape 7 : Résultats et données cartographiques

Voir la section [Données cartographiques](#données-cartographiques).

---

## Élection Présidentielle

### Spécificités

- **Type** : `presidential`
- **Circonscriptions** : Départements + Diaspora (pas de communes)
- **Listes** : Une seule liste `national` par candidat/coalition
- **Statistiques** : `absolute_majority` obligatoire
- **Résultats** : Pas de `winning_list`, uniquement `winning_coalition`

### Processus d'insertion

```
1. Créer l'élection (type: "presidential")
2. Vérifier les circonscriptions (46 départements + zones diaspora, référentiel déjà peuplé)
3. Créer/retrouver les entités politiques puis leurs participations (coalitions/candidats indépendants)
4. Pour chaque participation → créer UNE liste nationale
5. Créer/retrouver la personne puis LA candidature principale (position 1)
6. Mettre à jour coalition.head_of_list
7. Pointer election.electoral_file_national/electoral_file_diaspora vers le fichier électoral de la révision (voir Données cartographiques)
8. Après résultats :
   - Mettre à jour coalition.voix, coalition.pourcentage (et round_2_voix/round_2_pourcentage si second tour)
   - Créer les entrées election_constituency_results par département avec winning_coalition
   - Mettre à jour election (participation_rate, registered_voters, etc.)
   - Marquer la candidature élue (is_elected: true)
```

### Exemple de données

```json
// Participation présidentielle (election_coalition)
{
  "political_entity": 17,          // "Diomaye Président" (election_political_entities)
  "list_order": 17,
  "voix": 2434854,
  "pourcentage": 54.28,
  "sieges": null                   // Pas de sièges en présidentielle
}

// Résultat présidentiel par circonscription (election_constituency_results)
{
  "election": 1,
  "constituency": 5,                // ID de la circonscription Dakar
  "winning_coalition": 1,           // Participation qui a gagné ce département
  "winning_list": null,             // Pas utilisé en présidentielle
  "voters": 850000,
  "participation_10h": 15.2,
  "participation_12h": 28.5,
  "participation_14h": 42.1,
  "participation_17h": 58.3
}
```

---

## Élection Législative

### Spécificités

- **Type** : `legislative`
- **Circonscriptions** : Départements + Diaspora
- **Listes** : `national` + `departmental` par coalition
- **Statistiques** : `national_quotient` obligatoire
- **Sièges** : Répartis entre national et départemental

### Processus d'insertion

```
1. Créer l'élection (type: "legislative")
2. Vérifier les circonscriptions (46 départements + 8 zones diaspora, référentiel déjà peuplé)
3. Créer/retrouver les entités politiques puis leurs participations
4. Pour chaque participation :
   a. Créer la liste nationale (type: "national")
   b. Créer les listes départementales (type: "departmental") pour chaque circonscription
   c. (Optionnel) Créer les listes de suppléants (is_substitute: true)
5. Créer/retrouver les personnes puis leurs candidatures pour chaque liste
6. Mettre à jour coalition.head_of_list
7. Pointer election.electoral_file_national/electoral_file_diaspora
8. Après résultats :
   - Mettre à jour coalition.voix, pourcentage, sieges, sieges_national, sieges_departement
   - Créer les entrées election_constituency_results avec winning_coalition ET winning_list
   - Marquer les candidatures élues (is_elected: true)
```

### Exemple de données

```json
// Participation législative (election_coalition)
{
  "political_entity": 1,           // PASTEF (election_political_entities)
  "voix": 1968013,
  "pourcentage": 54.28,
  "sieges": 130,
  "sieges_national": 47,
  "sieges_departement": 83
}

// Liste départementale
{
  "name": "Liste PASTEF - Dakar",
  "type": "departmental",
  "coalition": 1,
  "election": 1,
  "constituency": 5,               // ID de la circonscription Dakar
  "is_substitute": false
}

// Résultat législatif par circonscription (election_constituency_results)
{
  "election": 1,
  "constituency": 5,
  "winning_coalition": 1,
  "winning_list": 42,              // ID de la liste gagnante dans ce département
  "seat": 7,                       // Sièges alloués à ce département
  "voters": 850000
}
```

## Élection Locale

### Spécificités

- **Type** : `locale`
- **Circonscriptions** : Communes (référentiel `geo_entities` de niveau `commune`)
- **Listes** : `communale` uniquement
- **Résultats** : `winning_list` obligatoire (pas de `winning_coalition`)

### Processus d'insertion

```
1. Créer l'élection (type: "locale")
2. Vérifier les circonscriptions communales (référentiel déjà peuplé, nationale_type: "commune",
   rattachées via geo_entity)
3. Créer/retrouver les entités politiques puis leurs participations
4. Pour chaque participation et chaque commune :
   - Créer la liste communale (type: "communale", constituency: id_commune)
5. Créer/retrouver les personnes puis leurs candidatures pour chaque liste
6. Mettre à jour coalition.head_of_list
7. Après résultats :
   - Créer les entrées election_constituency_results avec winning_list (obligatoire)
```

### Exemple de données

```json
// Liste communale
{
  "name": "Liste PASTEF - Plateau",
  "type": "communale",
  "coalition": 1,
  "election": 1,
  "constituency": 42                // ID de la commune Plateau (rattachée via geo_entity)
}

// Résultat local (election_constituency_results)
{
  "election": 1,
  "constituency": 42,                // Circonscription communale Plateau
  "winning_coalition": null,         // Non utilisé
  "winning_list": 123                // 🚨 Obligatoire - Liste gagnante
}
```

---

## Données cartographiques

Le détail complet (fichiers électoraux, bureaux, résultats, contours, mécanique de jointure) est dans [elections-geographie.md](./elections-geographie.md#53-saisie-éditoriale-nouvelle-révision--nouveau-scrutin). Résumé du workflow de saisie :

### 1. Fichier électoral (révision), une fois par révision × scope

**Collection** : `election_electoral_files`

```json
{
  "name": "Révision 2024",
  "scope": "national",              // "national" ou "diaspora" — créer les 2 lignes
  "year": 2024,
  "revision_type": "ordinaire",     // "ordinaire" ou "exceptionnelle"
  "revision_date": "2024-08-01",
  "document": 12                    // ID du document (arrêté officiel)
}
```

Puis pointer `elections.electoral_file_national`/`electoral_file_diaspora` de chaque scrutin concerné vers ces lignes — plusieurs élections peuvent partager la même révision.

### 2. Bureaux de vote, une fois par fichier électoral

**Collection** : `election_polling_stations`

```json
{
  "electoral_file": 1,               // ID de la ligne election_electoral_files (scope national)
  "constituency": 5,                 // ID de la circonscription (département)
  "polling_place": "École Plateau A",
  "office_number": "1",
  "voters": 500,
  "implantation": "Urbain",
  "municipality": "Plateau"          // Texte descriptif dénormalisé
}
```

Pour la diaspora, remplacer `implantation`/`municipality` par `country`/`locality`/`diplomatic_representation`.

### 3. Résultats, une fois par élection × circonscription

**Collection** : `election_constituency_results`

```json
{
  "election": 1,
  "constituency": 5,
  "winning_coalition": 1,            // Pour présidentielle/législative
  "winning_list": 42,                // Pour législative/locale
  "voters": 850000,
  "seat": 7,
  "participation_10h": 15.2,
  "participation_12h": 28.5,
  "participation_14h": 42.1,
  "participation_17h": 58.3
}
```

> ⚠️ Les collections `carte`, `election_map_national`, `election_map_diaspora` ne doivent plus être ciblées par une saisie nouvelle : elles ne servent qu'en repli technique legacy (voir [elections-geographie.md section 7](./elections-geographie.md#7-transition)).

---

## Contenus complémentaires

### Guides électoraux (`election_electoral_guide`)

Vidéos explicatives par type d'élection (indépendant de l'élection).

```json
{
  "titre": "Comment voter aux législatives 2024",
  "description": "Tutoriel complet...",
  "url_youtube": "https://youtube.com/watch?v=...",
  "type_election": "legislative",  // "presidentielle", "legislative", "locale"
  "langue": "Français",
  "status": "published"
}
```

### Vidéos de coalition (`election_coalition_videos`)

```json
{
  "titre": "Meeting PASTEF Dakar",
  "url_youtube": "https://youtube.com/watch?v=...",
  "coalition_id": 1                // ID de la participation (election_coalition)
}
```

### Documents (`documents`)

```json
{
  "title": "Code électoral 2024",
  "slug": "code-electoral-2024",
  "type": "election",
  "description": "...",
  "file": "<uuid_fichier>",
  "cover_image": "<image_de_couverture_du_document>",
  "publish_date": "2024-01-01"
}
```

---

## 🔧 Conseils pratiques

1. **Ordre strict** : Respectez l'ordre des dépendances pour éviter les erreurs FK
2. **Backup** : Faites un backup avant les imports massifs
3. **Statuts** : Utilisez `draft` pendant l'import, puis `published` une fois validé
4. **Identités pérennes** : Toujours vérifier si l'entité politique (`election_political_entities`) ou la personne (`election_persons`) existe déjà avant d'en créer une nouvelle — la fusion a posteriori est un travail manuel coûteux

---

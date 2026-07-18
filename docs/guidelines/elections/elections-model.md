# 🗳️ Elections – Modèles

## 🎯 Objectifs

* Publier les **données électorales** pour tous types d'élections (Présidentielles, Législatives, Locales)
* Gérer les **coalitions, listes électorales et candidats** avec leurs profils détaillés
* Afficher les **résultats** par département, commune et bureau de vote
* Gérer la **cartographie électorale** (nationale et diaspora)
* Fournir les **statistiques** (participation, répartition par sexe, âge, profession)
* Intégrer les **guides électoraux** (vidéos YouTube) et la **législation** (documents PDF)
* Permettre la **liaison entre élections** (1er tour ↔ 2nd tour, etc.)
* Préparer un modèle stable pour le dashboard électoral de Vie-publique.sn

---

## 🧱 Modèle de données

### 1️⃣ `elections` — *Élections principales*

Table pivot regroupant toutes les élections organisées au Sénégal.

| Champ                | Type                                       | Description                                | Exemple                    |
| -------------------- | ------------------------------------------ | ------------------------------------------ | --------------------------- |
| id                   | int                                        | ID interne                                 | 1                          |
| status               | string (`scheduled`, `registration`, `campaign`, `ongoing`, `completed`)  | État de l'élection                        | "completed"                |
| sort                 | int                                        | Ordre d'affichage                          | 1                          |
| name                 | string                                     | Nom de l'élection (unique)                 | "Législatives 2024"        |
| slug                 | string (**unique**)                        | Identifiant URL                            | "legislatives-2024"        |
| year                 | int                                        | Année de l'élection                        | 2024                       |
| type                 | enum (`legislative`, `presidential`, `locale`) | Type d'élection                        | "legislative"              |
| participation_rate   | float                                      | Taux de participation (%)                  | 49.51                      |
| rounds               | int (défaut: 1)                            | Nombre de tours                            | 1                          |
| election_date        | date                                       | Date du scrutin                            | "2024-11-17"               |
| election_date_round_2| date                                       | Date du second tour                        | null                       |
| registration_deadline| timestamp                                  | Date limite d'inscription                  | "2024-10-01T00:00:00Z"     |
| campaign_start_date  | date                                       | Début de campagne                          | "2024-10-27"               |
| campaign_end_date    | date                                       | Fin de campagne                            | "2024-11-15"               |
| description          | text                                       | Description générale                       | "Élections législatives..." |
| registered_voters    | int                                        | Nombre d'électeurs inscrits                | 7371891                    |
| voters_count         | int                                        | Nombre de votants                          | 3650120                    |
| null_ballots         | int                                        | Nombre de bulletins nuls                   | 26487                      |
| valid_votes          | int                                        | Suffrages valablement exprimés             | 3623633                    |
| absolute_majority    | int                                        | Majorité absolue (présidentielle)          | 1811817                    |
| national_quotient    | float                                      | Quotient national (législative)            | 68370.0                    |
| pv_upload_active     | boolean                                    | Active l'onglet PVs du dashboard           | true                       |
| electoral_file_national | M2O → election_electoral_files (nullable) | Révision (fichier électoral) national utilisée | 1                    |
| electoral_file_diaspora | M2O → election_electoral_files (nullable) | Révision (fichier électoral) diaspora utilisée | 2                    |
| documents            | M2M → documents (via `elections_documents`)| Documents liés (code électoral, PLF, etc.) | [...]                      |

> 🔁 Une élection peut contenir plusieurs coalitions, listes, candidats, circonscriptions et résultats.
> 📊 Les champs `registered_voters`, `voters_count`, `null_ballots`, `valid_votes` permettent d'afficher les statistiques KPI sur le dashboard.
> 🏆 Le champ `absolute_majority` est utilisé pour les élections présidentielles, `national_quotient` pour les législatives.
> 🗂️ `electoral_file_national`/`electoral_file_diaspora` remplacent l'ancienne collection `election_revisions` (fusionnée le 2026-07-14 dans `election_electoral_files`, voir 6️⃣ ci-dessous) — plusieurs élections peuvent pointer la même révision.

---

### 2️⃣ `election_coalition` — *Coalitions/Partis politiques*

Entités politiques participant aux élections.

| Champ              | Type                                       | Description                              | Exemple          |
| ------------------ | ------------------------------------------ | ----------------------------------------- | ---------------- |
| id                 | int                                        | ID interne                               | 1                |
| status             | string (`draft`, `published`, `archived`)  | État de publication                      | "published"      |
| sort               | int                                        | Ordre d'affichage                        | 1                |
| user_created       | uuid → directus_users                      | Créateur                                 | "uuid..."        |
| date_created       | timestamp                                  | Date de création                         | ...              |
| user_updated       | uuid → directus_users                      | Dernier modificateur                     | "uuid..."        |
| date_updated       | timestamp                                  | Date de modification                     | ...              |
| list_order         | int                                        | Ordre de la liste (numéro de bulletin)   | 1                |
| bulletin           | uuid → directus_files                      | Image du bulletin de vote                | "bulletin123..." |
| list_file          | uuid → directus_files                      | Fichier PDF de la liste                  | "list123..."     |
| head_of_list       | M2O → election_candidates                  | Tête de liste (candidat)                 | 1                |
| videos             | O2M → election_coalition_videos            | Vidéos de la coalition                   | [...]            |
| logo               | uuid → directus_files                      | Logo (override de l'entité politique)    | "abc123..."      |
| color              | string (hex)                               | Couleur (override de l'entité politique) | "#E63946"        |
| voix               | int                                        | Nombre total de voix                     | 1234567          |
| pourcentage        | float                                      | Pourcentage de voix (%)                  | 54.28            |
| sieges             | int                                        | Nombre total de sièges obtenus           | 130              |
| sieges_departement | int                                        | Sièges au scrutin départemental          | 83               |
| sieges_national    | int                                        | Sièges au scrutin national               | 47               |
| round_2_voix       | int                                        | Voix au second tour (présidentielle)     | 2345678          |
| round_2_pourcentage| float                                      | Pourcentage au second tour               | 58.10            |
| political_entity   | M2O → election_political_entities          | Identité pérenne de l'entité politique   | 4                |

> ⚠️ Pour les résultats, les champs utilisent des noms en français (`voix`, `pourcentage`, `sieges`).
> 🔀 `election_coalition` porte un FK **requis** `political_entity` → `election_political_entities` : l'identité pérenne (nom, sigle, description) vit sur l'entité, `election_coalition` est devenue la **participation** (une entité × une élection — une ligne coalition n'est jamais liée à deux élections). Les champs `name`/`acronym`/`type`/`description` historiques ont été **supprimés** de `election_coalition` (2026-07, chantier E5) ; `logo`/`color` restent en override éditable sur la participation. Alias `programs` (O2M ← `election_programs.participation`). Voir `deployments/2026-07-migration-prod.md`.

---

### 2️⃣bis `election_political_entities` — *Entités politiques (identité pérenne)*

Une ligne = un parti/coalition/candidature indépendante, réutilisé d'une élection à l'autre (ex. Rewmi en 2019 et 2024).

| Champ           | Type                                       | Description                                            | Exemple      |
| --------------- | ------------------------------------------ | -------------------------------------------------------- | ------------ |
| id              | int                                        | ID interne                                             | 1            |
| status          | string                                     | État de publication                                    | "published"  |
| slug            | text (**unique**)                          | Identifiant durable                                    | "pastef"     |
| name            | string                                     | Nom de l'entité                                        | "PASTEF"     |
| acronym         | string                                     | Sigle                                                  | "PASTEF"     |
| type            | enum (`coalition`, `party`, `independent`) | Type d'entité                                          | "party"      |
| logo            | uuid → directus_files                      | Logo de référence (la participation peut l'overrider)  | "abc..."     |
| color           | string (hex)                               | Couleur de référence (idem)                            | "#E63946"    |
| description     | text                                       | Présentation                                           | "..."        |
| tags            | csv                                        | Tags                                                   | "..."        |
| participations  | alias O2M → election_coalition             | Participations aux élections                           | [...]        |

---

### 2️⃣ter `election_programs` — *Programmes des participations*

| Champ         | Type                        | Description                                     | Exemple |
| ------------- | ---------------------------- | ----------------------------------------------- | ------- |
| id            | int                         | ID interne                                      | 1       |
| status        | string                      | État de publication                             | "published" |
| participation | M2O → election_coalition    | Participation dont c'est le programme           | 215     |
| document      | M2O → documents             | Document programme (type `programme`)           | 42      |
| language      | string (défaut `fr`)        | Langue du programme                             | "fr"    |
| version       | string (nullable)           | Version (null tant qu'il n'y a pas de versions) | null    |

---

### 3️⃣ `election_electoral_lists` — *Listes électorales*

Listes de candidats déposées par les coalitions.

| Champ           | Type                                             | Description                          | Exemple                        |
| --------------- | -------------------------------------------------- | ------------------------------------ | ------------------------------- |
| id              | int                                              | ID interne                           | 1                              |
| status          | string (`draft`, `published`, `archived`)        | État de publication                  | "published"                    |
| user_created    | uuid → directus_users                            | Créateur                             | "uuid..."                      |
| date_created    | timestamp                                        | Date de création                     | ...                            |
| user_updated    | uuid → directus_users                            | Dernier modificateur                 | "uuid..."                      |
| date_updated    | timestamp                                        | Date de modification                 | ...                            |
| name            | string                                           | Nom de la liste                      | "Liste nationale PASTEF"       |
| type            | enum (`national`, `departmental`, `communale`, `diaspora`) | Type de liste              | "national"                     |
| coalition       | M2O → election_coalition                         | Coalition associée                   | 1                              |
| election        | M2O → elections                                  | Élection associée                    | 1                              |
| is_substitute   | boolean                                          | Liste de suppléants                  | false                          |
| constituency    | M2O → election_constituencies                    | Circonscription                      | 5                              |
| candidates      | O2M → election_candidates                        | Candidats de la liste                | [...]                          |

> 💡 Pour les **élections présidentielles**, il y a une seule liste "nationale" par coalition.
> Pour les **élections législatives/locales**, il peut y avoir plusieurs listes départementales/locales par coalition.
> 📋 Le champ `candidates` est une relation O2M permettant de lister tous les candidats de la liste.

---

### 4️⃣ `election_candidates` — *Candidats*

Profils détaillés des candidats (candidature = une personne × une élection, voir 4️⃣bis).

| Champ           | Type                         | Description                    | Exemple                  |
| --------------- | ---------------------------- | ------------------------------- | ------------------------- |
| id              | int                          | ID interne                     | 1                        |
| position        | int                          | Position dans la liste         | 1                        |
| profession      | string                       | Profession (donnée par scrutin, distincte de `election_persons.profession`) | "Économiste" |
| electoral_list  | M2O → election_electoral_lists | Liste électorale             | 1                        |
| is_elected      | boolean                      | Élu ou non                     | true                     |
| documents       | M2O → documents              | Programme/document du candidat (legacy, non alimenté — voir `election_programs`) | null |
| is_outgoing_deputy | boolean                   | Député sortant                 | false                    |
| notes           | text                         | Notes internes                 | "..."                    |
| elected_replacement | boolean                  | Élu suppléant remplaçant       | false                    |
| voter_number    | string                       | Numéro d'électeur              | "SN123456"               |
| status          | string                       | État de publication            | "published"              |
| person          | M2O → election_persons (requis à la saisie) | Identité pérenne de la personne | 42          |

> 📊 Les **statistiques** (sexe, âge, profession) sont calculées via `election_persons` (sexe, âge) et `election_candidates.profession` (profession par scrutin).
> ⚠️ Les champs d'identité historiques (`first_name`, `last_name`, `birthdate`, `birthplace`, `gender`, `photo`, `tags`, `facebook`, `twitter`, `biography`) ont été **supprimés** de `election_candidates` (chantier P5, 2026-07) : ils vivent désormais sur `election_persons`. Le contrat API conserve la clé `biography` par compatibilité (= `short_bio` de la personne).

---

### 4️⃣bis `election_persons` — *Personnes (identité pérenne)*

Une ligne = un être humain, réutilisé d'une élection à l'autre. Export de schéma Directus versionné dans le repo dédié `vpsn-directus-collections` (pas dans ce repo).

| Champ           | Type                         | Description                                    | Exemple               |
| --------------- | ----------------------------- | ------------------------------------------------ | ---------------------- |
| id              | int                          | ID interne                                     | 1                     |
| status          | string                       | État de publication                            | "published"           |
| slug            | text (**unique**)            | Identifiant durable                            | "amadou-ba"           |
| first_name      | string                       | Prénom                                         | "Amadou"              |
| last_name       | string                       | Nom                                            | "BA"                  |
| gender          | enum (`M`, `F`)              | Sexe                                           | "M"                   |
| birthdate       | date                         | Date de naissance                              | "1961-05-17"          |
| birthplace      | string                       | Lieu de naissance                              | "Dakar"               |
| profession      | string                       | Profession courante (la donnée par scrutin reste sur le candidat) | "Économiste" |
| tags            | csv                          | Tags                                           | "..."                 |
| photo           | uuid → directus_files        | Photo                                          | "photo123..."         |
| short_bio       | text                         | Résumé court                                   | "..."                 |
| long_bio        | text                         | Biographie détaillée                           | "..."                 |
| facebook / twitter / linkedin | string         | Réseaux sociaux                                | "https://..."         |
| candidacies     | alias O2M → election_candidates | Candidatures de la personne                 | [...]                 |

> 🔑 Le `slug` est la clé durable d'une personne (homonymes suffixés : `mamadou-niang`, `mamadou-niang-2`).

---

### 5️⃣ `election_constituencies` — *Circonscriptions électorales*

Découpage géographique pour les élections législatives et locales. Référentiel pérenne (régions → départements → communes + 8 zones diaspora) ; voir [elections-geographie.md](./elections-geographie.md) et [elections-geo-resolution.md](./elections-geo-resolution.md) pour le détail de la résolution.

| Champ           | Type                                      | Description                          | Exemple      |
| --------------- | -------------------------------------------- | -------------------------------------- | ------------ |
| id              | int                                       | ID interne                           | 1            |
| name            | string                                    | Nom de la circonscription            | "Dakar"      |
| slug            | text (**unique**, nullable)               | Clé de jointure publique (API + contours GeoJSON statiques) | "dakar" |
| type            | enum (`department`, `diaspora`)            | Type de circonscription              | "department" |
| nationale_type  | string (select-dropdown)                  | Niveau (`departement`/`commune`, valeur libre pour la diaspora) — sert de filtre rapide et distingue carte nationale vs. communale | "departement"|
| seats           | int                                       | Nombre de sièges alloués             | 20           |
| geo_region      | M2O → `geo_regions` (nullable)            | Prévu pour une ligne de niveau région ; **aucune ligne `election_constituencies` n'a `nationale_type = "region"` en pratique** — les régions n'apparaissent que comme parent d'un département dans le référentiel `geo_*`, jamais comme circonscription à part | null      |
| geo_department  | M2O → `geo_departments` (nullable)        | Rattachement si la ligne EST un département | 12    |
| geo_municipality| M2O → `geo_municipalities` (nullable)     | Rattachement si la ligne EST une commune | null      |
| sort            | int                                       | Ordre d'affichage                    | 1            |
| status          | string                                    | État de publication                  | "published"  |

> ⚠️ **Depuis 2026-07-14**, les anciens champs `region` (string), `parent` (M2O self), `code` et `population` ont été **supprimés** de `election_constituencies` : l'identité géographique (nom, slug, code, population, hiérarchie parent/région) est désormais lue via le référentiel générique `geo_regions`/`geo_departments`/`geo_municipalities` (un seul des 3 FK est renseigné selon le niveau de la ligne), via `resolveGeoUnit()` (`server/utils/electionGeoUnit.ts`) — jamais d'accès direct aux champs du référentiel sans passer par cet utilitaire. Les lignes purement électorales sans équivalent administratif (8 zones diaspora, « Territoire National ») n'ont aucun FK geo et gardent leur `name`/`slug` en dur (repli permanent, pas transitoire).

---

### 5️⃣bis `geo_regions` / `geo_departments` / `geo_municipalities` — *Référentiel géographique générique*

Référentiel administratif générique (partagé avec d'autres modules du site), utilisé comme source d'identité pour `election_constituencies`. Hiérarchie : `geo_municipalities.department` → `geo_departments`, `geo_departments.region` → `geo_regions`.

| Champ (selon niveau)   | Description | Exemple |
| ------------------------ | ------------- | ------- |
| `name`                   | Nom | "Dakar" |
| `population`             | Population (régions et départements) | 1146053 |
| `slug` (communes uniquement) | Clé de jointure avec les contours GeoJSON | "plateau" |
| `code` (communes uniquement) | Pcode officiel | "SN0101" |
| `department` (communes) / `region` (départements) | FK vers le niveau parent | ... |

> Régions et départements n'ont **pas** de `slug`/`code` propres (retirés le 2026-07-14) : seules les communes en portent, la résolution des niveaux supérieurs se fait par leur `name`.

---

### 6️⃣ `election_electoral_files` — *Fichiers électoraux (révisions)*

Collection pérenne : une ligne = une révision du fichier électoral × un scope (national ou diaspora), partagée entre plusieurs élections tenues sur la même révision.

| Champ           | Type                                       | Description                                     | Exemple       |
| --------------- | ------------------------------------------- | -------------------------------------------------- | ------------- |
| id              | int                                        | ID interne                                       | 1             |
| name            | string                                     | Nom de la révision                               | "Révision 2024" |
| scope           | enum (`national`, `diaspora`)              | Territoire couvert                               | "national"    |
| year            | int                                        | Année de la révision                             | 2024          |
| revision_type   | string                                     | `ordinaire` / `exceptionnelle`                   | "exceptionnelle" |
| period_start / period_end | date                             | Période de la révision                           | ...           |
| revision_date   | date                                       | Date d'arrêt de la révision                      | "2024-08-01"  |
| document        | M2O → documents                            | Arrêté officiel consultable                      | 12            |
| notes           | text                                       | Notes                                            | "..."         |

> `elections.electoral_file_national`/`electoral_file_diaspora` pointent la révision utilisée par un scrutin. Fusion des anciennes lignes `election_revisions` faite le 2026-07-14 (collection `election_revisions` **supprimée**, avec ses endpoints `/api/elections/revisions/*` et pages `/revision-electorale/*`, remplacée par ces 3 champs).

---

### 7️⃣ `election_polling_stations` — *Bureaux de vote*

Collection pérenne, remplace `election_map_national`/`election_map_diaspora`. Une ligne = un bureau de vote d'un fichier électoral donné.

| Champ                      | Type                                | Description                          | Exemple            |
| --------------------------- | -------------------------------------- | --------------------------------------- | -------------------- |
| id                          | int                                | ID interne                            | 1                  |
| electoral_file              | M2O → election_electoral_files    | Fichier électoral (révision × scope)  | 1                  |
| constituency                | M2O → election_constituencies     | Circonscription (département ou zone diaspora) | 12       |
| polling_place               | string                            | Lieu de vote                          | "École Plateau"    |
| office_number               | string                            | Numéro du bureau                      | "1"                |
| voters                      | int                                | Nombre d'inscrits                     | 500                |
| implantation                | string (national)                 | Implantation                          | "Urbain"           |
| municipality                | string (national)                 | Commune (texte descriptif dénormalisé) | "Plateau"          |
| country / locality / diplomatic_representation | string (diaspora) | Pays / localité / représentation diplomatique | "France" |

---

### 8️⃣ `election_constituency_results` — *Résultats par circonscription*

Collection pérenne, remplace `carte`. Une ligne = le résultat d'une élection dans une circonscription (« gagnant seul », pas de détail par coalition).

| Champ                | Type                                  | Description                          | Exemple        |
| ---------------------- | ---------------------------------------- | --------------------------------------- | -------------- |
| id                   | int                                | ID interne                             | 1              |
| election             | M2O → elections                   | Élection concernée                     | 1              |
| constituency         | M2O → election_constituencies     | Circonscription concernée              | 5              |
| winning_coalition    | M2O → election_coalition (SET NULL) | Participation gagnante                | 1              |
| winning_list         | M2O → election_electoral_lists (SET NULL) | Liste gagnante                 | 3              |
| voters               | int                                | Nombre d'inscrits                      | 50000          |
| seat                 | int                                | Nombre de sièges                       | 7              |
| participation_10h/12h/14h/17h | float                     | Relevés horaires de participation (%)  | 42.1           |

> Unicité métier : une seule ligne par couple (`election`, `constituency`), imposée par les scripts de backfill (pas de contrainte DB). `population` a été déplacé sur le référentiel (`geo_department`/`geo_municipality`), il n'est plus porté par les résultats.

---

### 8️⃣ter `election_constituency_coalition_results` — *Classement complet des coalitions par circonscription*

Détail de `election_constituency_results` (qui ne porte que le gagnant) : une ligne = le score d'**une** coalition dans **une** circonscription pour **un** tour donné. Alimente le classement complet (pas seulement le vainqueur) exposé par `GET /api/elections/results/constituency/[slug]` ([server/api/elections/results/constituency/[slug].get.ts](../../../server/api/elections/results/constituency/[slug].get.ts)).

| Champ         | Type                                        | Description                                              | Exemple |
| --------------- | ---------------------------------------------- | ------------------------------------------------------------ | ------- |
| id            | int                                         | ID interne                                                | 1       |
| status        | string (`draft`, `published`, `archived`)   | État de publication (seules les lignes `published` sont lues) | "published" |
| result        | M2O → `election_constituency_results` (requis) | Le résultat de circonscription qu'elle détaille (porte élection + circonscription) | 12 |
| coalition     | M2O → `election_coalition` (requis)         | La participation concernée                                | 1       |
| round         | int (défaut 1)                              | Tour (1 ou 2 — présidentielle uniquement)                 | 1       |
| votes         | int                                         | Voix obtenues dans cette circonscription                  | 12500   |
| percentage    | float                                       | Pourcentage (base : suffrages exprimés de la circonscription) | 34.2 |

> Saisie éditoriale au fil de l'eau (pas de source structurée identifiée à ce jour) : la collection peut être vide pour une circonscription, ce n'est pas une erreur — l'endpoint retombe alors sur une réponse vide (`round1: []`, `round2: null`), le gagnant seul restant disponible via `/api/carte/result`.

---

### 8️⃣bis `carte` / `election_map_national` / `election_map_diaspora` — *Collections legacy (fallback)*

Anciennes collections cartographiques, **conservées uniquement en repli** (`server/api/carte/*`, `server/api/elections/map/*`) tant qu'un environnement n'a pas ses nouvelles collections peuplées (`election_electoral_files`/`election_polling_stations`/`election_constituency_results`). Elles ne sont plus la source de vérité et seront supprimées lors du décommissionnement final (voir [elections-geographie.md section 7](./elections-geographie.md#7-transition)).

---

### 9️⃣ `election_electoral_guide` — *Guides vidéos YouTube*

Tutoriels vidéos pour expliquer le processus électoral.

| Champ        | Type                                       | Description                   | Exemple                       |
| ------------ | ------------------------------------------ | -------------------------------- | -------------------------------- |
| id           | int                                        | ID interne                    | 1                             |
| titre        | string                                     | Titre de la vidéo             | "Comment voter en 2024 ?"     |
| description  | text (Markdown)                            | Description                   | "Tutoriel pas à pas..."       |
| url_youtube  | string (URL)                               | Lien YouTube                  | "https://youtube.com/..."     |
| type_election| enum (`presidentielle`, `legislative`, `locale`) | Type d'élection               | "legislative"                 |
| langue       | string                                     | Langue de la vidéo             | "Français"                    |
| sort         | int                                        | Ordre d'affichage             | 1                             |
| status       | string                                     | État de publication           | "published"                   |

---

### 🔟 `election_coalition_videos` — *Vidéos des coalitions*

Vidéos promotionnelles, meetings ou témoignages des coalitions.

| Champ        | Type                    | Description           | Exemple                  |
| ------------ | ----------------------- | ------------------------ | --------------------------- |
| id           | int                     | ID interne            | 1                        |
| titre        | string                  | Titre de la vidéo     | "Meeting PASTEF Dakar"   |
| url_youtube  | string (URL)            | Lien YouTube          | "https://youtube.com/..." |
| coalition_id | M2O → election_coalition | Coalition associée    | 1                        |
| sort         | int                     | Ordre d'affichage     | 1                        |
| status       | string                  | État de publication   | "published"              |

---

### 1️⃣1️⃣ `documents` — *Documents (électoraux)*

Documents liés aux élections (code électoral, programmes, etc.).

| Champ        | Type                     | Description           | Exemple                  |
| ------------ | -------------------------- | ------------------------ | --------------------------- |
| id           | int                      | ID interne            | 1                        |
| status       | string                   | État de publication   | "published"              |
| title        | string                   | Titre du document     | "Code électoral 2024"    |
| slug         | string                   | Slug URL              | "code-electoral-2024"    |
| description  | text                     | Description           | "..."                    |
| type         | string                   | Type de document      | "election"               |
| file         | uuid → directus_files    | Fichier PDF           | "file123..."             |
| cover_image  | uuid → directus_files    | Image de couverture   | "img123..."              |
| publish_date | date                     | Date de publication   | "2024-01-01"             |

> 📝 La collection `documents` est utilisée par plusieurs modules. Le type `election` identifie les documents électoraux.

---

## 🧩 Relations principales

```
elections ──┬── election_coalition ──┬── election_electoral_lists ─── election_candidates ──→ election_persons
            │       └── political_entity          └── election_coalition_videos         └── documents (programme)      (identité pérenne, candidacies O2M)
            │            (election_political_entities, alias programs → election_programs)
            │
            ├── election_constituencies ──┬── geo_region / geo_department / geo_municipality (référentiel générique)
            │                             │
            ├── electoral_file_national ──┴── election_electoral_files ── election_polling_stations (FK electoral_file + constituency)
            ├── electoral_file_diaspora ──┘
            │
            ├── election_constituency_results (FK election + constituency, winning_coalition, winning_list)
            │       └── election_constituency_coalition_results (FK result + coalition, classement complet)
            │
            ├── (legacy fallback) carte / election_map_national / election_map_diaspora
            │
            ├── documents (M2M via elections_documents)
            │
            └── election_electoral_guide (filtré par type_election)
```

---

## 📊 Exemples d'utilisation

### Élections

| Champ              | Valeur                      |
| -------------------- | ------------------------------ |
| name               | "Législatives 2024"         |
| type               | "legislative"               |
| year               | 2024                        |
| status             | "completed"                 |
| participation_rate | 49.51                       |
| registered_voters  | 7371891                     |
| voters_count       | 3650120                     |
| valid_votes        | 3623633                     |
| null_ballots       | 26487                       |
| national_quotient  | 68370.0                     |
| rounds             | 1                           |
| election_date      | "2024-11-17"                |

### Coalitions (Top 3)

| Coalition       | Voix      | Sièges | % Voix |
| ----------------- | ----------- | -------- | -------- |
| PASTEF          | 1,234,567 | 130    | 54.28  |
| Samm Sa Kaddu   | 456,789   | 16     | 20.10  |
| Takku Wallu     | 234,567   | 19     | 10.32  |

---

## ⚙️ Notes de gestion

* **Types d'élections** :
  - `presidential` : Élection du Président de la République
  - `legislative` : Élection des députés de l'Assemblée nationale
  - `locale` : Élections municipales et départementales

* **Statuts d'élection** :
  - `scheduled` : Élection programmée (pas encore tenue)
  - `registration` : Phase d'enregistrement des candidatures
  - `campaign` : Période de campagne électorale
  - `ongoing` : Élection en cours (jour du scrutin)
  - `completed` : Élection terminée (résultats publiés)

* **Calculs automatiques** :
  - Les totaux de voix, sièges, pourcentages sont calculés côté serveur (API)
  - Le frontend affiche les données pré-calculées pour optimiser les performances

* **Sources de données** :
  - **Conseil Constitutionnel** : Résultats officiels
  - **Direction Générale des Élections (DGE)** : Cartographie, bureaux de vote
  - **Vie-publique.sn** : Données compilées et enrichies

---

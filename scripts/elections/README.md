# Scripts du module électoral

Scripts d'exploitation de **données** du module électoral. Leur mode d'emploi complet (prérequis de schéma, règles de fusion, ordre des opérations, vérifications) est dans `docs/guidelines/elections/deployments/2026-07-migration-prod.md` — **le lire avant d'exécuter**.

Les évolutions de **schéma** ne passent pas par des scripts : les nouvelles collections s'importent en JSON via le module Schema Management Module de Directus, et les champs à ajouter sur des collections existantes suivent une procédure manuelle décrite dans le fichier de déploiement concerné (voir `docs/guidelines/elections/deployments/README.md`).

## Principes communs

- **Dry-run par défaut** : aucun script n'écrit sans le flag `--execute` ; le dry-run sert de validation et génère les CSV de revue ;
- **Idempotents** : une ré-exécution ne duplique rien (les éléments déjà présents/liés sont sautés) ;
- **Aucune écriture vers la prod avec le token du `.env`** (lecture seule) : l'exécution réelle passe par un token d'écriture temporaire créé par l'admin, révoqué après l'opération ;
- Les tokens ne sont jamais en dur : variables d'environnement chargées automatiquement depuis le `.env` à la racine du projet (via `load-env.mjs`, importé en tête de chaque script) ; possibilité de surcharger en les passant en préfixe de la commande ;
- Dossiers exclus de git : `backups/` (sauvegardes), `reports/` (CSV de revue, rapports d'exécution).

## Scripts

### `backfill-persons.mjs` — Backfill candidats → persons

```bash
node scripts/elections/backfill-persons.mjs                                   # dry-run + CSV de revue
node scripts/elections/backfill-persons.mjs --execute --merges=<fichier.csv>  # exécution
```

Crée une person par candidat **non archivé** sans `person`, applique les fusions inter-élections **validées** du fichier `--merges` (une ligne par fusion, IDs candidats séparés par des virgules, le premier = principal ; les fusions intra-élection sont refusées), génère les slugs depuis le nom (unicité persons uniquement), reprend la bio legacy (`biography`) en `short_bio`, lie `candidate.person`, vérifie (0 candidat non archivé sans person, 0 slug dupliqué).

Prérequis : le champ `election_candidates.person` et la collection `election_persons` existent (phase schéma) — sinon le dry-run échoue en 403, c'est attendu. Ne lit que des colonnes présentes en prod.

Sorties : `reports/persons-review-fusions.csv` (collisions inter-élections à arbitrer), `reports/persons-execution-report.json`.

⚠️ Les IDs candidats diffèrent entre environnements — toujours reconstruire le fichier `--merges` à partir du CSV de revue généré sur l'environnement cible (repères : coalition + position + birthdate).

### `backfill-political-entities.mjs` — Backfill coalitions → entités politiques

```bash
node scripts/elections/backfill-political-entities.mjs                                  # dry-run + CSV de revue
node scripts/elections/backfill-political-entities.mjs --execute --merges=<fichier.csv> # exécution
```

Crée une entité `published` par participation active (coalition non archivée avec listes, sans `political_entity`), applique les fusions inter-élections **validées** du fichier `--merges` (une ligne par fusion, IDs séparés par des virgules, le premier = participation la plus récente dont l'identité est reprise ; fusions intra-élection refusées), génère les slugs depuis les noms (préfixes génériques « Coalition… » retirés), lie `political_entity`, vérifie (0 participation active sans entité, 0 slug dupliqué).

Prérequis : le champ `election_coalition.political_entity`, la collection `election_political_entities` et le champ `election_candidates.person` existent (phase schéma) — sinon le dry-run échoue en 403, c'est attendu.

Sorties : `reports/entities-review-fusions.csv` (rapprochements par tête de liste et nom — compléter par un scan de graphies proches), `reports/entities-execution-report.json`.

⚠️ IDs différents entre environnements — reconstruire le fichier `--merges` depuis le CSV de revue généré sur l'environnement cible (repères : nom + élection + tête de liste).

### `backfill-constituencies.mjs` — Référentiel des circonscriptions

```bash
node scripts/elections/backfill-constituencies.mjs            # dry-run
node scripts/elections/backfill-constituencies.mjs --execute  # exécution
```

Enrichit `election_constituencies` : crée les 14 régions (`nationale_type=region`, graphie accentuée), pose le `parent` des départements vers leur région (depuis le champ texte `region` normalisé), génère les `slug` manquants (région `region-<nom>`, département `<nom>`, commune `<nom>` avec suffixe du département en cas de collision, puis suffixe numérique) et les `code` officiels des régions et départements (pcodes OCHA COD-AB Sénégal v02, tables de correspondance dans le script ; le slug reste la clé contractuelle, le code est informatif). Jamais de réécriture d'un slug/code/parent déjà posé.

Prérequis : les champs `slug` et `code` (uniques, nullables) et l'option `region` de `nationale_type` existent (phase schéma manuelle, voir le fichier de déploiement du référentiel des circonscriptions).

Contrôles bloquants en `--execute` : exactement 14 régions, 0 ligne publiée sans slug, 0 slug dupliqué, 0 département sans parent.

### `backfill-polling-stations.mjs` — Fichiers électoraux 2024 + bureaux de vote

```bash
node scripts/elections/backfill-polling-stations.mjs            # dry-run + CSV de revue
node scripts/elections/backfill-polling-stations.mjs --execute  # exécution
```

Crée les 2 lignes « Fichier électoral 2024 » (`election_electoral_files`, scope national/diaspora, recherche par scope + année avant création), rattache les élections législatives et présidentielle 2024 (résolues par type + année, jamais par ID ; FK posée uniquement si null), puis copie les bureaux rattachés aux législatives 2024 : `election_map_national` → `election_polling_stations` (circonscription par matching du texte `department` normalisé, bloquant si non résolu) et `election_map_diaspora` → idem (zone par la table pays → circonscription de l'étranger du script, 50 pays, bloquant si absent). Les collections sources ne sont jamais modifiées.

Prérequis : les 3 collections du volet fichiers électoraux et les 2 FK `elections.electoral_file_*` existent (phase schéma) ; le référentiel des circonscriptions porte les slugs.

Contrôles bloquants en `--execute` : volumétries source/cible identiques par scope, 0 bureau sans circonscription, sommes `voters` identiques.

Sorties : `reports/polling-stations-country-zones.csv` (correspondance pays → zone à revoir au dry-run).

### `backfill-constituency-results.mjs` — Résultats par circonscription + population

```bash
node scripts/elections/backfill-constituency-results.mjs            # dry-run
node scripts/elections/backfill-constituency-results.mjs --execute  # exécution
```

Copie 1:1 `carte` → `election_constituency_results` (1 ligne par couple élection × circonscription : `winning_coalition`, `winning_list`, `voters`, `seat`, `participation_10h/12h/14h/17h` ; les couples déjà présents sont sautés, les lignes `carte` en double sur un couple sont ignorées et rapportées) et pose `election_constituencies.population` depuis `carte.population` (uniquement si null ; en cas de divergence entre élections, la plus récente fait foi). `carte` n'est jamais modifiée et reste la source de lecture des endpoints jusqu'à la bascule.

Prérequis : la collection `election_constituency_results` et le champ `election_constituencies.population` existent (phase schéma).

Contrôles bloquants en `--execute` : volumétrie attendue, 0 doublon (election, constituency), échantillon comparé champ à champ à la source.

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

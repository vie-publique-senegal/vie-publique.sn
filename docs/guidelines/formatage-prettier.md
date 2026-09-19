# Formatage du code (Prettier)

> Doc canonique pour tout ce qui touche au formatage. Config : [`.prettierrc`](../../.prettierrc),
> [`.prettierignore`](../../.prettierignore), [`.editorconfig`](../../.editorconfig).

## ⚠️ Règle du moment : ne PAS lancer `npm run format`

`npm run format` = `prettier . --write` sur **tout le dépôt**. Or le dépôt n'a jamais été
formaté intégralement : au 2026-08-03, **312 fichiers** ne sont pas conformes (171 `.vue`,
128 `.ts`, le reste en `.json`/`.md`). Un `npm run format` les réécrit tous et noie ton diff.

**Tant que le [chantier ci-dessous](#chantier--passer-tout-le-dépôt-au-format-à-faire-avec-léquipe)
n'est pas fait, formater uniquement les fichiers qu'on a touchés :**

```bash
npx prettier --write app/pages/ma-page.vue server/api/mon-endpoint.ts
```

_(Cette règle remplace le « toujours lancer `npm run format` avant de commiter » historique.)_

## Configuration

| Fichier             | Rôle                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| `.prettierrc`       | `singleQuote`, `semi`, `trailingComma: all`, `printWidth: 100`, `tabWidth: 2`, `endOfLine: lf` + plugin `prettier-plugin-tailwindcss` (tri des classes Tailwind) |
| `.editorconfig`     | Cohérent avec `.prettierrc` (lf, 2 espaces). Prettier le lit **par défaut** en CLI — ne pas y mettre de valeurs contradictoires |
| `.prettierignore`   | Voir ci-dessous                                                            |

### Ce qui est exclu du formatage, et pourquoi

| Exclusion                          | Raison                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public`, `*.geojson`, `*.min.*`   | **Assets servis tels quels.** Prettier « déplie » les fichiers minifiés : constaté le 2026-08-03, un `npm run format` a ajouté **+78 000 lignes** sur 8 fichiers de `public/`, dont **25 136 sur le seul `public/geo/senegal-regions.geojson`** et ~10 000 sur `public/plateforme-bonne-gouvernance.html`. Aucun gain, et le repo gonfle. |
| `.agents`                          | **Contenu vendored** (skills Claude Code, 57 fichiers `.md`) : ce n'est pas notre code. Reformater leur frontmatter YAML est du bruit de diff au mieux, risqué au pire. Cf. [`claude-skills.md`](./claude-skills.md). |
| `docs`, `scripts`                  | Exclusions historiques, conservées : la doc reste écrite à la main.                                                                                                |
| `node_modules`, `.nuxt`, `.output`, `dist`, `.build`, `coverage` | Artefacts de build.                                                                                             |

## Le formatage n'est aujourd'hui contrôlé par rien

Constats au 2026-08-03, à traiter dans le chantier :

- **Aucun hook Git** : ni `husky`, ni `lint-staged`. Rien n'empêche de commiter du non-formaté —
  c'est l'origine de la dérive des 312 fichiers.
- **ESLint ne voit pas le formatage** : [`eslint.config.mjs`](../../eslint.config.mjs) importe
  `eslint-config-prettier`, qui se contente de **désactiver** les règles ESLint conflictuelles.
  `eslint-plugin-prettier` (celui qui _signalerait_ les écarts) est bien dans les `devDependencies`
  mais **n'est branché nulle part**. Donc `npm run lint` ne remonte **aucun** problème de format.
- **Pas de garde-fou en CI** : aucun `prettier --check` dans [`ci-cd-github.md`](../infra/ci-cd-github.md).

Note connexe : `npm run lint` remonte par ailleurs **883 problèmes préexistants** (817 erreurs,
surtout `@typescript-eslint/no-explicit-any`). Chantier distinct de celui-ci, mais il faudra en
tenir compte avant de rendre le lint bloquant en CI.

## Chantier : passer tout le dépôt au format (à faire avec l'équipe)

**Prérequis : avoir mergé les branches en cours des collègues.** Un reformatage global crée des
conflits sur des fichiers que personne n'a fonctionnellement touchés — il doit se faire quand
l'équipe repart d'une base commune, et être annoncé.

Ordre d'exécution :

1. **Merger tout le travail en cours** dans `develop`.
2. **Reformater en un seul commit isolé**, sans aucune modif fonctionnelle dedans :
   `npm run format` puis un commit `style: passage de tout le dépôt à Prettier`.
3. **Neutraliser le commit dans `git blame`** — sinon il devient l'auteur apparent de la moitié
   du code :
   ```bash
   echo "<SHA du commit style>" >> .git-blame-ignore-revs
   git config blame.ignoreRevsFile .git-blame-ignore-revs   # chaque dev, une fois
   ```
   (GitHub lit `.git-blame-ignore-revs` automatiquement.)
4. **Empêcher la dérive de revenir** — sans ça, on y sera de nouveau dans 6 mois :
   - `husky` + `lint-staged` → `prettier --write` sur les fichiers stagés en pre-commit ;
   - `prettier . --check` en job CI ;
   - trancher sur `eslint-plugin-prettier` : soit le brancher dans `eslint.config.mjs`, soit le
     désinstaller (une dépendance inutilisée vaut mieux supprimée — cf. item DOC-6 de
     [`audit-complet-2026-07.md`](../audits/audit-complet-2026-07.md)).
5. **Retirer l'avertissement en tête de ce doc** et remettre `npm run format` dans le workflow de
   [`/CLAUDE.md`](../../CLAUDE.md) (§ Development Workflow).

# Pipeline CI/CD (GitHub Actions)

Ce document explique le fonctionnement du pipeline d'intégration et de déploiement continu du projet `vie-publique.sn`.

> Fichier de configuration : `.github/workflows/_ci-cd.yml`
> Intégration GitHub ↔ Coolify : [coolify.io/docs — GitHub integration](https://coolify.io/docs/knowledge-base/git/github/integration)

---

## 1. Vue d'ensemble

**⚠️ Point important (état actuel)** : le déploiement de production se fait par **Coolify en
mode Nixpacks** (Coolify clone le repo et builde lui-même), **PAS à partir des images Docker**
construites par le pipeline. Les images poussées sur `ghcr.io` sont construites et prêtes, mais
ne servent pas encore au déploiement — bascule vers un déploiement par image Docker à envisager
plus tard.

> 🚨 **La branche déployée est `develop`, PAS `prod` (constaté 04/08/2026).** Le tableau des
> déclencheurs ci-dessous décrit fidèlement le workflow GitHub Actions, mais **ce n'est pas lui
> qui déploie aujourd'hui** : `deploy` ne se déclenche que sur un push `prod`
> (`if: github.ref == 'refs/heads/prod'`, `_ci-cd.yml`), or **`prod` est abandonnée — 380 commits
> en retard sur `develop`**. C'est **Coolify**, configuré sur `develop`, qui construit ce qui est
> en ligne.
>
> **Preuves :** des fonctionnalités présentes uniquement sur `develop` (le chat Sira, la dictée
> vocale) tournent en production ; et du code poussé sur `develop` s'est retrouvé servi en prod
> après un déploiement Coolify déclenché à la main (marqueur cherché dans le bundle `/_nuxt/`).
>
> **Conséquences pratiques :**
>
> - **lire ce tableau comme la description du pipeline GitHub, pas comme la voie de mise en
>   production** — s'y fier fait conclure à tort que du code mergé dans `develop` n'est pas en ligne ;
> - un push sur `develop` **ne déclenche pas** le webhook Coolify du workflow. Vérifier dans
>   Coolify si l'auto-déploiement (webhook Git propre à Coolify) est actif, sinon le déploiement
>   reste **manuel** ;
> - **ne pas « rattraper » `prod` par un merge** sans décision d'équipe : ce serait rejouer
>   380 commits déjà en ligne par une autre voie.
>
> À trancher : soit remettre `prod` dans la boucle (Coolify pointe sur `prod`, merges `develop` →
> `prod` pour livrer), soit acter `develop` comme branche de déploiement et retirer le job
> `deploy` devenu mort. **Le statu quo est le piège** — il fait cohabiter deux vérités.

### Déclencheurs

| Événement | Branches | Jobs exécutés |
| :--- | :--- | :--- |
| **Pull Request** vers `develop` | `develop` | Tests + **SonarCloud** (analyse qualité) |
| **Push** sur `develop` | `develop` | Tests + Build & Push image Docker (tags `develop`, `sha-…`) |
| **Push** sur `prod` | `prod` | Tests + Build & Push image (tags `prod`, `latest`, `sha-…`) + **Déploiement Coolify** |

### Enchaînement des jobs

```text
test-and-analyze  ──▶  build-and-push (push uniquement)  ──▶  deploy (push prod uniquement)
```

## 2. Détail des jobs

### A. Job `test-and-analyze` (Qualité)

Tourne sur **tous** les déclencheurs.

1. **Préparation** : Ubuntu, Node.js v24, `npm ci`.
2. **Tests** : tests unitaires avec couverture (`npm run test:coverage`).
3. **SonarCloud Scan** : **uniquement sur les Pull Requests vers `develop`**
   (`if: github.event_name == 'pull_request'`). Volontairement exclu des push `prod`/`develop`
   pour ne pas bloquer le build/déploiement (ex. token Sonar expiré).
   Configuration : `sonar-project.properties` (voir §4).

### B. Job `build-and-push` (Image Docker)

Ne tourne **que sur les push** (`develop` et `prod`), et seulement si les tests passent.

1. **Login** au registre GitHub (`ghcr.io`).
2. **Build** de l'image via `Dockerfile.optimized` (linux/amd64 uniquement).
3. **Push** sur `ghcr.io/vie-publique-senegal/vie-publique.sn` avec les tags :
   - `:develop` ou `:prod` (nom de la branche) ;
   - `:sha-xxxxxxx` (commit précis, utile pour un rollback) ;
   - `:latest` **uniquement sur les push `prod`** (image de production de référence).
4. **Cache** : double cache (GitHub Actions + tag `:buildcache` sur le registre) pour accélérer
   les builds suivants.

### C. Job `deploy` (Coolify)

Ne tourne **que sur les push `prod`** (`if: github.event_name == 'push' && github.ref == 'refs/heads/prod'`).

- Appelle le **webhook de déploiement Coolify** (`secrets.COOLIFY_WEBHOOK` +
  `secrets.COOLIFY_TOKEN`) via un simple `curl`.
- Coolify clone alors la branche `prod` du repo et **builde lui-même l'application (Nixpacks)**
  avant de redémarrer le conteneur. L'image `ghcr.io` construite au job précédent n'est pas
  utilisée à cette étape (voir l'avertissement en §1).

## 3. Secrets GitHub requis

Configurés dans `Settings > Secrets and variables > Actions` :

| Secret | Usage |
| :--- | :--- |
| `SONAR_TOKEN` | Authentification SonarCloud (scan qualité sur PR). ⚠️ expire — à régénérer sur sonarcloud.io > My Account > Security. |
| `COOLIFY_WEBHOOK` | URL du webhook de déploiement fournie par Coolify. |
| `COOLIFY_TOKEN` | Token API Coolify (header `Authorization: Bearer`). |
| `GITHUB_TOKEN` | Fourni automatiquement par GitHub (push ghcr.io, décoration PR Sonar). |

## 4. Configuration SonarCloud

L'analyse est pilotée par `sonar-project.properties` à la racine (clé projet
`vpsn_vie-publique.sn`, organisation `vie-publique-senegal`, sources `app`/`server`,
rapport de couverture `coverage/lcov.info`).

### Erreurs courantes

#### Erreur : `HTTP 403 Forbidden … check the property sonar.token`

- **Cause** : `SONAR_TOKEN` expiré, révoqué ou absent (le scanner s'authentifie dès le
  téléchargement du JRE). Rencontré en juillet 2026.
- **Solution** : régénérer un token sur SonarCloud (My Account > Security) et mettre à jour le
  secret `SONAR_TOKEN`, puis relancer le job.

#### Erreur : "Project not found"

- **Cause** : le `SONAR_TOKEN` n'appartient pas à l'organisation ou la `projectKey` a changé.
- **Solution** : régénérer le token et mettre à jour le secret.

#### Erreur : "You are running CI analysis while Automatic Analysis is enabled"

- **Cause** : conflit entre l'analyse automatique SonarCloud et l'analyse CI.
- **Solution** : désactiver l'Automatic Analysis dans le dashboard SonarCloud du projet.

### FAQ : Automatic Analysis vs CI-based Analysis

| Caractéristique | Analyse Automatique (SonarCloud) | Analyse CI (GitHub Actions) |
| :--- | :--- | :--- |
| **Configuration** | Zéro config (facile) | Fichier YAML + Properties (complet) |
| **Couverture de Code** | ❌ Non supporté (souvent) | ✅ Oui (importe les rapports LCOV) |
| **Contrôle** | Limité | Total (build, tests, lint avant analyse) |
| **Contexte** | Déconnecté du build | Intégré au workflow de validation |

**Verdict** : pour ce projet, l'analyse CI est indispensable.

## 5. Déploiement Docker (piste future)

Quand on voudra déployer à partir des images `ghcr.io` (au lieu du build Nixpacks) :

- Coolify sait déployer une image de registre (Docker Image resource) — utiliser le tag
  `:latest` (= dernier build `prod`) ou un `:sha-…` précis pour figer/rollbacker.
- Si le package ghcr est privé : PAT GitHub `read:packages` dans Coolify > Docker Registry,
  ou rendre le package public (page du repo > Packages > Change visibility).
- Alternative événementielle : webhook GitHub sur l'événement **Packages** (image publiée →
  Coolify tire la nouvelle image), à la place du webhook appelé par le job `deploy`.
- Guide serveur manuel (docker-compose, Traefik, backup…) : voir `deployment.md`.

## 6. Performances et temps de build

Un build complet peut prendre **5 à 8 minutes**.

1. **Cache Docker (le plus impactant)** :
   - premier build long (~60s rien que pour `npm ci`) ;
   - builds suivants rapides (~2-3 min) grâce au cache `ghcr.io` + cache GitHub Actions ;
   - si GitHub purge son cache (7 jours ou quota), un build lent se reproduit.
2. **PWA** : `@vite-pwa/nuxt` génère des milliers de hashs (~45 Mo, ~2 min de CPU).

### Pistes d'optimisation (si build > 15 min)

- Désactiver la PWA hors production.
- Réduire les assets statiques commités.
- Séparer "Tests" et "Build Docker" en workflows parallèles (au prix de la garantie
  « code testé = code buildé »).

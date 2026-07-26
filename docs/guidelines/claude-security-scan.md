# Claude Security — scan de vulnérabilités automatisé

> Doc canonique de l'outil. Les **résultats datés** de chaque campagne de scan vont dans
> `docs/audits/audit-claude-security-AAAA-MM.md` (convention audits). Complémentaire de
> l'audit sécurité manuel ([`../audits/audit-complet-2026-07.md`](../audits/audit-complet-2026-07.md),
> items SEC-1..10) — ne le remplace pas.

## C'est quoi

[Claude Security](https://www.anthropic.com/news/claude-code-security) est le plugin officiel
Anthropic (beta, juillet 2026) de scan de vulnérabilités pour Claude Code. Il orchestre un
pipeline **multi-agents** : inventaire du dépôt → modèle de menaces (points d'entrée, trust
boundaries) → chercheurs par composant × catégorie (injection, auth, mémoire/unsafe, crypto,
secrets) → balayage de complétude → **panel de vérification adversariale à 3 votes** (un finding
n'est rapporté que s'il survit à un quorum 2/3 ; unanimité = confiance `high`, 2/3 = `medium`).

Garanties du modèle de confiance :

- rien n'est appliqué automatiquement — les fixes sont des fichiers `.patch` à relire ;
- le scan ne fait **aucun appel réseau** (pas de push/fetch/download) ;
- le code scanné est traité comme **donnée**, jamais comme instruction.

Limites assumées : résultats **non déterministes** (relancer régulièrement construit la
couverture), pas d'isolation propre (ne scanner que du code de confiance), complément — pas
remplacement — d'un SAST classique et de la revue de code.

## Installation (fait le 2026-07-25, scope user)

```bash
claude plugin marketplace add anthropics/claude-plugins-official   # une fois par machine
claude plugin install claude-security@claude-plugins-official
```

Prérequis : Claude Code ≥ 2.1.154 (plan payant), Python ≥ 3.9, Git. Coût fixe : ~640 tokens
ajoutés à chaque session.

## Lancer un scan

**Usage normal (session interactive)** : ouvrir une session Claude Code dans le dépôt et taper
`/claude-security` → menu à 3 choix (scan codebase / scan changes / suggest patches). Effort :
`low` (triage rapide) · `medium` (défaut calibré) · `high` · `max` (+ phase red-team).

**Convention projet** : la surface d'attaque réelle est `server/` (~140 fichiers : routes API,
proxys CMS/documents, middleware, utils). Un scan scopé `server/` à `medium` est le bon
rapport signal/coût par défaut ; réserver le dépôt entier (~1,1k fichiers) aux campagnes
exceptionnelles.

```text
/claude-security scan codebase --scope server --effort medium
```

**Sortie** : un dossier `CLAUDE-SECURITY-<timestamp>/` à la racine du dépôt contenant le rapport
lisible (`CLAUDE-SECURITY-RESULTS.md`), le JSONL machine (pour un futur gate CI) et le tampon de
révision (commit scanné + statut `verified`/`unverified`). Le dossier embarque son propre
`.gitignore` — **il ne part jamais en commit** ; le résumé exploitable est à reporter dans
`docs/audits/`.

## Pièges (Windows / ce projet — vécus, font perdre du temps)

1. **Le plugin ne s'active qu'au démarrage de session.** Installé en cours de session, sa skill
   et ses agents (`claude-security:scan-researcher`…) sont introuvables → redémarrer la session
   (ou lancer une session neuve) avant `/claude-security`.
2. **`python3` n'existe pas sous Windows** (seul `python` est sur le PATH ; l'alias Windows Store
   `python3` renvoie « Python est introuvable »). Or les scripts du plugin (rendu du rapport,
   tampon de révision) appellent `python3`. Fix : shim sur le PATH avant de lancer la session :

   ```bash
   mkdir -p /c/tmp/py3shim
   printf '#!/bin/sh\nexec python "$@"\n' > /c/tmp/py3shim/python3
   chmod +x /c/tmp/py3shim/python3
   PATH="/c/tmp/py3shim:$PATH" claude
   ```

3. **Le marketplace officiel n'est pas pré-enregistré** : `plugin install` échoue avec
   « Plugin not found » tant que `claude plugin marketplace add anthropics/claude-plugins-official`
   n'a pas été fait.
4. **Scan sans surveillance (headless)** : possible via
   `claude -p "/claude-security scan codebase --scope server --effort medium — I understand it
   may take a while and use a significant number of tokens." --permission-mode bypassPermissions` —
   la phrase d'acquiescement est **obligatoire** (sans elle, la confirmation de coût ne peut pas
   être posée en non-interactif et le scan refuse de démarrer, par design).
5. **⚠️ Le pipeline exige que l'exécution de commandes soit autorisée** (`--permission-mode auto`
   en interactif, `bypassPermissions` en headless). Avec `acceptEdits` (ou un mode qui bloque le
   Bash), les scripts Python du plugin (rendu du rapport, tampon de révision) sont refusés au
   niveau permission → **le pipeline multi-agents ne tourne pas** et la session bascule
   silencieusement en **revue manuelle non tamponnée** (utile, mais sans vérification
   adversariale ni stamp de révision). Symptôme : le dossier `CLAUDE-SECURITY-<ts>/` reste vide
   (juste un `.gitignore`) et le texte de sortie commence par « the automated pipeline could not
   run ».
6. **⚠️ En headless (`claude -p`), le plafond d'attente des tâches de fond tue le pipeline à
   600s.** Le scan tourne comme tâche de fond DANS la session headless ; le wrapper `-p` la
   termine au bout de 600s (« Background tasks still running after 600s; terminating »), ne
   laissant qu'un `scan-meta.json` partiel. Fix : `export CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`
   avant de lancer (attente illimitée). En session **interactive** ce piège n'existe pas —
   c'est propre au mode `-p`.

## Historique des campagnes

| Date | Portée | Effort | Résultat |
| --- | --- | --- | --- |
| 2026-07-25 | `server/` (139 fichiers) | medium | **11 findings vérifiés** (1 HIGH, 8 MED, 2 LOW), statut `verified` → [`../audits/audit-claude-security-2026-07.md`](../audits/audit-claude-security-2026-07.md) |

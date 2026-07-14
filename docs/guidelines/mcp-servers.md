# Serveurs MCP du projet (Claude Code)

> **Doc canonique** des serveurs MCP déclarés dans [`.mcp.json`](../../.mcp.json) (portée
> projet, committé). Le fichier ne contient **aucun secret** : les serveurs hébergés
> s'authentifient par OAuth personnel, les secrets locaux passent par des variables
> d'environnement (`${VAR}`).

## Serveurs déclarés

| Serveur | Type | Auth | Sert à |
| --- | --- | --- | --- |
| `sentry` | HTTP (hébergé Sentry) | OAuth via `/mcp` | Lire les issues/stack traces de prod (détail : [`infra/sentry.md`](../infra/sentry.md) §5) |
| `github` | HTTP (hébergé GitHub) | OAuth via `/mcp` | PRs, issues, CI (le CLI `gh` reste dispo en parallèle) |
| `cloudflare-docs` | HTTP (hébergé Cloudflare) | aucune | Recherche dans la doc Cloudflare |
| `cloudflare-dns-analytics` | HTTP (hébergé Cloudflare) | OAuth via `/mcp` | Analytics DNS de la zone (le site passe par Cloudflare) |
| `chrome-devtools` | stdio (`npx chrome-devtools-mcp`) | aucune | Piloter un vrai Chrome : DOM **après hydratation**, console, réseau — la classe de bugs invisibles en `curl` (JSON-LD dupliqué client, TDZ à l'hydratation, cf. CLAUDE.md § SEO) |
| `directus` | stdio (`npx @directus/content-mcp`) | token via env | Inspecter les collections/champs réels du CMS (évite les pièges de nommage et de permissions documentés dans CLAUDE.md) |
| `google-analytics` | stdio (`python -m pipx run analytics-mcp`) | ADC Google | Requêter GA4 (rapports, temps réel) |

## Mise en route (une fois par développeur)

1. **Redémarrer la session Claude Code** après le checkout (les MCP sont chargés au
   démarrage) et **approuver** les serveurs du projet à la première utilisation.
2. **Serveurs OAuth** (`sentry`, `github`, `cloudflare-dns-analytics`) : taper `/mcp` →
   sélectionner le serveur → suivre l'OAuth. Vérifier avec `claude mcp list` (`Connected`).
3. **`directus`** : définir la variable d'environnement **utilisateur** `DIRECTUS_MCP_TOKEN`
   (token Directus de lecture ; un token dédié « MCP » est préférable, à défaut réutiliser
   celui du front). PowerShell :

   ```powershell
   [Environment]::SetEnvironmentVariable('DIRECTUS_MCP_TOKEN', '<token>', 'User')
   ```

   ⚠️ Puis **redémarrer VS Code entièrement** (les variables utilisateur sont lues au
   lancement du processus, pas de la session Claude).
4. **`google-analytics`** : nécessite pipx (`python -m pip install --user pipx`) et des
   [Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc)
   Google avec le scope `analytics.readonly` et les API *Analytics Admin* + *Analytics Data*
   activées sur un projet GCP — voir le
   [README officiel](https://github.com/googleanalytics/google-analytics-mcp). Tant que
   l'ADC n'est pas configuré, le serveur démarre mais ses outils échouent (sans effet de bord).

## Pièges connus

- **Ne PAS ajouter de serveur en portée `local`** pour ce projet : la config locale
  (`~/.claude.json`) est indexée par le chemin du projet **sensible à la casse** — le CLI
  écrit sous `C:/Devlabs/...` alors que la session VS Code s'identifie en `c:/devlabs/...`,
  et le serveur devient invisible (vécu 2026-07). La portée **projet** (`.mcp.json`) évite ça.
- Le validateur JSON de VS Code signale `${DIRECTUS_MCP_TOKEN}` comme « Variable not found » :
  **faux positif** — c'est la syntaxe d'expansion de Claude Code, pas une variable VS Code.
- Toute modification de `.mcp.json` nécessite un redémarrage de session pour être prise en
  compte.
- **Google Search Console** : pas de serveur MCP **officiel** à ce jour (2026-07) — seulement
  des implémentations communautaires (à auditer avant usage : elles demandent un service
  account GSC). À réévaluer périodiquement, le besoin SEO est réel sur ce projet.

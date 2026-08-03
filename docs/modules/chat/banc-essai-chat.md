# Banc d'essai de chatbots (`/chat/**`)

> Doc d'entrée du module. Plusieurs stacks de RAG conversationnel tournent en parallèle **sous
> la même interface**, chacune à son URL, pour que les équipes internes les testent et comparent.

## Pourquoi une coquille unique

Si chaque POC a son interface, on compare des interfaces au lieu de comparer des stacks. La
coquille (`app/components/Chat/`) est donc **identique pour toutes les variantes** ; seul
l'adaptateur de backend change. Elle ne connaît d'un backend que l'interface `ChatAdapter`
(`types/chat.ts`) : si une notion propre à une stack apparaît dans la coquille, c'est que
l'adaptateur n'a pas fait son travail de traduction.

## Structure

| Chemin | Rôle |
| --- | --- |
| `types/chat.ts` | Contrat client : `ChatEvent`, `ChatAdapter`, `ChatVariant`. |
| `app/config/chat-variants.ts` | **Registre — source de vérité unique** des variantes. |
| `app/lib/chat/adapters/` | Un fichier par backend. Chargement paresseux depuis le registre. |
| `app/lib/chat/markdown.ts` | Rendu markdown des réponses, assaini par DOMPurify. |
| `app/components/Chat/` | La coquille : `Shell`, `Message`, `Composer`. |
| `app/pages/chat/[variant].vue` | Page unique de **toutes** les variantes. Inconnue → 404. |
| `app/pages/chat/liste.vue` | Page d'atterrissage, **générée depuis le registre**. |

**Ajouter une stack coûte : une entrée dans le registre + un adaptateur.** Zéro nouvelle page,
zéro modification de la coquille. Le jour où une stack n'entre pas dans `ChatAdapter`, lui faire
un composant dédié plutôt que tordre l'interface pour tout le monde.

## Routes

| URL | Comportement |
| --- | --- |
| `/chat` | **302** vers la variante par défaut (`CHAT_DEFAULT_VARIANT`, aujourd'hui `gemini`). |
| `/chat/liste` | Liste des variantes. |
| `/chat/<stack>` | Une variante. Nommée **par stack** (`gemini`, `azure`), jamais par n° de version. |

⚠️ La redirection `/chat` est un **302, pas un 301** : la variante par défaut changera au fil des
POC, et un 301 resterait caché indéfiniment dans le navigateur des testeurs. L'URL est
l'identifiant de la stack dans tout retour de testeur : `/chat` dans un rapport de bug serait
intraçable le jour où le défaut change.

## Non-streaming et streaming, même interface

`send()` rend un `AsyncIterable<ChatEvent>`. Un backend **sans** streaming émet un unique `token`
avec la réponse complète, puis `done` — la coquille ignore qu'il ne streamait pas.

Trois règles de flux appliquées par la coquille :

1. l'affichage ne bloque **jamais** en attendant `sources` ; le texte s'affiche dès le 1ᵉʳ `token` ;
2. un flux qui se termine **sans événement terminal** (`done` ou `error`) est un **échec**, pas un
   succès : la réponse affichée peut être tronquée en silence ;
3. `429` est un **cas normal**, pas une panne : message explicite avec le délai + saisie bloquée
   le temps du décompte. Les quotas de l'API RAG sont **par IP**, et VP teste depuis un même
   bureau : « une erreur est survenue » y serait incompréhensible.

`done.meta` est **opaque** pour la coquille : elle l'affiche en clé/valeur sans jamais nommer une
clé. C'est ce qui lui permet d'exposer des métadonnées de diagnostic (latence, modèle) sans rien
savoir du backend.

## Traçabilité des retours

Sans elle, on récolte « ça hallucine » sans pouvoir remonter à quoi que ce soit. Deux garanties :

- le **nom de la variante** est visible en permanence (en-tête + pied), pour qu'une capture
  d'écran se suffise à elle-même ;
- le **`conversation_id` est affiché et copiable** — clé de jointure avec les traces côté backend.
  Quand une variante n'en fournit pas, son absence est affichée explicitement.

## Exposition

- `noindex, nofollow` sur toutes les pages `/chat/**` + exclusion du sitemap (`nuxt.config.ts`).
- Aucun lien depuis le menu, le pied de page ou une page publique. Accès par URL directe.
- ⚠️ **Pas de `Disallow` dans `robots.txt`** : ce fichier est **public**, y lister les variantes
  publierait l'inventaire des POC internes — et un crawler bloqué ne lirait pas le `noindex`
  (règle SEO §10 du `CLAUDE.md`).
- `noindex` empêche l'**indexation**, pas l'**accès** : ces pages restent atteignables par qui a
  l'URL. Une vraie confidentialité demanderait un autre mécanisme.

## Configuration

| Variable | Rôle |
| --- | --- |
| `NUXT_PUBLIC_RAG_API_URL` | Origine de l'API RAG (défaut `https://rag.vie-publique.sn`). |
| `CHATBOT_API_URL` / `CHATBOT_API_KEY` | Backend Azure historique, via le proxy `server/api/chat.ts`. |

⚠️ **Changer `NUXT_PUBLIC_RAG_API_URL` en production exige un REBUILD**, pas seulement une
variable d'environnement : l'origine est injectée dans la directive CSP `connect-src`, figée au
build. (Tant que l'API reste sur `*.vie-publique.sn`, elle est déjà couverte par l'entrée
générique.)

## Pas de proxy Nitro pour l'API RAG

Le navigateur appelle l'API **en direct**. Le modèle de `server/api/chat.ts` (proxy vers Azure)
**ne se transpose pas** :

- le tenant est résolu depuis l'en-tête `Origin` du navigateur — un appel serveur n'en a pas ;
- le rate limiting est **par IP** : derrière un proxy, tous les visiteurs partageraient l'IP du
  serveur Nuxt, donc un seul seau de 10 req/min pour le site entier.

Il n'y a d'ailleurs aucun secret à cacher : le jeton de session est anonyme, éphémère (15 min) et
délivré publiquement à qui présente la bonne origine. Le proxy n'achèterait rien et coûterait le
SSE.

## État d'avancement

| Brique | État |
| --- | --- |
| 2 — squelette du banc (registre, routes, coquille, adaptateur factice) | ✅ |
| 3 — adaptateur Azure | à faire |
| 4 — transport Gemini (jeton + parseur SSE, testés unitairement) | à faire |
| 5 — adaptateur Gemini (`conversation_id`, sources, erreurs, quotas) | à faire |
| 6 — finitions et retrait de `/chatbot` | à faire |

> Contrat de l'API RAG : **source de vérité = `../rag-platform/docs/ARCHITECTURE.md`, § Contrat
> d'API**. Ne rien recopier ici qui puisse diverger.

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
| `app/lib/chat/sse.ts` | Parseur SSE + lecture du `ReadableStream`. |
| `app/lib/chat/session-token.ts` | Jeton de session anonyme : cache, renouvellement, dédup. |
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

## Transport de la variante `gemini`

Deux appels, tous deux **depuis le navigateur, en direct** (voir « Pas de proxy Nitro » plus bas).

### `POST /session` → jeton (`session-token.ts`)

Aucun corps ; le tenant est résolu depuis l'en-tête `Origin` que le navigateur pose seul. Le jeton
vaut 15 min et **reste en mémoire** : anonyme et éphémère, le persister dans `localStorage`
n'apporterait rien. Trois règles, chacune couverte par un test :

1. **renouvellement à 80 % de la durée de vie**, pour ne pas découvrir un `401` au milieu d'une
   conversation ;
2. **une seule requête `/session` en vol** : deux questions coup sur coup ne consomment pas deux
   jetons (quota `/session` = 20/min par IP, partagé par tout un bureau) ;
3. **aucun retry automatique** : une requête refusée est elle aussi décomptée du quota. La seule
   reprise est **une** ré-authentification après un `401` sur `/ask`, jamais en boucle.

### `POST /ask` → réponse en SSE (`sse.ts`)

⚠️ **`EventSource` ne sait faire ni `POST` ni `Authorization`** : il faut `fetch` + lecture du
`ReadableStream` + un parseur SSE maison. C'est là que se cachent les bugs, parce qu'un chunk
réseau ne s'arrête jamais sur une frontière utile. Le découpage est donc **séparé de la lecture du
flux** pour être testable sans réseau (`test/unit/chat/sse.test.ts`, 18 cas) : ligne coupée en
plein milieu, `\n\n` à cheval sur deux chunks, `\r\n` coupé entre ses deux caractères, `data:`
multi-lignes, événement sans `data`, flux reconstitué caractère par caractère.

Le flux porte un **keep-alive** (`: keep-alive`) parce que Cloudflare coupe les flux inactifs et
que le premier token peut demander plusieurs secondes. C'est un commentaire SSE : un parseur
correct l'ignore, un parseur naïf le prend pour de la donnée.

### Erreurs et quotas

| Code | HTTP | Traitement |
| --- | --- | --- |
| `unauthorized` | 401 | jeton invalidé, **une** reprise, puis message d'erreur. |
| `origin_not_allowed` | 403 | l'origine n'est pas déclarée dans `RAG_TENANTS` côté API. |
| `rate_limited` | 429 | message explicite + décompte ; `Retry-After` en secondes. |

Limites **par IP** : 10 req/min sur `/ask`, 20 sur `/session`. Comme VP teste depuis un même
bureau, ces 10 questions/minute sont partagées par tout le bâtiment — d'où un message explicite
plutôt qu'« une erreur est survenue ». La limite est réglable côté API.

**Freinage préventif** : `X-RateLimit-Remaining` accompagne toutes les réponses des routes
limitées. Quand il tombe à 0, l'adaptateur refuse la question suivante **sans appeler l'API**
jusqu'à `X-RateLimit-Reset` — une requête refusée serait elle aussi décomptée. `Retry-After`, lui,
n'apparaît que sur le 429, donc trop tard pour se freiner.

> ⚠️ **Bloqué côté API au 2026-08-04 — CORS sur les réponses d'erreur et en-têtes de quota.**
> Le code ci-dessus est écrit et testé unitairement, mais il ne peut **pas** fonctionner dans un
> navigateur tant que l'API n'a pas été corrigée :
>
> 1. **La réponse `429` ne porte pas `Access-Control-Allow-Origin`** (les `200`, si). Le navigateur
>    la bloque donc avant que le code n'y accède : `fetch` lève un `TypeError: Failed to fetch`
>    indiscernable d'une coupure réseau. Résultat observé : « La réponse n'a pas pu être obtenue »
>    au lieu de « trop de questions à la minute, réessayez dans 60 s ». Le contrat présente
>    pourtant le 429 comme « un cas normal à gérer » — un client navigateur ne peut pas le gérer.
> 2. **Aucune réponse ne porte `Access-Control-Expose-Headers`.** Depuis le navigateur, seul
>    `content-type` est lisible (vérifié : `[...response.headers.keys()]` → `['content-type']`).
>    `X-RateLimit-Remaining`, `-Reset` et `Retry-After` sont donc **invisibles**, alors que le
>    contrat invite explicitement le client à s'en servir pour se freiner avant d'être refusé.
>
> Il n'y a **rien à contourner côté widget** : deviner un quota à partir d'un `TypeError` serait
> faux (une vraie coupure réseau donne la même chose). Le jour où l'API ajoutera ces en-têtes, le
> message explicite et le freinage préventif s'activeront sans modification ici.

### Doublons du corpus

Le corpus contient un même PDF indexé sous deux `external_id`. La déduplication serveur porte sur
`(external_id, page)` et ne peut donc pas les voir : l'adaptateur dédoublonne sur l'URL du
fichier, pour ne pas afficher deux cartes identiques.

## Tests

`npx vitest run test/unit/chat` — 38 cas. Le parseur SSE et la gestion du jeton sont testés **avant
l'UI** : ce sont les deux endroits où une régression est invisible à l'œil (le flux « marche » sur
un réseau rapide et casse en production ; un jeton mal renouvelé ne se voit qu'au bout de 15 min).
L'adaptateur est testé avec un `fetch` bouchonné — donc **sans consommer le quota**.

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

## Mise en service

**Aucune variable à ajouter sur Coolify** pour un déploiement sur `rag.vie-publique.sn` :
`NUXT_PUBLIC_RAG_API_URL` a cette valeur par défaut dans `nuxt.config.ts`, et la CSP de production
autorise déjà `https://*.vie-publique.sn` dans `connect-src`. La déclarer explicitement reste une
bonne pratique de traçabilité ; elle ne devient **obligatoire** que si l'API déménage hors du
domaine — et il faudra alors **rebuild**, pas seulement redéployer.

**Origines autorisées côté API** (`RAG_TENANTS`, tenant `vpsn`) : `https://www.vie-publique.sn`
est déclarée (vérifié le 2026-08-04, `/session` → 200). L'apex `https://vie-publique.sn` répond
403, ce qui est **sans conséquence** : `server/middleware/host-redirect.ts` redirige apex → www en
301 avant qu'une page ne s'exécute, donc le navigateur est toujours sur www au moment de l'appel.

À vérifier après déploiement :

```bash
curl -sL https://www.vie-publique.sn/chat -o /dev/null -w '%{http_code} %{redirect_url}\n'  # 302 -> /chat/gemini
curl -s https://www.vie-publique.sn/chat/gemini | grep -i robots                            # noindex, nofollow
curl -s https://www.vie-publique.sn/robots.txt | grep -i chat                                # ne doit PAS lister /chat
curl -s https://www.vie-publique.sn/sitemap.xml | grep -c '/chat'                            # 0
```

Puis, dans un navigateur, poser une question sur `/chat/gemini` : le texte doit s'afficher au fil
de l'eau. Si rien ne vient et que la console montre une erreur CSP `connect-src`, c'est que
l'origine de l'API a changé sans rebuild.

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
| 3 — adaptateur Azure | à faire — la variante `azure` tourne encore sur l'adaptateur factice |
| 4 — transport Gemini (jeton + parseur SSE, testés unitairement) | ✅ |
| 5 — adaptateur Gemini (`conversation_id`, sources, erreurs, quotas) | ✅ éprouvé contre l'API — sauf le 429, bloqué côté API |
| 6 — finitions et retrait de `/chatbot` | à faire |

## Recette

Le corpus indexé ne contient que **136 documents** (conseils des ministres, lois de finances, Cour
des comptes, statistiques ANSD) : toute question hors périmètre répond « je ne sais pas », c'est
le comportement attendu.

Passée le 2026-08-04 contre `https://rag.vie-publique.sn` :

| Question | Ce que ça vérifie | Résultat |
| --- | --- | --- |
| Départements touchés par l'insécurité alimentaire sévère ? | streaming, rendu markdown des listes, liens cliquables | ✅ (sources ANSD, pas le CM du 29/07 — affaire de recherche côté API) |
| Qui préside la Commission des Finances qui a examiné le PLF 2026 ? | pas deux cartes identiques | ✅ Chérif Ahmed DICKO ; 2 cartes **distinctes** (documents 5219 et 1974), même PDF dupliqué dans le catalogue |
| Déficit du PLF 2026 ? puis « Et le plafond d'emplois publics ? » | `conversation_id` du `done` repassé au tour suivant | ✅ 1 245,1 Mds / 5,37 % du PIB, puis 206 375 |
| Budget de la commune de Ziguinchor 2026 ? | pas de bloc « Sources » vide | ✅ « pas d'information », aucun bloc Sources |
| Taux de croissance révisé par la LFR 2025 ? | exactitude de la réponse | ✅ 8,0 % contre 8,8 % |
| `429` provoqué (14 requêtes parallèles) | message explicite + délai | ❌ **bloqué par la CORS de l'API** (voir l'encadré § Erreurs et quotas) |

⚠️ Le doublon du 2ᵉ cas n'est **pas** dédoublonnable côté widget : les deux entrées ont des
titres, des `external_id` et des URLs différents — ce sont deux fiches distinctes du catalogue
pointant sur le même PDF. Les fusionner demanderait de comparer les extraits, ce qui masquerait
de vraies sources distinctes. Le bon niveau de correction est le catalogue (Directus), pas l'UI.
La déduplication implémentée ne fusionne que les sources **strictement identiques**
(même fichier, même page).

> Contrat de l'API RAG : **source de vérité = `../rag-platform/docs/ARCHITECTURE.md`, § Contrat
> d'API**. Ne rien recopier ici qui puisse diverger.

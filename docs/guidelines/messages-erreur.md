# Messages d'erreur utilisateur

> **Règle projet, valable sur TOUTES les pages du site** : aucun message d'erreur
> technique ne doit atteindre l'écran d'un visiteur. Ni `Error: [GET] "/api/…": 500`,
> ni `fetch failed`, ni un objet `Error` interpolé tel quel dans un template.

## Pourquoi

Les blocs d'erreur historiques faisaient `{{ error }}` ou `:title="error.message"`.
Le `message` d'une erreur `ofetch` est construit par la lib, pas par nous :

```
[GET] "/api/elections/map/national?department=LINGUERE&election=4": 500 Erreur lors de la récupération…
```

Résultat à l'écran : une URL d'API, un verbe HTTP, un code 500 — illisible pour un
citoyen, et une fuite d'information sur la structure interne (cf. SEC-9 : jamais
d'`error.message` dans une réponse HTTP non plus).

## Les deux outils

| Outil | Où | Usage |
| --- | --- | --- |
| `getFriendlyErrorMessage(error, fallback?)` | [`shared/friendly-error.ts`](../../shared/friendly-error.ts), auto-importé côté app via [`useErrorHandler`](../../app/composables/useErrorHandler.ts) | traduit **n'importe quelle** erreur en une phrase FR compréhensible |
| `<AppErrorState>` | [`app/components/AppErrorState.vue`](../../app/components/AppErrorState.vue) | bloc d'erreur canonique (icône + titre + message + « Réessayer ») |

### Bloc d'erreur dans une page / une liste

```vue
<AppErrorState
  v-else-if="error"
  :error="error"
  title="Votes indisponibles"
  message="Les votes de la législature n'ont pas pu être chargés."
  retryable
  @retry="refresh"
/>
```

- `:error` = l'erreur **brute** (elle n'est jamais affichée telle quelle, elle sert
  à choisir le bon message selon le code HTTP).
- `title` = ce qui a échoué, en langage métier.
- `message` = repli métier, utilisé seulement si l'erreur n'est pas typée.
- `retryable` + `@retry` = bouton « Réessayer » (brancher le `refresh` du composable).
- `compact` pour un encart étroit.

### Toast / formulaire

```ts
const { showErrorToast, getFriendlyErrorMessage } = useErrorHandler();

try {
  await $fetch('/api/…', { method: 'POST' });
} catch (err) {
  submitError.value = getFriendlyErrorMessage(err, "L'envoi a échoué. Merci de réessayer.");
  // ou : showErrorToast(err)
}
```

## Ce que fait `getFriendlyErrorMessage`

1. **Réseau coupé** → « Connexion interrompue… »
2. **5xx** → message générique de panne. Le `message` renvoyé par l'API est
   **ignoré** : il décrit une panne interne, même quand il est écrit en français.
3. **4xx** → on réutilise `error.data.message` **seulement** s'il passe
   `isUserFriendlyMessage()` (pas d'URL, pas de stack, pas de JSON, pas de code
   HTTP, rédigé en français) — c'est le cas des messages de validation de
   formulaire. Sinon, message standard par code (401, 403, 404, 429…).
4. **Dernier recours** → le `fallback` passé en argument, sinon un message générique.

## Interdits

```vue
❌ {{ error }}
❌ :title="error.message"
❌ {{ error.statusMessage }}
❌ submitError = err?.data?.statusMessage || err?.message
```

```vue
✅ <AppErrorState :error="error" … />
✅ {{ getFriendlyErrorMessage(error) }}
```

## Vérifier

Le plus simple est de couper l'accès au CMS (ou d'utiliser un slug inexistant)
et de contrôler le rendu :

```bash
# aucune de ces chaînes ne doit apparaître dans le HTML rendu
curl -s <url> | grep -iE '\[GET\]|/api/|fetch failed|statusCode'
```

Voir aussi : [`infra/sentry.md`](../infra/sentry.md) — la dégradation reste propre
pour l'utilisateur, mais l'erreur doit rester visible en monitoring
(`reportServerError` côté serveur).

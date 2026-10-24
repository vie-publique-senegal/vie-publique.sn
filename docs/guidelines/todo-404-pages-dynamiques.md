# TODO : une page qui n'existe pas doit le dire

> Constat du 2026-09-25, trouvé en recettant les pages de dirigeants (PR #19). Trois pages
> ont été corrigées dans la foulée (`e18f17c`, `bdbfe7d`) ; le motif est plus large.

## Problème

**Une URL dynamique dont la ressource n'existe pas répond HTTP 200.** Le corps affiche bien
« introuvable », mais le statut dit le contraire. Conséquences : les moteurs indexent des
pages vides (soft-404), et un lecteur qui suit un lien périmé reçoit un écran sans
explication ni redirection.

Deux causes distinctes, relevées sur les **33 pages `.vue` à paramètre dynamique** :

| | Pages | Cause |
| --- | --- | --- |
| Aucune gestion | **17** | ni `createError` ni `showError` : la page ne peut pas répondre 404 |
| `watchEffect` | **6** (3 restantes) | `throw createError()` levé depuis un `watchEffect` |
| Correct | 10 | — |

**Le piège du `watchEffect`.** Le `createError({ statusCode: 404 })` est bien là, mais en SSR
Vue capte l'exception dans le scope de l'effet : elle n'atteint jamais le pipeline de rendu,
et la réponse part en 200. S'y ajoute que `useFetch` n'est pas attendu, donc `error` n'est pas
encore peuplée quand la page décide du statut. Restent à traiter :

- `app/pages/etat-senegal/[slug].vue`
- `app/pages/etat-senegal/institutions/[slug].vue`
- `app/pages/dossiers/[slug].vue`

Le gabarit du correctif est dans `app/pages/etat-senegal/presidents/[slug].vue` : composable
`await`é, décision du statut dans le setup, et un `watch` pour les navigations côté client où
le fetch se rejoue après le setup.

## Le premier travail n'est pas d'écrire du code

**17 est un majorant, pas un décompte de défauts.** Certaines de ces routes prennent un
paramètre qui est un **filtre**, pas une clé — `elections-senegal/dashboard/[type]/[year]`,
`carte-electorale/nationale/[department]`, `barometre-politique/.../promesse/[label]` — et
rendent légitimement une page pour toute valeur.

Le chantier commence donc par un **tri**, qui se décide et ne se déduit pas du code :

- la route désigne une **ressource** (`/documents/[id]/[slug]`, `/personnalites/[id]/[slug]`,
  `/actualites/[id]/[slug]`, les votes et questions de l'Assemblée) → elle doit répondre 404
  quand la ressource est absente ;
- la route porte un **filtre** → elle doit borner les valeurs acceptées, ou rediriger vers sa
  valeur par défaut, mais pas 404.

Cas particulier à trancher au passage : les routes `[id]/[slug]` résolvent par **id** et
ignorent le slug — `/personnalites/93/nimporte-quoi` répond 200. C'est pratique (un slug qui
change ne casse pas le lien) mais ça multiplie les URL pour une même ressource. Une
redirection 301 vers le slug courant réglerait les deux.

## Regénérer les chiffres

```bash
for f in $(find app/pages -name "*\[*\]*" -name "*.vue"); do
  if   ! grep -q "createError\|showError" "$f"; then echo "S $f"
  elif   grep -q "watchEffect" "$f";            then echo "W $f"
  else                                                echo "O $f"; fi
done | awk '{print $1}' | sort | uniq -c
```

Et pour vérifier une route, le statut fait foi — pas le corps :

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/<route>/slug-qui-nexiste-pas
```

## Voir aussi

- [`url-structure-analysis.md`](./url-structure-analysis.md) — structure des URL et slugs
- [`../seo/todo-seo.md`](../seo/todo-seo.md) — le soft-404 est d'abord un sujet d'indexation

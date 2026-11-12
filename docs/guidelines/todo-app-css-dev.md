# TODO — `app.css` servi en `text/javascript` en dev (palette Dim absente)

> **Statut** : diagnostiqué le 2026-11-12, **non corrigé**. Impact **dev uniquement**,
> la production est saine. Tracé ici parce que ce piège fait perdre du temps et
> conduit à de **faux diagnostics**.
> Référence vivante : [`design.md`](./design.md) (§ Dark mode).

## Le constat

En développement, Nuxt émet bien la balise :

```html
<link rel="stylesheet" href="/_nuxt/assets/css/app.css" />
```

…mais le serveur répond avec le **mauvais type MIME** :

```bash
curl -s -o /dev/null -w "%{content_type}\n" "http://localhost:3000/_nuxt/assets/css/app.css"
# -> text/javascript        (attendu : text/css)
```

Le navigateur **rejette donc la feuille** : zéro règle appliquée.

## Conséquence

[`app/assets/css/app.css`](../../app/assets/css/app.css) contient les surcharges
**globales** de la palette « Dim » du site :

| Sélecteur | Valeur voulue |
| --- | --- |
| `.dark body`, `.dark .bg-gray-900` | `#15202B` |
| `.bg-gray-800` (cartes) | `#1E2732` |
| `.bg-gray-700` | `#22303C` |

En dev, **aucune ne s'applique** : les gris retombent sur l'échelle `slate` de
Tailwind. Le mode sombre affiché en local n'est donc **pas** celui des utilisateurs.

`.no-scrollbar` (défini dans le même fichier) est inopérant en dev pour la même raison.

## Pourquoi c'est dangereux (vécu)

Ce bug a produit un **faux diagnostic coûteux** : croyant que les classes Tailwind
n'étaient « pas générées », plusieurs composants ont reçu des commentaires erronés
à ce sujet. La génération Tailwind fonctionne parfaitement — c'est l'injection de
`app.css` qui échoue. Les commentaires fautifs ont été retirés.

**Règle pratique : ne jamais valider un rendu en mode sombre depuis le serveur de
dev.** Passer par un build de production :

```bash
npm run build && node .output/server/index.mjs
# puis vérifier la couleur réellement calculée :
#   getComputedStyle(document.querySelector('.min-h-screen')).backgroundColor
#   -> doit donner rgb(21, 32, 43) = #15202B
```

Vérifié ainsi le 2026-11-12 : **la production est correcte** (`#15202B` pour le fond
de page, `#1E2732` pour les cartes).

## Pistes

- Vérifier comment `app/assets/css/app.css` est déclaré (`nuxt.config.ts` → `css: []`)
  et si le chemin passe bien par la résolution d'asset Vite en dev.
- Une tentative d'`@import` depuis `app.vue` a été essayée puis **annulée** : elle
  changeait l'ordre de cascade. Ne pas la refaire à l'identique.
- Ne pas « corriger » en dupliquant la palette ailleurs : il n'y a qu'une source,
  `app.css`.

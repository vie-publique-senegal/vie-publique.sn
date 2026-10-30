# TODO — Aligner la couleur `primary` sur la charte

> **Statut** : à arbitrer. Décision prise le 2026-10-27 de ne PAS lancer le chantier
> tout de suite, mais de le tracer ici.
> Référence vivante : [`design.md`](./design.md) (§ Couleurs).

## Le constat

La couleur `primary` de Nuxt UI est réglée sur **`sky`** dans
[`app/app.config.ts`](../../app/app.config.ts) — choix assumé à l'époque
(« Bleu plus vif pour les accents (comme Twitter) »), et documenté comme « le bleu VP »
dans [`design.md`](./design.md) et le `CLAUDE.md`.

Mais les couleurs de la **charte** déclarées dans
[`tailwind.config.ts`](../../tailwind.config.ts) ne sont, elles, jamais employées :

| Token          | Hex       | Rôle déclaré                | Usages réels dans `app/` |
| -------------- | --------- | --------------------------- | ------------------------ |
| `brand-navy`   | `#18223B` | couleur **principale**      | **0**                    |
| `brand-gold`   | `#E2BA13` | accent, CTA, highlights     | **0**                    |
| `primary` (= `sky`) | —    | composants UI               | **359** (`bg-/text-/ring-/border-primary-*`) |

Autrement dit, l'identité visuelle effective du site est le bleu `sky`, et les deux
couleurs de la charte sont de la configuration morte.

## Ce qui a déclenché le sujet

Les onglets du dashboard budget (`/budget-senegal/dashboard`) affichaient un aplat
`bg-primary-50` (bleu clair `sky`) sur l'onglet actif, jugé hors charte.

**Traité en local** : l'onglet actif est passé en neutre (pas d'aplat, texte `gray-900`
mis en évidence + fin soulignement). Voir `app/pages/budget-senegal/dashboard.vue`.
C'est volontairement une correction **locale** — elle ne préjuge pas de l'arbitrage global.

> Première tentative écartée : aplat `brand-gold`. En plus du rendu jugé trop jaune,
> `design.md` rappelle que **gold sur blanc plafonne à 2,2:1** et ne passe pas WCAG AA —
> à réserver aux très grands titres ou aux fonds sombres.

## Les options si le chantier est lancé

1. **Basculer `ui.primary` vers une échelle construite sur le bleu marine.**
   Un seul point de bascule (`app.config.ts`), mais repeint les 359 usages d'un coup :
   boutons, liens, focus, badges, `UCard`, états actifs. Prérequis : définir les
   **11 nuances** (50 → 950) dans `tailwind.config.ts` — `#18223B` n'est qu'une teinte
   isolée, bien trop sombre pour servir de `primary-500`.

2. **Garder `sky` comme couleur fonctionnelle et réserver navy/gold à l'identité**
   (hero, en-têtes, supports de com), ce que `design.md` prescrit déjà aujourd'hui.
   Dans ce cas il n'y a rien à coder : il faut seulement décider si `sky` est assumé
   comme « le bleu VP », et le réaffirmer dans la charte.

## Points de vigilance avant de basculer

- **Contraste** : `#18223B` sur blanc donne un très fort contraste, mais les nuances
  claires d'une échelle navy (50-200) virent vite au gris bleuté — vérifier les états
  `hover`/`disabled` et les aplats `primary-50` qui servent de fond.
- **Dark mode** : la palette « Dim » (`app/assets/css/app.css`) a son propre accent
  `#1D9BF0`. Un changement de `primary` sans toucher à cet accent créerait deux bleus
  concurrents en thème sombre.
- **Surcharge existante** : `app.config.ts` surcharge déjà `ui.button.color.primary.solid`
  avec des classes `sky` **écrites en dur** — à reprendre, sinon les boutons resteront bleus
  quelle que soit la valeur de `ui.primary`.
- Prévoir une passe de revue visuelle page par page : le changement ne se teste pas
  automatiquement.

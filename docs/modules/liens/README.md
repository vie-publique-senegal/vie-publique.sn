# Page de liens `/liens` (remplace le Linktree)

Page unique qui présente les **produits de Vie Publique** : cible du **QR code** (t-shirts,
supports de com) et du lien en **bio des réseaux sociaux**, à la place de
`linktr.ee/ViePubliqueSN`. Le trafic reste sur le site (navigation, SEO, mesure GA4).

**Parti pris** : une vitrine courte, pas un plan du site. En tête, l'app mobile, puis les produits (site, archives.sn, newsletter) ;
peu de liens en dessous. La navigation du site (en-tête) donne déjà accès aux rubriques.

- Page : `app/pages/liens.vue` — `/links` et `/linktree` redirigent en 301 (`routeRules`).
- Données : `GET /api/liens` (`server/api/liens.get.ts`), type `VpLink` (`types/vp-link.ts`).
- Mesure : événement GA4 `liens_click` (`link_id`, `link_section`) sur chaque clic.
- **Réseaux sociaux** (icônes de l'en-tête + section « Suivez-nous » avec le nombre d'abonnés) :
  lus dans la collection Directus **`vp_social_stats`**, la même que la home. Pour changer un
  lien ou un nombre d'abonnés, c'est **dans Directus**, pas dans le JSON. Les entrées `social`
  du JSON ne servent que de repli si le CMS est injoignable (affichées sans chiffres).

## Ajouter / modifier un lien (V1 : JSON)

Éditer `server/data/liens.json`, puis déployer. Une entrée :

| Champ | Rôle |
| --- | --- |
| `id` | Identifiant stable (sert de `link_id` dans GA4 — ne pas le renommer) |
| `section` | Ordre à l'écran : `featured` (tout en haut, facultatif — vide aujourd'hui), `app` (badges des stores), `products` (« Nos autres produits »), `about` (« L'association », en bas : rapport d'impact…) ; `social` = repli des réseaux (voir plus haut) |
| `title`, `description` | Libellés (`description` facultative) |
| `url` | Chemin interne (`/actualites`) ou URL absolue (ouverte dans un nouvel onglet) |
| `icon` | Icône Iconify : `i-heroicons-*` ou `i-simple-icons-*` |
| `image` | Facultatif : visuel à la place du bouton (badge officiel du store, section `app`) |
| `sort` | Ordre dans la section (croissant) |
| `status` | `published` pour afficher, `draft` / `archived` pour masquer |

Une section sans lien publié n'est pas affichée.

## QR code

Pointer le QR code sur `https://www.vie-publique.sn/liens?utm_source=qrcode&utm_medium=print`
(et la bio sur `…/liens?utm_source=instagram&utm_medium=social`, etc.) : les visites se lisent
alors par canal dans GA4. Toujours l'hôte **www** (canonique) pour éviter la redirection apex.

## Bascule vers Directus (V2)

Collection **`vp_links`** (famille `vp_` : contenu de l'association), mêmes champs que le JSON :

| Champ | Type Directus | Interface |
| --- | --- | --- |
| `id` | integer (auto) | — |
| `status` | string | Dropdown `draft` / `published` / `archived` |
| `section` | string | Dropdown `featured` / `app` / `products` / `about` / `social` |
| `title` | string | Input |
| `description` | string, nullable | Input |
| `url` | string | Input |
| `icon` | string, nullable | Input (nom Iconify) |
| `image` | uuid (fichier), nullable | Image — côté API, la convertir en URL avec `useCmsImage` |
| `sort` | integer | Champ de tri de la collection (glisser-déposer) |

Côté code, seul `server/api/liens.get.ts` change : `readItems('vp_links', { filter: { status:
{ _eq: 'published' } }, sort: ['sort'] })` dans un `defineCachedEventHandler`, avec le JSON
actuel en **repli** si le CMS échoue (+ `reportServerError`). Donner le droit **Read** sur
`vp_links` au rôle du token CMS. La page n'est pas modifiée. Côté GA4, les `link_id` deviennent
les ids numériques Directus.

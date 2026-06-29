# Historique des gouvernements — Modèle de données Directus

> Ce document décrit les collections Directus utilisées par la feature « Historique des
> gouvernements ». Le frontend (`server/api/government/*`, `types/government.ts`) est aligné
> sur ce schéma : **respectez les noms de champs et de collections à la lettre.**

---

## Vue d'ensemble

- **2 collections principales** : `governments` + `public_person_appointments`
- **2 collections support** : `public_persons` (annuaire, partagé) + `documents` (décrets, partagé)
- **Pas de nouvelle collection** à créer si `public_person_appointments` et `public_persons`
  existent déjà.

```
governments
  ├── president           M2O → public_persons
  ├── prime_minister      M2O → public_persons (nullable)
  ├── pm_appointment_decree  M2O → documents (nullable)
  └── formation_decree    M2O → documents (nullable)

public_person_appointments
  ├── government          M2O → governments (nullable)
  └── person              M2O → public_persons
```

---

## 1. Collection `governments`

| Réglage | Valeur |
| --- | --- |
| Nom (Collection Name) | `governments` |
| Primary Key | `id` — Integer, auto-increment |
| Champ d'affichage | `{{ name }}` |
| Archive Field / Value | `status` / `archived` |
| Sort Field | `sort` |

### Champs scalaires

| Champ (clé) | Type Directus | Interface | Contraintes / notes |
| --- | --- | --- | --- |
| `id` | Integer | — | PK, auto-increment |
| `status` | String | **Dropdown** | `draft` (défaut), `published`, `archived`. Seuls les `published` sont exposés par l'API. |
| `sort` | Integer | Input | Tri manuel |
| `name` | String | Input | **Requis** — ex : `"Gouvernement Sonko I"` |
| `slug` | String | Input | **Requis, Unique** — minuscules, sans accent, tirets. ex : `"sonko-i"` |
| `start_date` | Date | Datetime | **Requis** — date de nomination officielle |
| `end_date` | Date | Datetime | Nullable — `null` = gouvernement en cours |
| `notes` | Text | Textarea / WYSIWYG | Nullable — contexte historique, événements marquants |

### Relations Many-to-One

| Champ (clé) | Type | Collection cible | Nullable | Notes |
| --- | --- | --- | --- | --- |
| `president` | M2O | `public_persons` | Non | Président en exercice pendant ce gouvernement |
| `prime_minister` | M2O | `public_persons` | Oui | Null si régime sans PM (présidence directe) |
| `pm_appointment_decree` | M2O | `documents` | Oui | Décret nommant le Premier Ministre |
| `formation_decree` | M2O | `documents` | Oui | Décret fixant la composition du gouvernement |

### Exemple d'enregistrement

```json
{
  "id": 12,
  "status": "published",
  "name": "Gouvernement Sonko I",
  "slug": "sonko-i",
  "start_date": "2024-03-05",
  "end_date": null,
  "notes": "Premier gouvernement sous la présidence de Bassirou Diomaye Faye.",
  "president": { "id": 1, "full_name": "Bassirou Diomaye Faye", "slug": "bassirou-diomaye-faye" },
  "prime_minister": { "id": 2, "full_name": "Ousmane Sonko", "slug": "ousmane-sonko" },
  "pm_appointment_decree": { "id": 101, "title": "Décret n°2024-570", "slug": "decret-2024-570" },
  "formation_decree": null
}
```

---

## 2. Collection `public_person_appointments`

> **Collection partagée** — elle sert aussi pour les nominations en dehors des gouvernements
> (magistrature, diplomatie, etc.). Le champ `government` (nullable) relie une nomination à
> un gouvernement précis.

### Champs clés utilisés par la feature

| Champ (clé) | Type | Interface | Contraintes / notes |
| --- | --- | --- | --- |
| `id` | Integer | — | PK |
| `status` | String | Dropdown | `published` / `draft` / `archived` |
| `position_title` | String | Input | **Requis** — intitulé exact du portefeuille, ex : `"Ministre des Finances et du Budget"` |
| `organization_label` | String | Input | **Requis** — libellé du ministère / organisme |
| `position_category` | String | Dropdown (choices) | **Requis** — libellé lisible du rôle (géré dans Directus) |
| `position_category_slug` | String | Dropdown (choices) | **Requis** — slug machine du rôle (liste dynamique CMS, voir ci-dessous) |
| `appointment_date` | Datetime | Datetime | **Requis** — date de prise de fonction |
| `end_date` | Datetime | Datetime | Nullable |
| `end_reason` | String | Dropdown (choices) | Nullable — raison de la fin (liste dynamique CMS) |
| `is_current` | Boolean | Toggle | `true` si nomination toujours active |
| `government` | M2O → `governments` | Relation | Nullable — null = nomination hors gouvernement |
| `person` | M2O → `public_persons` | Relation | **Requis** |

### ⚠️ Catégories dynamiques — règle impérative

Les valeurs de `position_category` / `position_category_slug` (et `end_reason`) sont des
**listes de choix gérées dans Directus** et peuvent évoluer sans aucun déploiement.

**Le code ne fixe jamais ces listes.** L'ordre des groupes et leurs libellés sont récupérés
via la métadonnée Directus du champ :

```typescript
// server/api/government/[slug].get.ts
const field = await directus.request(
  readField('public_person_appointments', 'position_category_slug')
);
const choices = field?.meta?.options?.choices ?? []; // [{ text, value }, …]
```

**Catégories actuellement définies** (exemple — peuvent changer) :

| `value` (slug) | `text` (libellé) | Affiché |
| --- | --- | --- |
| `presidence` | Présidence | Exclu (rendu depuis `government.president`) |
| `premier_ministre` | Premier Ministre | Exclu (rendu depuis `government.prime_minister`) |
| `ministre` | Ministre | Oui |
| `ministre_delegue` | Ministre délégué | Oui |
| `secretaire_etat` | Secrétaire d'État | Oui |

> ⚠️ `presidence` et `premier_ministre` sont **exclus** dans le filtre de l'API détail pour
> éviter d'afficher deux fois le président et le PM (déjà rendus dans l'en-tête du gouvernement).
> L'exclusion est exprimée via `_nin` et non en listant les catégories à garder — toute
> nouvelle catégorie remonte automatiquement.

### Requête SDK pour les membres d'un gouvernement

```typescript
readItems('public_person_appointments', {
  fields: [
    'id', 'position_title', 'organization_label',
    'position_category', 'position_category_slug',
    'appointment_date', 'end_date', 'end_reason', 'is_current',
    'person.id', 'person.full_name', 'person.slug', 'person.photo', 'person.sexe',
  ],
  filter: {
    status: { _eq: 'published' },
    government: { slug: { _eq: slug } },
    position_category_slug: { _nin: ['presidence', 'premier_ministre'] },
  },
  sort: ['position_category_slug', 'person.full_name'],
  limit: -1,
})
```

---

## 3. Collection `public_persons` (champs utilisés)

> Collection existante — seuls les champs lus par la feature sont listés.

| Champ | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK |
| `full_name` | String | Nom complet |
| `slug` | String | Slug URL → `/personnalites/<id>/<slug>` |
| `photo` | UUID (fichier Directus) | `useCmsImage(photo)` pour l'affichage |
| `sexe` | Enum | `male` \| `female` — pour les statistiques de parité |

> ⚠️ `sexe` vaut `male` ou `female` (pas `M`/`F`). Compter les femmes : `sexe === 'female'`.

---

## 4. Collection `documents` (champs utilisés)

> Collection existante — seuls les champs lus sont listés.

| Champ | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK |
| `title` | String | Titre du décret / document |
| `slug` | String | Slug URL → `/documents/<id>/<slug>` |

---

## 5. Requête historique complet

```typescript
// server/api/government/history.get.ts
readItems('governments', {
  fields: [
    'id', 'name', 'slug', 'start_date', 'end_date', 'notes',
    'president.id', 'president.full_name', 'president.slug', 'president.photo',
    'prime_minister.id', 'prime_minister.full_name', 'prime_minister.slug', 'prime_minister.photo',
    'pm_appointment_decree.id', 'pm_appointment_decree.title', 'pm_appointment_decree.slug',
    'formation_decree.id', 'formation_decree.title', 'formation_decree.slug',
  ],
  filter: { status: { _eq: 'published' } },
  sort: ['-start_date'],  // du plus récent au plus ancien
  limit: -1,
})
```

Les **statistiques** (total membres, femmes) sont calculées côté serveur avec un second appel
agrégé sur `public_person_appointments`, puis fusionnées dans `GovernmentWithStats`.

---

## 6. Permissions Directus recommandées

| Rôle | Collection | Accès | Champs |
| --- | --- | --- | --- |
| `Public` | `governments` | Lecture | Tous sauf `sort` |
| `Public` | `public_person_appointments` | Lecture | Tous (pour gouvernements uniquement via filtre) |
| `Public` | `public_persons` | Lecture | `id`, `full_name`, `slug`, `photo`, `sexe` |
| `Public` | `documents` | Lecture | `id`, `title`, `slug` |
| `Editor` | `governments` | CRUD | Tous |
| `Editor` | `public_person_appointments` | CRUD | Tous |

> Le rôle `Public` doit aussi avoir accès à la **métadonnée du champ** `position_category_slug`
> pour que `GET /api/government/categories` fonctionne (`readField` → `directus_fields`).
> Activer : Settings → Roles → Public → System Collections → `directus_fields` → Read.

---

## 7. Workflow rédacteur

1. Créer un gouvernement (`status = draft`) : saisir nom, slug, dates, président, PM, décrets.
2. Relier les nominations (`public_person_appointments`) à ce gouvernement via le champ `government`.
3. S'assurer que chaque nomination a `position_category_slug` défini (sinon elle tombe dans le
   groupe `autres`).
4. Passer `status = published` → la page devient publique, indexable et apparaît dans la frise.

> Les brouillons (`draft`) ne sont **jamais** exposés : l'API renvoie 404 pour le détail
> et les filtre de la liste historique.

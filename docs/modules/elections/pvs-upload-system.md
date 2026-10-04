# Système d'Upload de PV - Élections Sénégal

## Vue d'ensemble

Système complet permettant aux observateurs électoraux de télécharger des procès-verbaux (PVs) via le dashboard électoral. Supporte les deux sources : **National** et **Diaspora**.

## Architecture

### 1. Backend (Server API)

#### Routes d'authentification (`/api/elections/auth/`)

- **`POST /api/elections/auth/login`** : Connexion des observateurs
  - Rate limiting : 5 tentatives / 15 minutes
  - Génération de cookies httpOnly (election_cms_token, election_cms_refresh_token)
  - Validation du rôle "Observateur electoral"

- **`POST /api/elections/auth/logout`** : Déconnexion
  - Supprime les cookies d'authentification

- **`GET /api/elections/auth/me`** : Profil utilisateur
  - Retourne les infos de l'observateur connecté

#### Routes d'upload (`/api/elections/pvs-upload/`)

- **`POST /api/elections/pvs-upload/upload`** : Upload d'un PV
  - Validation conditionnelle selon la source (National/Diaspora)
  - Upload fichier image (JPEG/PNG/WEBP, max 20MB)
  - Création enregistrement election_pvs avec status=draft

- **`GET /api/elections/pvs-upload/list`** : Liste des PVs
  - Filtres : source, tour, statut, pagination
  - Retourne les PVs avec leurs relations (géographie, uploader)

- **`GET /api/elections/pvs-upload/national/regions`** : Liste des régions
- **`GET /api/elections/pvs-upload/national/departments`** : Départements filtrés par région
- **`GET /api/elections/pvs-upload/national/municipalities`** : Communes filtrées par département

- **`GET /api/elections/pvs-upload/diaspora/countries`** : Liste des pays
- **`GET /api/elections/pvs-upload/diaspora/representations`** : Représentations filtrées par pays
- **`GET /api/elections/pvs-upload/diaspora/localities`** : Localités filtrées par représentation

### 2. Schema Directus

**Collection `election_pvs`** avec les champs :

- **Communs** : election_id, uploaded_by, tour, status, image
- **Source** : `source` (national | diaspora)
- **National** : region, department, municipality
- **Diaspora** : country, diplomatic_representation, locality

### 3. Frontend

#### Composables

- **`useElectionAuth()`** : Gestion de l'authentification
  - `login(email, password)`
  - `logout()`
  - `checkAuth()`
  - `isAuthenticated` (computed)
  - `currentUser` (state)

- **`useElectionPvsUpload()`** : Gestion de la liste PVs
  - Filtres réactifs (source, tour, statut)
  - Pagination
  - Méthodes : `setFilter()`, `clearFilters()`, `setPage()`

#### Composants

- **`ElectionsDashboardPvsTab.vue`** : Composant principal
  - Grille de cartes de PV avec lightbox
  - Filtres (source, tour)
  - Boutons connexion/déconnexion
  - Pagination
  - Intégration des modals

- **`PvLoginModal.vue`** : Modal de connexion
  - Formulaire email/password
  - Affichage countdown si rate limit atteint
  - Validation et gestion d'erreurs

- **`PvUploadModal.vue`** : Modal d'upload
  - Toggle National/Diaspora (UTabs)
  - Sélection cascadante (région → département → commune)
  - Drag & drop pour l'image
  - Validation formulaire complète

### 4. Intégration Dashboard

Le tab PVs est intégré dans [dashboard/[type]/[year].vue](../../app/pages/elections-senegal/dashboard/[type]/[year].vue) :

- **Position** : Entre "Résultats" et "Documents"
- **Icône** : `i-heroicons-document-check`
- **Visibilité conditionnelle** : Le tab PVs n'apparaît que si l'élection a `pv_upload_active = true`
- **Accessible** : Pour tous les types d'élections (présidentielle, législative, locale)
- **Disponible** : Même pour les élections terminées (completed)

⚠️ **Important** : Pour activer le tab PVs sur une élection, il faut cocher le champ `pv_upload_active` dans Directus pour cette élection.

## Workflow utilisateur

1. **Connexion** :
   - L'observateur clique sur "Se connecter"
   - Saisit email/password dans PvLoginModal
   - Reçoit un token stocké en httpOnly cookie

2. **Upload de PV** :
   - Clique sur "Télécharger un PV"
   - Choisit la source (National ou Diaspora)
   - **Si National** : Sélectionne Région → Département → Commune
   - **Si Diaspora** : Sélectionne Pays → Représentation diplomatique → Localité
   - Upload l'image du PV (drag & drop ou sélection)
   - Soumet le formulaire

3. **Visualisation** :
   - Les PVs apparaissent dans la grille
   - Filtrage par source et tour
   - Clic sur une carte ouvre le lightbox pour voir l'image
   - Badges indiquent la source, le tour et le statut

## Sécurité

- **Authentication** : Cookies httpOnly avec expiration 1h
- **Rate Limiting** : 5 tentatives de connexion / 15 minutes
- **Validation** : 
  - Taille fichier max 20MB
  - Types autorisés : JPEG, PNG, WEBP
  - Validation des champs obligatoires selon la source
- **Autorisations** : Seuls les observateurs électoraux peuvent uploader

## Configuration requise

### Variables d'environnement

```env
CMS_API_URL=https://your-directus-instance.com
```

### Rôle Directus

Le rôle **"Observateur electoral"** doit être créé dans Directus avec les permissions :

- Lecture : election_map_national, election_map_diaspora, elections
- Lecture/Création : election_pvs
- Upload : directus_files

### Activation sur une élection

Pour qu'une élection affiche le tab PVs, cochez le champ **`pv_upload_active`** à `true` dans Directus pour cette élection spécifique. Si ce champ est `false` ou non coché, le tab PVs ne sera pas visible dans le dashboard.

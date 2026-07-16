# PWA & apps mobiles (Play Store / App Store)

_Doc canonique du canal mobile. Réécrit le 16/07/2026 après audit des deux wrappers.
**À lire avant toute modification du manifest PWA, du service worker, des icônes `public/pwa-*`
ou de `public/.well-known/`** — les apps publiées sur les stores en dépendent._

## 1. Architecture : 1 codebase → 3 canaux

| Canal | Quoi | Build |
| --- | --- | --- |
| **Site + PWA** | ce repo (`@vite-pwa/nuxt`, SW custom `app/service-worker/sw.ts`) | Coolify |
| **Android (Play Store)** | **TWA** (Trusted Web Activity) généré par [PWABuilder](https://www.pwabuilder.com) — wrapper mince qui ouvre le site **live** en Chrome plein écran | repo [vie-publique-mobile-android](https://github.com/vie-publique-senegal/vie-publique-mobile-android) |
| **iOS (App Store)** | wrapper **WKWebView** PWABuilder qui charge le site **live** | repo [vie-publique-mobile-ios](https://github.com/vie-publique-senegal/vie-publique-mobile-ios) |

Artefacts locaux (AAB/APK signés, keystores, screenshots stores) : `C:\Devlabs\malicktech\2-mobile\`.
Générateur d'icônes : <https://www.pwabuilder.com/imageGenerator>.

**Principe clé** : les deux apps affichent le site **en direct**. Un déploiement web met à jour
les apps instantanément, sans re-soumission aux stores — c'est la force du montage, et sa
fragilité : **casser un des invariants §3 casse les apps déjà installées**.

## 2. Ce qui est figé dans chaque app au moment du build PWABuilder

| | Android (TWA, `twa-manifest.json`) | iOS (`Settings.swift` + `Info.plist`) |
| --- | --- | --- |
| URL de démarrage | `startUrl: /?utm_medium=PWA&utm_source=launcher` | `rootUrl` (idem) |
| Domaine | `host: www.vie-publique.sn` | `allowedOrigins` + **`WKAppBoundDomains`** (conditionne le support du service worker !) |
| Icônes launcher/splash | téléchargées au build depuis `https://www.vie-publique.sn/pwa-1024x1024.png` (+ `pwa-192x192.png` pour les shortcuts) | fichiers locaux `launch-*.png` du repo |
| Signature | `android.keystore` (fingerprint `E5:35:B0:76…`) + clé Play App Signing (`D8:77:38…`) | certificats Apple |
| Notifications | `enableNotifications: true` (web push du site) | `GoogleService-Info.plist` (FCM) |

Tout le reste (manifest, SW, precache, contenu, styles) est lu **live** → modifiable sans re-build.

> ⚠️ Historique 16/07/2026 : le repo iOS pointait `dev.vpsn.cloud` (Settings.swift +
> `WKAppBoundDomains`) — l'app **publiée** pointe bien la prod (config faite dans Xcode mais
> jamais poussée). Push de rattrapage prévu depuis le MacBook. **Vérifier ce point avant tout
> re-build iOS** : builder depuis le repo tel quel enverrait les utilisateurs sur le site de test.

## 3. Invariants — ce qu'il ne faut JAMAIS casser côté web

1. **`public/.well-known/assetlinks.json`** : le lien de confiance du TWA Android. S'il devient
   inaccessible (404, redirect, mauvais content-type) ou si les **fingerprints** changent,
   l'app Android affiche la barre d'URL Chrome (mode dégradé) pour tous les utilisateurs.
   Ne jamais modifier/supprimer sans re-vérifier :
   `curl -s https://www.vie-publique.sn/.well-known/assetlinks.json` → doit lister `E5:35:B0:76…` et `D8:77:38…`.
2. **Les fichiers d'icônes `public/pwa-192x192.png`, `pwa-256x256.png`, `pwa-512x512.png`,
   `pwa-1024x1024.png`, `favicon.ico`, `badge-72x72.png`** : référencés par le manifest, le
   precache du SW, les shortcuts du TWA et `apple-touch-icon` (routeRules). **Ne pas renommer
   ni supprimer** (en ajouter est OK).
3. **Le manifest (`nuxt.config.ts` → `pwa.manifest`)** : garder au minimum une icône 512+
   `purpose: any` **et** une `maskable` (exigences Play/PWABuilder), le `name`, `start_url`
   avec ses **UTM** (`utm_medium=PWA&utm_source=launcher` = tracking du canal app dans GA4),
   les `shortcuts` (URLs stables) et le `share_target`.
4. **La route `/sw.js`** : son URL est enregistrée chez tous les clients. Le contenu peut
   évoluer (le precache a été réduit de 43 Mo → 0,5 Mo le 16/07/2026 sans casse — le SW custom
   n'a aucun `matchPrecache` explicite et sa page offline est inline) mais la route doit rester.
5. **Le domaine `www.vie-publique.sn`** : baké dans le TWA (`host`) et dans iOS
   (`WKAppBoundDomains`). Un changement de domaine = re-build + re-soumission des 2 apps.
6. **`public/.well-known/apple-app-site-association`** : équivalent iOS (universal links).

## 4. Quand faut-il re-builder les apps stores ?

Uniquement si l'un de ces éléments change : **nom de l'app, icône launcher, start_url,
domaine, shortcuts** (Android), **push FCM / domaines autorisés** (iOS). Sinon : jamais —
tout passe par le déploiement web. Procédure : PWABuilder → nouveau package → bump
`appVersionCode` (Android) → stores.

## 5. Vérifications rapides après une modif PWA

```bash
# Lien TWA intact (fingerprints présents)
curl -s https://www.vie-publique.sn/.well-known/assetlinks.json | grep -c "E5:35:B0:76"
# Manifest : icônes any + maskable présentes
curl -s https://www.vie-publique.sn/manifest.webmanifest | grep -oE '"purpose":"[^"]*"'
# Precache du SW : doit rester ~9 entrées (icônes + meta), pas des dizaines de Mo
curl -s https://www.vie-publique.sn/sw.js | grep -oE '"url":"[^"]*"' | wc -l
```

## 6. Setup PWA côté Nuxt (mémo d'origine)

Packages : `@vite-pwa/nuxt` + `@vueuse/nuxt` ; config dans `nuxt.config.ts` (`pwa:`) en mode
`strategies: 'injectManifest'` → le SW custom `app/service-worker/sw.ts` gère tout le runtime
caching (NetworkFirst pages, CacheFirst images/assets, fallback offline inline). Les options
`pwa.workbox.*` sont **ignorées** dans ce mode (bloc supprimé le 16/07/2026 — ne pas le
réintroduire).

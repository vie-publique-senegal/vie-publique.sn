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

### Fiches publiées et identifiants

| | Fiche store | Identifiant |
| --- | --- | --- |
| **iOS** | [apps.apple.com/app/id6757257552](https://apps.apple.com/app/id6757257552) | `sn.viepublique.app` (Apple ID **6757257552**, Team `SHJMC27623`) |
| **Android** | [play.google.com/store/apps/details?id=sn.viepublique.app](https://play.google.com/store/apps/details?id=sn.viepublique.app) | `sn.viepublique.app` |

**Le même identifiant sert sur les deux plateformes** — c'est voulu, et c'est ce qui rend
l'`appID` de l'AASA (`SHJMC27623.sn.viepublique.app`) lisible. Côté iOS, la configuration **Dev**
utilise `sn.viepublique.app.dev` pour pouvoir cohabiter avec la prod sur un même téléphone
(`Dev.xcconfig` / `Prod.xcconfig`).

**Où ces liens sont exposés sur le site** — page dédiée [`/app`](../../app/pages/app/index.vue),
plus `HomeAppPromo.vue`, `AppMobileAppBanner.vue`, `a-propos/qui-sommes-nous.vue`,
`a-propos/financement-independance.vue`, et le gabarit de newsletter.

> ⚠️ **Les deux URLs sont dupliquées en dur dans ces 5 fichiers**, sous deux formes différentes
> (`/app/id…` et `/us/app/vie-publique-sénégal/id…`). Changer d'app, ajouter un paramètre de
> suivi ou corriger la locale `us/` (inutile pour une app sénégalaise) demande donc 5 éditions.
> À regrouper dans une constante partagée à la prochaine occasion d'y toucher.

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
| Notifications | `enableNotifications: true` (web push du site) | FCM — ⚠️ **pas encore configuré**, voir §2 ter |

Tout le reste (manifest, SW, precache, contenu, styles) est lu **live** → modifiable sans re-build.

> ✅ **Réglé le 04/08/2026** (remplace l'avertissement du 16/07 : le repo iOS codait `dev.vpsn.cloud`
> en dur et le rattrapage n'était pas poussé). La branche `feature/multi-env` est **mergée dans
> `main`** : le domaine vient désormais de `APP_DOMAIN`, défini dans `Prod.xcconfig`
> (`www.vie-publique.sn`) et `Dev.xcconfig` (`dev.vpsn.cloud`), et se propage à `rootUrl`,
> `allowedOrigins`, `WKAppBoundDomains` et aux associated-domains.
>
> ⚠️ Le piège n'a pas disparu, il a changé de forme : **les deux configurations compilent aussi
> bien**. Avant toute archive, vérifier que le schéma Xcode utilise **Prod** — sinon l'app publiée
> envoie les utilisateurs sur le site de test, sans le moindre signal.

## 2 ter. Notifications push iOS : rien n'est configuré (constaté 04/08/2026)

**L'app iOS ne reçoit aucune notification**, et ça ne se voit pas : le pod `Firebase/Messaging` est
installé et `aps-environment: production` figure dans les entitlements — tout a l'air branché.

Mais :

- `GoogleService-Info.plist` est le **placeholder PWABuilder** (`BUNDLE_ID =
  com.microsoft.pwabuilder-ios`, `PROJECT_ID = pwabuilder-ios-template`, `GCM_SENDER_ID =
  000000000000`) ;
- `FirebaseApp.configure()` est **commenté** (`AppDelegate.swift:15`, TODO d'origine jamais fait).

Le web push, lui, fonctionne — mais il ne peut PAS servir ici : une WKWebView ne reçoit pas de web
push. Il faut du push **natif**.

> 💡 Ce qui décide qu'un appareil reçoit une diffusion, c'est d'être une **instance enregistrée
> d'une app du projet Firebase** — pas un abonnement à un topic. Le code web abonne bien les
> navigateurs au topic `news`, mais **rien n'envoie jamais vers ce topic** : `sendToTopic()`
> (`server/utils/firebase-admin.ts`) n'est appelé nulle part, VP diffuse à tout le monde depuis la
> console. Le lot iOS porte donc sur l'**enregistrement de l'app** + la clé APNs, pas sur les topics.

Chantier à part, non entamé.

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
   ⚠️ **`sw.js` doit être servi en `cache-control: no-cache`** (routeRule dans `nuxt.config.ts`) :
   sans ça, l'origine envoyait `max-age=14400` et **Cloudflare cachait le SW 4 h au edge** →
   toute mise à jour PWA mettait jusqu'à 4 h à atteindre les utilisateurs (constaté le
   16/07/2026). Vérif : `curl -sI https://www.vie-publique.sn/sw.js | grep -iE 'cache-control|cf-cache-status'`
   → attendu `no-cache` et pas de `HIT` longue durée. **Cause racine (17/07/2026)** : le
   réglage Cloudflare **Browser Cache TTL** était sur « 4 hours » et écrasait le `no-cache`
   de l'origine — il est passé à « Respect Existing Headers »
   (cf. [`../infra/cloudfare.md`](../infra/cloudfare.md) § Browser Cache TTL). Ne pas le remettre
   sur une durée fixe.
5. **Le domaine `www.vie-publique.sn`** : baké dans le TWA (`host`) et dans iOS
   (`WKAppBoundDomains`). Un changement de domaine = re-build + re-soumission des 2 apps.
6. **`public/.well-known/apple-app-site-association`** : équivalent iOS (universal links).

## 3 bis. Permissions micro / reconnaissance vocale : le wrapper iOS refuse (mesuré 04/08/2026)

Constaté sur l'**app publiée**, à l'occasion de la dictée vocale du chat
([`../modules/chat/voix.md`](../modules/chat/voix.md) §4) : l'API `webkitSpeechRecognition` est bien
**présente** dans la WKWebView, mais la permission est **refusée**.

Deux manques dans le wrapper, à corriger ensemble :

| Manque | Effet |
| --- | --- |
| **`NSSpeechRecognitionUsageDescription` absente d'`Info.plist`** | iOS refuse la reconnaissance vocale. C'est une clé **distincte** de `NSMicrophoneUsageDescription` (présente, elle) — le micro et la reconnaissance sont deux permissions séparées. |
| **`requestMediaCapturePermissionFor` absent de `WebView.swift`** | Sur iOS 15+, sans ce délégué `WKUIDelegate`, WKWebView refuse automatiquement toute capture (`getUserMedia`), sans prompt ni erreur lisible. |

Preuve par comparaison, sur le même téléphone : **Chrome iOS** demande d'abord la reconnaissance
vocale système (« les données vocales seront envoyées à Apple »), **puis** le micro pour le site.
L'app ne déclare que la seconde.

Correctif : la clé de plist + ~8 lignes de Swift, puis **rebuild + re-soumission App Store**. Aucun
changement côté web. Le TWA Android n'est pas concerné : la permission y appartient à Chrome.

> À garder en tête pour **toute** future fonctionnalité micro ou caméra dans l'app iOS — ce n'est
> pas propre au vocal du chat.

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

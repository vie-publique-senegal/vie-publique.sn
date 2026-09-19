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
l'`appID` de l'AASA (`SHJMC27623.sn.viepublique.app`) lisible.

> ⚠️ **Correction (04/08/2026)** : ce § affirmait que la configuration iOS **Dev** utilise
> `sn.viepublique.app.dev` « pour cohabiter avec la prod sur un même téléphone ». **C'est faux.**
> `Dev.xcconfig` le déclare bien, mais `PRODUCT_BUNDLE_IDENTIFIER` est **codé en dur à
> `sn.viepublique.app` dans les build settings de la cible pour les deux configurations**, et un
> build setting de cible gagne toujours sur un xcconfig. **Le bundle `.dev` n'existe pas** :
> installer un build Debug **remplace l'app de production** sur l'appareil. Vérifié via
> `xcodebuild -showBuildSettings`. Non corrigé (ça touche à l'identité de l'app).

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
| Notifications | `enableNotifications: true` (web push du site) | **push natif** APNs + FCM, voir §2 ter |

Tout le reste (manifest, SW, precache, contenu, styles) est lu **live** → modifiable sans re-build.

> ✅ **Réglé le 04/08/2026** (remplace l'avertissement du 16/07 : le repo iOS codait `dev.vpsn.cloud`
> en dur et le rattrapage n'était pas poussé). La branche `feature/multi-env` est **mergée dans
> `main`** : le domaine vient désormais de `APP_DOMAIN`, défini dans `Prod.xcconfig`
> (`www.vie-publique.sn`) et `Dev.xcconfig` (`dev.vpsn.cloud`), et se propage à `rootUrl`,
> `allowedOrigins`, `WKAppBoundDomains` et aux associated-domains.
>
> ⚠️ Le piège n'a pas disparu, il a changé de forme : **les deux configurations compilent aussi
> bien**. Avant toute archive, vérifier la configuration — sinon l'app publiée envoie les
> utilisateurs sur le site de test, sans le moindre signal.
>
> ⚠️ **Correction (04/08/2026)** : les configurations Xcode ne s'appellent **pas** `Prod`/`Dev`,
> mais **`Debug`** (→ `Dev.xcconfig`, `dev.vpsn.cloud`) et **`Release`** (→ `Prod.xcconfig`,
> `www.vie-publique.sn`). Une archive part en **`Release`** — c'est ça qu'il faut vérifier.
> Et `xcodebuild -configuration Prod` **ne renvoie aucune erreur** : il retombe silencieusement
> sur la configuration par défaut. Ne pas s'en servir comme vérification.

## 2 ter. Notifications push iOS : canal natif en place (04/08/2026)

> Doc canonique : [`../modules/notifications/push-notifications.md`](../modules/notifications/push-notifications.md)
> (recette d'envoi, comportements) et `docs/push-notifications.md` **dans le dépôt iOS** (code Swift,
> invite, protocole de test appareil). Ce §  n'en garde que le résumé.

**Une WKWebView ne reçoit pas de web push.** L'app iOS ne recevait donc aucune notification, alors
que tout avait l'air branché (pod `Firebase/Messaging` installé, `aps-environment: production` dans
les entitlements). Il manquait l'activation de Firebase. Le canal **natif** (APNs + FCM) s'**ajoute**
désormais au web push, sans rien y changer.

Ce qui a été fait :

- app iOS `sn.viepublique.app` enregistrée dans le projet Firebase `vie-publique`, vrai
  `GoogleService-Info.plist` en place (le placeholder PWABuilder est parti) ;
- clé d'authentification APNs (`.p8`) créée et importée dans Firebase → Cloud Messaging.
  **Elle vit dans Vaultwarden**, Apple ne permet pas de la retélécharger, `.gitignore` exclut `*.p8` ;
- `FirebaseApp.configure()` + `registerForRemoteNotifications()` activés ;
- invite de permission **différée** (jamais au premier lancement à froid), protégée par une
  pré-invite maison — l'invite système iOS n'est présentable qu'une seule fois ;
- lien profond au tap, **même recette d'envoi que le web** (`url` / `openUrl` dans les données
  personnalisées) ; une URL hors domaine est ignorée.

**Côté web, un seul changement** : dans l'app iOS, le modal de consentement web ne s'affiche plus
(`detectNativeIOSApp()`, `app/composables/useIsInApp.ts`). Sans ça, l'utilisateur accepterait une
permission qui ne délivrera jamais rien — et recevrait **deux** notifications par message le jour où
WebKit activera le web push en WKWebView. La détection est **iOS-seulement** : le TWA Android garde
son web push.

> 💡 Ce qui décide qu'un appareil reçoit une diffusion, c'est d'être une **instance enregistrée
> d'une app du projet Firebase** — pas un abonnement à un topic. Le code web abonne bien les
> navigateurs au topic `news`, mais **rien n'envoie jamais vers ce topic** : `sendToTopic()`
> (`server/utils/firebase-admin.ts`) n'est appelé nulle part, VP diffuse à tout le monde depuis la
> console. L'abonnement iOS au topic est gratuit et garde l'option ouverte — ne rien bâtir dessus.

> ⚠️ **Deux pièges de configuration du projet Xcode**, constatés au passage et **non corrigés**
> (les changer touche à l'identité de l'app) : les configurations s'appellent **`Debug`/`Release`**,
> pas `Dev`/`Prod` — une archive part en **Release**, qui pointe sur `Prod.xcconfig`. Et
> `PRODUCT_BUNDLE_IDENTIFIER` est codé en dur à `sn.viepublique.app` dans les build settings de la
> cible **pour les deux configurations**, ce qui écrase le `sn.viepublique.app.dev` de
> `Dev.xcconfig` : le bundle dev n'existe pas dans les faits. Détail dans le dépôt iOS.

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

> ✅ **Corrigé et livré** dans **1.1 (5)**, en ligne sur TestFlight depuis le 04/08/2026
> (`requestMediaCapturePermissionFor` dans `WebView.swift` + `NSSpeechRecognitionUsageDescription`
> dans `Info.plist`). Le correctif avait été préparé pour le build 4, qui n'a jamais été archivé —
> il part donc avec le lot push. **À re-tester sur appareil** en même temps que les notifications.

> À garder en tête pour **toute** future fonctionnalité micro ou caméra dans l'app iOS — ce n'est
> pas propre au vocal du chat.

## 4. Quand faut-il re-builder les apps stores ?

Uniquement si l'un de ces éléments change : **nom de l'app, icône launcher, start_url,
domaine, shortcuts** (Android), **push FCM / domaines autorisés / permissions système** (iOS).
Sinon : jamais — tout passe par le déploiement web.

**Android** : PWABuilder → nouveau package → bump `appVersionCode` → Play Console.

**iOS** : la procédure complète (versions, archive, upload, checklist) vit dans le **dépôt iOS**,
[`README.md`](https://github.com/vie-publique-senegal/vie-publique-mobile-ios) § « Procédure de
déploiement ». Trois choses à savoir avant de s'y lancer :

1. **Deux numéros, pas un.** Monter le build number (`CURRENT_PROJECT_VERSION`) ne suffit pas si
   la version publique est déjà **approuvée** : son train est fermé, et l'upload est rejeté
   *après* une archive réussie (`Invalid Pre-Release Train`). Il faut alors monter aussi
   `MARKETING_VERSION`. Vécu le 04/08/2026 : `1 (5)` refusé → `1.1 (5)` accepté.
2. **La configuration s'appelle `Release`, pas `Prod`** — c'est elle que `Product → Archive`
   utilise, et elle pointe sur `Prod.xcconfig` (`www.vie-publique.sn`). `xcodebuild -configuration
   Prod` ne renvoie **aucune erreur** et retombe sur le défaut : inutilisable comme vérification.
   La bonne vérif est `xcodebuild -showBuildSettings -configuration Release | grep APP_DOMAIN`.
3. **`src/Configuration/*.xcconfig` est un doublon mort** : le projet lit ceux de `src/`.

## 4 bis. Déploiement web — rien de spécial à faire pour les apps

Un déploiement du site **est** une mise à jour des apps : elles chargent le site live. Aucune
action côté stores. Les seuls points de vigilance sont les **invariants du §3** — et le fait que
`sw.js` doit rester servi en `no-cache`, faute de quoi les apps installées peuvent rester
plusieurs heures sur une version périmée.

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

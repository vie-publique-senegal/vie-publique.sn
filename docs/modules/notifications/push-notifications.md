# Notifications push — web et app iOS

> Doc canonique des notifications push. Le versant iOS natif (code Swift, invite, tests
> appareil) est documenté dans le **dépôt iOS** : `docs/push-notifications.md`.
> Voir aussi [`../../project/pwa-mobile.md`](../../project/pwa-mobile.md) §2 ter.

## Deux canaux, un seul format de message

| Canal | Qui reçoit | Transport |
| --- | --- | --- |
| **Web push** | navigateurs desktop/Android, PWA installée, TWA Android | Service worker (`app/service-worker/sw.ts`), FCM Web |
| **Push natif iOS** | app App Store `sn.viepublique.app` | APNs + FCM, wrapper WKWebView |

Les deux lisent **le même champ** pour le lien profond. Un seul envoi depuis la console
Firebase sert les deux. C'est un invariant : changer le format casserait les deux canaux
d'un coup.

**Une WKWebView ne reçoit pas de web push.** C'est pour ça que le canal natif existe : sans
lui, les utilisateurs de l'app iOS ne recevaient rien, alors même que le site leur proposait
d'activer les notifications.

## Recette d'envoi (console Firebase)

Firebase Console → **Messaging** → Nouvelle campagne → Notifications.

1. **Titre** et **texte** : le contenu affiché. N'y mettez **jamais** l'URL.
2. **Cible** : l'app iOS `sn.viepublique.app` et/ou l'app Web.
3. **Options supplémentaires → Données personnalisées** : c'est **là** que va le lien.

| Clé | Valeur | Effet |
| --- | --- | --- |
| `url` | `/actualites/123/mon-article` | ouvre cette page, web **et** iOS |
| `openUrl` | idem | synonyme accepté, même comportement |

> ⚠️ **Sans donnée personnalisée, un clic ouvre l'accueil `/`**, pas l'article. C'est le
> défaut du service worker ([`sw.ts`](../../../app/service-worker/sw.ts), `openUrl = '/'`) et
> du natif. Ce n'est pas un bug de code : c'est la recette d'envoi qui est incomplète.
> **C'est la cause n°1 d'un « le lien profond ne marche pas ».**

**Chemin relatif recommandé** (`/actualites/...`) : il fonctionne à l'identique sur les deux
canaux. Une URL absolue marche aussi, mais elle doit être sur `www.vie-publique.sn` — sinon
elle est **ignorée** côté iOS (test d'hôte strict) et ouvrirait un domaine tiers côté web.

## Ce que fait chaque canal à la réception

| | Web (service worker) | iOS natif |
| --- | --- | --- |
| Clic / tap | `notificationclick` → focus l'onglet existant et `navigate()`, sinon nouvelle fenêtre | charge l'URL dans la WebView (SPA-friendly) |
| App/onglet au premier plan | toast in-app (`useNotifications.setupForegroundHandler`) | bannière + son + centre de notifications |
| URL hors domaine | suivie telle quelle | **ignorée**, l'app s'ouvre normalement |
| Notifications successives | `tag: 'vpsn-notification'` + `renotify` → la nouvelle **remplace** la précédente | pas de regroupement (pas d'`apns-collapse-id`) → elles s'empilent |

Cette dernière ligne est une divergence **assumée**, pas un bug à corriger.

## L'app iOS ne propose pas le push web (important)

Le wrapper pose un cookie `app-platform: iOS App Store` (dépôt iOS, `Settings.swift` →
`platformCookie`) et suffixe son user-agent par `PWAShell`. Le site s'en sert **uniquement**
pour se taire :

- `detectNativeIOSApp()` — [`app/composables/useIsInApp.ts`](../../../app/composables/useIsInApp.ts) ;
- consommé par `shouldShowConsentModal` et `recoverSubscription`
  ([`app/composables/useNotifications.ts`](../../../app/composables/useNotifications.ts)).

Dans l'app, le modal de consentement web **ne s'affiche pas** et aucun token web n'est
enregistré. Le natif demande la permission lui-même, à son moment.

Sans cette garde : une invite qui ne délivre jamais rien aujourd'hui, et **deux notifications
par message** le jour où WebKit activera le web push en WKWebView.

> ⚠️ La détection est **volontairement iOS-seulement**. Le **TWA Android** ne pose pas ce
> cookie et son web push fonctionne — il ne doit pas tomber dedans. Ne pas élargir la
> détection à `useIsInApp()` (qui, lui, inclut la PWA standalone, où le web push marche
> aussi et doit continuer).

## Le topic `news` ne sert à rien aujourd'hui

Le code web abonne les navigateurs au topic `news` (`/api/notifications/subscribe`), et le
natif s'y abonne aussi après acceptation. Mais **rien n'envoie jamais vers ce topic** :
`sendToTopic()` ([`server/utils/firebase-admin.ts`](../../../server/utils/firebase-admin.ts))
n'est appelé nulle part. VP diffuse à tout le monde depuis la console.

Ce qui décide qu'un appareil reçoit une diffusion, c'est d'être une **instance enregistrée
d'une app du projet Firebase**, pas un abonnement. L'abonnement est gratuit et garde l'option
ouverte — **ne rien bâtir dessus** sans d'abord câbler un envoi ciblé.

## Vérifier

```bash
# Le service worker lit bien le lien profond (doit sortir les 2 clés)
curl -s https://www.vie-publique.sn/sw.js | grep -oE '(openUrl|data\.url)' | sort -u
```

Le reste se teste par un envoi réel :

1. **Web** : envoyer avec une donnée personnalisée `url`, cliquer → la bonne page s'ouvre.
2. **iOS** : appareil **réel** via TestFlight (le simulateur ne reçoit pas de push APNs),
   protocole détaillé dans le dépôt iOS.
3. Vérifier qu'un envoi **sans** donnée personnalisée ouvre bien l'accueil — c'est le
   comportement attendu, et le rappel que le lien se met à l'envoi.

## Ne pas casser

- **`/api/notifications/*`**, le service worker et le **format des messages** : partagés par
  les deux canaux.
- **`GoogleService-Info.plist`** du dépôt iOS : doit rester celui du projet `vie-publique`.
- **La clé APNs `.p8`** : dans Vaultwarden, jamais dans un dépôt, non retéléchargeable
  chez Apple.
</content>
</invoke>

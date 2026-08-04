# Vocal du chat — dictée et lecture (`/chat/**`)

> Entrée et sortie vocales de **Sira**. Doc canonique du sujet ; la vue d'ensemble du module reste
> [`banc-essai-chat.md`](./banc-essai-chat.md).
>
> **Le vocal est ADDITIF** : tout reste utilisable au clavier sans lui. Un moteur absent ne dégrade
> rien — il retire un bouton.

## 1. Contrainte fondatrice : l'API RAG n'a pas bougé

Toute la chaîne est dans le navigateur :

```
micro → ASR → texte → POST /ask (SSE, INCHANGÉ) → texte → TTS
```

`POST /session` et `POST /ask` reçoivent et renvoient exactement ce qu'ils recevaient et renvoyaient
avant. Aucun octet de plus, aucun champ de plus. Aucune entrée `connect-src` non plus : Web Speech
ne passe pas par `fetch`, il parle à son service hors bande.

Corollaire : **le jour où le vocal demandera du serveur** (moteur wolof, ASR auto-hébergé), ce sera
un **autre chantier** avec son propre chiffrage — pas une extension discrète de celui-ci.

## 2. ⚠️ `Permissions-Policy` — le piège qui ne se voit qu'en production

`nuxt-security` pose par défaut `permissionsPolicy: { microphone: [] }`, sérialisé en
**`Permissions-Policy: microphone=()`** : le micro est interdit sur **tout le site**.

Et **en développement, `security.headers` vaut `false`** : cet en-tête n'existe pas. Un micro qui
marche en local ne prouve donc **rien** pour la production. C'est le pire des scénarios — la panne
n'apparaît qu'après déploiement.

Le correctif est **scopé aux seules pages de conversation** (`nuxt.config.ts`) :

```ts
'/chat/**': { security: { headers: { permissionsPolicy: { microphone: ['self'] } } } },
```

`(self)` **n'accorde rien** : il rend seulement la demande de permission *possible*. L'utilisateur
doit toujours l'accorder dans son navigateur. Le reste du site conserve `microphone=()`.

La politique par défaut est aussi rendue **explicite** dans `securityConfig` : sans ces cinq lignes
sous les yeux, personne ne devine que le site interdit le micro partout.

**Vérification — jamais en dev :**

```bash
npm run build && npm run preview
curl -sI http://localhost:3000/chat/gemini | grep -i permissions-policy   # microphone=(self)
curl -sI http://localhost:3000/               | grep -i permissions-policy   # microphone=()
```

## 3. Compatibilité — détection de fonctionnalité, jamais de reniflage

| Cible | Dictée (ASR) | Lecture (TTS) |
| --- | --- | --- |
| Chrome, Edge (desktop & Android) | ✅ `webkitSpeechRecognition` | ✅ |
| Safari macOS / iOS ≥ 14.5 | ✅ | ✅ |
| **Chrome iOS** | ✅ **mesuré 04/08/2026** — double invite : reconnaissance vocale système (Apple), puis micro du site | ✅ |
| **Firefox** | ❌ API absente (flag `media.webspeech.recognition.enable`, off) | ✅ |
| **App Android (TWA)** | ✅ attendu — c'est Chrome | ✅ attendu |
| **App iOS (WKWebView)** | ⚠️ **API PRÉSENTE, permission refusée** — mesuré 04/08/2026, voir §4 | ✅ **mesuré** (2 voix `fr-FR`) |

> ⚠️ **Correction du 04/08/2026.** Cette doc affirmait d'abord que
> `webkitSpeechRecognition` était *absent* de WKWebView. **C'est faux** : la sonde relevée dans
> l'app iOS publiée affiche `dictée ✅ web-speech`. L'API est bien là ; c'est la **permission** qui
> est refusée, et pour une raison réparable (§4). La leçon est celle du `CLAUDE.md` : ne pas
> conclure sans mesurer sur la cible réelle.

**Là où la dictée manque, le bouton micro n'est pas rendu du tout.** Jamais de bouton mort. C'est
`moteurEcoute()` / `moteurLecture()` (`app/lib/voice/index.ts`) qui en décide, à l'exécution.

### Relever la compatibilité sur un appareil réel

Les apps des stores ne se testent pas depuis un poste de développement. Le pied de conversation
(« Détails », sous la saisie) affiche donc une **sonde** :

```
Voix   dictée ✅ web-speech · lecture ✅ · 4 voix fr-FR
```

Ouvrir `/chat/gemini` dans l'app installée, déplier « Détails », relever la ligne. Pas de page de
diagnostic à maintenir, et ça sert la vocation de traçabilité du banc.

## 4. App iOS : l'API est là, la permission manque — et c'est réparable

**Mesuré le 04/08/2026 dans l'app publiée** (sonde du pied de conversation) :

```
Voix   dictée ✅ web-speech · lecture ✅ · 2 voix fr-FR
```

Puis, au clic sur le micro : « L'accès au micro a été refusé. Vous pouvez poser votre question au
clavier. » La dégradation prévue fonctionne, mais la dictée est inutilisable.

**Cause, trouvée dans le wrapper** (`~/Projects/VP/mobile/Vie Publique SN/src`, voir aussi
[`../../project/pwa-mobile.md`](../../project/pwa-mobile.md)) :

| Clé `Info.plist` | Présente ? |
| --- | --- |
| `NSMicrophoneUsageDescription` | ✅ (gabarit PWABuilder) |
| `NSCameraUsageDescription` | ✅ |
| **`NSSpeechRecognitionUsageDescription`** | ❌ **absente** |

Sur iOS, la reconnaissance vocale exige **sa propre** clé d'usage, distincte de celle du micro. Sans
elle, le système refuse. La preuve par comparaison, sur le même téléphone : dans **Chrome iOS**, le
système demande d'abord « "Chrome" souhaite accéder à la reconnaissance vocale — les données
vocales seront envoyées à Apple », **puis** « Autoriser www.vie-publique.sn à utiliser le micro ? ».
Deux permissions distinctes ; l'app n'en déclare qu'une.

S'y ajoute probablement le délégué
`webView(_:requestMediaCapturePermissionFor:initiatedByFrame:type:decisionHandler:)`, **absent** de
`WebView.swift` : sur iOS 15+, sans lui, WKWebView refuse automatiquement toute capture.

> **Le micro sur l'app iOS est un problème de CONFIGURATION NATIVE, pas d'API.** Aucun moteur
> serveur n'est nécessaire : `webkitSpeechRecognition` fonctionne dans WKWebView, il n'a simplement
> pas le droit de s'exécuter.

**Ce que ça coûte :**

1. ajouter `NSSpeechRecognitionUsageDescription` à `Info.plist` (une chaîne, rédigée pour l'App
   Store) ;
2. ajouter le délégué de capture média à `WebView.swift` (~8 lignes) si le micro reste refusé après
   le point 1 ;
3. rebuild PWABuilder + **re-soumission App Store**.

**Aucune ligne de code web à changer.** `peutEcouter()` répond déjà `true` : le jour où l'app est
resoumise avec la permission, la dictée s'active seule.

> ⚠️ Avant tout rebuild iOS, vérifier `Settings.swift` / `appDomain` : le repo a déjà pointé
> `dev.vpsn.cloud` alors que l'app publiée vise la prod (cf. `pwa-mobile.md`). Builder le repo tel
> quel enverrait les utilisateurs sur le site de test.

**Comportement en attendant** : le bouton micro s'affiche (l'API existe), le premier appui échoue
avec un message clair, puis le bouton devient inerte avec son infobulle. Ce n'est pas idéal — mais
c'est honnête, ça n'empêche rien au clavier, et c'est **auto-réparateur**. Le masquer demanderait de
détecter l'app iOS, donc de renifler le navigateur : précisément ce que ce module s'interdit.

**L'app Android, elle, n'a rien à faire.** Le TWA affiche le site live et le vocal ne touche à aucun
élément figé au build (nom, icône, `start_url`, domaine, shortcuts) : le vocal y arrive **au
prochain déploiement web, sans passer par le Play Store**.

## 5. Gouvernance — l'audio n'est pas traité localement

**La reconnaissance vocale n'est pas locale : l'audio part chez un tiers.** Pour un service public,
avec la CDP en face, ce n'est pas un détail d'implémentation.

⚠️ **Le destinataire dépend de la PLATEFORME, pas seulement du navigateur.** Mesuré le 04/08/2026
sur iPhone : Chrome iOS annonce que « les données vocales seront envoyées à **Apple** » — c'est le
service système iOS, pas Google. Chrome et Edge sur desktop/Android passent, eux, par Google et
Microsoft. **Une mention qui nommerait un seul fournisseur serait donc FAUSSE pour une partie des
visiteurs** — pire que de rester général, sur un site de service public. La formulation en place
couvre les trois cas sans en garantir un.

Ce qui est en place :

- une **mention affichée une fois, AVANT le premier enregistrement** (`ChatComposer`), qui dit que
  la transcription est faite par un tiers et rappelle que le clavier reste disponible. On informe,
  on ne barre pas la route ; l'état est mémorisé (`vp-chat-voix-mention-v1`) ;
- **rien n'est enregistré ni stocké** côté Vie Publique : l'audio ne transite pas par nos serveurs,
  et seul le **texte** transcrit part vers `/ask` — exactement comme une question tapée.

**Si l'envoi de l'audio chez Google est refusé** : l'alternative est un ASR côté serveur (Whisper),
**autre chantier**. C'est précisément pour que ce remplacement ne touche à rien d'autre que le
moteur est isolé (§6).

*Écarté : Whisper WASM dans le navigateur.* Tout local, gouvernance réglée — mais 40 à 75 Mo de
modèle à télécharger, sur des forfaits data comptés et des téléphones modestes, pour dicter une
phrase. Et ça ne débloque toujours pas iOS (même mur `getUserMedia`).

## 6. Architecture — le moteur est remplaçable, le reste ne bouge pas

| Chemin | Rôle | Dépend d'un moteur ? |
| --- | --- | --- |
| `app/lib/voice/types.ts` | Contrat `MoteurVocal` + `ErreurVocale` | — (c'est le contrat) |
| `app/lib/voice/engines/web-speech.ts` | **Unique** implémentation à ce jour | oui |
| `app/lib/voice/index.ts` | Sélection du moteur à l'exécution | — |
| `app/lib/voice/phrases.ts` | Découpage du flux en phrases — **pur, testé** | **non** |
| `app/lib/voice/texte-parle.ts` | Nettoyage avant lecture — **pur, testé** | **non** |
| `app/composables/useDicteeVocale.ts` | États du bouton, permission, silence | **non** |
| `app/composables/useLectureVocale.ts` | File de phrases, sourdine, arrêt | **non** |

Le contrat est **volontairement étroit** :

```ts
ecouter({ lang, onPartiel?, signal }): Promise<string>   // transcrire(langue) → texte
parler(texte, { lang, signal }): Promise<void>            // parler(texte, langue)
peutEcouter() / peutParler(): boolean                     // détection de fonctionnalité
```

Ce n'est **pas de l'abstraction gratuite** : on sait déjà par quoi ce moteur peut être remplacé —
moteur serveur pour le wolof, pont vers les STT/TTS natifs, ASR auto-hébergé. Chacun se place dans
la liste `MOTEURS` de `index.ts` et **rien d'autre ne bouge**.

Deux détails de conception qui n'ont l'air de rien :

- `peutEcouter()` et `peutParler()` sont **séparés**, et `moteurEcoute()` / `moteurLecture()`
  résolvent indépendamment. Sur l'app iOS, Web Speech sait parler mais pas écouter : il faut pouvoir
  garder sa synthèse tout en confiant un jour la dictée à un autre moteur.
- `onPartiel` est **optionnel**. Un moteur serveur (enregistrer puis transcrire) n'émettra aucune
  transcription partielle : l'état `transcription` deviendra alors l'état **dominant** au lieu d'un
  état de passage. Il est dans la machine à états dès maintenant pour cette raison.

> Le canal **WhatsApp** ne réutilisera rien de ce code : il est côté serveur, sans navigateur ni
> streaming. Rien ici n'a été conçu en prévision de lui.

## 7. Lecture AU FIL du flux — le cœur du sujet

Lire la réponse une fois terminée ferait entendre le premier mot plusieurs secondes après l'avoir lu
à l'écran : **le streaming ne servirait plus à rien**. Chaque token alimente donc un tampon
(`creerTamponPhrases`) qui émet dès qu'une phrase est complète ; chaque phrase est nettoyée puis
mise en file. La file est **sérialisée par la promesse de `parler()`** — sans elle, les phrases se
chevaucheraient.

**Règles de coupe** (`phrases.ts`, 18 cas de test) :

- coupe sur `. ! ? … : ;` **suivis d'un blanc**, et sur les fins de ligne ;
- **rien après la ponctuation → on n'émet pas.** Décisif : « 3. » peut encore devenir « 3.5 » au
  fragment suivant ;
- pas de coupe sur une décimale (`8.0`), une URL, un acronyme — conséquence directe de la règle
  ci-dessus (le caractère suivant n'est pas un blanc) ;
- pas de coupe après une abréviation (`M.`, `art.`, `p.`, `n°`…) ni après une initiale isolée
  (`A. Sarr`). La liste est **courte et calée sur le corpus** : chaque entrée superflue retarde la
  première phrase lue ;
- **longueur minimale** (40) : « Oui. » seul suivi d'un silence rend la lecture hachée, on fusionne ;
- **longueur maximale** (300) : coupe forcée au dernier espace. Sans ce garde-fou, un paragraphe mal
  ponctué ne serait **jamais** lu.

Effet de bord heureux : Chrome met sa synthèse en pause au bout d'une quinzaine de secondes (bug
connu, jamais corrigé). Lire phrase par phrase l'évite presque toujours ; un `resume()` périodique
sert de ceinture en plus des bretelles.

**Nettoyage avant lecture** (`texte-parle.ts`, 17 cas). La réponse est écrite pour être *lue à
l'écran* : passée telle quelle au synthétiseur, elle donne « astérisque astérisque le déficit
astérisque astérisque, h-t-t-p-s deux-points… ». On retire donc emphase, titres, marqueurs de liste,
citations, blocs de code (y compris **tronqués** — la clôture ``` peut n'être jamais arrivée), on
garde le libellé des liens en jetant l'URL, et on rend les tableaux en énumération.

- **Les sources s'affichent, elles ne s'énoncent pas.** Elles sont déjà rendues en cartes cliquables
  sous la réponse : les lire serait une litanie d'URLs. Les renvois `[1]`, `[2, 3]` sautent aussi.
- **Réutilisation de `cleanCmsText`** (`shared/clean-text.ts`) en dernière passe : strip HTML,
  entités, blancs — et surtout `.normalize('NFKC')`, qui replie le **pseudo-gras Unicode**
  (`𝐎𝐛𝐣𝐞𝐭` → `Objet`). Le corpus en contient (règle §11 du `CLAUDE.md`) et un synthétiseur le
  rendrait inaudible.
- **Aucune expansion d'abréviation** (« Mds » → « milliards », « % » → « pour cent ») : ce serait
  spécifique au français, alors que le wolof est la cible d'une version suivante. Les synthétiseurs
  le font déjà selon leur langue. Choix délibéré, pas un oubli.

## 8. UX

| État | Rendu |
| --- | --- |
| Repos | icône micro discrète, **à gauche** du champ (la dictée remplace la frappe, pas l'envoi) |
| Écoute | bouton rouge pulsé + pastille et transcription en direct **sous** le champ |
| Transcription | même zone, le texte partiel s'affiche au fil de la parole |
| Erreur | message clair au-dessus du champ, retour au clavier, **jamais de blocage** |
| Permission refusée | bouton conservé mais inerte, infobulle explicative (plutôt qu'évaporé) |
| Non supporté | **bouton absent** |

- **Le texte dicté n'est JAMAIS envoyé tout seul.** Il *complète* le champ (sans écraser ce qui est
  déjà tapé) et y reste visible et modifiable. C'est la règle demandée — et le meilleur frein
  anti-spam : le vocal ne peut pas doubler la cadence vers une API limitée à 10 questions/min/IP.
- **Barge-in** : appuyer sur le micro coupe la lecture **avant** de demander le micro, pour que
  l'assistant ne se parle pas par-dessus lui-même.
- **Silence** : arrêt automatique à 8 s sans résultat (`stop()`, pas `abort()` — on garde ce qui a
  été dit), plafond dur à 30 s.
- **Sourdine** dans l'en-tête, **silence par défaut**, état mémorisé
  (`vp-chat-voix-lecture-v1`). Décision, pas un oubli : un service public ne se met pas à parler
  seul, et le clic d'activation fournit au passage l'**activation utilisateur** que Safari exige
  avant toute synthèse.
- La transcription partielle s'affiche **sous** le champ et non dedans : l'y injecter entrerait en
  conflit avec la frappe si l'utilisateur corrige pendant qu'il dicte.
- Micro **désactivé** pendant le décompte de quota, comme la saisie.
- **Arrêt de la synthèse** au démontage, au changement de fil, à l'erreur, à l'arrêt manuel et à la
  question suivante. La synthèse est un **service global du navigateur** : elle survit au composant
  et continuerait de parler sur la page suivante si personne ne l'annulait.

*Limite assumée* : activer le son **pendant** une réponse démarre la lecture à la phrase suivante,
pas au début — en sourdine, les tokens ne sont même pas bufferisés.

## 9. Configuration

| Élément | Rôle |
| --- | --- |
| Flag Directus `chat_voice` (`vp_feature_flags`) | Coupe le vocal **sans redéploiement** (cache 5 min). |
| `DEFAULT_FEATURES.chat_voice` | Fallback si Directus est injoignable. `dev`/`test` seulement. |
| `NUXT_PUBLIC_VOICE_LANG` (défaut `fr-FR`) | Langue du vocal, lue **au runtime** — pas de rebuild. |
| `ChatVariant.voiceLang` | Surcharge par variante. **C'est ici que se branchera le wolof.** |

**La langue n'est jamais codée en dur**, ni dans le moteur, ni dans la coquille, ni dans les
libellés d'interface (« Dicter la question », « Lire les réponses » — jamais « en français »).

`isFeatureEnabled` rend `false` tant que les flags ne sont pas chargés : le défaut est donc « pas de
vocal », ce qui est le bon sens de sécurité.

## 10. Tests

`npx vitest run test/unit/voice` — **35 cas**. Comme pour le parseur SSE, les modules purs sont
testés **avant l'UI** : c'est là que la régression est invisible à l'œil. Sur un réseau rapide les
tokens arrivent en gros morceaux bien ponctués et tout « marche » ; en production ils tombent au
milieu d'un nombre ou entre les deux points d'une abréviation. Un test rejoue d'ailleurs un flux
**caractère par caractère** et exige le même découpage qu'en une seule fois.

Deux bugs réels ont été trouvés par ces tests à l'écriture : le nom du langage d'un bloc de code
tronqué qui se faisait lire (« json »), et une espace orpheline devant le point final après retrait
d'un renvoi de source.

Le moteur et les composables ne sont **pas** testés unitairement (API navigateur, permissions
réelles) : recette manuelle ci-dessous.

## 11. Recette

Le flag est hors production par défaut : la recette se fait en `dev`/`test`, ou en activant
`chat_voice` sur l'environnement voulu dans Directus.

| À vérifier | Attendu |
| --- | --- |
| `curl -sI <url>/chat/gemini \| grep -i permissions-policy` (build de prod) | `microphone=(self)` |
| `curl -sI <url>/ \| grep -i permissions-policy` | `microphone=()` — le reste du site reste fermé |
| Firefox desktop | **pas** de bouton micro ; la sourdine, si |
| 1ᵉʳ clic micro | mention sur la transmission de l'audio, une seule fois |
| Refus de la permission navigateur | message clair, bouton inerte expliqué, saisie clavier intacte |
| Dictée d'une question | texte dans le champ, **non envoyé**, modifiable |
| Silence de 8 s micro ouvert | arrêt automatique |
| Son activé puis question posée | 1ʳᵉ phrase lue **pendant** la génération, pas à la fin |
| Micro pressé pendant la lecture | lecture coupée **immédiatement** (barge-in) |
| « Nouveau fil » / retour arrière pendant la lecture | silence immédiat |
| Rechargement de page | la sourdine a gardé son état |
| Pied « Détails » | ligne `Voix` cohérente avec le navigateur |
| **App Android installée** | relever la ligne `Voix` — attendu dictée ✅ |
| **App iOS installée** | ✅ **relevé 04/08/2026** : `dictée ✅ web-speech · lecture ✅ · 2 voix fr-FR`, micro refusé au clic (§4) |

## 12. Après Web Speech

| Déclencheur | Réponse | Portée |
| --- | --- | --- |
| **Wolof** | moteur serveur : Web Speech ne le connaît pas et ne le connaîtra pas | autre chantier |
| **Envoi de l'audio chez un tiers refusé** | ASR auto-hébergé (Whisper) | autre chantier |
| **Micro sur l'app iOS** | **config native** : clé `Info.plist` + délégué, puis re-soumission (§4) | **pas de code web**, pas de moteur serveur |

Les trois passent par le **même point d'extension** : une entrée dans `MOTEURS`
(`app/lib/voice/index.ts`). Les états du bouton, le barge-in, le découpage en phrases et le
nettoyage avant lecture restent en place — c'est toute la raison d'être du contrat étroit.

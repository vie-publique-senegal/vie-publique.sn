# Layer Nuxt : vpsn-elections

Ce layer contient toute la logique du **Dashboard Électoral** utilisé par Vie-Publique. Il est conçu pour être réutilisable pour différents pays ou types d'élections.

## Architecture (Nuxt 4)

- **app/components/elections/dashboard/** : Composants UI du dashboard.
- **app/composables/elections/dashboard/** : Logique métier (états, fetchers).
- **server/api/elections/dashboard/** : Points d'entrée API pour les données électorales.

## Utilisation

1. Ajoutez le layer dans votre `nuxt.config.ts` :
```ts
export default defineNuxtConfig({
  extends: ['./layers/vpsn-elections']
})
```

2. Configurez le pays et le branding dans votre `app.config.ts` :
```ts
export default defineAppConfig({
  vpsnElections: {
    country: 'Sénégal',
    // ... custom config
  }
})
```

## Migration en cours
Les éléments sont transférés depuis le cœur de l'application vers ce layer pour assurer une séparation nette des préoccupations.

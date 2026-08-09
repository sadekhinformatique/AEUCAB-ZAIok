---
name: headers-securite
description: Utiliser cette skill pour : Configurer les headers HTTP de sécurité (CSP, HSTS, X-Frame-Options, etc.) adaptés à l'application. S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « headers de sécurité ».
---

# Headers de sécurité

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Configurer les headers http de sécurité (csp, hsts, x-frame-options, etc.) adaptés à l'application.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « headers de sécurité »
- La tâche en cours implique configurer les headers http de sécurité (csp, hsts, x-frame-options, etc.) adaptés à l'application
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Ne jamais faire confiance aux entrées utilisateur, même 'internes'
- Appliquer le principe du moindre privilège partout (BDD, API, fichiers)
- Échapper/encoder les sorties selon leur contexte (HTML, SQL, URL)
- Utiliser des requêtes préparées / ORM plutôt que des chaînes concaténées
- Garder les secrets hors du code source (variables d'environnement, vault)
- Mettre à jour régulièrement les dépendances vulnérables
- Journaliser les événements sensibles sans stocker de données sensibles en clair

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Exemples concrets

**Avec `helmet` (Express) :**
```js
import helmet from 'helmet';
app.use(helmet()); // active HSTS, X-Content-Type-Options, X-Frame-Options, etc.
```

**Headers manuels (Next.js `next.config.js`) :**
```js
module.exports = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « headers de sécurité », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant

---
name: xss
description: Utiliser cette skill pour : Identifier et corriger les failles XSS (stockées, réfléchies, DOM-based) via échappement et CSP. S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « protection xss ».
---

# Protection XSS

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Identifier et corriger les failles xss (stockées, réfléchies, dom-based) via échappement et csp.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « protection xss »
- La tâche en cours implique identifier et corriger les failles xss (stockées, réfléchies, dom-based) via échappement et csp
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

**Mauvais (React) — injection directe de HTML non fiable :**
```jsx
// DANGER : XSS si `comment.text` vient d'un utilisateur
<div dangerouslySetInnerHTML={{ __html: comment.text }} />
```

**Correct — texte échappé par défaut, HTML uniquement si nettoyé :**
```jsx
import DOMPurify from 'dompurify';

// Texte simple : React échappe déjà automatiquement
<div>{comment.text}</div>

// Si du HTML est vraiment nécessaire (ex. éditeur riche) :
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.html) }} />
```

**Content-Security-Policy (Next.js `next.config.js`) :**
```js
const csp = "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self';";
module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: csp }] }];
  },
};
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « protection xss », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant

---
name: rate-limiting
description: Utiliser cette skill pour : Mettre en place une limitation de débit sur les endpoints sensibles (login, API publique) pour éviter les abus. S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « rate limiting ».
---

# Rate limiting

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Mettre en place une limitation de débit sur les endpoints sensibles (login, api publique) pour éviter les abus.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « rate limiting »
- La tâche en cours implique mettre en place une limitation de débit sur les endpoints sensibles (login, api publique) pour éviter les abus
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

**Rate limiting sur une route sensible (Express + `express-rate-limit`) :**
```js
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,                   // 5 tentatives par IP
  message: { error: 'Trop de tentatives, réessayez plus tard.' },
});

app.post('/auth/login', loginLimiter, loginHandler);
```

**Rate limiting côté edge (Cloudflare / Vercel) :** configurer une règle
au niveau du CDN pour bloquer avant même d'atteindre le serveur applicatif —
plus efficace contre les attaques volumétriques.

## Livrables attendus
- Une solution concrète et fonctionnelle pour « rate limiting », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant

---
name: gestion-secrets
description: Utiliser cette skill pour : Mettre en place une gestion sûre des secrets (variables d'environnement, rotation, non-versionnement). S'applique aux projets web/mobile (catégorie « Sécurité » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « gestion des secrets ».
---

# Gestion des secrets

**Catégorie :** 06. Sécurité — Pack *Web Master AI*

## Objectif
Mettre en place une gestion sûre des secrets (variables d'environnement, rotation, non-versionnement).

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « gestion des secrets »
- La tâche en cours implique mettre en place une gestion sûre des secrets (variables d'environnement, rotation, non-versionnement)
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

**`.env` (jamais commité — vérifier `.gitignore`) :**
```
DATABASE_URL=postgres://user:pass@host:5432/db
JWT_SECRET=change-me-in-a-real-vault
STRIPE_SECRET_KEY=sk_live_xxx
```

**`.gitignore` :**
```
.env
.env.local
.env.production
```

**Accès aux secrets en code (jamais de valeur en dur) :**
```js
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET manquant');
```
En production : préférer un gestionnaire de secrets (Vercel/Railway env vars
chiffrées, Doppler, AWS Secrets Manager) à un simple fichier `.env`.

## Livrables attendus
- Une solution concrète et fonctionnelle pour « gestion des secrets », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant

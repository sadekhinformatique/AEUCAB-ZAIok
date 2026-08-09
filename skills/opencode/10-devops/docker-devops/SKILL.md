---
name: docker-devops
description: Utiliser cette skill pour : Conteneuriser une application pour un environnement de développement reproductible. S'applique aux projets web/mobile (catégorie « DevOps » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « docker (dev) ».
---

# Docker (dev)

**Catégorie :** 10. DevOps — Pack *Web Master AI*

## Objectif
Conteneuriser une application pour un environnement de développement reproductible.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « docker (dev) »
- La tâche en cours implique conteneuriser une application pour un environnement de développement reproductible
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Committer souvent, avec des messages clairs et atomiques
- Protéger la branche principale et passer par des pull requests
- Automatiser build/tests/déploiement plutôt que de le faire à la main
- Séparer strictement config/secrets du code source
- Garder des environnements staging et production équivalents
- Surveiller activement plutôt que découvrir les problèmes par les utilisateurs
- Documenter la procédure de rollback avant d'en avoir besoin

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Livrables attendus
- Une solution concrète et fonctionnelle pour « docker (dev) », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant

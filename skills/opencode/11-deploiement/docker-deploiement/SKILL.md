---
name: docker-deploiement
description: Utiliser cette skill pour : Conteneuriser et déployer une application en production avec Docker, images optimisées et orchestration simple. S'applique aux projets web/mobile (catégorie « Déploiement » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « docker (production) ».
---

# Docker (production)

**Catégorie :** 11. Déploiement — Pack *Web Master AI*

## Objectif
Conteneuriser et déployer une application en production avec docker, images optimisées et orchestration simple.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « docker (production) »
- La tâche en cours implique conteneuriser et déployer une application en production avec docker, images optimisées et orchestration simple
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Vérifier que build et variables d'environnement sont corrects avant de déployer
- Déployer d'abord sur un environnement de test/preview
- Prévoir un domaine, un certificat SSL et un DNS correctement configurés
- Automatiser le déploiement plutôt que de le faire manuellement à chaque fois
- Garder une méthode de retour arrière rapide en cas de problème
- Vérifier les logs juste après chaque déploiement

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Livrables attendus
- Une solution concrète et fonctionnelle pour « docker (production) », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant

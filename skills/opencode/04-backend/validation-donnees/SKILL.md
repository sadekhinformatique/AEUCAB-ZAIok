---
name: validation-donnees
description: Utiliser cette skill pour : Mettre en place une validation stricte des données entrantes (schémas, types, règles métier) côté serveur. S'applique aux projets web/mobile (catégorie « Backend » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « validation des données ».
---

# Validation des données

**Catégorie :** 04. Backend — Pack *Web Master AI*

## Objectif
Mettre en place une validation stricte des données entrantes (schémas, types, règles métier) côté serveur.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « validation des données »
- La tâche en cours implique mettre en place une validation stricte des données entrantes (schémas, types, règles métier) côté serveur
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Valider et nettoyer toutes les entrées côté serveur, sans exception
- Séparer clairement routes, logique métier et accès aux données
- Retourner des codes HTTP et messages d'erreur cohérents et exploitables
- Ne jamais faire confiance aux données venant du client (y compris les IDs)
- Logger les erreurs importantes sans exposer d'informations sensibles
- Prévoir la gestion des cas limites (fichiers vides, doublons, timeouts)
- Documenter les endpoints au fur et à mesure

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Livrables attendus
- Une solution concrète et fonctionnelle pour « validation des données », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant

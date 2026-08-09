---
name: gestion-des-erreurs
description: Utiliser cette skill pour : Structurer une gestion d'erreurs centralisée, avec codes cohérents et messages utiles sans fuite d'information sensible. S'applique aux projets web/mobile (catégorie « Backend » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « gestion des erreurs ».
---

# Gestion des erreurs

**Catégorie :** 04. Backend — Pack *Web Master AI*

## Objectif
Structurer une gestion d'erreurs centralisée, avec codes cohérents et messages utiles sans fuite d'information sensible.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « gestion des erreurs »
- La tâche en cours implique structurer une gestion d'erreurs centralisée, avec codes cohérents et messages utiles sans fuite d'information sensible
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
- Une solution concrète et fonctionnelle pour « gestion des erreurs », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant

---
name: detection-fichiers-inutiles
description: Utiliser cette skill pour : Identifier les fichiers, imports et dépendances inutilisés à nettoyer en toute sécurité. S'applique aux projets web/mobile (catégorie « Analyse automatique » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « détection des fichiers inutiles ».
---

# Détection des fichiers inutiles

**Catégorie :** 17. Analyse automatique — Pack *Web Master AI*

## Objectif
Identifier les fichiers, imports et dépendances inutilisés à nettoyer en toute sécurité.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « détection des fichiers inutiles »
- La tâche en cours implique identifier les fichiers, imports et dépendances inutilisés à nettoyer en toute sécurité
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Toujours commencer par un inventaire objectif avant tout jugement
- Prioriser les constats par impact réel (sécurité > bugs > style)
- Illustrer chaque problème par un exemple concret dans le code
- Distinguer clairement 'bug avéré' de 'amélioration possible'
- Terminer par des recommandations actionnables et priorisées
- Ne jamais corriger silencieusement sans lister ce qui a été changé

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Livrables attendus
- Une solution concrète et fonctionnelle pour « détection des fichiers inutiles », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant

---
name: tests-securite
description: Utiliser cette skill pour : Tester les vecteurs d'attaque courants (injection, accès non autorisé) sur une application avant mise en production. S'applique aux projets web/mobile (catégorie « Tests & QA » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « tests de sécurité ».
---

# Tests de sécurité

**Catégorie :** 09. Tests & QA — Pack *Web Master AI*

## Objectif
Tester les vecteurs d'attaque courants (injection, accès non autorisé) sur une application avant mise en production.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « tests de sécurité »
- La tâche en cours implique tester les vecteurs d'attaque courants (injection, accès non autorisé) sur une application avant mise en production
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Prioriser les tests sur la logique métier critique et les cas limites
- Garder les tests rapides, indépendants et reproductibles
- Nommer les tests de façon à comprendre l'intention sans lire le code
- Tester les cas d'erreur autant que les cas nominaux
- Automatiser l'exécution des tests dans le pipeline CI
- Ne pas confondre couverture élevée et qualité des tests

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Livrables attendus
- Une solution concrète et fonctionnelle pour « tests de sécurité », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant

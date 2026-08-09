---
name: rapport-final
description: Utiliser cette skill pour : Produire un rapport final clair : ce qui a été fait, ce qui a été trouvé, ce qui reste à faire. S'applique aux projets web/mobile (catégorie « Agent autonome » du pack Web Master AI, stack type Next.js, React Native, Supabase, Django, Electron). Déclencher dès qu'une tâche touche à « rapport final ».
---

# Rapport final

**Catégorie :** 18. Agent autonome — Pack *Web Master AI*

## Objectif
Produire un rapport final clair : ce qui a été fait, ce qui a été trouvé, ce qui reste à faire.

## Quand déclencher cette skill
- L'utilisateur demande explicitement de travailler sur « rapport final »
- La tâche en cours implique produire un rapport final clair
- Un fichier, un module ou une fonctionnalité du projet touche directement ce sujet
- Une revue de code, un audit ou une nouvelle fonctionnalité en dépend

## Checklist / bonnes pratiques
- Découper toute tâche complexe en étapes vérifiables avant d'agir
- Annoncer le plan avant de commencer l'exécution
- Vérifier le résultat de chaque étape avant de passer à la suivante
- Corriger immédiatement les écarts détectés plutôt que de les ignorer
- Retester ce qui a été corrigé pour confirmer la résolution
- Terminer par un rapport clair de ce qui a été fait, trouvé et reste à faire

## Démarche recommandée
1. Clarifier le besoin exact et le contexte du projet (stack, contraintes, existant)
2. Identifier les options possibles et choisir la plus adaptée au contexte (pas la plus complexe)
3. Mettre en œuvre par petites étapes vérifiables
4. Vérifier le résultat par rapport à la checklist ci-dessus
5. Signaler explicitement les limites, risques ou points restant à valider

## Exemples concrets

**Trame de rapport final :**
```markdown
## Ce qui a été fait
- Authentification email/mot de passe complète (inscription, connexion, JWT)

## Ce qui a été trouvé
- Absence de validation serveur sur 2 endpoints existants (corrigée)

## Ce qui reste à faire
- Réinitialisation de mot de passe (hors périmètre initial)
- Tests E2E du parcours complet (recommandé avant mise en production)
```

## Livrables attendus
- Une solution concrète et fonctionnelle pour « rapport final », adaptée au projet en cours
- Une explication claire des choix effectués et de leurs compromis
- La liste des points de vigilance ou suites possibles, le cas échéant
